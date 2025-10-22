import pandas as pd
from sklearn.svm import SVC  
from sklearn.model_selection import train_test_split, GridSearchCV
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import accuracy_score


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
param_grid = {
    'kernel': ['linear', 'poly', 'rbf', 'sigmoid'],
    'C': [0.1, 1, 10],
    'gamma': ['scale', 0.01, 0.1, 1]
}

#网格输出所有组合的性能
grid = GridSearchCV(SVC(), param_grid, cv=5, scoring='accuracy', n_jobs=-1)
grid.fit(X_train, y_train)

results = pd.DataFrame(grid.cv_results_)
print(results[['param_kernel','param_C','param_gamma','mean_test_score']])

print("最佳参数:", grid.best_params_)
print("训练集最优得分:", grid.best_score_)
print("测试集准确率:", grid.score(X_test, y_test))