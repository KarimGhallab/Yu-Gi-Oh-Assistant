import type { ILogger } from '@ygo-assistant/logger';

const LOOPBACK_HOSTS = new Set([
  '127.0.0.1',
  'localhost',
  '::1',
  '::ffff:127.0.0.1'
]);

/**
 * Whether the host only accepts connections from the local machine.
 */
export function isLoopbackHost(host: string): boolean {
  return LOOPBACK_HOSTS.has(host);
}

/**
 * Records where the server bound. A non-loopback address exposes the
 * unauthenticated conversation history, so it is worth a warning.
 */
export function logBinding(logger: ILogger, host: string): void {
  if (isLoopbackHost(host)) {
    logger.info('Server bound to loopback', { host });
    return;
  }

  logger.warn(
    'Server bound to a non-loopback address. Conversation history is unauthenticated.',
    { host }
  );
}
