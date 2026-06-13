from rest_framework import serializers
from .models import Customer


class CustomerSerializer(serializers.ModelSerializer):
    status = serializers.ReadOnlyField()

    class Meta:
        model = Customer
        fields = '__all__'


class CustomerListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for the customer list/table view."""
    status = serializers.ReadOnlyField()

    class Meta:
        model = Customer
        fields = [
            'id', 'customer_id', 'gender', 'senior_citizen', 'tenure',
            'contract', 'monthly_charges', 'total_charges', 'churn',
            'churn_risk_score', 'risk_level', 'status', 'created_at',
        ]
