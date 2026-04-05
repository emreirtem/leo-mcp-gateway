"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PinoLoggerAdapter = void 0;
const pino_1 = __importDefault(require("pino"));
const pinoLogger = (0, pino_1.default)({
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
class PinoLoggerAdapter {
    serviceName;
    constructor(serviceName) {
        this.serviceName = serviceName;
    }
    buildMsg(correlation_id, meta) {
        return {
            service_name: this.serviceName,
            correlation_id,
            ...meta,
        };
    }
    info(correlation_id, message, meta) {
        pinoLogger.info(this.buildMsg(correlation_id, meta), message);
    }
    error(correlation_id, message, meta) {
        pinoLogger.error(this.buildMsg(correlation_id, meta), message);
    }
    warn(correlation_id, message, meta) {
        pinoLogger.warn(this.buildMsg(correlation_id, meta), message);
    }
    debug(correlation_id, message, meta) {
        pinoLogger.debug(this.buildMsg(correlation_id, meta), message);
    }
}
exports.PinoLoggerAdapter = PinoLoggerAdapter;
