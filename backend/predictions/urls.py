from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    DatasetViewSet, FeatureMappingViewSet, ModelConfigViewSet,
    TrainingJobViewSet, PredictionViewSet, AnalyticsViewSet
)

# Initialize router and register viewsets
router = DefaultRouter()
router.register(r'datasets', DatasetViewSet, basename='dataset')
router.register(r'feature-mappings', FeatureMappingViewSet, basename='feature-mapping')
router.register(r'model-configs', ModelConfigViewSet, basename='model-config')
router.register(r'training-jobs', TrainingJobViewSet, basename='training-job')
router.register(r'predictions', PredictionViewSet, basename='prediction')
router.register(r'analytics', AnalyticsViewSet, basename='analytics')

urlpatterns = [
    path('', include(router.urls)),
]
