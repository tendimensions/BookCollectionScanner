FROM python:3.13-slim

WORKDIR /app

# Install build tools (needed for greenlet on ARM), then remove them after
COPY requirements.txt .
RUN apt-get update && apt-get install -y --no-install-recommends g++ \
    && pip install --no-cache-dir -r requirements.txt \
    && apt-get remove -y g++ && apt-get autoremove -y \
    && rm -rf /var/lib/apt/lists/*

# Copy application code (admin/dist/ is pre-built by deploy.ps1 before rsync)
COPY . .

EXPOSE 8000

CMD ["python", "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
