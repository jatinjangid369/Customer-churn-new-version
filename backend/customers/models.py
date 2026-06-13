from django.db import models


class Customer(models.Model):
    GENDER_CHOICES = [('Male', 'Male'), ('Female', 'Female')]
    CONTRACT_CHOICES = [
        ('Month-to-month', 'Month-to-month'),
        ('One year', 'One year'),
        ('Two year', 'Two year'),
    ]
    INTERNET_CHOICES = [
        ('DSL', 'DSL'),
        ('Fiber optic', 'Fiber optic'),
        ('No', 'No'),
    ]
    PAYMENT_CHOICES = [
        ('Electronic check', 'Electronic check'),
        ('Mailed check', 'Mailed check'),
        ('Bank transfer (automatic)', 'Bank transfer (automatic)'),
        ('Credit card (automatic)', 'Credit card (automatic)'),
    ]
    RISK_CHOICES = [('Low', 'Low'), ('Medium', 'Medium'), ('High', 'High')]

    # Identity
    customer_id = models.CharField(max_length=20, unique=True)
    gender = models.CharField(max_length=10, choices=GENDER_CHOICES)
    senior_citizen = models.BooleanField(default=False)
    partner = models.BooleanField(default=False)
    dependents = models.BooleanField(default=False)

    # Service info
    tenure = models.IntegerField(help_text='Months as customer')
    phone_service = models.BooleanField(default=True)
    multiple_lines = models.CharField(max_length=20, default='No')
    internet_service = models.CharField(max_length=20, choices=INTERNET_CHOICES)
    online_security = models.CharField(max_length=20, default='No')
    online_backup = models.CharField(max_length=20, default='No')
    device_protection = models.CharField(max_length=20, default='No')
    tech_support = models.CharField(max_length=20, default='No')
    streaming_tv = models.CharField(max_length=20, default='No')
    streaming_movies = models.CharField(max_length=20, default='No')

    # Contract & billing
    contract = models.CharField(max_length=20, choices=CONTRACT_CHOICES)
    paperless_billing = models.BooleanField(default=False)
    payment_method = models.CharField(max_length=40, choices=PAYMENT_CHOICES)
    monthly_charges = models.FloatField()
    total_charges = models.FloatField()

    # Churn status & ML prediction
    churn = models.BooleanField(default=False)
    churn_risk_score = models.FloatField(null=True, blank=True, help_text='0-100 probability')
    risk_level = models.CharField(max_length=10, choices=RISK_CHOICES, null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.customer_id} — {self.contract} — {"Churned" if self.churn else "Active"}'

    @property
    def status(self):
        return 'Churned' if self.churn else 'Active'
