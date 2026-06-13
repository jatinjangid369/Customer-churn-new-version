"""URL configuration for the Customer Churn Platform."""
from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('users.urls')),
    path('api/', include('customers.urls')),
    path('api/', include('analytics.urls')),
    path('api/', include('predictions.urls')),
]
