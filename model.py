import time
import pandas as pd
import numpy as np
from sklearn.svm import SVC, LinearSVC
from sklearn.model_selection import train_test_split, StratifiedKFold, cross_val_score
from sklearn.preprocessing import StandardScaler
from sklearn.feature_selection import SelectKBest, f_classif, RFE
from sklearn.inspection import permutation_importance

# ---------- 数据加载与预处理（和你一致） ----------
month_map = {
    'Jan': 1, 'Feb': 2, 'Mar': 3, 'Apr': 4,
    'May': 5, 'Jun': 6, 'Jul': 7, 'Aug': 8,
    'Sep': 9, 'Oct': 10, 'Nov': 11, 'Dec': 12
}

data = pd.read_csv("online_shoppers_intention.csv")
data['Weekend'] = data['Weekend'].astype(str).str.upper().map({'TRUE': True, 'FALSE': False})
data['Revenue'] = data['Revenue'].astype(str).str.upper().map({'TRUE': True, 'FALSE': False})
data['Month'] = data['Month'].astype(str).str.strip().str[:3].str.capitalize().map(month_map)
data = pd.get_dummies(data, columns=['VisitorType'], drop_first=True)

X = data.drop(columns='Revenue').copy()
X['Weekend'] = X['Weekend'].astype(int)
y = data['Revenue'].copy()

# 保留数值列索引
num_cols = X.select_dtypes(include=['int64', 'float64']).columns

# ---------- 用和训练一致的标准化器对全量 X 做缩放（避免 RFE/LinearSVC 出现数值问题） ----------
scaler_full = StandardScaler()
X_scaled = X.copy()
X_scaled[num_cols] = scaler_full.fit_transform(X[num_cols])

# 划分（你原先在脚本中已做，保持一致）
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.3, random_state=42)

# 你的已训练模型（保持不动）
clf = SVC(kernel='rbf', C=10, gamma=0.01)
clf.fit(X_train, y_train)
print("测试集准确率:", clf.score(X_test, y_test))


# ========== 从这里开始：安全快速替代并行与说明 ==========
def secs():
    return time.perf_counter()

def pretty_time(t):
    return f"{t:.2f}s"

# 1) Balanced 对比（保持）
t0 = secs()
clf_balanced = SVC(kernel='rbf', C=10, gamma=0.01, class_weight='balanced')
clf_balanced.fit(X_train, y_train)
t1 = secs()
print(f"\n[class_weight] 使用 class_weight='balanced' 后的准确率: {clf_balanced.score(X_test, y_test)} (time {pretty_time(t1-t0)})")


# 2) StratifiedKFold 交叉验证（这一步不是训练整个网格，只评估当前 clf）
t0 = secs()
cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
scores = cross_val_score(clf, X, y, cv=cv, scoring='accuracy', n_jobs=1)  # n_jobs=1 避免并发抢占资源
t1 = secs()
print(f"\n5 折交叉验证准确率: {scores}\n平均准确率: {scores.mean():.6f} (time {pretty_time(t1-t0)})")


# 3) SelectKBest（在标准化后的 X_scaled 上进行）
t0 = secs()
skb = SelectKBest(f_classif, k=10)
skb.fit(X_scaled, y)
selected_features_skb = X.columns[skb.get_support()]
t1 = secs()
print("\n=== SelectKBest 选出的前10个特征 ===")
print(list(selected_features_skb))
print("Time:", pretty_time(t1-t0))


# 4) RFE — 使用 LinearSVC 作为基学习器（比 SVC(kernel='linear') 快很多）
#    在 X_scaled 上运行（避免未缩放导致的收敛慢）
t0 = secs()
# LinearSVC 参数说明：dual=False 适用于 n_samples > n_features，加速收敛
lsvc_est = LinearSVC(C=1.0, class_weight='balanced', max_iter=5000, dual=False, tol=1e-4)
rfe = RFE(estimator=lsvc_est, n_features_to_select=10, step=1)
rfe.fit(X_scaled, y)
selected_features_rfe = X.columns[rfe.support_]
t1 = secs()
print("\n=== RFE (LinearSVC 基学习器) 选出的前10个特征 ===")
print(list(selected_features_rfe))
print("Time:", pretty_time(t1-t0))


