import pandas as pd
from sklearn.svm import SVC  
from sklearn.model_selection import train_test_split,ParameterGrid, cross_val_score, StratifiedKFold, GridSearchCV
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import accuracy_score
from sklearn.pipeline import Pipeline
from tqdm.auto import tqdm
import numpy as np


month_map = {
    'Jan': 1, 'Feb': 2, 'Mar': 3, 'Apr': 4,
    'May': 5, 'Jun': 6, 'Jul': 7, 'Aug': 8,
    'Sep': 9, 'Oct': 10, 'Nov': 11, 'Dec': 12
}

data = pd.read_csv("online_shoppers_intention.csv")
# print(data.head())
# print(data.info())
# print(data['Revenue'].value_counts())

#将两个bool列转化为真正的bool类型，将月份转化为数字，并对VisitorType进行独热编码（老用户是True，新用户是False）
data['Weekend'] = data['Weekend'].astype(str).str.upper().map({'TRUE': True, 'FALSE': False})
data['Revenue'] = data['Revenue'].astype(str).str.upper().map({'TRUE': True, 'FALSE': False})
data['Month'] = data['Month'].astype(str).str.strip().str[:3].str.capitalize().map(month_map)
data = pd.get_dummies(data, columns=['VisitorType'], drop_first=True)
#规定特征和标签，划分训练集和测试集
X=data.drop(columns='Revenue')
X['Weekend'] = X['Weekend'].astype(int)
y=data['Revenue']
#skip
num_cols = X.select_dtypes(include=['int64', 'float64']).columns
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.3, random_state=42)
scaler = StandardScaler()
X_train[num_cols] = scaler.fit_transform(X_train[num_cols])
X_test[num_cols] = scaler.transform(X_test[num_cols])
#训练一个基本的SVM模型

clf = SVC(kernel='rbf', C=1.0)
clf.fit(X_train, y_train)
# print("Accuracy:", clf.score(X_test, y_test))

#三种选择模型的参数的设置

pipe = Pipeline([('scale', StandardScaler()), ('svc', SVC(cache_size=500))])
param_grid = {
    'svc__kernel': ['linear', 'poly', 'rbf', 'sigmoid'],
    'svc__C': [0.1, 1, 10],
    'svc__gamma': ['scale', 0.01, 0.1, 1]
}

cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
grid = list(ParameterGrid(param_grid))

scores = []
best = (None, -np.inf)
for params in tqdm(grid, desc="GridSearch", unit="combo"):
    pipe.set_params(**params)
    cv_scores = cross_val_score(pipe, X_train, y_train, cv=cv, scoring='accuracy', n_jobs=-1)
    mean_score = cv_scores.mean()
    scores.append((params, mean_score))
    if mean_score > best[1]:
        best = (params, mean_score)
#网格输出所有组合的性能
print("最佳参数:", best[0])
print("训练集最优得分:", best[1])
# 用最佳参数在测试集上评估
pipe.set_params(**best[0]).fit(X_train, y_train)
print("测试集准确率:", pipe.score(X_test, y_test))