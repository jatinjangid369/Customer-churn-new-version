"""
Management command: train_model

Trains the Random Forest churn prediction model and updates all customer risk scores.

Usage:
    python manage.py train_model
"""

from django.core.management.base import BaseCommand
from django.conf import settings
from pathlib import Path


class Command(BaseCommand):
    help = 'Train the Random Forest churn prediction model'

    def handle(self, *args, **options):
        self.stdout.write('🤖 Starting ML model training...\n')

        from predictions.ml.predictor import train
        ml_dir = Path(settings.ML_MODEL_DIR)

        success = train(model_dir=ml_dir, verbose=True)

        if success:
            self.stdout.write(self.style.SUCCESS(
                '\n✅ Model training complete!\n'
                f'   Artifacts saved to: {ml_dir}/\n'
                '   Customers updated with risk scores.\n'
                '\nYou can now use POST /api/predict/ to get predictions.'
            ))
        else:
            self.stdout.write(self.style.ERROR(
                '❌ Training failed. Check logs above for details.'
            ))
