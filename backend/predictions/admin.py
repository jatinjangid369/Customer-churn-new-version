from django.contrib import admin
from .models import Prediction


@admin.register(Prediction)
class PredictionAdmin(admin.ModelAdmin):
    list_display = ['id', 'customer_id', 'churn_probability', 'is_high_risk', 'created_date']
    list_filter = ['is_high_risk']
    readonly_fields = ['created_date']
