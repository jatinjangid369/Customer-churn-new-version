"""
Comprehensive prediction API views for MLOps churn platform

API Endpoints:
    POST   /api/datasets/upload/                  - Upload CSV dataset
    GET    /api/datasets/                         - List user's datasets
    GET    /api/datasets/<id>/                    - Get dataset details
    GET    /api/datasets/<id>/preview/            - Preview first 10 rows
    POST   /api/datasets/<id>/validate/           - Validate data quality
    DELETE /api/datasets/<id>/                    - Delete dataset
    
    POST   /api/feature-mappings/                 - Create feature mapping
    GET    /api/feature-mappings/                 - List mappings
    PUT    /api/feature-mappings/<id>/            - Update mapping
    DELETE /api/feature-mappings/<id>/            - Delete mapping
    POST   /api/feature-mappings/<id>/validate/   - Validate mapping
    
    POST   /api/training-jobs/                    - Start training
    GET    /api/training-jobs/                    - List training jobs
    GET    /api/training-jobs/<id>/               - Get training job
    GET    /api/training-jobs/<id>/metrics/       - Get metrics
    DELETE /api/training-jobs/<id>/               - Cancel training
    
    POST   /api/predictions/predict-batch/        - Batch predictions
    GET    /api/predictions/high-risk/            - Get high-risk customers
    GET    /api/predictions/export/               - Export predictions
    
    GET    /api/analytics/summary/                - Overall summary
    GET    /api/analytics/feature-importance/     - Feature importance
    GET    /api/analytics/model-comparison/       - Compare models
"""

import os
import pandas as pd
from pathlib import Path
from datetime import datetime
import csv

from rest_framework import viewsets, status, permissions, generics
from rest_framework.decorators import action, permission_classes
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from django.http import HttpResponse
from django.conf import settings
from django.db.models import Q

from .models import Dataset, FeatureMapping, ModelConfig, TrainingJob, Prediction
from .serializers import (
    DatasetSerializer, FeatureMappingSerializer, ModelConfigSerializer,
    TrainingJobSerializer, PredictionSerializer,
    DatasetValidationSerializer, FeatureMappingValidationSerializer,
    TrainingJobCreateSerializer, HighRiskCustomersSerializer
)
from .ml.data_validator import DataValidator
from .ml.predictor import PredictionService
from .tasks import train_model_async, predict_batch_async


class IsOwner(permissions.BasePermission):
    """Custom permission to check if user is the owner of an object"""
    def has_object_permission(self, request, view, obj):
        if hasattr(obj, 'user'):
            return obj.user == request.user
        if hasattr(obj, 'dataset'):
            return obj.dataset.user == request.user
        return False


# ============================================
# DATASET VIEWS
# ============================================

