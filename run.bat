@echo off
setlocal
echo ========================================================
echo   Neumorphic Task Management System - Local Launcher
echo ========================================================

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo Error: Python is not installed or not in PATH.
    pause
    exit /b 1
)

REM Check or create virtual environment
if not exist ".venv" (
    echo Creating virtual environment (.venv)...
    python -m venv .venv
)

REM Activate venv
call .venv\Scripts\activate.bat

echo Installing / checking dependencies...
pip install -r requirements.txt --quiet

echo.
echo Starting Neumorphic Task Manager...
echo Application URL: http://localhost:8000
echo Swagger API Docs: http://localhost:8000/docs
echo Press Ctrl+C to stop the server.
echo ========================================================
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
pause
