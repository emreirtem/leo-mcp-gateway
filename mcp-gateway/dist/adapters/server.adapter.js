"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServerAdapter = void 0;
const fastify_1 = __importDefault(require("fastify"));
const swagger_1 = __importDefault(require("@fastify/swagger"));
const swagger_ui_1 = __importDefault(require("@fastify/swagger-ui"));
const crypto_1 = __importDefault(require("crypto"));
class ServerAdapter {
    fastify;
    logger;
    authPort;
    constructor(logger, authPort) {
        this.logger = logger;
        this.authPort = authPort;
        this.fastify = (0, fastify_1.default)({ disableRequestLogging: true });
        this.setupPlugins();
        this.setupMiddleware();
        this.setupRoutes();
    }
    async setupPlugins() {
        await this.fastify.register(swagger_1.default, {
            openapi: {
                info: {
                    title: 'Leo MCP Gateway',
                    description: 'Model Context Protocol Gateway API',
                    version: '1.0.0'
                },
                components: {
                    securitySchemes: {
                        apiKey: {
                            type: 'apiKey',
                            name: 'x-api-key',
                            in: 'header'
                        },
                        bearerAuth: {
                            type: 'http',
                            scheme: 'bearer',
                            bearerFormat: 'JWT'
                        }
                    }
                }
            }
        });
        await this.fastify.register(swagger_ui_1.default, {
            routePrefix: '/docs',
            uiConfig: {
                docExpansion: 'full',
                deepLinking: false
            }
        });
    }
    setupMiddleware() {
        // Generate Correlation ID if missing, and attach to request context
        this.fastify.addHook('onRequest', async (request, reply) => {
            const correlationId = request.headers['x-correlation-id'] || crypto_1.default.randomUUID();
            request.headers['x-correlation-id'] = correlationId;
            this.logger.info(correlationId, `Incoming request: ${request.method} ${request.url}`);
        });
        // Auth validation on requests (except /docs and /health)
        this.fastify.addHook('preHandler', async (request, reply) => {
            if (request.url.startsWith('/docs') || request.url.startsWith('/health')) {
                return; // skip auth for public endpoints
            }
            const isAuthorized = await this.authPort.verify(request);
            if (!isAuthorized) {
                const correlationId = request.headers['x-correlation-id'];
                this.logger.warn(correlationId, `Unauthorized request attempt from ${request.ip}`);
                reply.code(401).send({ error: 'Unauthorized' });
            }
        });
        this.fastify.addHook('onResponse', async (request, reply) => {
            const correlationId = request.headers['x-correlation-id'];
            this.logger.info(correlationId, `Response sent: ${request.method} ${request.url} - Status: ${reply.statusCode}`, { responseTimeMs: reply.elapsedTime });
        });
    }
    setupRoutes() {
        this.fastify.get('/health', async () => {
            return { status: 'ok' };
        });
        // Example protected route connecting to other services later
        this.fastify.post('/api/v1/mcp', {
            schema: {
                description: 'MCP Tool or Resource execution endpoint',
                tags: ['mcp'],
                security: [{ apiKey: [] }, { bearerAuth: [] }]
            }
        }, async (request, reply) => {
            return { message: "MCP Request received" };
        });
    }
    async start(port) {
        try {
            await this.fastify.listen({ port, host: '0.0.0.0' });
            this.logger.info('system', `Server adapter started on port ${port}`);
        }
        catch (err) {
            this.logger.error('system', `Server failed to start: ${err}`);
            process.exit(1);
        }
    }
}
exports.ServerAdapter = ServerAdapter;
