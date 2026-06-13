@echo off
REM Quick Setup Script for MLOps Churn Prediction Platform (Windows)
REM This script automates the initial setup process

echo.
echo =========================================
echo MLOps Churn Prediction Platform Setup
echo =========================================
echo.

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python is not installed or not in PATH
    echo Please install Python 3.9+ and add it to your PATH
    pause
    exit /b 1
)

echo [1/6] Installing Python dependencies...
cd backend
pip install -r requirements.txt
if errorlevel 1 (
    echo ERROR: Failed to install dependencies
    pause
    exit /b 1
)

echo.
echo [2/6] Creating database migrations...
python manage.py makemigrations predictions
if errorlevel 1 (
    echo ERROR: Failed to create migrations
    pause
    exit /b 1
)

echo.
echo [3/6] Applying database migrations...
python manage.py migrate
if errorlevel 1 (
    echo ERROR: Failed to apply migrations
    pause
    exit /b 1
)

echo.
echo [4/6] Collecting static files...
python manage.py collectstatic --noinput
if errorlevel 1 (
    echo WARNING: Failed to collect static files (may not be critical)
)

echo.
echo =========================================
echo Setup Complete!
echo =========================================
echo.
echo Next steps:
echo.
echo 1. Start Redis (in a new terminal):
echo    - Option A: redis-server
echo    - Option B: docker run -d -p 6379:6379 redis:latest
echo.
echo 2. Create a superuser (optional):
echo    python manage.py createsuperuser
echo.
echo 3. Start Django development server:
echo    python manage.py runserver
echo.
echo 4. In a separate terminal, start Celery worker:
echo    celery -A config worker -l info
echo.
echo 5. In another terminal, start Celery beat (scheduler):
echo    celery -A config beat -l info
echo.
echo 6. Access the platform:
echo    - Backend API: http://localhost:8000/api/
echo    - Admin Panel: http://localhost:8000/admin/
echo.
echo Documentation: See IMPLEMENTATION_GUIDE.md for detailed API docs
echo.
pause
