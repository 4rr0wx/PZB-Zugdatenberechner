import json
import logging
import os
from typing import Any, Dict, Optional

from opentelemetry import metrics, trace
from opentelemetry.exporter.otlp.proto.http.metric_exporter import OTLPMetricExporter
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.instrumentation.logging import LoggingInstrumentor
from opentelemetry.instrumentation.sqlalchemy import SQLAlchemyInstrumentor
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.metrics.export import PeriodicExportingMetricReader
from opentelemetry.sdk.resources import Resource
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor

logger = logging.getLogger(__name__)


def _bool_env(var_name: str, default: bool = False) -> bool:
    value = os.getenv(var_name)
    if value is None:
        return default
    return value.lower() in {"1", "true", "yes", "on"}


def _parse_headers(raw_headers: Optional[str]) -> Dict[str, str]:
    if not raw_headers:
        return {}
    try:
        parsed = json.loads(raw_headers)
        if isinstance(parsed, dict):
            return {str(k): str(v) for k, v in parsed.items()}
    except json.JSONDecodeError:
        pass
    headers: Dict[str, str] = {}
    for item in raw_headers.split(","):
        if "=" in item:
            key, value = item.split("=", 1)
            headers[key.strip()] = value.strip()
    return headers


def configure_telemetry(app, engine) -> None:
    if not _bool_env("ENABLE_OTEL", default=False):
        logger.info("OpenTelemetry disabled (set ENABLE_OTEL=true to enable).")
        return

    endpoint = os.getenv("OTEL_EXPORTER_OTLP_ENDPOINT")
    if not endpoint:
        logger.warning("ENABLE_OTEL is true but OTEL_EXPORTER_OTLP_ENDPOINT is not set; skipping telemetry setup.")
        return

    service_name = os.getenv("OTEL_SERVICE_NAME", "pzbbuilder-backend")
    deployment_env = os.getenv("OTEL_RESOURCE_ATTRIBUTES_DEPLOYMENT_ENV", os.getenv("ENVIRONMENT", "development"))
    resource_attrs = {
        "service.name": service_name,
        "service.version": os.getenv("APP_VERSION", "0.1.0"),
        "deployment.environment": deployment_env,
    }

    extra_resource = os.getenv("OTEL_RESOURCE_ATTRIBUTES")
    if extra_resource:
        for pair in extra_resource.split(","):
            if "=" in pair:
                key, value = pair.split("=", 1)
                resource_attrs[key.strip()] = value.strip()

    resource = Resource(attributes=resource_attrs)

    trace_provider = TracerProvider(resource=resource)
    span_exporter = OTLPSpanExporter(
        endpoint=endpoint,
        headers=_parse_headers(os.getenv("OTEL_EXPORTER_OTLP_HEADERS")),
        insecure=_bool_env("OTEL_EXPORTER_OTLP_INSECURE", default=False),
        timeout=int(os.getenv("OTEL_EXPORTER_OTLP_TIMEOUT", "10")),
    )
    trace_provider.add_span_processor(BatchSpanProcessor(span_exporter))
    trace.set_tracer_provider(trace_provider)

    metric_exporter = OTLPMetricExporter(
        endpoint=endpoint,
        headers=_parse_headers(os.getenv("OTEL_EXPORTER_OTLP_HEADERS")),
        insecure=_bool_env("OTEL_EXPORTER_OTLP_INSECURE", default=False),
        timeout=int(os.getenv("OTEL_EXPORTER_OTLP_TIMEOUT", "10")),
    )
    reader = PeriodicExportingMetricReader(metric_exporter)
    meter_provider = MeterProvider(resource=resource, metric_readers=[reader])
    metrics.set_meter_provider(meter_provider)

    LoggingInstrumentor().instrument(set_logging_format=True)
    FastAPIInstrumentor.instrument_app(app, tracer_provider=trace_provider, meter_provider=meter_provider)
    SQLAlchemyInstrumentor().instrument(
        engine=engine.sync_engine if hasattr(engine, "sync_engine") else engine,
        tracer_provider=trace_provider,
    )

    logger.info("OpenTelemetry configured with endpoint %s", endpoint)
