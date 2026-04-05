import Fastify, { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { ILoggerPort } from '../ports/logger.port';
import { IAuthPort } from '../ports/auth.port';
import crypto from 'crypto';

export class ServerAdapter {
  private fastify: FastifyInstance;
  private logger: ILoggerPort;
  private authPort: IAuthPort;

  constructor(logger: ILoggerPort, authPort: IAuthPort) {
    this.logger = logger;
    this.authPort = authPort;
    this.fastify = Fastify({ disableRequestLogging: true });
    
    this.setupPlugins();
    this.setupMiddleware();
    this.setupRoutes();
  }

  private async setupPlugins() {
    await this.fastify.register(swagger, {
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

    await this.fastify.register(swaggerUi, {
      routePrefix: '/docs',
      uiConfig: {
        docExpansion: 'full',
        deepLinking: false
      }
    });
  }

  private setupMiddleware() {
    // Generate Correlation ID if missing, and attach to request context
    this.fastify.addHook('onRequest', async (request, reply) => {
      const correlationId = (request.headers['x-correlation-id'] as string) || crypto.randomUUID();
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
        const correlationId = request.headers['x-correlation-id'] as string;
        this.logger.warn(correlationId, `Unauthorized request attempt from ${request.ip}`);
        reply.code(401).send({ error: 'Unauthorized' });
      }
    });

    this.fastify.addHook('onResponse', async (request, reply) => {
      const correlationId = request.headers['x-correlation-id'] as string;
      this.logger.info(correlationId, `Response sent: ${request.method} ${request.url} - Status: ${reply.statusCode}`, { responseTimeMs: reply.elapsedTime });
    });
  }

  private setupRoutes() {
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

  public async start(port: number) {
    try {
      await this.fastify.listen({ port, host: '0.0.0.0' });
      this.logger.info('system', `Server adapter started on port ${port}`);
    } catch (err) {
      this.logger.error('system', `Server failed to start: ${err}`);
      process.exit(1);
    }
  }
}
