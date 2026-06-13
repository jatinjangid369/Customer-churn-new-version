# Database Schema - MLOps Churn Prediction Platform

## ER Diagram

```
┌─────────────────┐         ┌──────────────────┐
│  User (Django)  │         │    Dataset       │
├─────────────────┤◄────────┼──────────────────┤
│ id (PK)         │   FK    │ id (PK)          │
│ username        │         │ user_id (FK)     │
│ email           │         │ name             │
│ password        │         │ file_path        │
│ ...             │         │ original_file    │
└─────────────────┘         │ rows_count       │
                            │ columns_count    │
                            │ columns_list     │
                            │ upload_date      │
                            │ quality_score    │
                            └────────┬─────────┘
                                     │
                            ┌────────▼──────────────┐
                            │  FeatureMapping      │
                            ├──────────────────────┤
                            │ id (PK)              │
                            │ dataset_id (FK)      │
                            │ customer_id_column   │
                            │ target_column        │
                            │ feature_columns      │
                            │ categorical_columns  │
                            │ numerical_columns    │
                            │ missing_value_strat  │
                            │ created_date         │
                            └────────┬─────────────┘
                                     │
                    ┌────────────────┼────────────────┐
                    │                │                │
        ┌───────────▼──────────┐     │    ┌───────────▼──────────────┐
        │  TrainingJob         │     │    │   ModelConfig            │
        ├──────────────────────┤     │    ├──────────────────────────┤
        │ id (PK)              │     │    │ id (PK)                  │
        │ dataset_id (FK)      │─────┼────│ user_id (FK)             │
        │ feature_mapping_id   │─────┴────│ name                     │
        │ model_config_id (FK) │──────────┤ model_type (rf,lr,xgb)   │
        │ celery_task_id       │          │ hyperparameters (JSON)   │
        │ status               │          │ created_date             │
        │ progress             │          └──────────────────────────┘
        │ accuracy             │
        │ precision            │
        │ recall               │
        │ f1_score             │
        │ confusion_matrix     │
        │ feature_importance   │
        │ model_file_path      │
        │ preprocessor_path    │
        │ started_at           │
        │ completed_at         │
        │ error_message        │
        └────────┬─────────────┘
                 │
        ┌────────▼──────────────┐
        │   Prediction          │
        ├───────────────────────┤
        │ id (PK)               │
        │ training_job_id (FK)  │
        │ customer_id           │
        │ churn_probability     │
        │ predicted_class       │
        │ is_high_risk          │
        │ created_date          │
        └───────────────────────┘
```

---

## Table Definitions

### 1. Dataset Table
**Stores uploaded CSV/Excel files and metadata**

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PRIMARY KEY | Unique dataset ID |
| user_id | INTEGER | FOREIGN KEY (User) | Owner of dataset |
| name | VARCHAR(255) | NOT NULL | User-friendly name |
| file_path | VARCHAR(512) | NOT NULL | Full path to stored file |
| original_filename | VARCHAR(255) | NOT NULL | Original filename from upload |
| rows_count | INTEGER | NOT NULL | Number of rows in dataset |
| columns_count | INTEGER | NOT NULL | Number of columns |
| columns_list | JSON | NOT NULL | Array of column names |
| upload_date | DATETIME | AUTO_NOW_ADD | When file was uploaded |
| quality_score | FLOAT | NULL | Data quality 0-100 |

**Indexes:**
- (user_id, -upload_date)

**Constraints:**
- rows_count >= 1
- columns_count >= 2
- quality_score between 0 and 100

---

### 2. FeatureMapping Table
**Maps user's CSV columns to standardized fields for ML**

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PRIMARY KEY | Unique mapping ID |
| dataset_id | INTEGER | FOREIGN KEY (Dataset), UNIQUE | One-to-one with dataset |
| customer_id_column | VARCHAR(255) | NOT NULL | Column name for customer ID |
| target_column | VARCHAR(255) | NOT NULL | Column name for churn target |
| feature_columns | JSON | NOT NULL | Array of feature column names |
| categorical_columns | JSON | NOT NULL | Array of categorical column names |
| numerical_columns | JSON | NOT NULL | Array of numerical column names |
| missing_value_strategy | VARCHAR(50) | NOT NULL | drop, mean, median, mode |
| created_date | DATETIME | AUTO_NOW_ADD | When mapping was created |

