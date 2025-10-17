import pandas as pd

data = pd.read_csv("online_shoppers_intention.csv")
print(data.head())
print(data.info())
print(data['Revenue'].value_counts())
