FROM python:3.13-slim

WORKDIR /app

# Install dependencies first for better layer caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Build React admin if source is present
RUN if [ -d "admin" ] && [ -f "admin/package.json" ]; then \
      apt-get update && apt-get install -y nodejs npm && \
      cd admin && npm ci && npm run build && \
      apt-get remove -y nodejs npm && apt-get autoremove -y && \
      rm -rf /var/lib/apt/lists/* /root/.npm; \
    fi

EXPOSE 8000

CMD ["python", "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
