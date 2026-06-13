from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.db.models import Count, Avg, Sum, Q
from customers.models import Customer


@api_view(['GET'])
def dashboard_overview(request):
    """GET /api/dashboard/ — KPI metrics for the main dashboard."""
    total = Customer.objects.count()
    churned = Customer.objects.filter(churn=True).count()
    active = total - churned
    churn_rate = round((churned / total * 100), 2) if total > 0 else 0
    avg_monthly = Customer.objects.aggregate(avg=Avg('monthly_charges'))['avg'] or 0
    total_revenue_lost = Customer.objects.filter(churn=True).aggregate(
        s=Sum('monthly_charges')
    )['s'] or 0

    # Risk distribution
    high_risk = Customer.objects.filter(risk_level='High').count()
    medium_risk = Customer.objects.filter(risk_level='Medium').count()
    low_risk = Customer.objects.filter(risk_level='Low').count()

    return Response({
        'total_customers': total,
        'churned_customers': churned,
        'active_customers': active,
        'churn_rate': churn_rate,
        'avg_monthly_charges': round(avg_monthly, 2),
        'revenue_lost_monthly': round(total_revenue_lost, 2),
        'risk_distribution': {
            'high': high_risk,
            'medium': medium_risk,
            'low': low_risk,
        }
    })


@api_view(['GET'])
def churn_by_contract(request):
    """GET /api/analytics/contract/ — churn rate by contract type."""
    data = []
    for contract in ['Month-to-month', 'One year', 'Two year']:
        total = Customer.objects.filter(contract=contract).count()
        churned = Customer.objects.filter(contract=contract, churn=True).count()
        rate = round((churned / total * 100), 1) if total > 0 else 0
        data.append({
            'contract': contract,
            'total': total,
            'churned': churned,
            'retained': total - churned,
            'churn_rate': rate,
        })
    return Response(data)


@api_view(['GET'])
def churn_by_payment(request):
    """GET /api/analytics/payment/ — churn rate by payment method."""
    data = []
    payment_methods = Customer.objects.values_list('payment_method', flat=True).distinct()
    for method in payment_methods:
        total = Customer.objects.filter(payment_method=method).count()
        churned = Customer.objects.filter(payment_method=method, churn=True).count()
        rate = round((churned / total * 100), 1) if total > 0 else 0
        data.append({
            'payment_method': method,
            'total': total,
            'churned': churned,
            'churn_rate': rate,
        })
    return Response(sorted(data, key=lambda x: -x['churn_rate']))


@api_view(['GET'])
def churn_by_tenure(request):
    """GET /api/analytics/tenure/ — churn rate bucketed by tenure."""
    buckets = [
        ('0-6 months', 0, 6),
        ('7-12 months', 7, 12),
        ('13-24 months', 13, 24),
        ('25-48 months', 25, 48),
        ('49-72 months', 49, 72),
    ]
    data = []
    for label, low, high in buckets:
        total = Customer.objects.filter(tenure__gte=low, tenure__lte=high).count()
        churned = Customer.objects.filter(tenure__gte=low, tenure__lte=high, churn=True).count()
        rate = round((churned / total * 100), 1) if total > 0 else 0
        data.append({
            'bucket': label,
            'total': total,
            'churned': churned,
            'retained': total - churned,
            'churn_rate': rate,
        })
    return Response(data)


@api_view(['GET'])
def churn_by_internet(request):
    """GET /api/analytics/internet/ — churn rate by internet service."""
    data = []
    for service in ['DSL', 'Fiber optic', 'No']:
        total = Customer.objects.filter(internet_service=service).count()
        churned = Customer.objects.filter(internet_service=service, churn=True).count()
        rate = round((churned / total * 100), 1) if total > 0 else 0
        data.append({
            'internet_service': service,
            'total': total,
            'churned': churned,
            'churn_rate': rate,
        })
    return Response(data)


@api_view(['GET'])
def monthly_trend(request):
    """GET /api/analytics/trend/ — simulated monthly churn trend from tenure data."""
    # We bucket customers by tenure into 12 "months" for a trend line
    months = []
    for month in range(1, 13):
        low = (month - 1) * 6
        high = month * 6
        total = Customer.objects.filter(tenure__gte=low, tenure__lt=high).count()
        churned = Customer.objects.filter(tenure__gte=low, tenure__lt=high, churn=True).count()
        rate = round((churned / total * 100), 1) if total > 0 else 0
        months.append({
            'month': f'M{month * 6}',
            'churned': churned,
            'retained': total - churned,
            'churn_rate': rate,
        })
    return Response(months)
