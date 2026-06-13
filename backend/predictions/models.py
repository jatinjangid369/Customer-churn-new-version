from django.db import models
from django.contrib.auth.models import User
from customers.models import Customer


class Dataset(models.Model):
    """Store uploaded CSV files and metadata"""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='datasets')
    name = models.CharField(max_length=255, help_text='Dataset name')
    file_path = models.CharField(max_length=512, help_text='Path to uploaded file')
    original_filename = models.CharField(max_length=255)
    rows_count = models.IntegerField()
    columns_count = models.IntegerField()
    columns_list = models.JSONField(default=list, help_text='List of column names')
    upload_date = models.DateTimeField(auto_now_add=True)
    quality_score = models.FloatField(null=True, blank=True, help_text='Data quality score 0-100')
    
    class Meta:
        ordering = ['-upload_date']
    
    def __str__(self):
        return f'{self.name} ({self.rows_count} rows, {self.columns_count} cols)'


class FeatureMapping(models.Model):
    """Map user's CSV columns to standardized fields"""
    dataset = models.OneToOneField(Dataset, on_delete=models.CASCADE, related_name='feature_mapping')
    customer_id_column = models.CharField(max_length=255, help_text='Column name for customer ID')
    target_column = models.CharField(max_length=255, help_text='Column name for churn target')
    feature_columns = models.JSONField(default=list, help_text='List of feature column names to use')
    categorical_columns = models.JSONField(default=list, help_text='Column names that are categorical')
    numerical_columns = models.JSONField(default=list, help_text='Column names that are numerical')
    missing_value_strategy = models.CharField(
        max_length=50, 
        choices=[('drop', 'Drop rows'), ('mean', 'Fill with mean'), ('median', 'Fill with median'), ('mode', 'Fill with mode')],
        default='drop'
    )
    created_date = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_date']
    
    def __str__(self):
        return f'Mapping for {self.dataset.name}'


class ModelConfig(models.Model):
    """Store ML model configuration and hyperparameters"""
    MODEL_TYPE_CHOICES = [
        ('rf', 'Random Forest'),
        ('lr', 'Logistic Regression'),
        ('xgb', 'XGBoost'),
        ('lgb', 'LightGBM')
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='model_configs')
    name = models.CharField(max_length=255, help_text='Model configuration name')
    model_type = models.CharField(max_length=10, choices=MODEL_TYPE_CHOICES)
    hyperparameters = models.JSONField(
        default=dict, 
        help_text='Hyperparameters dictionary'
    )
    created_date = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_date']
    
    def __str__(self):
        return f'{self.name} ({self.get_model_type_display()})'


class TrainingJob(models.Model):
    """Track ML model training jobs"""
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('running', 'Running'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
        ('cancelled', 'Cancelled')
    ]
    
    dataset = models.ForeignKey(Dataset, on_delete=models.CASCADE, related_name='training_jobs')
    feature_mapping = models.ForeignKey(FeatureMapping, on_delete=models.CASCADE, related_name='training_jobs')
    model_config = models.ForeignKey(ModelConfig, on_delete=models.CASCADE, related_name='training_jobs')
    
    celery_task_id = models.CharField(max_length=255, null=True, blank=True, help_text='Celery task ID for progress tracking')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    progress = models.IntegerField(default=0, help_text='Training progress 0-100')
    
    # Metrics
    accuracy = models.FloatField(null=True, blank=True)
    precision = models.FloatField(null=True, blank=True)
    recall = models.FloatField(null=True, blank=True)
    f1_score = models.FloatField(null=True, blank=True)
    confusion_matrix = models.JSONField(null=True, blank=True, help_text='[[tn, fp], [fn, tp]]')
    feature_importance = models.JSONField(null=True, blank=True, help_text='Feature importance scores')
    
    # File paths
    model_file_path = models.CharField(max_length=512, null=True, blank=True)
    preprocessor_file_path = models.CharField(max_length=512, null=True, blank=True)
    
    started_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    error_message = models.TextField(null=True, blank=True)
    
    class Meta:
        ordering = ['-started_at']
    
    def __str__(self):
        return f'Training Job {self.id} — {self.get_status_display()}'


class Prediction(models.Model):
    """Store batch predictions from trained models"""
    training_job = models.ForeignKey(TrainingJob, on_delete=models.CASCADE, related_name='predictions')
    customer_id = models.CharField(max_length=255, help_text='Original customer ID from dataset')
    churn_probability = models.FloatField(help_text='Probability of churn 0.0-1.0')
    predicted_class = models.IntegerField(choices=[(0, 'No Churn'), (1, 'Churn')])
    is_high_risk = models.BooleanField(default=False, help_text='True if probability > 0.8')
    created_date = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-churn_probability']
        indexes = [
            models.Index(fields=['training_job', 'is_high_risk']),
            models.Index(fields=['-churn_probability']),
        ]
    
    def __str__(self):
        return f'Prediction {self.id} — Customer {self.customer_id} ({self.churn_probability:.2%})'
