const SHARE_TOKEN_PATTERN = /^(\/api\/share\/)[^/?#]+/

/**
 * Replaces the public share token in a request URL before the URL goes to a log.
 *
 * @param {string|undefined} url - Request URL, normally `req.originalUrl`
 * @returns {string|undefined} The URL with the token replaced by `[redacted]`
 */
export const redactUrl = (url) => {
  if (!url) return url
  return url.replace(SHARE_TOKEN_PATTERN, "$1[redacted]")
}