**Constraints:**
- feature_columns must not be empty
- categorical_columns ⊆ feature_columns
- numerical_columns ⊆ feature_columns
- customer_id_column in dataset.columns_list
- target_column in dataset.columns_list

**Indexes:**
- (dataset_id)
- (-created_date)

---

### 3. ModelConfig Table
**Stores ML model selection and hyperparameters**

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PRIMARY KEY | Unique configuration ID |
| user_id | INTEGER | FOREIGN KEY (User) | Owner of configuration |
| name | VARCHAR(255) | NOT NULL | Configuration name |
| model_type | VARCHAR(10) | NOT NULL | rf, lr, xgb, lgb |
| hyperparameters | JSON | NOT NULL | Model hyperparameters dict |
| created_date | DATETIME | AUTO_NOW_ADD | When config was created |

**Valid model_type values:**
- `rf` - Random Forest Classifier
- `lr` - Logistic Regression
- `xgb` - XGBoost Classifier
- `lgb` - LightGBM Classifier

**Example hyperparameters:**
```json
{
  "rf": {"n_estimators": 100, "max_depth": 15, "min_samples_split": 5},
  "lr": {"max_iter": 1000},
  "xgb": {"n_estimators": 100, "max_depth": 7, "learning_rate": 0.1},
  "lgb": {"n_estimators": 100, "max_depth": 7, "num_leaves": 31}
}
```

**Indexes:**
- (user_id)
- (-created_date)

---

### 4. TrainingJob Table
**Tracks model training progress and results**

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PRIMARY KEY | Unique job ID |
| dataset_id | INTEGER | FOREIGN KEY (Dataset) | Training data |
| feature_mapping_id | INTEGER | FOREIGN KEY (FeatureMapping) | Feature configuration |
| model_config_id | INTEGER | FOREIGN KEY (ModelConfig) | Model to train |
| celery_task_id | VARCHAR(255) | NULL, UNIQUE | Celery task ID for async tracking |
| status | VARCHAR(20) | NOT NULL | pending, running, completed, failed, cancelled |
| progress | INTEGER | DEFAULT 0 | Training progress 0-100 |
| accuracy | FLOAT | NULL | Model accuracy on test set |
| precision | FLOAT | NULL | Precision metric |
| recall | FLOAT | NULL | Recall metric |
| f1_score | FLOAT | NULL | F1 score |
| confusion_matrix | JSON | NULL | [[tn, fp], [fn, tp]] |
| feature_importance | JSON | NULL | {feature: importance} dict |
| model_file_path | VARCHAR(512) | NULL | Path to saved model.pkl |
| preprocessor_file_path | VARCHAR(512) | NULL | Path to saved preprocessor.pkl |
| started_at | DATETIME | AUTO_NOW_ADD | When training started |
| completed_at | DATETIME | NULL | When training finished |
| error_message | TEXT | NULL | Error description if failed |

**Status Transitions:**
```
pending → running → completed ✓
       ↘              ↗ failed
         → cancelled
```

**Metrics Populated Only When:**
- status = 'completed'
- completed_at IS NOT NULL

**Indexes:**
- (dataset_id, status)
- (model_config_id)
- (status)
- (-started_at)
- (celery_task_id)

**Constraints:**
- progress between 0 and 100
- accuracy, precision, recall, f1_score between 0 and 1 (if not NULL)

---

### 5. Prediction Table
**Stores batch predictions from trained models**

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PRIMARY KEY | Unique prediction ID |
| training_job_id | INTEGER | FOREIGN KEY (TrainingJob) | Model used for prediction |
| customer_id | VARCHAR(255) | NOT NULL | Original customer ID from data |
| churn_probability | FLOAT | NOT NULL | Probability 0.0-1.0 |
| predicted_class | INTEGER | NOT NULL | 0 (No Churn) or 1 (Churn) |
| is_high_risk | BOOLEAN | NOT NULL | True if probability > 0.8 |
| created_date | DATETIME | AUTO_NOW_ADD | When prediction was made |

