FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements & install
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code
COPY . .

# Expose port
EXPOSE 8000

# Run both the API and the background scraper scheduler
CMD ["sh", "-c", "python -m nepse_alert.cli ingest && (python -m nepse_alert.cli scheduler &) && python -m nepse_alert.cli serve"]
