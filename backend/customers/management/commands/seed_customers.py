"""
Management command: seed_customers

Generates 1200 realistic synthetic customers with known churn patterns:
- Month-to-month contracts churn ~42%
- One year contracts churn ~12%
- Two year contracts churn ~3%
- Short tenure → higher churn
- High charges → higher churn

Usage:
    python manage.py seed_customers
    python manage.py seed_customers --count 2000
    python manage.py seed_customers --clear
"""

import random
import uuid
from django.core.management.base import BaseCommand
from customers.models import Customer


def weighted_choice(choices, weights):
    total = sum(weights)
    r = random.uniform(0, total)
    running = 0
    for choice, weight in zip(choices, weights):
        running += weight
        if r <= running:
            return choice
    return choices[-1]


def churn_probability(contract, tenure, monthly_charges, internet_service, payment_method, senior):
    """Rule-based churn probability for realistic synthetic data generation."""
    base = 0.15

    # Contract type — biggest predictor
    if contract == 'Month-to-month':
        base += 0.30
    elif contract == 'One year':
        base += 0.02
    else:
        base -= 0.08

    # Tenure — inverse relationship
    if tenure <= 3:
        base += 0.30
    elif tenure <= 6:
        base += 0.20
    elif tenure <= 12:
        base += 0.12
    elif tenure <= 24:
        base += 0.05
    elif tenure >= 48:
        base -= 0.10

    # Monthly charges — high charges → higher churn
    if monthly_charges > 90:
        base += 0.18
    elif monthly_charges > 70:
        base += 0.10
    elif monthly_charges < 30:
        base -= 0.05

    # Internet service — fiber optic customers churn more
    if internet_service == 'Fiber optic':
        base += 0.12
    elif internet_service == 'No':
        base -= 0.05

    # Payment method
    if payment_method == 'Electronic check':
        base += 0.10
    elif payment_method in ['Credit card (automatic)', 'Bank transfer (automatic)']:
        base -= 0.05

    # Senior citizens churn slightly more
    if senior:
        base += 0.05

    return max(0.02, min(0.97, base))


class Command(BaseCommand):
    help = 'Seed the database with realistic synthetic customer churn data'

    def add_arguments(self, parser):
        parser.add_argument('--count', type=int, default=1200, help='Number of customers to create')
        parser.add_argument('--clear', action='store_true', help='Clear existing customers first')

    def handle(self, *args, **options):
        if options['clear']:
            Customer.objects.all().delete()
            self.stdout.write(self.style.WARNING('🗑  Cleared existing customers.'))

        if Customer.objects.count() > 0 and not options['clear']:
            self.stdout.write(self.style.WARNING(
                f'⚠  {Customer.objects.count()} customers already exist. '
                'Use --clear to replace them.'
            ))
            return

        count = options['count']
        self.stdout.write(f'🌱 Generating {count} synthetic customers...')

        contracts = ['Month-to-month', 'One year', 'Two year']
        contract_weights = [0.55, 0.25, 0.20]

        internet_services = ['DSL', 'Fiber optic', 'No']
        internet_weights = [0.34, 0.44, 0.22]

        payment_methods = [
            'Electronic check', 'Mailed check',
            'Bank transfer (automatic)', 'Credit card (automatic)'
        ]
        payment_weights = [0.34, 0.22, 0.22, 0.22]

        genders = ['Male', 'Female']
        customers_to_create = []

        for i in range(count):
            customer_id = f'CUST-{str(uuid.uuid4().hex[:8]).upper()}'
            gender = random.choice(genders)
            senior = random.random() < 0.16
            partner = random.random() < 0.48
            dependents = random.random() < 0.30

            contract = weighted_choice(contracts, contract_weights)
            internet = weighted_choice(internet_services, internet_weights)
            payment = weighted_choice(payment_methods, payment_weights)

            # Tenure depends on contract
            if contract == 'Two year':
                tenure = random.randint(12, 72)
            elif contract == 'One year':
                tenure = random.randint(6, 60)
            else:
                tenure = random.randint(1, 72)

            # Monthly charges depend on internet service
            if internet == 'Fiber optic':
                monthly = round(random.uniform(65, 115), 2)
            elif internet == 'DSL':
                monthly = round(random.uniform(40, 80), 2)
            else:
                monthly = round(random.uniform(18, 45), 2)

            total = round(monthly * tenure * random.uniform(0.9, 1.1), 2)

            # Determine churn based on realistic probability
            prob = churn_probability(contract, tenure, monthly, internet, payment, senior)
            churn = random.random() < prob

            customers_to_create.append(Customer(
                customer_id=customer_id,
                gender=gender,
                senior_citizen=senior,
                partner=partner,
                dependents=dependents,
                tenure=tenure,
                phone_service=random.random() < 0.90,
                multiple_lines='Yes' if random.random() < 0.42 else 'No',
                internet_service=internet,
                online_security='Yes' if random.random() < 0.28 else 'No',
                online_backup='Yes' if random.random() < 0.34 else 'No',
                device_protection='Yes' if random.random() < 0.34 else 'No',
                tech_support='Yes' if random.random() < 0.29 else 'No',
                streaming_tv='Yes' if random.random() < 0.38 else 'No',
                streaming_movies='Yes' if random.random() < 0.39 else 'No',
                contract=contract,
                paperless_billing=random.random() < 0.59,
                payment_method=payment,
                monthly_charges=monthly,
                total_charges=total,
                churn=churn,
            ))

        # Bulk create for performance
        Customer.objects.bulk_create(customers_to_create, batch_size=200)

        total_created = Customer.objects.count()
        churned = Customer.objects.filter(churn=True).count()
        churn_rate = churned / total_created * 100

        self.stdout.write(self.style.SUCCESS(
            f'\n✅ Created {total_created} customers\n'
            f'   Churned: {churned} ({churn_rate:.1f}%)\n'
            f'   Active:  {total_created - churned} ({100 - churn_rate:.1f}%)\n'
            f'\nNext step: python manage.py train_model'
        ))
