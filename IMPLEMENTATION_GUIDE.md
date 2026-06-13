# MLOps Churn Prediction Platform - Implementation Guide

## ✅ Phase 1 & Phase 3 Complete!

This document outlines what has been implemented and how to run the platform.

---

## 📦 What's Been Implemented

### **1. Dependencies** ✓
- Added Celery 5.3.4 for async task processing
- Added Redis 5.0.1 for message broker
- Added XGBoost 2.0.3 and LightGBM 4.1.0 for advanced models
- Updated requirements.txt with all necessary packages

### **2. Celery & Redis Configuration** ✓
- Created `backend/config/celery.py` for Celery initialization
- Updated `backend/config/settings.py` with:
  - Celery broker and result backend configuration
  - Redis cache configuration
  - File upload settings (50MB max)
  - ML model configuration defaults
- Celery auto-discovers tasks from all apps

### **3. Django Models** ✓
Five new models created in `backend/predictions/models.py`:

#### **Dataset Model**
- Stores uploaded CSV/Excel file metadata
- Tracks rows, columns, quality score
- Stores file path and upload timestamp

#### **FeatureMapping Model**
- Maps user's CSV columns to standardized fields
- Tracks customer_id, target, features
- Separates categorical vs numerical columns
- Configurable missing value strategies

#### **ModelConfig Model**
- Stores ML model selection (RF, LR, XGBoost, LightGBM)
- Saves hyperparameters as JSON
- Supports custom configuration per user

#### **TrainingJob Model**
- Tracks model training progress
- Stores Celery task ID for async monitoring
- Saves metrics: accuracy, precision, recall, F1, confusion matrix
- Stores file paths to saved model and preprocessor
- Tracks status: pending → running → completed/failed

#### **Prediction Model**
- Stores batch predictions from trained models
- Records customer ID, churn probability, predicted class
- Flags high-risk customers (>80% probability)
- Indexed for fast querying

### **4. ML Pipeline Modules** ✓

#### **data_validator.py**
```python
class DataValidator:
  - validate_file_format()        # Check CSV/Excel format
  - check_missing_values()        # Identify NaN columns
  - detect_data_types()           # Infer numeric/categorical
  - validate_target_column()      # Ensure binary classification
  - check_class_imbalance()       # Check data distribution
  - generate_quality_report()     # Overall quality score (0-100)
  - load_file()                   # Safe file loading
```

#### **preprocessor.py**
```python
class DataPreprocessor:
  - handle_missing_data()         # drop/mean/median/mode strategies
  - encode_target()               # Binary target encoding
  - create_preprocessing_pipeline() # OneHotEncoder + StandardScaler
  - fit_transform()               # Fit on training data
  - transform()                   # Transform new data
  - get_feature_names()           # Processed feature names
  - save() / load()               # Persist preprocessor
```

#### **trainer.py**
```python
class ModelTrainer:
  Supports: RandomForest, LogisticRegression, XGBoost, LightGBM
  - train()                       # Fit model
  - evaluate()                    # Get metrics on test set
  - get_feature_importance()      # Feature importance ranking
  - predict() / predict_proba()   # Make predictions
  - save() / load()               # Persist trained model

class TrainingPipeline:
  - run()                         # End-to-end training: prep→train→evaluate
```

#### **predictor.py**
```python
class PredictionService:
  - load_from_files()             # Load model + preprocessor
  - predict_single()              # Single customer prediction
  - predict_batch()               # Batch predictions
  - predict_batch_dataframe()     # Return as DataFrame
  - identify_high_risk_customers()# Filter by threshold
  - get_prediction_summary()      # Summary statistics
  - export_predictions_csv()      # Export to CSV
```

### **5. Celery Async Tasks** ✓

#### **train_model_async**
```python
@shared_task
def train_model_async(training_job_id):
    # 10% Load dataset
    # 20% Validate data
    # 30% Preprocess
    # 40% Initialize model
    # 50% Train model
    # 80% Save artifacts
    # 90% Finalize
    # 100% Done!
```

