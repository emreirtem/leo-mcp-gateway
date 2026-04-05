import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { FastifyInstrumentation } from '@opentelemetry/instrumentation-fastify';

export function setupOpenTelemetry(serviceName: string) {
  // Set the service name so it works by default
  process.env.OTEL_SERVICE_NAME = serviceName;

  const sdk = new NodeSDK({
    traceExporter: new OTLPTraceExporter({
      url: process.env.OTLP_ENDPOINT || 'http://jaeger:4318/v1/traces',
    }),
    instrumentations: [
      new FastifyInstrumentation()
    ]
  });

  sdk.start();

  // graceful shutdown
  process.on('SIGTERM', () => {
    sdk.shutdown()
      .then(() => console.log('Tracing terminated'))
      .catch((error) => console.log('Error terminating tracing', error))
      .finally(() => process.exit(0));
  });

  return sdk;
}

