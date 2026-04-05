import pino from 'pino';
import { ILoggerPort } from '../ports/logger.port';

const pinoLogger = pino({
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level: (label) => {
      return { level: label.toUpperCase() };
    },
    bindings: () => {
      return {}; // removes pid and hostname
    }
  },
  timestamp: () => `,"timestamp":"${new Date().toISOString()}"`,
  messageKey: 'message',
});

export class PinoLoggerAdapter implements ILoggerPort {
  private serviceName: string;

  constructor(serviceName: string) {
    this.serviceName = serviceName;
  }

  private buildMsg(correlation_id: string, meta?: any) {
    return {
      service_name: this.serviceName,
      correlation_id,
      ...meta,
    };
  }

  info(correlation_id: string, message: string, meta?: any): void {
    pinoLogger.info(this.buildMsg(correlation_id, meta), message);
  }

  error(correlation_id: string, message: string, meta?: any): void {
    pinoLogger.error(this.buildMsg(correlation_id, meta), message);
  }

  warn(correlation_id: string, message: string, meta?: any): void {
    pinoLogger.warn(this.buildMsg(correlation_id, meta), message);
  }

  debug(correlation_id: string, message: string, meta?: any): void {
    pinoLogger.debug(this.buildMsg(correlation_id, meta), message);
  }
}