Handles:
- Progress tracking (0-100%)
- Error handling and logging
- Model and preprocessor persistence
- Database updates with metrics

#### **predict_batch_async**
- Load trained model
- Load prediction data
- Generate predictions
- Bulk insert to database

#### **cleanup_old_models**
- Scheduled daily at 2 AM
- Deletes models older than 30 days
- Removes associated prediction files

#### **archive_old_predictions**
- Scheduled daily at 3 AM
- Archives predictions older than 60 days

### **6. API Endpoints** ✓

#### **Dataset Management**
```
POST   /api/datasets/upload/            Upload CSV file
GET    /api/datasets/                   List user's datasets
GET    /api/datasets/<id>/              Get dataset details
GET    /api/datasets/<id>/preview/      Preview first 10 rows
POST   /api/datasets/<id>/validate/     Validate data quality
DELETE /api/datasets/<id>/              Delete dataset
```

#### **Feature Mapping**
```
POST   /api/feature-mappings/           Create mapping
GET    /api/feature-mappings/           List mappings
PUT    /api/feature-mappings/<id>/      Update mapping
DELETE /api/feature-mappings/<id>/      Delete mapping
POST   /api/feature-mappings/<id>/validate/  Validate completeness
```

#### **Model Configuration**
```
POST   /api/model-configs/              Create configuration
GET    /api/model-configs/              List configurations
PUT    /api/model-configs/<id>/         Update configuration
DELETE /api/model-configs/<id>/         Delete configuration
```

#### **Training Jobs**
```
POST   /api/training-jobs/              Start training
GET    /api/training-jobs/              List training jobs
GET    /api/training-jobs/<id>/         Get job details & status
GET    /api/training-jobs/<id>/metrics/ Get metrics & importance
POST   /api/training-jobs/<id>/cancel/  Cancel running job
```

#### **Predictions**
```
POST   /api/predictions/predict-batch/  Start batch prediction
GET    /api/predictions/                List all predictions
GET    /api/predictions/high-risk/      Get high-risk customers (>80%)
GET    /api/predictions/export/         Export to CSV
```

#### **Analytics & Insights**
```
GET    /api/analytics/summary/          Overall platform summary
GET    /api/analytics/feature-importance/  Top features driving churn
GET    /api/analytics/model-comparison/    Compare model performance
```

### **7. Serializers** ✓
- DatasetSerializer
- FeatureMappingSerializer
- ModelConfigSerializer
- TrainingJobSerializer
- PredictionSerializer
- Input/Output serializers for validation & display

---

## 🚀 How to Setup & Run

### **Step 1: Install Dependencies**
```bash
cd backend
pip install -r requirements.txt
```

### **Step 2: Install & Start Redis**

**Windows (PowerShell):**
```powershell
# Install via Chocolatey
choco install redis-64

# Start Redis
redis-server
```

**Or using Docker:**
```bash
docker run -d -p 6379:6379 redis:latest
```

### **Step 3: Create & Apply Migrations**
```bash
cd backend
python manage.py makemigrations predictions
python manage.py migrate
```

This will create:
- `Dataset` table
- `FeatureMapping` table
- `ModelConfig` table
- `TrainingJob` table
- `Prediction` table

### **Step 4: Create Superuser (for admin panel)**
```bash
python manage.py createsuperuser
```

### **Step 5: Start Django Development Server**
```bash
python manage.py runserver
```

Server runs at: http://localhost:8000

### **Step 6: Start Celery Worker** (in separate terminal)
```bash
cd backend
celery -A config worker -l info
```

### **Step 7: Start Celery Beat** (scheduler, separate terminal)
```bash
cd backend
celery -A config beat -l info
```

Now your platform is running! ✅

---

## 📊 Workflow: How to Use the Platform

### **User Journey:**

