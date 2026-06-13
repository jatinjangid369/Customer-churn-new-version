# API Reference - MLOps Churn Prediction Platform

Quick reference for all API endpoints organized by resource.

## Authentication
All endpoints require JWT token in header:
```
Authorization: Bearer <your_jwt_token>
```

Get token at: `POST /api/token/` (from django-rest-framework-simplejwt)

---

## 📁 DATASETS

### List User's Datasets
```
GET /api/datasets/
Response: [
  {
    "id": 1,
    "name": "Q1 Customer Data",
    "original_filename": "customers.csv",
    "rows_count": 5000,
    "columns_count": 15,
    "upload_date": "2024-01-15T10:30:00Z",
    "quality_score": 87.5
  }
]
```

### Upload Dataset
```
POST /api/datasets/upload/
Content-Type: multipart/form-data

Form Data:
  - file: <CSV or Excel file>
  - name: "Dataset Name"

Response: {Dataset object}
```

### Get Dataset Details
```
GET /api/datasets/{id}/
Response: {Dataset object with all fields}
```

### Preview Dataset (First 10 Rows)
```
GET /api/datasets/{id}/preview/
Response: {
  "columns": ["customer_id", "age", "tenure", ...],
  "data": [[1, 35, 12, ...], [2, 42, 24, ...], ...],
  "rows_count": 5000,
  "sample_rows": 10
}
```

### Validate Dataset Quality
```
POST /api/datasets/{id}/validate/
Body: {
  "target_column": "churned"
}

Response: {
  "format_valid": true,
  "total_rows": 5000,
  "total_columns": 15,
  "missing_values": {"age": 0.5, "tenure": 1.2},
  "data_types": {"age": "numeric", "contract": "categorical"},
  "quality_score": 87.5,
  "class_distribution": {"0": 75.5, "1": 24.5},
  "target_valid": true,
  "target_message": "Target column is valid"
}
```

### Delete Dataset
```
DELETE /api/datasets/{id}/
Response: Status 204 No Content
```

---

## 🗺️ FEATURE MAPPINGS

### Create Feature Mapping
```
POST /api/feature-mappings/
Body: {
  "dataset": 1,
  "customer_id_column": "customer_id",
  "target_column": "churned",
  "feature_columns": ["age", "tenure", "monthly_charges", "contract_type"],
  "categorical_columns": ["contract_type", "payment_method"],
  "numerical_columns": ["age", "tenure", "monthly_charges"],
  "missing_value_strategy": "drop"
}

Response: {Mapping object}
```

### List Feature Mappings
```
GET /api/feature-mappings/
Response: [Mapping objects...]
```

### Get Feature Mapping
```
GET /api/feature-mappings/{id}/
Response: {Mapping object}
```

### Update Feature Mapping
```
PUT /api/feature-mappings/{id}/
Body: {Updated fields}
Response: {Updated Mapping object}
```

### Validate Feature Mapping
```
POST /api/feature-mappings/{id}/validate/
Response: {
  "is_valid": true,
  "message": "Mapping is valid and ready for training"
}
```

### Delete Feature Mapping
```
DELETE /api/feature-mappings/{id}/
Response: Status 204 No Content
```

---

## 🤖 MODEL CONFIGURATIONS

### Create Model Configuration
```
POST /api/model-configs/
Body: {
  "name": "Random Forest v1",
  "model_type": "rf",  // Options: rf, lr, xgb, lgb
  "hyperparameters": {
    "n_estimators": 100,
    "max_depth": 15,
    "min_samples_split": 5
  }
}

Response: {ModelConfig object}
```

### List Model Configurations
```
GET /api/model-configs/
Response: [ModelConfig objects...]
```

### Get Model Configuration
```
GET /api/model-configs/{id}/
Response: {ModelConfig object}
```

### Update Model Configuration
```
PUT /api/model-configs/{id}/
Body: {Updated fields}
Response: {Updated ModelConfig object}
```

### Delete Model Configuration
```
DELETE /api/model-configs/{id}/
Response: Status 204 No Content
```

---

## 🏋️ TRAINING JOBS

### Start Training
```
POST /api/training-jobs/
Body: {
  "dataset_id": 1,
  "feature_mapping_id": 1,
  "model_config_id": 1
}

Response: {
  "id": 1,
  "status": "pending",  // pending → running → completed/failed
  "progress": 0,        // 0-100
  "celery_task_id": "abc-123-def-456",
  "accuracy": null,
  "precision": null,
  "recall": null,
  "f1_score": null,
  "started_at": "2024-01-15T10:30:00Z"
}
```

### List Training Jobs
```
GET /api/training-jobs/
Query Parameters:
  - status: pending, running, completed, failed, cancelled
  - dataset_id: Filter by dataset

Response: [TrainingJob objects...]
```

