@echo off
echo Starting Django development server...
call venv\Scripts\activate
echo Server running at: http://localhost:8000
echo API root:          http://localhost:8000/api/
echo Admin panel:       http://localhost:8000/admin/
echo.
python manage.py runserver
