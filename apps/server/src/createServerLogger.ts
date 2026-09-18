import { type ILogger, createLogger } from '@ygo-assistant/logger';

import { type AppConfig, NodeEnvironment } from './config/index.js';

const SERVER_LOG_NAME = 'server';

/**
 * Builds the server logger. Production writes rotating files (mirrored to
 * stdout); anything else prints colorized logs to the terminal.
 */
export function createServerLogger(config: AppConfig): ILogger {
  if (config.nodeEnv === NodeEnvironment.Production) {
    return createLogger({
      level: config.logLevel,
      name: SERVER_LOG_NAME,
      file: { directory: config.logDir, fileName: SERVER_LOG_NAME }
    });
  }

  return createLogger({
    level: config.logLevel,
    name: SERVER_LOG_NAME,
    pretty: true
  });
}
