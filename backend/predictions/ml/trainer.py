"""
Model training module for training various ML models and evaluating performance
"""

import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, confusion_matrix
import joblib
from typing import Tuple, Dict
import xgboost as xgb
import lightgbm as lgb


class ModelTrainer:
    """
    Trains and evaluates ML models for churn prediction
    """
    
    def __init__(self, model_type: str, hyperparameters: Dict = None):
        """
        Initialize trainer with model type and optional hyperparameters
        
        Args:
            model_type: 'rf' (Random Forest), 'lr' (Logistic Regression), 
                       'xgb' (XGBoost), 'lgb' (LightGBM)
            hyperparameters: Dict of hyperparameters for the model
        """
        self.model_type = model_type
        self.hyperparameters = hyperparameters or {}
        self.model = None
        self.is_trained = False
        self._initialize_model()
    
    def _initialize_model(self):
        """Initialize the ML model with hyperparameters"""
        if self.model_type == 'rf':
            params = {
                'n_estimators': self.hyperparameters.get('n_estimators', 100),
                'max_depth': self.hyperparameters.get('max_depth', 15),
                'min_samples_split': self.hyperparameters.get('min_samples_split', 5),
                'min_samples_leaf': self.hyperparameters.get('min_samples_leaf', 2),
                'random_state': 42,
                'n_jobs': -1
            }
            self.model = RandomForestClassifier(**params)
        
        elif self.model_type == 'lr':
            params = {
                'max_iter': self.hyperparameters.get('max_iter', 1000),
                'random_state': 42,
                'n_jobs': -1
            }
            self.model = LogisticRegression(**params)
        
        elif self.model_type == 'xgb':
            params = {
                'n_estimators': self.hyperparameters.get('n_estimators', 100),
                'max_depth': self.hyperparameters.get('max_depth', 7),
                'learning_rate': self.hyperparameters.get('learning_rate', 0.1),
                'subsample': self.hyperparameters.get('subsample', 0.8),
                'colsample_bytree': self.hyperparameters.get('colsample_bytree', 0.8),
                'random_state': 42,
                'n_jobs': -1,
                'verbosity': 0
            }
            self.model = xgb.XGBClassifier(**params)
        
        elif self.model_type == 'lgb':
            params = {
                'n_estimators': self.hyperparameters.get('n_estimators', 100),
                'max_depth': self.hyperparameters.get('max_depth', 7),
                'learning_rate': self.hyperparameters.get('learning_rate', 0.1),
                'num_leaves': self.hyperparameters.get('num_leaves', 31),
                'random_state': 42,
                'n_jobs': -1,
                'verbosity': -1
            }
            self.model = lgb.LGBMClassifier(**params)
        
        else:
            raise ValueError(f'Unknown model type: {self.model_type}')
    
    def train(self, X_train: np.ndarray, y_train: np.ndarray):
        """
        Train the model on training data
        
        Args:
            X_train: Training features array
            y_train: Training target array
        """
        self.model.fit(X_train, y_train)
        self.is_trained = True
    
    def evaluate(self, X_test: np.ndarray, y_test: np.ndarray) -> Dict[str, float]:
        """
        Evaluate model on test data
        
        Args:
            X_test: Test features array
            y_test: Test target array
        
        Returns:
            Dict with accuracy, precision, recall, f1_score
        """
        if not self.is_trained:
            raise ValueError('Model must be trained before evaluation')
        
        # Get predictions
        y_pred = self.model.predict(X_test)
        y_pred_proba = self.model.predict_proba(X_test)[:, 1]
        
        # Calculate metrics
        accuracy = accuracy_score(y_test, y_pred)
        precision = precision_score(y_test, y_pred, zero_division=0)
        recall = recall_score(y_test, y_pred, zero_division=0)
        f1 = f1_score(y_test, y_pred, zero_division=0)
        
        # Get confusion matrix
        cm = confusion_matrix(y_test, y_pred)
        
        metrics = {
            'accuracy': round(float(accuracy), 4),
            'precision': round(float(precision), 4),
            'recall': round(float(recall), 4),
            'f1_score': round(float(f1), 4),
            'confusion_matrix': [[int(cm[0, 0]), int(cm[0, 1])], 
                                [int(cm[1, 0]), int(cm[1, 1])]],
            'y_test': y_test.tolist(),
            'y_pred': y_pred.tolist(),
            'y_pred_proba': y_pred_proba.tolist()
        }
        
        return metrics
    
    def get_feature_importance(self, feature_names: list) -> Dict[str, float]:
        """
        Get feature importance scores
        
        Args:
            feature_names: List of feature names
        
        Returns:
            Dict of feature_name: importance_score
        """
        if not self.is_trained:
            raise ValueError('Model must be trained to get feature importance')
        
        # Get importance based on model type
        if self.model_type == 'rf':
            importances = self.model.feature_importances_
        elif self.model_type == 'xgb':
            importances = self.model.feature_importances_
        elif self.model_type == 'lgb':
            importances = self.model.feature_importances_
        elif self.model_type == 'lr':
            # For logistic regression, use absolute coefficient values
            importances = np.abs(self.model.coef_[0])
        else:
            return {}
        
        # Create dict and sort by importance
        importance_dict = {}
        for i, importance in enumerate(importances):
            if i < len(feature_names):
                importance_dict[feature_names[i]] = round(float(importance), 4)
        
        # Sort by importance descending
        sorted_importance = dict(sorted(importance_dict.items(), 
                                      key=lambda x: x[1], 
                                      reverse=True))
        
        return sorted_importance
    
    def predict(self, X: np.ndarray) -> np.ndarray:
        """
        Make predictions on new data
        
        Args:
            X: Feature array
        
        Returns:
            Predicted class labels
        """
        if not self.is_trained:
            raise ValueError('Model must be trained before prediction')
        
        return self.model.predict(X)
    
    def predict_proba(self, X: np.ndarray) -> np.ndarray:
        """
        Get prediction probabilities on new data
        
        Args:
            X: Feature array
        
        Returns:
            Array of class probabilities
        """
        if not self.is_trained:
            raise ValueError('Model must be trained before prediction')
        
        return self.model.predict_proba(X)
    
    def save(self, filepath: str):
        """
        Save trained model to disk
        
        Args:
            filepath: Path to save the model
        """
        if not self.is_trained:
            raise ValueError('Cannot save untrained model')
        
        joblib.dump(self.model, filepath)
    
    @staticmethod
    def load(filepath: str) -> 'ModelTrainer':
        """
        Load trained model from disk
        
        Args:
            filepath: Path to the saved model
        
        Returns:
            ModelTrainer instance with loaded model
        """
        model = joblib.load(filepath)
        
        # Create trainer instance and assign model
        # Determine model type from the loaded model
        if isinstance(model, RandomForestClassifier):
            model_type = 'rf'
        elif isinstance(model, LogisticRegression):
            model_type = 'lr'
        elif isinstance(model, xgb.XGBClassifier):
            model_type = 'xgb'
        elif isinstance(model, lgb.LGBMClassifier):
            model_type = 'lgb'
        else:
            model_type = 'unknown'
        
        trainer = ModelTrainer(model_type)
        trainer.model = model
        trainer.is_trained = True
        
        return trainer


