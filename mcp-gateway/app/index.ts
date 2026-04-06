import * as dotenv from 'dotenv';
import { PinoLoggerAdapter } from './adapters/pino-logger.adapter';
import { AuthAdapter } from './adapters/auth.adapter';
import { ServerAdapter } from './adapters/server.adapter';

dotenv.config();

async function bootstrap() {
  const logger = new PinoLoggerAdapter('mcp-gateway');
  const authPort = new AuthAdapter();
  
  const server = new ServerAdapter(logger, authPort);

  const port = parseInt(process.env.PORT || '3000', 10);
  
  await server.start(port);
}

bootstrap();
