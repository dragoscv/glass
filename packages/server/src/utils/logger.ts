import winston from 'winston';
import { join } from 'path';
import { homedir } from 'os';

export class LoggerService {
  private logger: winston.Logger;
  
  constructor(level = 'info') {
    this.logger = LoggerService.createLogger(level);
  }

  info(message: string, ...meta: unknown[]): void {
    this.logger.info(message, ...meta);
  }

  warn(message: string, ...meta: unknown[]): void {
    this.logger.warn(message, ...meta);
  }

  error(message: string, ...meta: unknown[]): void {
    this.logger.error(message, ...meta);
  }

  debug(message: string, ...meta: unknown[]): void {
    this.logger.debug(message, ...meta);
  }

  public static createLogger(level = 'info'): winston.Logger {
    const logDir = join(homedir(), '.glassmcp', 'logs');

    // Create winston logger with multiple transports
    const logger = winston.createLogger({
      level,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      defaultMeta: {
        service: 'glassmcp-server',
        version: process.env.npm_package_version || '1.0.0',
      },
      transports: [
        // Console transport for development
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple(),
            winston.format.printf(({ timestamp, level: logLevel, message, ...meta }) => {
              const metaStr = Object.keys(meta).length > 0 ? JSON.stringify(meta) : '';
              return `${timestamp} [${logLevel}]: ${message} ${metaStr}`;
            })
          ),
        }),

        // File transport for persistent logging
        new winston.transports.File({
          filename: join(logDir, 'glassmcp.log'),
          maxsize: 10 * 1024 * 1024, // 10MB
          maxFiles: 5,
          tailable: true,
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json()
          ),
        }),

        // Error-specific log file
        new winston.transports.File({
          filename: join(logDir, 'glassmcp-error.log'),
          level: 'error',
          maxsize: 10 * 1024 * 1024, // 10MB
          maxFiles: 3,
          tailable: true,
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json()
          ),
        }),
      ],
    });

    // Handle logging errors
    logger.on('error', (error) => {
      console.error('Logger error:', error);
    });

    return logger;
  }

  public static createAuditLogger(): winston.Logger {
    const logDir = join(homedir(), '.glassmcp', 'logs');

    return winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      defaultMeta: {
        service: 'glassmcp-audit',
        type: 'audit',
      },
      transports: [
        new winston.transports.File({
          filename: join(logDir, 'glassmcp-audit.log'),
          maxsize: 50 * 1024 * 1024, // 50MB
          maxFiles: 10,
          tailable: true,
        }),
      ],
    });
  }
}
