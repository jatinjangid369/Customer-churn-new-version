"""
Prediction service module for making predictions on new data
"""

import pandas as pd
import numpy as np
from typing import List, Dict, Tuple
import os


class PredictionService:
    """
    Service for making predictions using trained models and preprocessors
    """
    
    def __init__(self, model_trainer, preprocessor):
        """
        Initialize prediction service with trained model and preprocessor
        
        Args:
            model_trainer: Trained ModelTrainer instance
            preprocessor: Fitted DataPreprocessor instance
        """
        self.model_trainer = model_trainer
        self.preprocessor = preprocessor
    
    @staticmethod
    def load_from_files(model_filepath: str, preprocessor_filepath: str) -> 'PredictionService':
        """
        Load prediction service from saved model and preprocessor files
        
        Args:
            model_filepath: Path to saved model file
            preprocessor_filepath: Path to saved preprocessor file
        
        Returns:
            PredictionService instance
        """
        from .trainer import ModelTrainer
        from .preprocessor import DataPreprocessor
        
        model_trainer = ModelTrainer.load(model_filepath)
        preprocessor = DataPreprocessor.load(preprocessor_filepath)
        
        return PredictionService(model_trainer, preprocessor)
    
    def predict_single(self, customer_data: Dict) -> Dict:
        """
        Make prediction for a single customer
        
        Args:
            customer_data: Dict with customer features
        
        Returns:
            Dict with prediction results
        """
        # Convert dict to DataFrame
        df = pd.DataFrame([customer_data])
        
        # Preprocess
        X = self.preprocessor.transform(df)
        
        # Predict
        prediction = self.model_trainer.predict(X)[0]
        probability = self.model_trainer.predict_proba(X)[0]
        
        return {
            'predicted_class': int(prediction),
            'churn_probability': float(probability[1]),
            'no_churn_probability': float(probability[0]),
            'is_high_risk': float(probability[1]) > 0.8
        }
    
    def predict_batch(self, df: pd.DataFrame, 
                     customer_id_column: str = None) -> List[Dict]:
        """
        Make predictions for batch of customers
        
        Args:
            df: DataFrame with customer data
            customer_id_column: Name of column with customer ID
        
        Returns:
            List of prediction dicts
        """
        # Preprocess
        X = self.preprocessor.transform(df)
        
        # Predict
        predictions = self.model_trainer.predict(X)
        probabilities = self.model_trainer.predict_proba(X)
        
        # Build results
        results = []
        for i in range(len(df)):
            customer_id = None
            if customer_id_column and customer_id_column in df.columns:
                customer_id = str(df.iloc[i][customer_id_column])
            
            result = {
                'index': i,
                'customer_id': customer_id,
                'predicted_class': int(predictions[i]),
                'churn_probability': float(probabilities[i][1]),
                'no_churn_probability': float(probabilities[i][0]),
                'is_high_risk': float(probabilities[i][1]) > 0.8
            }
            results.append(result)
        
        return results
    
    def predict_batch_dataframe(self, df: pd.DataFrame,
                              customer_id_column: str = None) -> pd.DataFrame:
        """
        Make predictions and return results as DataFrame
        
        Args:
            df: DataFrame with customer data
            customer_id_column: Name of column with customer ID
        
        Returns:
            DataFrame with original customer data plus predictions
        """
        # Get predictions
        predictions_list = self.predict_batch(df, customer_id_column)
        
        # Convert to DataFrame
        predictions_df = pd.DataFrame(predictions_list)
        
        # Optionally add customer IDs from original data
        if customer_id_column and customer_id_column in df.columns:
            predictions_df['customer_id'] = df[customer_id_column].values
        
        return predictions_df
    
    def identify_high_risk_customers(self, df: pd.DataFrame,
                                    customer_id_column: str = None,
                                    threshold: float = 0.8) -> pd.DataFrame:
        """
        Identify high-risk customers (above threshold probability)
        
        Args:
            df: DataFrame with customer data
            customer_id_column: Name of column with customer ID
            threshold: Churn probability threshold (0-1)
        
        Returns:
            DataFrame with high-risk customers only
        """
        # Get all predictions
        predictions_df = self.predict_batch_dataframe(df, customer_id_column)
        
        # Filter high-risk
        high_risk = predictions_df[
            predictions_df['churn_probability'] >= threshold
        ].sort_values('churn_probability', ascending=False)
        
        return high_risk
    
    def get_prediction_summary(self, df: pd.DataFrame,
                             customer_id_column: str = None) -> Dict:
        """
        Get summary statistics of predictions
        
        Args:
            df: DataFrame with customer data
            customer_id_column: Name of column with customer ID
        
        Returns:
            Dict with prediction statistics
        """
        predictions_df = self.predict_batch_dataframe(df, customer_id_column)
        
        churn_probs = predictions_df['churn_probability']
        
        summary = {
            'total_customers': len(predictions_df),
            'predicted_churners': int((predictions_df['predicted_class'] == 1).sum()),
            'predicted_non_churners': int((predictions_df['predicted_class'] == 0).sum()),
            'high_risk_customers': int((predictions_df['is_high_risk']).sum()),
            'average_churn_probability': float(churn_probs.mean()),
            'median_churn_probability': float(churn_probs.median()),
            'std_churn_probability': float(churn_probs.std()),
            'min_churn_probability': float(churn_probs.min()),
            'max_churn_probability': float(churn_probs.max()),
            'churn_rate_percentage': round(
                (predictions_df['predicted_class'].sum() / len(predictions_df)) * 100, 2
            )
        }
        
        return summary
    
    def export_predictions_csv(self, df: pd.DataFrame,
                             customer_id_column: str = None,
                             output_filepath: str = None) -> Tuple[str, pd.DataFrame]:
        """
        Export predictions to CSV file
        
        Args:
            df: DataFrame with customer data
            customer_id_column: Name of column with customer ID
            output_filepath: Path to save CSV (if None, returns data only)
        
        Returns:
            Tuple of (filepath, predictions_dataframe)
        """
        predictions_df = self.predict_batch_dataframe(df, customer_id_column)
        
        # Rename columns for export
        export_df = predictions_df.copy()
        export_df.columns = [
            'Index', 'Customer ID', 'Predicted Churn', 'Churn Probability',
            'No Churn Probability', 'High Risk'
        ]
        
        if output_filepath:
            export_df.to_csv(output_filepath, index=False)
            return output_filepath, export_df
        
        return None, export_df