class DatasetViewSet(viewsets.ModelViewSet):
    """ViewSet for managing datasets"""
    serializer_class = DatasetSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = (MultiPartParser, FormParser)
    
    def get_queryset(self):
        """Return only user's datasets"""
        return Dataset.objects.filter(user=self.request.user).order_by('-upload_date')
    
    def perform_create(self, serializer):
        """Create dataset and save file"""
        file = self.request.FILES.get('file')
        name = self.request.data.get('name', file.name)
        
        if not file:
            raise ValueError('No file provided')
        
        # Validate file type
        allowed_extensions = ['.csv', '.xlsx', '.xls']
        file_ext = os.path.splitext(file.name)[1].lower()
        if file_ext not in allowed_extensions:
            raise ValueError(f'File type {file_ext} not allowed. Use CSV or Excel.')
        
        # Validate file size (50MB max)
        if file.size > 52428800:
            raise ValueError('File size exceeds 50MB limit')
        
        # Load and validate file
        df, error = DataValidator.load_file(file)
        if error:
            raise ValueError(error)
        
        # Save file to disk
        settings.UPLOADS_DIR.mkdir(exist_ok=True)
        filepath = settings.UPLOADS_DIR / f'{datetime.now().timestamp()}_{file.name}'
        with open(filepath, 'wb') as f:
            for chunk in file.chunks():
                f.write(chunk)
        
        # Create dataset object
        serializer.save(
            user=self.request.user,
            file_path=str(filepath),
            original_filename=file.name,
            rows_count=len(df),
            columns_count=len(df.columns),
            columns_list=list(df.columns)
        )
    
    @action(detail=True, methods=['get'])
    def preview(self, request, pk=None):
        """Preview first 10 rows of dataset"""
        dataset = self.get_object()
        self.check_object_permissions(request, dataset)
        
        df, error = DataValidator.load_file(dataset.file_path)
        if error:
            return Response({'error': error}, status=status.HTTP_400_BAD_REQUEST)
        
        # Get first 10 rows
        preview_df = df.head(10)
        
        return Response({
            'columns': list(df.columns),
            'data': preview_df.values.tolist(),
            'rows_count': len(df),
            'sample_rows': min(10, len(df))
        })
    
    @action(detail=True, methods=['post'])
    def validate(self, request, pk=None):
        """Validate data quality and completeness"""
        dataset = self.get_object()
        self.check_object_permissions(request, dataset)
        
        df, error = DataValidator.load_file(dataset.file_path)
        if error:
            return Response({'error': error}, status=status.HTTP_400_BAD_REQUEST)
        
        # Get target column from request
        target_column = request.data.get('target_column')
        
        # Validate data
        validator = DataValidator(df)
        quality_report = validator.generate_quality_report(target_column)
        
        # Update dataset quality score
        dataset.quality_score = quality_report['quality_score']
        dataset.save()
        
        return Response(quality_report)


# ============================================
# FEATURE MAPPING VIEWS
# ============================================

class FeatureMappingViewSet(viewsets.ModelViewSet):
    """ViewSet for managing feature mappings"""
    serializer_class = FeatureMappingSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwner]
    
    def get_queryset(self):
        """Return only mappings for user's datasets"""
        return FeatureMapping.objects.filter(
            dataset__user=self.request.user
        ).order_by('-created_date')
    
    @action(detail=True, methods=['post'])
    def validate(self, request, pk=None):
        """Validate feature mapping completeness"""
        mapping = self.get_object()
        self.check_object_permissions(request, mapping)
        
        errors = []
        
        if not mapping.customer_id_column:
            errors.append('customer_id_column is required')
        if not mapping.target_column:
            errors.append('target_column is required')
        if not mapping.feature_columns or len(mapping.feature_columns) == 0:
            errors.append('At least one feature_column is required')
        
        if errors:
            return Response({
                'is_valid': False,
                'message': 'Mapping is incomplete',
                'missing_config': errors
            }, status=status.HTTP_400_BAD_REQUEST)
        
        return Response({
            'is_valid': True,
            'message': 'Mapping is valid and ready for training'
        })


# ============================================
# MODEL CONFIG VIEWS
# ============================================

class ModelConfigViewSet(viewsets.ModelViewSet):
    """ViewSet for managing model configurations"""
    serializer_class = ModelConfigSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwner]
    
    def get_queryset(self):
        """Return only user's model configs"""
        return ModelConfig.objects.filter(user=self.request.user).order_by('-created_date')
    
    def perform_create(self, serializer):
        """Create model config"""
        serializer.save(user=self.request.user)


# ============================================
# TRAINING JOB VIEWS
# ============================================

