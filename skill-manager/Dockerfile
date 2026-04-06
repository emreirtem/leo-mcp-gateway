FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
ENV PYTHONPATH=/app \
    OTEL_EXPORTER_OTLP_ENDPOINT=http://jaeger:4318 \
    OTEL_EXPORTER_OTLP_TRACES_ENDPOINT=http://jaeger:4318/v1/traces \
    ENVIRONMENT=development \
    SERVICE_VERSION=0.1.0
COPY . .
CMD [ "python", "-m", "app.main" ]
