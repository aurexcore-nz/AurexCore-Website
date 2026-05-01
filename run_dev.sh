#!/bin/bash
# Aurex Core — Development server startup
# Usage: ./run_dev.sh

set -e
cd "$(dirname "$0")"

echo "Activating virtual environment..."
source venv/bin/activate

echo "Building Tailwind CSS..."
./node_modules/.bin/tailwindcss -i ./static/css/src.css -o ./static/css/main.css

echo "Running migrations..."
python manage.py migrate --run-syncdb

echo "Starting Django dev server on http://127.0.0.1:8000"
python manage.py runserver
