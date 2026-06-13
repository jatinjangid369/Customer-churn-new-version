from django.contrib import admin
from .models import Customer


@admin.register(Customer)
class CustomerAdmin(admin.ModelAdmin):
    list_display = [
        'customer_id', 'gender', 'tenure', 'contract',
        'monthly_charges', 'churn', 'risk_level', 'churn_risk_score'
    ]
    list_filter = ['churn', 'contract', 'risk_level', 'gender', 'internet_service']
    search_fields = ['customer_id', 'contract']
    ordering = ['-created_at']
    readonly_fields = ['churn_risk_score', 'risk_level', 'created_at', 'updated_at']
