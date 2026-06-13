"""
Celery asynchronous tasks for model training and batch predictions
"""

import os
import shutil
from datetime import timedelta
from celery import shared_task
from django.utils import timezone
from django.conf import settings
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
import pandas as pd

from .models import Dataset, TrainingJob, FeatureMapping, ModelConfig, Prediction
from .ml.data_validator import DataValidator
from .ml.preprocessor import DataPreprocessor
from .ml.trainer import ModelTrainer, TrainingPipeline
from .ml.predictor import PredictionService


@shared_task(bind=True)
def train_model_async(self, training_job_id: int):
    """
    Asynchronous model training task
    
    Flow:
    1. Load training job and dataset
    2. Validate data
    3. Apply feature mapping
    4. Preprocess data
    5. Train model
    6. Evaluate metrics
    7. Save model and preprocessor
    8. Update training job status
    
    Args:
        training_job_id: ID of TrainingJob to train
    """
    try:
        # Load training job
        training_job = TrainingJob.objects.get(id=training_job_id)
        training_job.status = 'running'
        training_job.celery_task_id = self.request.id
        training_job.save()
        
        # Update progress
        self.update_state(state='PROGRESS', meta={'current': 10, 'total': 100, 'status': 'Loading data...'})
        
        # Load dataset
        dataset = training_job.dataset
        df, error = DataValidator.load_file(dataset.file_path)
        if error:
            raise Exception(f'Failed to load dataset: {error}')
        
        # Validate data
        self.update_state(state='PROGRESS', meta={'current': 20, 'total': 100, 'status': 'Validating data...'})
        validator = DataValidator(df)
        quality_report = validator.generate_quality_report(
            target_column=training_job.feature_mapping.target_column
        )
        dataset.quality_score = quality_report.get('quality_score', 0)
        dataset.save()
        
        # Prepare preprocessing config
        self.update_state(state='PROGRESS', meta={'current': 30, 'total': 100, 'status': 'Preprocessing data...'})
        feature_mapping = training_job.feature_mapping
        preprocessing_config = {
            'target_column': feature_mapping.target_column,
            'feature_columns': feature_mapping.feature_columns,
            'categorical_columns': feature_mapping.categorical_columns,
            'numerical_columns': feature_mapping.numerical_columns,
            'missing_value_strategy': feature_mapping.missing_value_strategy,
            'customer_id_column': feature_mapping.customer_id_column,
        }
        
        # Initialize preprocessor
        preprocessor = DataPreprocessor(preprocessing_config)
        
        # Initialize model
        self.update_state(state='PROGRESS', meta={'current': 40, 'total': 100, 'status': 'Initializing model...'})
        model_config = training_job.model_config
        model_trainer = ModelTrainer(
            model_type=model_config.model_type,
            hyperparameters=model_config.hyperparameters
        )
        
        # Run training pipeline
        self.update_state(state='PROGRESS', meta={'current': 50, 'total': 100, 'status': 'Training model...'})
        pipeline = TrainingPipeline(
            preprocessor=preprocessor,
            model_trainer=model_trainer,
            test_size=0.2,
            random_state=42
        )
        metrics = pipeline.run(df, feature_mapping.target_column)
        
        # Save model and preprocessor
        self.update_state(state='PROGRESS', meta={'current': 80, 'total': 100, 'status': 'Saving model artifacts...'})
        
        # Create models directory if doesn't exist
        settings.MODELS_DIR.mkdir(exist_ok=True)
        
        # Save model
        model_filepath = settings.MODELS_DIR / f'model_{training_job_id}.pkl'
        model_trainer.save(str(model_filepath))
        
        # Save preprocessor
        preprocessor_filepath = settings.MODELS_DIR / f'preprocessor_{training_job_id}.pkl'
        preprocessor.save(str(preprocessor_filepath))
        
        # Update training job with results
        self.update_state(state='PROGRESS', meta={'current': 90, 'total': 100, 'status': 'Finalizing...'})
        
        training_job.status = 'completed'
        training_job.completed_at = timezone.now()
        training_job.model_file_path = str(model_filepath)
        training_job.preprocessor_file_path = str(preprocessor_filepath)
        training_job.accuracy = metrics.get('accuracy', 0)
        training_job.precision = metrics.get('precision', 0)
        training_job.recall = metrics.get('recall', 0)
        training_job.f1_score = metrics.get('f1_score', 0)
        training_job.confusion_matrix = metrics.get('confusion_matrix')
        training_job.feature_importance = metrics.get('feature_importance', {})
        training_job.progress = 100
        training_job.save()
        
        self.update_state(
            state='SUCCESS',
            meta={
                'current': 100,
                'total': 100,
                'status': 'Training complete!',
                'metrics': {
                    'accuracy': training_job.accuracy,
                    'precision': training_job.precision,
                    'recall': training_job.recall,
                    'f1_score': training_job.f1_score,
                }
            }
        )
        
        return {
            'status': 'success',
            'training_job_id': training_job_id,
            'accuracy': training_job.accuracy
        }
    
    except Exception as e:
        training_job = TrainingJob.objects.get(id=training_job_id)
        training_job.status = 'failed'
        training_job.error_message = str(e)
        training_job.completed_at = timezone.now()
        training_job.save()
        
        self.update_state(
            state='FAILURE',
            meta={
                'status': 'Training failed',
                'error': str(e)
            }
        )
        
        raise


