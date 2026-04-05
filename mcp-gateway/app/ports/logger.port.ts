export interface LogEntry {
  timestamp?: string; // ISO8601 formatting usually happens in adapter but we can define it
  level: "INFO" | "ERROR" | "WARN" | "DEBUG";
  service_name: string;
  correlation_id: string;
  message: string;
  [key: string]: any;
}

export interface ILoggerPort {
  info(correlation_id: string, message: string, meta?: any): void;
  error(correlation_id: string, message: string, meta?: any): void;
  warn(correlation_id: string, message: string, meta?: any): void;
  debug(correlation_id: string, message: string, meta?: any): void;
}