class TrainingJobViewSet(viewsets.ModelViewSet):
    """ViewSet for managing training jobs"""
    serializer_class = TrainingJobSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwner]
    
    def get_queryset(self):
        """Return only user's training jobs"""
        return TrainingJob.objects.filter(
            dataset__user=self.request.user
        ).order_by('-started_at')
    
    def create(self, request, *args, **kwargs):
        """Start a new training job"""
        serializer = TrainingJobCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        dataset_id = serializer.validated_data['dataset_id']
        feature_mapping_id = serializer.validated_data['feature_mapping_id']
        model_config_id = serializer.validated_data['model_config_id']
        
        # Validate ownership
        try:
            dataset = Dataset.objects.get(id=dataset_id, user=request.user)
            feature_mapping = FeatureMapping.objects.get(id=feature_mapping_id, dataset=dataset)
            model_config = ModelConfig.objects.get(id=model_config_id, user=request.user)
        except (Dataset.DoesNotExist, FeatureMapping.DoesNotExist, ModelConfig.DoesNotExist):
            return Response(
                {'error': 'Invalid dataset, feature_mapping, or model_config'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Create training job
        training_job = TrainingJob.objects.create(
            dataset=dataset,
            feature_mapping=feature_mapping,
            model_config=model_config,
            status='pending'
        )
        
        # Launch async training task
        task = train_model_async.delay(training_job.id)
        training_job.celery_task_id = task.id
        training_job.save()
        
        serializer = TrainingJobSerializer(training_job)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
    @action(detail=True, methods=['get'])
    def metrics(self, request, pk=None):
        """Get detailed metrics from completed training job"""
        training_job = self.get_object()
        self.check_object_permissions(request, training_job)
        
        if training_job.status != 'completed':
            return Response(
                {'error': 'Metrics only available for completed training jobs'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        return Response({
            'job_id': training_job.id,
            'status': training_job.status,
            'accuracy': training_job.accuracy,
            'precision': training_job.precision,
            'recall': training_job.recall,
            'f1_score': training_job.f1_score,
            'confusion_matrix': training_job.confusion_matrix,
            'feature_importance': training_job.feature_importance,
            'completed_at': training_job.completed_at
        })
    
    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        """Cancel a running training job"""
        training_job = self.get_object()
        self.check_object_permissions(request, training_job)
        
        if training_job.status == 'completed' or training_job.status == 'failed':
            return Response(
                {'error': f'Cannot cancel {training_job.status} job'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        training_job.status = 'cancelled'
        training_job.save()
        
        # TODO: Revoke celery task if running
        
        return Response({'status': 'Job cancelled'})


# ============================================
# PREDICTION VIEWS
# ============================================

class PredictionViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for viewing predictions"""
    serializer_class = PredictionSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwner]
    
    def get_queryset(self):
        """Return only user's predictions"""
        return Prediction.objects.filter(
            training_job__dataset__user=self.request.user
        ).order_by('-churn_probability')
    
    @action(detail=False, methods=['post'])
    def predict_batch(self, request):
        """Make batch predictions using trained model"""
        training_job_id = request.data.get('training_job_id')
        dataset_id = request.data.get('dataset_id')
        
        if not training_job_id:
            return Response(
                {'error': 'training_job_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validate ownership
        try:
            training_job = TrainingJob.objects.get(
                id=training_job_id,
                dataset__user=request.user
            )
        except TrainingJob.DoesNotExist:
            return Response(
                {'error': 'Training job not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        if training_job.status != 'completed':
            return Response(
                {'error': 'Training job must be completed before predictions'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Launch async prediction task
        task = predict_batch_async.delay(training_job_id, dataset_id)
        
        return Response({
            'status': 'Batch prediction started',
            'task_id': task.id,
            'training_job_id': training_job_id
        }, status=status.HTTP_202_ACCEPTED)
    
    @action(detail=False, methods=['get'])
    def high_risk(self, request):
        """Get high-risk customers (>80% churn probability)"""
        training_job_id = request.query_params.get('training_job_id')
        threshold = float(request.query_params.get('threshold', 0.8))
        
        if not training_job_id:
            return Response(
                {'error': 'training_job_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            training_job = TrainingJob.objects.get(
                id=training_job_id,
                dataset__user=request.user
            )
        except TrainingJob.DoesNotExist:
            return Response(
                {'error': 'Training job not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Get high-risk predictions
        high_risk = Prediction.objects.filter(
            training_job=training_job,
            churn_probability__gte=threshold
        ).order_by('-churn_probability')
        
        serializer = PredictionSerializer(high_risk, many=True)
        return Response({
            'threshold': threshold,
            'count': high_risk.count(),
            'customers': serializer.data
        })
    
    @action(detail=False, methods=['get'])
    def export(self, request):
        """Export predictions to CSV"""
        training_job_id = request.query_params.get('training_job_id')
        
        if not training_job_id:
            return Response(
                {'error': 'training_job_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            training_job = TrainingJob.objects.get(
                id=training_job_id,
                dataset__user=request.user
            )
        except TrainingJob.DoesNotExist:
            return Response(
                {'error': 'Training job not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Get all predictions
        predictions = Prediction.objects.filter(training_job=training_job)
        
        # Create CSV response
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = f'attachment; filename="predictions_{training_job_id}.csv"'
        
        writer = csv.writer(response)
        writer.writerow([
            'Customer ID', 'Churn Probability', 'Predicted Churn', 'High Risk'
        ])
        
        for pred in predictions:
            writer.writerow([
                pred.customer_id,
                f'{pred.churn_probability:.4f}',
                'Yes' if pred.predicted_class == 1 else 'No',
                'Yes' if pred.is_high_risk else 'No'
            ])
        
        return response


# ============================================
# ANALYTICS VIEWS
# ============================================

class AnalyticsViewSet(viewsets.ViewSet):
    """ViewSet for analytics and insights"""
    permission_classes = [permissions.IsAuthenticated]
    
    @action(detail=False, methods=['get'])
    def summary(self, request):
        """Get overall platform summary"""
        user_datasets = Dataset.objects.filter(user=request.user).count()
        user_training_jobs = TrainingJob.objects.filter(dataset__user=request.user).count()
        completed_jobs = TrainingJob.objects.filter(
            dataset__user=request.user,
            status='completed'
        ).count()
        
        # Get latest completed job
        latest_job = TrainingJob.objects.filter(
            dataset__user=request.user,
            status='completed'
        ).order_by('-completed_at').first()
        
        summary_data = {
            'total_datasets': user_datasets,
            'total_training_jobs': user_training_jobs,
            'completed_jobs': completed_jobs,
            'latest_accuracy': latest_job.accuracy if latest_job else None,
            'latest_model_type': latest_job.model_config.get_model_type_display() if latest_job else None,
        }
        
        return Response(summary_data)
    
    @action(detail=False, methods=['get'])
    def feature_importance(self, request):
        """Get feature importance from latest trained model"""
        training_job_id = request.query_params.get('training_job_id')
        
        if not training_job_id:
            return Response(
                {'error': 'training_job_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            training_job = TrainingJob.objects.get(
                id=training_job_id,
                dataset__user=request.user
            )
        except TrainingJob.DoesNotExist:
            return Response(
                {'error': 'Training job not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        if not training_job.feature_importance:
            return Response(
                {'error': 'Feature importance not available for this job'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get top 10 features
        features_sorted = sorted(
            training_job.feature_importance.items(),
            key=lambda x: x[1],
            reverse=True
        )[:10]
        
        return Response({
            'top_features': dict(features_sorted)
        })
    
    @action(detail=False, methods=['get'])
    def model_comparison(self, request):
        """Compare performance of different models on same dataset"""
        dataset_id = request.query_params.get('dataset_id')
        
        if not dataset_id:
            return Response(
                {'error': 'dataset_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            dataset = Dataset.objects.get(id=dataset_id, user=request.user)
        except Dataset.DoesNotExist:
            return Response(
                {'error': 'Dataset not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Get all completed training jobs for this dataset
        training_jobs = TrainingJob.objects.filter(
            dataset=dataset,
            status='completed'
        ).order_by('-completed_at')
        
        comparison_data = []
        for job in training_jobs:
            comparison_data.append({
                'job_id': job.id,
                'model_type': job.model_config.get_model_type_display(),
                'accuracy': job.accuracy,
                'precision': job.precision,
                'recall': job.recall,
                'f1_score': job.f1_score,
                'trained_at': job.completed_at
            })
        
        return Response(comparison_data)


class PredictionListView(generics.ListAPIView):
    """GET /api/predictions/ — paginated list of all predictions."""
    queryset = Prediction.objects.all()
    serializer_class = PredictionSerializer