@shared_task(bind=True)
def predict_batch_async(self, training_job_id: int, dataset_id: int = None):
    """
    Asynchronous batch prediction task
    
    Flow:
    1. Load trained model and preprocessor
    2. Load prediction data
    3. Generate predictions
    4. Save predictions to database
    
    Args:
        training_job_id: ID of completed TrainingJob
        dataset_id: ID of Dataset for predictions (uses same dataset if None)
    """
    try:
        # Load training job
        training_job = TrainingJob.objects.get(id=training_job_id)
        if training_job.status != 'completed':
            raise Exception('Training job must be completed before predictions')
        
        # Load model and preprocessor
        self.update_state(state='PROGRESS', meta={'current': 10, 'total': 100, 'status': 'Loading model...'})
        prediction_service = PredictionService.load_from_files(
            training_job.model_file_path,
            training_job.preprocessor_file_path
        )
        
        # Load data for predictions
        self.update_state(state='PROGRESS', meta={'current': 20, 'total': 100, 'status': 'Loading data...'})
        prediction_dataset = training_job.dataset if dataset_id is None else Dataset.objects.get(id=dataset_id)
        df, error = DataValidator.load_file(prediction_dataset.file_path)
        if error:
            raise Exception(f'Failed to load prediction data: {error}')
        
        # Make predictions
        self.update_state(state='PROGRESS', meta={'current': 50, 'total': 100, 'status': 'Running predictions...'})
        customer_id_col = training_job.feature_mapping.customer_id_column
        predictions_list = prediction_service.predict_batch(df, customer_id_col)
        
        # Save predictions to database
        self.update_state(state='PROGRESS', meta={'current': 80, 'total': 100, 'status': 'Saving predictions...'})
        
        # Clear old predictions if rerunning
        Prediction.objects.filter(training_job=training_job).delete()
        
        # Bulk create predictions
        predictions_objs = []
        for pred in predictions_list:
            predictions_objs.append(
                Prediction(
                    training_job=training_job,
                    customer_id=pred['customer_id'],
                    churn_probability=pred['churn_probability'],
                    predicted_class=pred['predicted_class'],
                    is_high_risk=pred['is_high_risk']
                )
            )
        
        Prediction.objects.bulk_create(predictions_objs, batch_size=1000)
        
        self.update_state(
            state='SUCCESS',
            meta={
                'current': 100,
                'total': 100,
                'status': 'Predictions complete!',
                'total_predictions': len(predictions_objs)
            }
        )
        
        return {
            'status': 'success',
            'training_job_id': training_job_id,
            'total_predictions': len(predictions_objs)
        }
    
    except Exception as e:
        self.update_state(
            state='FAILURE',
            meta={
                'status': 'Prediction failed',
                'error': str(e)
            }
        )
        raise


@shared_task
def cleanup_old_models():
    """
    Scheduled task to delete old trained models (older than 30 days)
    Runs daily at 2 AM (configured in celery.py)
    """
    try:
        cutoff_time = timezone.now() - timedelta(days=30)
        old_jobs = TrainingJob.objects.filter(
            completed_at__lt=cutoff_time,
            status='completed'
        )
        
        for job in old_jobs:
            # Delete model files
            if job.model_file_path and os.path.exists(job.model_file_path):
                os.remove(job.model_file_path)
            
            if job.preprocessor_file_path and os.path.exists(job.preprocessor_file_path):
                os.remove(job.preprocessor_file_path)
            
            # Delete predictions from database
            Prediction.objects.filter(training_job=job).delete()
        
        deleted_count = old_jobs.count()
        return f'Cleaned up {deleted_count} old models'
    
    except Exception as e:
        return f'Cleanup failed: {str(e)}'


@shared_task
def archive_old_predictions():
    """
    Scheduled task to archive old predictions (older than 60 days)
    Runs daily at 3 AM (configured in celery.py)
    """
    try:
        cutoff_time = timezone.now() - timedelta(days=60)
        old_predictions = Prediction.objects.filter(created_date__lt=cutoff_time)
        
        # Here you could export to CSV or archive to cloud storage
        # For now, just delete
        deleted_count = old_predictions.count()
        old_predictions.delete()
        
        return f'Archived {deleted_count} old predictions'
    
    except Exception as e:
        return f'Archive failed: {str(e)}'
