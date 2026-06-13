@echo off
echo ============================================
echo  Customer Churn Platform - Backend Setup
echo ============================================
echo.

echo [1/6] Creating virtual environment...
python -m venv venv
if errorlevel 1 (
    echo ERROR: Could not create virtual environment. Is Python installed?
    pause
    exit /b 1
)

echo [2/6] Activating virtual environment...
call venv\Scripts\activate

echo [3/6] Installing dependencies...
pip install -r requirements.txt
if errorlevel 1 (
    echo ERROR: pip install failed.
    pause
    exit /b 1
)

echo [4/6] Running database migrations...
python manage.py makemigrations customers predictions users
python manage.py migrate
if errorlevel 1 (
    echo ERROR: Migration failed.
    pause
    exit /b 1
)

echo [5/6] Seeding database with 1200 synthetic customers...
python manage.py seed_customers
if errorlevel 1 (
    echo ERROR: Seeding failed.
    pause
    exit /b 1
)

echo [6/6] Training Random Forest ML model...
python manage.py train_model
if errorlevel 1 (
    echo ERROR: Model training failed.
    pause
    exit /b 1
)

echo.
echo ============================================
echo  Setup Complete!
echo  Run start.bat to launch the server.
echo  Admin: python manage.py createsuperuser
echo ============================================
pause
