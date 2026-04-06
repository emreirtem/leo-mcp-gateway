import os
import logging
from typing import Optional

from opentelemetry import trace
from opentelemetry.sdk.resources import Resource
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
from opentelemetry.instrumentation.requests import RequestsInstrumentor

logger = logging.getLogger(__name__)
_OTEL_INITIALIZED = False


def init_otel(service_name: str, service_version: Optional[str] = None) -> None:
    """Initialize OpenTelemetry once for the current process."""
    global _OTEL_INITIALIZED
    if _OTEL_INITIALIZED:
        return

    resource = Resource.create(
        {
            "service.name": service_name,
            "service.version": service_version or os.getenv("SERVICE_VERSION", "0.1.0"),
            "deployment.environment": os.getenv("ENVIRONMENT", "development"),
        }
    )

    provider = TracerProvider(resource=resource)
    trace.set_tracer_provider(provider)

    otlp_endpoint = os.getenv("OTEL_EXPORTER_OTLP_ENDPOINT", "http://jaeger:4318")
    traces_endpoint = os.getenv(
        "OTEL_EXPORTER_OTLP_TRACES_ENDPOINT",
        f"{otlp_endpoint.rstrip('/')}/v1/traces",
    )
    exporter = OTLPSpanExporter(endpoint=traces_endpoint)
    provider.add_span_processor(BatchSpanProcessor(exporter))

    # Instrument outgoing HTTP calls from requests library.
    RequestsInstrumentor().instrument()

    _OTEL_INITIALIZED = True
    logger.info("OpenTelemetry initialized for %s -> %s", service_name, traces_endpoint)


def get_tracer(name: str):
    return trace.get_tracer(name)