class TrainingPipeline:
    """
    Complete training pipeline from raw data to trained model
    """
    
    def __init__(self, preprocessor, model_trainer, test_size: float = 0.2, random_state: int = 42):
        """
        Initialize training pipeline
        
        Args:
            preprocessor: Fitted DataPreprocessor instance
            model_trainer: ModelTrainer instance
            test_size: Proportion of data to use for testing
            random_state: Random state for reproducibility
        """
        self.preprocessor = preprocessor
        self.model_trainer = model_trainer
        self.test_size = test_size
        self.random_state = random_state
    
    def run(self, df, target_column: str) -> Dict:
        """
        Run complete training pipeline
        
        Args:
            df: DataFrame with all data
            target_column: Name of target column
        
        Returns:
            Dict with training metrics and results
        """
        # Preprocess data
        X, y = self.preprocessor.fit_transform(df)
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(
            X, y,
            test_size=self.test_size,
            random_state=self.random_state,
            stratify=y
        )
        
        # Train model
        self.model_trainer.train(X_train, y_train)
        
        # Evaluate
        metrics = self.model_trainer.evaluate(X_test, y_test)
        
        # Get feature importance
        feature_importance = self.model_trainer.get_feature_importance(
            self.preprocessor.get_feature_names()
        )
        
        metrics['feature_importance'] = feature_importance
        metrics['training_samples'] = len(X_train)
        metrics['test_samples'] = len(X_test)
        
        return metrics