# 5) 线性核的权重（LinearSVC）——在缩放后的训练集上训练并输出coef_
t0 = secs()
linear_clf = LinearSVC(C=1.0, class_weight='balanced', max_iter=5000, dual=False, tol=1e-4)
# 使用 X_scaled 的训练分割部分
# 先构造 X_scaled_train / X_scaled_test 与之前的 X_train/X_test 对应
X_scaled_train = X_scaled.loc[X_train.index]
X_scaled_test  = X_scaled.loc[X_test.index]

linear_clf.fit(X_scaled_train, y_train)
coefs = linear_clf.coef_[0]
weights = sorted(zip(X.columns, coefs), key=lambda x: abs(x[1]), reverse=True)
t1 = secs()
print("\n=== 线性核 SVM (LinearSVC) 特征权重（前10名） ===")
for name, w in weights[:10]:
    print(f"{name:30s} weight={w:.6f}")
print("Time:", pretty_time(t1-t0))


# 6) Permutation Importance（快速、安全版）
#    - 只在测试集上用子样本（最多1000条）
#    - n_repeats=3（速度和稳定性的折中）
#    - 并行 n_jobs=-1 但要在 __main__ 下运行（见下）
def do_permutation_importance(model, X_test_full, y_test_full, max_sample=1000, n_repeats=3):
    n = len(X_test_full)
    sample_n = min(max_sample, n)
    # 固定采样，避免每次不同
    X_sample = X_test_full.sample(n=sample_n, random_state=42)
    y_sample = y_test_full.loc[X_sample.index]
    t0 = secs()
    res = permutation_importance(model, X_sample, y_sample, n_repeats=n_repeats, random_state=42, n_jobs=-1)
    t1 = secs()
    importances = res.importances_mean
    rank = sorted(zip(X.columns, importances), key=lambda x: x[1], reverse=True)
    print(f"\n=== RBF SVM Permutation Importance (sample={sample_n}, repeats={n_repeats}) ===")
    for name, score in rank[:10]:
        print(f"{name:30s} importance={score:.6f}")
    print("Time:", pretty_time(t1-t0))
    return res

# 把真正执行并行的部分放在 __main__ 下，避免 Windows multiprocessing 问题
if __name__ == '__main__':
    # 运行 permutation importance（会并行）
    do_permutation_importance(clf, X_test, y_test, max_sample=1000, n_repeats=3)

    # 最后的总结（快速版）
    print("\n==================== 模型分析总结（简要） ====================")
    print("1) Top features (SelectKBest):", list(selected_features_skb[:5]))
    print("2) Top features (RFE):", list(selected_features_rfe[:5]))
    print("3) LinearSVC top weights:", [w[0] for w in weights[:5]])
    print("4) 最优核函数（你的调参结果）: RBF")
    print("5) 参数影响: C=10 (较高惩罚) ; gamma=0.01 (较平滑的 RBF)")
    print("===========================================================")



from sklearn.metrics import confusion_matrix, classification_report
from sklearn.decomposition import PCA

# ------- 1. 混淆矩阵 + Precision/Recall/F1 -------
y_pred = clf.predict(X_test)

print("\n=========== 混淆矩阵 ===========")
cm = confusion_matrix(y_test, y_pred)
print(cm)

print("\n=========== 分类报告（Precision / Recall / F1）===========")
cr = classification_report(y_test, y_pred, digits=4)
print(cr)


kernels = ['linear', 'rbf', 'sigmoid']
kernel_acc = {}

for k in kernels:
    print(f"正在训练 kernel={k} ...")
    temp_clf = SVC(kernel=k, C=10, gamma=0.01)
    temp_clf.fit(X_train, y_train)
    acc = temp_clf.score(X_test, y_test)
    kernel_acc[k] = acc

print("\n=========== 各核函数测试集准确率（用于画柱状图）===========")
print(kernel_acc)



# ------- 3. 混淆矩阵热图数据 -------
labels = ["Not Revenue", "Revenue"]
print("\n=========== 混淆矩阵热图数据 ==========")
print("labels:", labels)
print("matrix:\n", cm)


# ------- 4. PCA 降维用于决策边界绘图 -------
pca = PCA(n_components=2, random_state=42)
X_test_pca = pca.fit_transform(X_test)
y_pred_pca = clf.predict(X_test)

print("\n=========== PCA 2D 用于绘制决策边界的数据 ==========")
print("X_test_pca (前10行):")
print(X_test_pca[:10])

print("\n对应的预测标签 y_pred_pca (前10个):")
print(y_pred_pca[:10])

print("\n真实标签 y_test（前10个）:")
print(np.array(y_test)[:10])
