import type { Context, MiddlewareHandler } from 'hono';

import { apiErrorSchema } from '@ygo-assistant/contracts';
import { HttpStatus } from '@ygo-assistant/utils';

import type { AppConfig } from '../config/index.js';

/** The machine itself: the hosts a request may name when nothing is configured. */
const LOOPBACK_HOSTS = ['127.0.0.1', 'localhost', '::1', '::ffff:127.0.0.1'];

/** A bind address that is not a name any client uses. */
const WILDCARD_HOSTS = new Set(['0.0.0.0', '::']);

/**
 * Refuses a request that reached the API under an unknown `Host`, or that
 * carried an `Origin` (or a `Referer`) from somewhere else.
 *
 * It is the checkpoint loopback binding cannot be: binding to the loopback
 * address keeps the network out, but it does not keep a page the user visits
 * from rebinding its DNS to loopback, and a cross-site simple request is sent
 * without ever asking for permission. A request with no `Origin` is left alone,
 * so a non-browser client still works. The check fails closed on a `Host` it
 * cannot read and on an `Origin` it cannot parse.
 */
export function originGuard(config: AppConfig): MiddlewareHandler {
  const allowedHosts = collectAllowedHosts(config);
  const allowedOrigins = new Set(
    (config.corsOrigin ?? []).map(normalizeOrigin)
  );

  return async (context, next) => {
    const host = hostnameFromUrl(context.req.url);
    if (host === undefined || !allowedHosts.has(host)) {
      return refuse(context, 'The request host is not allowed');
    }

    const reference =
      context.req.header('origin') ?? context.req.header('referer');
    if (
      reference !== undefined &&
      !isAllowedOrigin(reference, allowedHosts, allowedOrigins)
    ) {
      return refuse(context, 'The request origin is not allowed');
    }

    await next();
  };
}

/**
 * The hosts a request may name: the loopback forms, the configured hosts, the
 * hostnames of any configured client origins, and the address the operator
 * bound to when it is a real name rather than a wildcard.
 */
function collectAllowedHosts(config: AppConfig): Set<string> {
  const hosts = new Set(LOOPBACK_HOSTS);

  for (const host of config.allowedHosts ?? []) {
    const normalized = normalizeHostname(host);
    if (normalized.length > 0) {
      hosts.add(normalized);
    }
  }

  for (const origin of config.corsOrigin ?? []) {
    const hostname = hostnameFromOrigin(origin);
    if (hostname !== undefined) {
      hosts.add(hostname);
    }
  }

  const bound = normalizeHostname(config.host);
  if (bound.length > 0 && !WILDCARD_HOSTS.has(bound)) {
    hosts.add(bound);
  }

  return hosts;
}

/**
 * An origin is allowed when it is one the operator configured, or when it names
 * an allowed host. The host is compared rather than the full origin because a
 * reverse proxy may present the API under a different port than the browser
 * used, so the port carries no trust here.
 */
function isAllowedOrigin(
  reference: string,
  allowedHosts: Set<string>,
  allowedOrigins: Set<string>
): boolean {
  if (allowedOrigins.has(normalizeOrigin(reference))) {
    return true;
  }

  const hostname = hostnameFromOrigin(reference);
  return hostname !== undefined && allowedHosts.has(hostname);
}

function refuse(context: Context, message: string): Response {
  return context.json(
    apiErrorSchema.parse({ error: message }),
    HttpStatus.Forbidden
  );
}

/**
 * The hostname the request named, read from the URL the runtime built. The node
 * adapter builds that URL from the `Host` header and rejects a malformed one, so
 * this is the header's value with the port and any IPv6 brackets stripped.
 */
function hostnameFromUrl(url: string): string | undefined {
  try {
    return normalizeHostname(new URL(url).hostname);
  } catch {
    return undefined;
  }
}

function hostnameFromOrigin(origin: string): string | undefined {
  try {
    return normalizeHostname(new URL(origin).hostname);
  } catch {
    return undefined;
  }
}

function normalizeOrigin(origin: string): string {
  try {
    const url = new URL(origin);
    return `${url.protocol}//${url.host}`;
  } catch {
    return origin.trim().toLowerCase();
  }
}

function normalizeHostname(hostname: string): string {
  const trimmed = hostname.trim().toLowerCase();
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    return trimmed.slice(1, -1);
  }

  return trimmed;
}