```
1. User Uploads Data (CSV)
   ↓
2. System Validates Data Quality
   ↓
3. User Maps Columns to Features
   ↓
4. User Selects ML Model (RF, LR, XGBoost, etc.)
   ↓
5. User Clicks "Train" 
   ↓
6. Celery Task Starts Training in Background
   ↓
7. User Sees Progress (Real-time Updates)
   ↓
8. Model Training Complete! Metrics Displayed
   ↓
9. User Uses Trained Model for Predictions
   ↓
10. System Generates Batch Predictions
    ↓
11. High-Risk Customers Identified (>80% churn prob)
    ↓
12. Results Exported to CSV for Marketing Team
```

---

## 🔧 Example API Calls

### **1. Upload Dataset**
```bash
curl -X POST http://localhost:8000/api/datasets/upload/ \
  -H "Authorization: Bearer <token>" \
  -F "file=@customers.csv" \
  -F "name=Q1 Customer Data"
```

### **2. Create Feature Mapping**
```bash
curl -X POST http://localhost:8000/api/feature-mappings/ \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "dataset": 1,
    "customer_id_column": "customer_id",
    "target_column": "churned",
    "feature_columns": ["age", "tenure", "monthly_charges"],
    "categorical_columns": ["contract_type", "payment_method"],
    "numerical_columns": ["age", "tenure", "monthly_charges"]
  }'
```

### **3. Create Model Configuration**
```bash
curl -X POST http://localhost:8000/api/model-configs/ \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "RF - Q1 2024",
    "model_type": "rf",
    "hyperparameters": {
      "n_estimators": 100,
      "max_depth": 15
    }
  }'
```

### **4. Start Training**
```bash
curl -X POST http://localhost:8000/api/training-jobs/ \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "dataset_id": 1,
    "feature_mapping_id": 1,
    "model_config_id": 1
  }'
```

Response:
```json
{
  "id": 1,
  "status": "pending",
  "progress": 0,
  "celery_task_id": "abc-123-def-456"
}
```

### **5. Check Training Progress**
```bash
curl -X GET http://localhost:8000/api/training-jobs/1/ \
  -H "Authorization: Bearer <token>"
```

### **6. Get Training Metrics**
```bash
curl -X GET http://localhost:8000/api/training-jobs/1/metrics/ \
  -H "Authorization: Bearer <token>"
```

Response:
```json
{
  "job_id": 1,
  "status": "completed",
  "accuracy": 0.85,
  "precision": 0.82,
  "recall": 0.88,
  "f1_score": 0.85,
  "confusion_matrix": [[950, 50], [100, 900]],
  "feature_importance": {
    "tenure": 0.35,
    "monthly_charges": 0.28,
    "contract_type": 0.22
  }
}
```

### **7. Run Batch Predictions**
```bash
curl -X POST http://localhost:8000/api/predictions/predict-batch/ \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "training_job_id": 1,
    "dataset_id": 2
  }'
```

### **8. Get High-Risk Customers**
```bash
curl -X GET "http://localhost:8000/api/predictions/high-risk/?training_job_id=1&threshold=0.8" \
  -H "Authorization: Bearer <token>"
```

### **9. Export Predictions to CSV**
```bash
curl -X GET "http://localhost:8000/api/predictions/export/?training_job_id=1" \
  -H "Authorization: Bearer <token>" \
  > predictions.csv
```

---

## 📁 Project Structure After Implementation

```
backend/
├── config/
│   ├── __init__.py
│   ├── celery.py              ✅ NEW - Celery config
│   ├── settings.py            ✅ UPDATED - Added Celery & Redis
│   ├── urls.py
│   └── wsgi.py
├── predictions/
│   ├── models.py              ✅ UPDATED - New models
│   ├── views.py               ✅ UPDATED - New ViewSets
│   ├── serializers.py         ✅ UPDATED - New serializers
│   ├── urls.py                ✅ UPDATED - New routers
│   ├── tasks.py               ✅ NEW - Async tasks
│   ├── ml/
│   │   ├── __init__.py
│   │   ├── data_validator.py  ✅ NEW - Data validation
│   │   ├── preprocessor.py    ✅ NEW - Feature preprocessing
│   │   ├── trainer.py         ✅ NEW - Model training
│   │   └── predictor.py       ✅ UPDATED - Prediction service
│   └── migrations/
│       └── 0002_new_models.py ✅ NEW - Database schema
├── requirements.txt           ✅ UPDATED - New dependencies
├── manage.py
└── db.sqlite3
```

