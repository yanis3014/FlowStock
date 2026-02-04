import winston from 'winston';
import path from 'path';
import { existsSync, mkdirSync } from 'fs';

const logDir = process.env.LOG_DIR || path.join(process.cwd(), 'logs');
const isTest = process.env.NODE_ENV === 'test';
const isProduction = process.env.NODE_ENV === 'production';

// Format JSON pour fichiers / production
const jsonFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.metadata({ fillExcept: ['message', 'level', 'timestamp', 'label'] }),
  winston.format.json()
);

// Format console (développement)
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, metadata }) => {
    const meta = metadata && Object.keys(metadata).length ? ` ${JSON.stringify(metadata)}` : '';
    return `${timestamp} [${level}]: ${message}${meta}`;
  })
);

const transports: winston.transport[] = [];

// Console : toujours en dev/test ; en prod si LOG_CONSOLE ou pas de LOG_DIR (fallback)
const useConsole = !isProduction || process.env.LOG_CONSOLE === 'true' || !process.env.LOG_DIR;
if (useConsole) {
  transports.push(
    new winston.transports.Console({
      format: isProduction ? jsonFormat : consoleFormat,
      level: process.env.LOG_LEVEL || (isTest ? 'warn' : 'info'),
    })
  );
}

// Fichiers : en production quand LOG_DIR est défini
if (isProduction && !isTest && process.env.LOG_DIR) {
  if (!existsSync(logDir)) {
    mkdirSync(logDir, { recursive: true });
  }
  transports.push(
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    new winston.transports.File({
      filename: path.join(logDir, 'combined.log'),
      maxsize: 5242880,
      maxFiles: 5,
    })
  );
}

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || (isTest ? 'warn' : 'info'),
  format: jsonFormat,
  defaultMeta: { service: 'bmad-api' },
  transports,
});

/** Logger une erreur avec contexte */
export function logError(error: unknown, context?: Record<string, unknown>): void {
  if (error instanceof Error) {
    logger.error(error.message, {
      ...context,
      stack: error.stack,
      name: error.name,
    });
  } else {
    logger.error('Unknown error', { error, ...context });
  }
}

/** Logger une requête HTTP (optionnel) */
export function logRequest(
  req: { method: string; url?: string; ip?: string; get?: (name: string) => string },
  duration?: number
): void {
  logger.info('HTTP Request', {
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get?.('user-agent'),
    durationMs: duration,
  });
}

export default logger;
