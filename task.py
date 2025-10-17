import pandas as pd
from sklearn.svm import SVC  
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import accuracy_score

data = pd.read_csv("online_shoppers_intention.csv")
print(data.head())
print(data.info())
print(data['Revenue'].value_counts())

x=data.drop(columns='Revenue')
y=data['Revenue']

x_train,x_test,y_train,y_test=train_test_split(
    x,y,
    test_size=0.3,
    random_state=42
)