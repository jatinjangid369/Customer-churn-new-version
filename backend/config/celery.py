"""
Celery configuration for Customer Churn Analytics & Prediction Platform
"""

import os
from celery import Celery
from celery.schedules import crontab

# Set default Django settings module
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

app = Celery('churn_analytics')

# Load configuration from Django settings with CELERY namespace
app.config_from_object('django.conf:settings', namespace='CELERY')

# Auto-discover tasks from installed apps
app.autodiscover_tasks()

# Optional: Configure periodic tasks
app.conf.beat_schedule = {
    'cleanup-old-models': {
        'task': 'predictions.tasks.cleanup_old_models',
        'schedule': crontab(hour=2, minute=0),  # Run daily at 2 AM
    },
    'archive-old-predictions': {
        'task': 'predictions.tasks.archive_old_predictions',
        'schedule': crontab(hour=3, minute=0),  # Run daily at 3 AM
    },
}

@app.task(bind=True)
def debug_task(self):
    print(f'Request: {self.request!r}')