**Indexes:**
- (training_job_id, is_high_risk)
- (-churn_probability)
- (created_date)
- (training_job_id)

**Constraints:**
- churn_probability between 0.0 and 1.0
- predicted_class in [0, 1]
- is_high_risk = (churn_probability >= 0.8)

---

## Data Flow & Relationships

### Training Workflow
```
1. User uploads CSV
   → Dataset created

2. User maps features
   → FeatureMapping created

3. User selects model
   → ModelConfig created

4. User clicks "Train"
   → TrainingJob created (status='pending')
   → Celery task scheduled

5. Celery worker:
   a. Loads Dataset file
   b. Applies FeatureMapping
   c. Preprocesses data
   d. Trains ModelConfig
   e. Evaluates metrics
   f. Saves model files
   g. Updates TrainingJob
      (status='completed', metrics populated)

6. Prediction Phase:
   a. Load trained Model + Preprocessor
   b. Load new Dataset
   c. Generate Predictions
   d. Save to Prediction table
```

### Query Examples

**Get all completed training jobs for a user:**
```sql
SELECT tj.* FROM training_job tj
JOIN dataset d ON tj.dataset_id = d.id
WHERE d.user_id = ? AND tj.status = 'completed'
ORDER BY tj.completed_at DESC;
```

**Get high-risk customers from a trained model:**
```sql
SELECT * FROM prediction
WHERE training_job_id = ? AND is_high_risk = true
ORDER BY churn_probability DESC
LIMIT 100;
```

**Compare model performance on same dataset:**
```sql
SELECT mc.name, tj.accuracy, tj.precision, tj.recall, tj.f1_score
FROM training_job tj
JOIN model_config mc ON tj.model_config_id = mc.id
WHERE tj.dataset_id = ? AND tj.status = 'completed'
ORDER BY tj.f1_score DESC;
```

**Get data quality trends:**
```sql
SELECT d.name, d.quality_score, d.upload_date
FROM dataset d
WHERE d.user_id = ?
ORDER BY d.upload_date DESC;
```

---

## Key Statistics & Metadata

### Dataset Stats
- **Min rows for training:** 100 (recommended: 1000+)
- **Max file size:** 50 MB
- **Supported formats:** CSV, XLSX, XLS
- **Quality score calculation:**
  - Base: 100 points
  - Deduct 30 points if any columns missing values
  - Deduct 20 points if <100 rows, 10 if <500
  - Deduct 15 points if class imbalance >90%

### Training Job Characteristics
- **Train/test split:** 80/20
- **Random state:** 42 (for reproducibility)
- **Max training time:** 30 minutes (Celery task limit)
- **Soft timeout:** 25 minutes (warnings)

### Prediction Thresholds
- **High-risk threshold:** 0.8 (80% probability)
- **Batch size for bulk insert:** 1000 records

---

## Migration Strategy

### Initial Migration (0002_new_models.py)
Creates 5 new tables:
1. predictions_dataset
2. predictions_featuremapping
3. predictions_modelconfig
4. predictions_trainingjob
5. predictions_prediction

### Rollback Capability
All models can be deleted and recreated without affecting:
- User authentication
- Customer data (if exists in customers app)
- Analytics records

---

## Backup & Archival

### Files to Backup
- SQLite database: `backend/db.sqlite3`
- Uploaded datasets: `backend/uploads/`
- Trained models: `backend/models/`

### Archival Policy
- Datasets: Keep indefinitely (users may retrain)
- Models: Auto-delete after 30 days
- Predictions: Auto-delete after 60 days

---

## Performance Optimizations

### Indexes on Heavy Queries
- Queries filtering by user/dataset benefit from (user_id, date) indexes
- Queries sorting by high_risk benefit from (training_job_id, is_high_risk) index
- Frequent sorting by probability benefits from (-churn_probability) index

### Bulk Operations
- Prediction insertion uses bulk_create() with batch_size=1000
- Feature importance stored as JSON to avoid separate table joins

### Caching Opportunities
- Feature names cached in preprocessor after fit
- Model objects loaded once at prediction time
- Quality reports cached for 1 hour

---

**Last Updated:** 2024-01-15
**Schema Version:** 1.0
