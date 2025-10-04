# Backend Dockerfile (Flask)
FROM python:3.11-slim

# System deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    poppler-utils \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Leverage docker layer caching for deps
COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

# App source
COPY . /app

# Default environment
ENV PYTHONUNBUFFERED=1 \
    FLASK_ENV=development \
    PORT=5000

EXPOSE 5000

# Run the Flask app (ensure app.py binds to 0.0.0.0:5000)
CMD ["python", "app.py"]
