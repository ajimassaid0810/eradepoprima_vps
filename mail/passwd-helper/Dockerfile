# ==============================================================================
# SECURE INTERNAL PASSWORD MEDIATOR CONTAINER
# ==============================================================================
FROM python:3.12-alpine

WORKDIR /app

# Install minimal dependencies for cryptographic hashing
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy server code
COPY server.py .
RUN chmod +x server.py

EXPOSE 8000

HEALTHCHECK --interval=20s --timeout=3s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/healthz')" || exit 1

CMD ["python", "server.py"]
