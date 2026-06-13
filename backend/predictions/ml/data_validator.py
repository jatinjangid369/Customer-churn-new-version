"""
Data validation module for ensuring data quality before ML training
"""

import pandas as pd
import numpy as np
from typing import Dict, Tuple, List


class DataValidator:
    """Validates uploaded datasets for quality and completeness"""
    
    def __init__(self, df: pd.DataFrame):
        self.df = df
        self.validation_report = {}
    
    def validate_file_format(self) -> bool:
        """Check if the data is a valid pandas DataFrame"""
        try:
            if not isinstance(self.df, pd.DataFrame):
                return False
            if len(self.df) == 0:
                self.validation_report['error'] = 'Dataset is empty'
                return False
            if len(self.df.columns) == 0:
                self.validation_report['error'] = 'Dataset has no columns'
                return False
            return True
        except Exception as e:
            self.validation_report['error'] = str(e)
            return False
    
    def check_missing_values(self) -> Dict[str, float]:
        """
        Identify missing values in each column
        Returns: Dict of column_name: missing_percentage
        """
        missing_info = {}
        for col in self.df.columns:
            missing_count = self.df[col].isnull().sum()
            missing_pct = (missing_count / len(self.df)) * 100
            if missing_pct > 0:
                missing_info[col] = round(missing_pct, 2)
        
        self.validation_report['missing_values'] = missing_info
        return missing_info
    
    def detect_data_types(self) -> Dict[str, str]:
        """
        Infer column data types (numeric, categorical, datetime, etc.)
        Returns: Dict of column_name: inferred_type
        """
        type_mapping = {}
        
        for col in self.df.columns:
            dtype = str(self.df[col].dtype)
            
            # Numeric columns
            if pd.api.types.is_numeric_dtype(self.df[col]):
                type_mapping[col] = 'numeric'
            # Categorical columns
            elif pd.api.types.is_string_dtype(self.df[col]) or pd.api.types.is_object_dtype(self.df[col]):
                unique_count = self.df[col].nunique()
                if unique_count <= 50:  # Arbitrary threshold for categorical
                    type_mapping[col] = 'categorical'
                else:
                    type_mapping[col] = 'text'
            # Datetime columns
            elif pd.api.types.is_datetime64_any_dtype(self.df[col]):
                type_mapping[col] = 'datetime'
            else:
                type_mapping[col] = 'unknown'
        
        self.validation_report['data_types'] = type_mapping
        return type_mapping
    
    def validate_target_column(self, target_column: str) -> Tuple[bool, str]:
        """
        Validate that target column has exactly 2 unique values (binary classification)
        Returns: (is_valid, message)
        """
        if target_column not in self.df.columns:
            return False, f'Target column "{target_column}" not found in dataset'
        
        unique_values = self.df[target_column].nunique()
        
        if unique_values != 2:
            return False, f'Target column must have exactly 2 classes, found {unique_values}'
        
        # Check for null values in target
        null_count = self.df[target_column].isnull().sum()
        if null_count > 0:
            pct = (null_count / len(self.df)) * 100
            return False, f'Target column has {null_count} ({pct:.1f}%) missing values'
        
        return True, 'Target column is valid'
    
    def check_class_imbalance(self, target_column: str) -> Dict[str, float]:
        """
        Check class distribution in target column
        Returns: Dict of class_value: percentage
        """
        value_counts = self.df[target_column].value_counts()
        class_distribution = {}
        
        for class_val, count in value_counts.items():
            pct = (count / len(self.df)) * 100
            class_distribution[str(class_val)] = round(pct, 2)
        
        # Flag severe imbalance (>90-10 split)
        if len(class_distribution) == 2:
            percentages = list(class_distribution.values())
            if max(percentages) > 90:
                self.validation_report['class_imbalance_warning'] = True
        
        self.validation_report['class_distribution'] = class_distribution
        return class_distribution
    
    def generate_quality_report(self, target_column: str = None) -> Dict:
        """
        Generate comprehensive data quality report
        Returns: Dict with all validation metrics
        """
        report = {
            'total_rows': len(self.df),
            'total_columns': len(self.df.columns),
            'column_names': list(self.df.columns),
            'memory_usage_mb': round(self.df.memory_usage(deep=True).sum() / 1024**2, 2),
        }
        
        # Validate basic format
        report['format_valid'] = self.validate_file_format()
        
        # Check missing values
        self.check_missing_values()
        report['missing_values'] = self.validation_report.get('missing_values', {})
        
        # Detect data types
        self.detect_data_types()
        report['data_types'] = self.validation_report.get('data_types', {})
        
        # Validate target column
        if target_column:
            is_valid, message = self.validate_target_column(target_column)
            report['target_valid'] = is_valid
            report['target_message'] = message
            
            if is_valid:
                self.check_class_imbalance(target_column)
                report['class_distribution'] = self.validation_report.get('class_distribution', {})
        
        # Calculate quality score (0-100)
        # Deduct points for issues
        quality_score = 100
        
        # Deduct for missing values (up to 30 points)
        missing_count = len(report['missing_values'])
        if missing_count > 0:
            quality_score -= min(30, missing_count * 5)
        
        # Deduct for very few rows (up to 20 points)
        if report['total_rows'] < 100:
            quality_score -= 20
        elif report['total_rows'] < 500:
            quality_score -= 10
        
        # Deduct for class imbalance (up to 15 points)
        if self.validation_report.get('class_imbalance_warning'):
            quality_score -= 15
        
        report['quality_score'] = max(0, round(quality_score, 1))
        report['validation_report'] = self.validation_report
        
        return report
    
    @staticmethod
    def load_file(filepath: str) -> Tuple[pd.DataFrame, str]:
        """
        Load CSV or Excel file safely
        Returns: (DataFrame, error_message) - error_message is None if successful
        """
        try:
            if filepath.endswith('.csv'):
                df = pd.read_csv(filepath)
            elif filepath.endswith(('.xlsx', '.xls')):
                df = pd.read_excel(filepath)
            else:
                return None, 'Unsupported file format. Use CSV or Excel.'
            
            return df, None
        except Exception as e:
            return None, f'Error loading file: {str(e)}'
