import matplotlib.pyplot as plt
import seaborn as sns
import numpy as np
from sklearn.metrics import confusion_matrix, classification_report
plt.rcParams['font.sans-serif']=['SimHei']
plt.rcParams['axes.unicode_minus']=False
labels = ['反例', '正例']
matrix = np.array([[3095, 29], [560, 15]])

# 绘制混淆矩阵热图
plt.figure(figsize=(8, 6))
sns.heatmap(matrix, annot=True, fmt='d', cmap='Blues', 
            xticklabels=labels, yticklabels=labels)
plt.title('混淆矩阵可视化图像')
plt.xlabel('预测标签')
plt.ylabel('实际标签')
plt.tight_layout()
plt.show()

# 打印分类报告
print("分类报告:")
print(f"准确率: {(matrix[0,0] + matrix[1,1]) / matrix.sum():.3f}")
print(f"召回率: {matrix[1,1] / matrix[1,:].sum():.3f}")
print(f"精确率: {matrix[1,1] / matrix[:,1].sum():.3f}")


X_test_pca = np.array([[-1.38768549e+02,  5.63949478e+01],
                       [ 1.32988317e+03,  3.37013158e+02],
                       [ 3.11235676e+03, -1.81074788e+02],
                       [-5.84466153e+02,  7.44957671e+01],
                       [ 3.79532401e+03,  5.17802951e+02],
                       [-7.79899130e+02, -3.28693889e+01],
                       [-1.00860354e+03, -4.46135520e+01],
                       [-9.97587451e+02, -4.50512281e+01],
                       [ 1.40627892e+03, -2.24448954e+00],
                       [-1.10154127e+03,  9.57252565e+01]])

y_pred_pca = np.array([False, False, False, False, False, False, False, False, False, False])
y_test = np.array([False, True, False, False, False, False, False, False, False, False])

# 绘制决策边界散点图
plt.figure(figsize=(10, 8))

# 根据真实标签分类绘制点
mask_true_positive = (y_test == True) & (y_pred_pca == True)
mask_true_negative = (y_test == False) & (y_pred_pca == False)
mask_false_positive = (y_test == False) & (y_pred_pca == True)
mask_false_negative = (y_test == True) & (y_pred_pca == False)

# 绘制不同类别的点
plt.scatter(X_test_pca[mask_true_negative, 0], X_test_pca[mask_true_negative, 1], 
           c='green', label='真反例', alpha=0.6, s=50)
plt.scatter(X_test_pca[mask_true_positive, 0], X_test_pca[mask_true_positive, 1], 
           c='blue', label='真正例', alpha=0.6, s=50)
plt.scatter(X_test_pca[mask_false_negative, 0], X_test_pca[mask_false_negative, 1], 
           c='red', label='假反例', alpha=0.6, s=50, marker='x')
plt.scatter(X_test_pca[mask_false_positive, 0], X_test_pca[mask_false_positive, 1], 
           c='orange', label='假正例', alpha=0.6, s=50, marker='x')

plt.xlabel('PCA1')
plt.ylabel('PCA2')
plt.title('PCA_2D降维决策边界散点展示图')
plt.legend()
plt.grid(True, alpha=0.3)
plt.tight_layout()
plt.show()