### Get Training Job Status
```
GET /api/training-jobs/{id}/
Response: {TrainingJob object with current progress}
```

### Get Training Metrics
```
GET /api/training-jobs/{id}/metrics/
Response: {
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
    "contract_type": 0.22,
    ...top 10 features
  },
  "completed_at": "2024-01-15T11:30:00Z"
}
```

### Cancel Training Job
```
POST /api/training-jobs/{id}/cancel/
Response: {"status": "Job cancelled"}
```

---

## 🎯 PREDICTIONS

### Start Batch Predictions
```
POST /api/predictions/predict-batch/
Body: {
  "training_job_id": 1,
  "dataset_id": 2  // optional, uses same dataset if omitted
}

Response: {
  "status": "Batch prediction started",
  "task_id": "xyz-789-uvw-123",
  "training_job_id": 1
}
```

### List All Predictions
```
GET /api/predictions/
Query Parameters:
  - training_job_id: Filter by training job
  - is_high_risk: true/false

Response: [Prediction objects...]
```

### Get High-Risk Customers
```
GET /api/predictions/high-risk/
Query Parameters:
  - training_job_id: (required)
  - threshold: 0.8 (optional, default 0.8)

Response: {
  "threshold": 0.8,
  "count": 250,
  "customers": [
    {
      "id": 100,
      "customer_id": "CUST-001",
      "churn_probability": 0.95,
      "predicted_class": 1,
      "is_high_risk": true
    },
    ...
  ]
}
```

### Export Predictions to CSV
```
GET /api/predictions/export/
Query Parameters:
  - training_job_id: (required)

Response: CSV file download
Columns: Customer ID, Churn Probability, Predicted Churn, High Risk
```

---

## 📊 ANALYTICS

### Platform Summary
```
GET /api/analytics/summary/
Response: {
  "total_datasets": 5,
  "total_training_jobs": 12,
  "completed_jobs": 10,
  "latest_accuracy": 0.87,
  "latest_model_type": "Random Forest"
}
```

### Feature Importance
```
GET /api/analytics/feature-importance/
Query Parameters:
  - training_job_id: (required)

Response: {
  "top_features": {
    "tenure": 0.35,
    "monthly_charges": 0.28,
    "contract_type": 0.22,
    "payment_method": 0.18,
    ...
  }
}
```

### Model Comparison
```
GET /api/analytics/model-comparison/
Query Parameters:
  - dataset_id: (required)

Response: [
  {
    "job_id": 1,
    "model_type": "Random Forest",
    "accuracy": 0.85,
    "precision": 0.82,
    "recall": 0.88,
    "f1_score": 0.85,
    "trained_at": "2024-01-15T11:30:00Z"
  },
  {
    "job_id": 2,
    "model_type": "XGBoost",
    "accuracy": 0.87,
    "precision": 0.84,
    "recall": 0.90,
    "f1_score": 0.87,
    "trained_at": "2024-01-15T12:00:00Z"
  }
]
```

---

## Error Responses

### 400 Bad Request
```json
{
  "error": "Invalid request data",
  "details": {...}
}
```

### 401 Unauthorized
```json
{
  "detail": "Authentication credentials were not provided."
}
```

### 403 Forbidden
```json
{
  "detail": "You do not have permission to perform this action."
}
```

### 404 Not Found
```json
{
  "detail": "Not found."
}
```

### 422 Unprocessable Entity
```json
{
  "error": "Validation failed",
  "missing_config": ["field1", "field2"]
}
```

### 500 Server Error
```json
{
  "error": "Internal server error",
  "message": "Error details..."
}
```

---

## Status Values

### Training Job Status
- `pending` - Waiting to start
- `running` - Currently training
- `completed` - Training finished successfully
- `failed` - Training failed with error
- `cancelled` - User cancelled the job

### Missing Value Strategies
- `drop` - Remove rows with missing values
- `mean` - Fill with mean (numeric columns)
- `median` - Fill with median (numeric columns)
- `mode` - Fill with most frequent value (categorical columns)

### Model Types
- `rf` - Random Forest Classifier
- `lr` - Logistic Regression
- `xgb` - XGBoost Classifier
- `lgb` - LightGBM Classifier

---

## Pagination

List endpoints support pagination:
```
GET /api/datasets/?page=1&page_size=20
Response: {
  "count": 50,
  "next": "http://api/datasets/?page=2&page_size=20",
  "previous": null,
  "results": [...]
}
```

---

## Rate Limiting

File uploads are rate limited:
- Max file size: 50MB
- Allowed formats: CSV, XLSX, XLS

---

## Batch Operations

All list endpoints support filtering:
```
GET /api/training-jobs/?status=completed&dataset_id=1
GET /api/predictions/?is_high_risk=true&training_job_id=1
```

---

**Last Updated:** 2024-01-15
**API Version:** 1.0
