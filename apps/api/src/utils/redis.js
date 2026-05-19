/**
 * Parse a Redis URL string into IORedis-compatible connection options.
 * Supports both redis:// (plain) and rediss:// (TLS) schemes.
 *
 * @param {string} url - Redis connection URL
 * @returns {{ host: string, port: number, password?: string, tls?: {} }}
 */
export const parseRedisUrl = (url) => {
  const { hostname, port, password, protocol } = new URL(url)
  return {
    host: hostname,
    port: Number(port) || 6379,
    ...(password && { password: decodeURIComponent(password) }),
    ...(protocol === "rediss:" && { tls: {} }),
  }
}
