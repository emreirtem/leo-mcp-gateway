"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupOpenTelemetry = setupOpenTelemetry;
const sdk_node_1 = require("@opentelemetry/sdk-node");
const exporter_trace_otlp_http_1 = require("@opentelemetry/exporter-trace-otlp-http");
const instrumentation_fastify_1 = require("@opentelemetry/instrumentation-fastify");
function setupOpenTelemetry(serviceName) {
    // Set the service name so it works by default
    process.env.OTEL_SERVICE_NAME = serviceName;
    const sdk = new sdk_node_1.NodeSDK({
        traceExporter: new exporter_trace_otlp_http_1.OTLPTraceExporter({
            url: process.env.OTLP_ENDPOINT || 'http://jaeger:4318/v1/traces',
        }),
        instrumentations: [
            new instrumentation_fastify_1.FastifyInstrumentation()
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
