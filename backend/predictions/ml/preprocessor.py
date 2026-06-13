"""
Data preprocessing module for feature engineering and data preparation
"""

import pandas as pd
import numpy as np
from sklearn.preprocessing import StandardScaler, OneHotEncoder, LabelEncoder
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
import joblib
from typing import Tuple, Dict, List


class DataPreprocessor:
    """
    Handles all data preprocessing including missing value imputation,
    categorical encoding, and numerical scaling
    """
    
    def __init__(self, mapping_config: Dict):
        """
        Initialize preprocessor with feature mapping configuration
        
        Args:
            mapping_config: Dict with keys:
                - 'target_column': name of target column
                - 'feature_columns': list of feature column names to use
                - 'categorical_columns': list of categorical column names
                - 'numerical_columns': list of numerical column names
                - 'missing_value_strategy': 'drop', 'mean', 'median', 'mode'
                - 'customer_id_column': name of customer ID column
        """
        self.mapping_config = mapping_config
        self.target_column = mapping_config.get('target_column')
        self.feature_columns = mapping_config.get('feature_columns', [])
        self.categorical_columns = mapping_config.get('categorical_columns', [])
        self.numerical_columns = mapping_config.get('numerical_columns', [])
        self.missing_value_strategy = mapping_config.get('missing_value_strategy', 'drop')
        self.customer_id_column = mapping_config.get('customer_id_column')
        
        self.preprocessor = None
        self.feature_names_out = None
        self.target_encoder = LabelEncoder()
        self.is_fitted = False
    
    def handle_missing_data(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Handle missing values based on configured strategy
        Returns: DataFrame with handled missing values
        """
        df_copy = df.copy()
        
        if self.missing_value_strategy == 'drop':
            # Drop rows with any missing values
            df_copy = df_copy.dropna(subset=self.feature_columns + [self.target_column])
        
        elif self.missing_value_strategy == 'mean':
            # Fill numeric columns with mean
            for col in self.numerical_columns:
                if col in self.feature_columns and df_copy[col].isnull().any():
                    df_copy[col] = df_copy[col].fillna(df_copy[col].mean())
        
        elif self.missing_value_strategy == 'median':
            # Fill numeric columns with median
            for col in self.numerical_columns:
                if col in self.feature_columns and df_copy[col].isnull().any():
                    df_copy[col] = df_copy[col].fillna(df_copy[col].median())
        
        elif self.missing_value_strategy == 'mode':
            # Fill categorical columns with mode
            for col in self.categorical_columns:
                if col in self.feature_columns and df_copy[col].isnull().any():
                    mode_val = df_copy[col].mode()
                    if len(mode_val) > 0:
                        df_copy[col] = df_copy[col].fillna(mode_val[0])
        
        return df_copy
    
    def encode_target(self, y: pd.Series, fit: bool = True):
        """
        Encode binary target variable (0 or 1)
        Returns: Encoded target array
        """
        if fit:
            return self.target_encoder.fit_transform(y)
        else:
            return self.target_encoder.transform(y)
    
    def create_preprocessing_pipeline(self) -> ColumnTransformer:
        """
        Create sklearn preprocessing pipeline for categorical and numerical features
        Returns: Fitted ColumnTransformer
        """
        transformers = []
        
        # Categorical preprocessing: OneHotEncoder
        if self.categorical_columns:
            categorical_transformer = OneHotEncoder(
                sparse_output=False,
                handle_unknown='ignore',
                drop='first'  # Drop first category to avoid multicollinearity
            )
            transformers.append(
                ('cat', categorical_transformer, self.categorical_columns)
            )
        
        # Numerical preprocessing: StandardScaler
        if self.numerical_columns:
            numerical_transformer = StandardScaler()
            transformers.append(
                ('num', numerical_transformer, self.numerical_columns)
            )
        
        preprocessor = ColumnTransformer(
            transformers=transformers,
            remainder='drop'
        )
        
        return preprocessor
    
    def fit_transform(self, df: pd.DataFrame) -> Tuple[np.ndarray, np.ndarray]:
        """
        Fit preprocessor on training data and transform it
        Returns: (X_transformed, y_encoded)
        """
        # Handle missing values
        df_clean = self.handle_missing_data(df)
        
        # Extract features and target
        X = df_clean[self.feature_columns]
        y = df_clean[self.target_column]
        
        # Create and fit preprocessing pipeline
        self.preprocessor = self.create_preprocessing_pipeline()
        X_transformed = self.preprocessor.fit_transform(X)
        
        # Encode target
        y_encoded = self.encode_target(y, fit=True)
        
        # Get feature names after transformation
        self._set_feature_names()
        
        self.is_fitted = True
        return X_transformed, y_encoded
    
    def transform(self, df: pd.DataFrame) -> np.ndarray:
        """
        Transform new data using fitted preprocessor
        Returns: Transformed feature array
        """
        if not self.is_fitted or self.preprocessor is None:
            raise ValueError('Preprocessor must be fitted before transform')
        
        # Handle missing values
        df_clean = self.handle_missing_data(df)
        
        # Extract features
        X = df_clean[self.feature_columns]
        
        # Transform
        X_transformed = self.preprocessor.transform(X)
        
        return X_transformed
    
    def _set_feature_names(self):
        """
        Extract feature names after preprocessing
        """
        feature_names = []
        
        for name, trans, columns in self.preprocessor.transformers_:
            if name == 'cat':
                # Get one-hot encoded feature names
                if hasattr(trans, 'get_feature_names_out'):
                    encoded_names = trans.get_feature_names_out(columns)
                    feature_names.extend(encoded_names)
            elif name == 'num':
                # Numerical features keep their names
                feature_names.extend(columns)
        
        self.feature_names_out = feature_names
    
    def get_feature_names(self) -> List[str]:
        """
        Return list of feature names after preprocessing
        Returns: List of feature names
        """
        if self.feature_names_out is None:
            return self.feature_columns
        return self.feature_names_out
    
    def save(self, filepath: str):
        """
        Save fitted preprocessor to disk using joblib
        """
        if not self.is_fitted:
            raise ValueError('Cannot save unfitted preprocessor')
        
        joblib.dump({
            'preprocessor': self.preprocessor,
            'target_encoder': self.target_encoder,
            'mapping_config': self.mapping_config,
            'feature_names_out': self.feature_names_out
        }, filepath)
    
    @staticmethod
    def load(filepath: str) -> 'DataPreprocessor':
        """
        Load saved preprocessor from disk
        Returns: Loaded DataPreprocessor instance
        """
        data = joblib.load(filepath)
        
        preprocessor = DataPreprocessor(data['mapping_config'])
        preprocessor.preprocessor = data['preprocessor']
        preprocessor.target_encoder = data['target_encoder']
        preprocessor.feature_names_out = data['feature_names_out']
        preprocessor.is_fitted = True
        
        return preprocessor
    
    def fit(self, df: pd.DataFrame) -> 'DataPreprocessor':
        """
        Fit preprocessor on data without returning transformed data
        Returns: self for chaining
        """
        self.fit_transform(df)
        return self
