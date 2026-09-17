import type { MiddlewareHandler } from 'hono';

import type { ILogger } from '@ygo-assistant/logger';

const CLIENT_ERROR_STATUS = 400;
const SERVER_ERROR_STATUS = 500;

/**
 * Logs one record per request through the injected logger, once the handler
 * has answered. Reading the status after `next` also captures the requests the
 * error boundary answered, which never reach the handler's return. The status
 * decides the level, so a scan of the log shows what a client got.
 *
 * A streamed answer is recorded when the handler hands the stream back, not
 * when the stream ends, so its duration is the time to the first event.
 */
export function requestLogger(logger: ILogger): MiddlewareHandler {
  return async (context, next) => {
    const startedAt = performance.now();

    await next();

    const status = context.res.status;
    const record = {
      method: context.req.method,
      path: context.req.path,
      status,
      durationMs: Math.round(performance.now() - startedAt)
    };

    if (status >= SERVER_ERROR_STATUS) {
      logger.error('Request completed', record);
      return;
    }
    if (status >= CLIENT_ERROR_STATUS) {
      logger.warn('Request completed', record);
      return;
    }
    logger.info('Request completed', record);
  };
}
