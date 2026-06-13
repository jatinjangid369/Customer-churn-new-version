from rest_framework import generics, filters
from rest_framework.decorators import api_view
from rest_framework.response import Response

from .models import Customer
from .serializers import CustomerSerializer, CustomerListSerializer


class CustomerListView(generics.ListAPIView):
    """GET /api/customers/ — paginated customer list with filters."""
    serializer_class = CustomerListSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['customer_id', 'contract', 'gender']
    ordering_fields = ['tenure', 'monthly_charges', 'churn_risk_score', 'created_at']
    ordering = ['-created_at']

    def get_queryset(self):
        qs = Customer.objects.all()
        # Filter by risk level
        risk = self.request.query_params.get('risk_level')
        if risk:
            qs = qs.filter(risk_level=risk)
        # Filter by churn status
        churn = self.request.query_params.get('churn')
        if churn is not None:
            qs = qs.filter(churn=(churn.lower() == 'true'))
        # Filter by contract
        contract = self.request.query_params.get('contract')
        if contract:
            qs = qs.filter(contract=contract)
        return qs


class CustomerDetailView(generics.RetrieveAPIView):
    """GET /api/customers/<id>/ — single customer detail."""
    queryset = Customer.objects.all()
    serializer_class = CustomerSerializer
