from rest_framework import serializers
from .models import Dataset, FeatureMapping, ModelConfig, TrainingJob, Prediction


class DatasetSerializer(serializers.ModelSerializer):
    """Serializer for uploaded datasets"""
    user = serializers.StringRelatedField(read_only=True)
    
    class Meta:
        model = Dataset
        fields = ['id', 'user', 'name', 'original_filename', 'rows_count', 
                 'columns_count', 'columns_list', 'upload_date', 'quality_score']
        read_only_fields = ['rows_count', 'columns_count', 'columns_list', 'upload_date', 'quality_score']


class FeatureMappingSerializer(serializers.ModelSerializer):
    """Serializer for feature mappings"""
    
    class Meta:
        model = FeatureMapping
        fields = ['id', 'dataset', 'customer_id_column', 'target_column', 
                 'feature_columns', 'categorical_columns', 'numerical_columns',
                 'missing_value_strategy', 'created_date']
        read_only_fields = ['created_date']


class ModelConfigSerializer(serializers.ModelSerializer):
    """Serializer for model configurations"""
    user = serializers.StringRelatedField(read_only=True)
    model_type_display = serializers.CharField(source='get_model_type_display', read_only=True)
    
    class Meta:
        model = ModelConfig
        fields = ['id', 'user', 'name', 'model_type', 'model_type_display', 
                 'hyperparameters', 'created_date']
        read_only_fields = ['created_date']


class TrainingJobSerializer(serializers.ModelSerializer):
    """Serializer for training jobs"""
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    dataset_name = serializers.CharField(source='dataset.name', read_only=True)
    model_type = serializers.CharField(source='model_config.get_model_type_display', read_only=True)
    
    class Meta:
        model = TrainingJob
        fields = ['id', 'dataset', 'dataset_name', 'feature_mapping', 'model_config', 
                 'model_type', 'status', 'status_display', 'progress', 'celery_task_id',
                 'accuracy', 'precision', 'recall', 'f1_score', 'confusion_matrix',
                 'feature_importance', 'started_at', 'completed_at', 'error_message']
        read_only_fields = ['status', 'progress', 'accuracy', 'precision', 'recall', 
                          'f1_score', 'confusion_matrix', 'feature_importance', 
                          'started_at', 'completed_at', 'error_message']


class PredictionSerializer(serializers.ModelSerializer):
    """Serializer for predictions"""
    training_job_id = serializers.IntegerField(source='training_job.id', read_only=True)
    predicted_class_display = serializers.SerializerMethodField()
    
    class Meta:
        model = Prediction
        fields = ['id', 'training_job_id', 'customer_id', 'churn_probability', 
                 'predicted_class', 'predicted_class_display', 'is_high_risk', 'created_date']
        read_only_fields = ['created_date']
    
    def get_predicted_class_display(self, obj):
        return obj.get_predicted_class_display()


class PredictionBatchSerializer(serializers.Serializer):
    """Serializer for batch prediction results"""
    total_customers = serializers.IntegerField()
    predicted_churners = serializers.IntegerField()
    predicted_non_churners = serializers.IntegerField()
    high_risk_customers = serializers.IntegerField()
    average_churn_probability = serializers.FloatField()
    churn_rate_percentage = serializers.FloatField()


# Input/Output serializers for API endpoints

class DatasetUploadSerializer(serializers.Serializer):
    """Input serializer for dataset upload"""
    file = serializers.FileField()
    name = serializers.CharField(max_length=255)


class DatasetPreviewSerializer(serializers.Serializer):
    """Output serializer for dataset preview"""
    columns = serializers.ListField()
    data = serializers.ListField()
    rows_count = serializers.IntegerField()


class DatasetValidationSerializer(serializers.Serializer):
    """Output serializer for data validation"""
    format_valid = serializers.BooleanField()
    total_rows = serializers.IntegerField()
    total_columns = serializers.IntegerField()
    missing_values = serializers.DictField()
    data_types = serializers.DictField()
    quality_score = serializers.FloatField()
    class_distribution = serializers.DictField(required=False)
    target_valid = serializers.BooleanField(required=False)
    target_message = serializers.CharField(required=False)


class FeatureMappingValidationSerializer(serializers.Serializer):
    """Output serializer for feature mapping validation"""
    is_valid = serializers.BooleanField()
    message = serializers.CharField()
    missing_config = serializers.ListField(required=False)


class TrainingJobCreateSerializer(serializers.Serializer):
    """Input serializer for creating training jobs"""
    dataset_id = serializers.IntegerField()
    feature_mapping_id = serializers.IntegerField()
    model_config_id = serializers.IntegerField()


class TrainingJobStatusSerializer(serializers.Serializer):
    """Output serializer for training job status"""
    job_id = serializers.IntegerField()
    status = serializers.CharField()
    progress = serializers.IntegerField()
    current_step = serializers.CharField(required=False)


class TrainingJobResultsSerializer(serializers.Serializer):
    """Output serializer for training job results"""
    job_id = serializers.IntegerField()
    status = serializers.CharField()
    accuracy = serializers.FloatField()
    precision = serializers.FloatField()
    recall = serializers.FloatField()
    f1_score = serializers.FloatField()
    confusion_matrix = serializers.ListField()
    feature_importance = serializers.DictField()


class HighRiskCustomersSerializer(serializers.Serializer):
    """Output serializer for high-risk customers"""
    customer_id = serializers.CharField()
    churn_probability = serializers.FloatField()
    predicted_class = serializers.IntegerField()


class ModelComparisonSerializer(serializers.Serializer):
    """Output serializer for model comparison"""
    model_name = serializers.CharField()
    model_type = serializers.CharField()
    accuracy = serializers.FloatField()
    precision = serializers.FloatField()
    recall = serializers.FloatField()
    f1_score = serializers.FloatField()
    trained_at = serializers.DateTimeField()
