#!/usr/bin/env bash
set -e

echo "========================================================"
echo "  Neumorphic Task Management System - Local Launcher"
echo "========================================================"

if ! command -v python3 &> /dev/null; then
    echo "Error: python3 is not installed."
    exit 1
fi

if [ ! -d ".venv" ]; then
    echo "Creating virtual environment (.venv)..."
    python3 -m venv .venv
fi

source .venv/bin/activate
echo "Installing dependencies..."
pip install -r requirements.txt --quiet

echo ""
echo "Starting Neumorphic Task Manager..."
echo "Application URL: http://localhost:8000"
echo "Swagger API Docs: http://localhost:8000/docs"
echo "Press Ctrl+C to stop the server."
echo "========================================================"
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