---

## 🧪 Testing the Implementation

### **Quick Test Script**
```python
# backend/test_pipeline.py
import os
import django
import pandas as pd

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from predictions.ml.data_validator import DataValidator
from predictions.ml.preprocessor import DataPreprocessor
from predictions.ml.trainer import ModelTrainer, TrainingPipeline

# Load sample data
df = pd.read_csv('sample_data.csv')

# Validate
validator = DataValidator(df)
report = validator.generate_quality_report('target_column')
print(f"Quality Score: {report['quality_score']}/100")

# Configure preprocessing
config = {
    'target_column': 'target_column',
    'feature_columns': ['feature1', 'feature2', 'feature3'],
    'categorical_columns': ['feature1'],
    'numerical_columns': ['feature2', 'feature3'],
    'missing_value_strategy': 'drop'
}

# Initialize models
preprocessor = DataPreprocessor(config)
trainer = ModelTrainer('rf')  # Random Forest

# Run pipeline
pipeline = TrainingPipeline(preprocessor, trainer)
metrics = pipeline.run(df, 'target_column')

print(f"Accuracy: {metrics['accuracy']}")
print(f"Top Features: {list(metrics['feature_importance'].items())[:3]}")
```

---

## 🎯 Next Steps (Phase 2 & 4-5)

### **Phase 2: API Refinement & Validation**
- [ ] Add input validation for all endpoints
- [ ] Add error handling and meaningful error messages
- [ ] Add pagination for large result sets
- [ ] Add rate limiting for file uploads

### **Phase 4: Background Task Monitoring**
- [ ] WebSocket support for real-time progress updates
- [ ] Task status API endpoint
- [ ] Task cancellation support
- [ ] Failed task retry logic

### **Phase 5: Frontend Implementation**
- [ ] React components for upload UI
- [ ] Feature mapping UI with column selectors
- [ ] Model selection and hyperparameter tuning
- [ ] Real-time training progress visualization
- [ ] Results dashboard with charts
- [ ] CSV export functionality

---

## 🐛 Troubleshooting

### **Redis Connection Error**
```
Error: ConnectionError: Error -2 connecting to localhost:6379
Solution: Make sure Redis is running. Start with: redis-server
```

### **Celery Worker Not Found**
```
Error: No module named celery
Solution: pip install celery redis django-celery-beat
```

### **Migration Error**
```
Error: django.db.utils.OperationalError: no such table
Solution: python manage.py migrate
```

### **Model File Not Found**
```
Error: FileNotFoundError: model_*.pkl
Solution: Make sure training completed successfully. Check training job status.
```

---

## 📝 Notes

1. **SQLite is used** by default. For production, switch to PostgreSQL in settings.py
2. **File uploads** stored in `backend/uploads/` directory
3. **Models saved** to `backend/models/` directory
4. **Celery tasks** logged to console. For production, use proper logging service
5. **Redis** can be replaced with RabbitMQ or AWS SQS for production
6. **JWT authentication** used for API security. Tokens in Authorization header

---

## ✨ Key Features Implemented

✅ Dynamic data upload (CSV/Excel)
✅ Data quality validation with scoring
✅ Flexible feature mapping
✅ Support for 4 ML algorithms (RF, LR, XGBoost, LightGBM)
✅ Async model training with progress tracking
✅ Comprehensive model evaluation metrics
✅ Batch predictions on new data
✅ High-risk customer identification
✅ Feature importance analysis
✅ Model comparison framework
✅ Results export to CSV
✅ Scheduled cleanup tasks
✅ User authentication & authorization

---

**Platform Ready for Frontend Integration!** 🎉
