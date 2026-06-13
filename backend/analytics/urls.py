from django.urls import path
from .views import (
    dashboard_overview, churn_by_contract, churn_by_payment,
    churn_by_tenure, churn_by_internet, monthly_trend,
)

urlpatterns = [
    path('dashboard/', dashboard_overview, name='dashboard'),
    path('analytics/contract/', churn_by_contract, name='analytics-contract'),
    path('analytics/payment/', churn_by_payment, name='analytics-payment'),
    path('analytics/tenure/', churn_by_tenure, name='analytics-tenure'),
    path('analytics/internet/', churn_by_internet, name='analytics-internet'),
    path('analytics/trend/', monthly_trend, name='analytics-trend'),
]
