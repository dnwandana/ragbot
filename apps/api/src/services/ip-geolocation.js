import { isPrivateIp } from "../utils/ssrf.js"
import logger from "../utils/logger.js"

const ENDPOINT = "https://api.ipgeolocation.io/v3/ipgeo"

/**
 * Resolves an IP address to a "City, CC" label via ipgeolocation.io.
 *
 * Fail-soft by design: returns null for private/loopback IPs, a missing API
 * key, a non-OK response, or any network/timeout error — callers must never
 * let a geo failure break the flow they sit in (e.g. signin).
 *
 * @param {string} ip - The IPv4/IPv6 address to look up.
 * @returns {Promise<string|null>} "City, CC" or null.
 */
export const lookupLocation = async (ip) => {
  const apiKey = process.env.IPGEOLOCATION_API_KEY
  if (!ip || !apiKey || isPrivateIp(ip)) return null

  try {
    const url = `${ENDPOINT}?apiKey=${encodeURIComponent(apiKey)}&ip=${encodeURIComponent(ip)}&fields=location`
    const res = await fetch(url, {
      signal: AbortSignal.timeout(Number(process.env.IPGEOLOCATION_TIMEOUT_MS)),
    })
    if (!res.ok) return null

    const body = await res.json()
    const city = body?.location?.city
    const country = body?.location?.country_code2
    if (!city || !country) return null

    return `${city}, ${country}`
  } catch (err) {
    logger.warn("IP geolocation lookup failed", { ip, message: err.message })
    return null
  }
}
