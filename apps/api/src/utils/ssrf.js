import net from "node:net"
import { lookup } from "node:dns/promises"
import HttpError from "./http-error.js"
import { HTTP_STATUS_CODE } from "./constant.js"

/**
 * Returns true if the IP literal is loopback, private, link-local, unspecified,
 * or otherwise non-public (IPv4 or IPv6).
 *
 * @param {string} ip - IP address literal
 * @returns {boolean} True if the address must not be reached server-side
 */
export const isPrivateIp = (ip) => {
  const type = net.isIP(ip)
  if (type === 4) {
    const [a, b] = ip.split(".").map(Number)
    if (a === 0 || a === 10 || a === 127) return true
    if (a === 169 && b === 254) return true // link-local incl. cloud metadata 169.254.169.254
    if (a === 172 && b >= 16 && b <= 31) return true
    if (a === 192 && b === 168) return true
    return false
  }
  if (type === 6) {
    const addr = ip.toLowerCase()
    if (addr === "::1" || addr === "::") return true
    if (addr.startsWith("fe80") || addr.startsWith("fc") || addr.startsWith("fd")) return true
    const mapped = addr.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/)
    if (mapped) return isPrivateIp(mapped[1])
    const hexMapped = addr.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/)
    if (hexMapped) {
      const high = parseInt(hexMapped[1], 16)
      const low = parseInt(hexMapped[2], 16)
      const a = (high >> 8) & 0xff
      const b = high & 0xff
      const c = (low >> 8) & 0xff
      const d = low & 0xff
      return isPrivateIp(`${a}.${b}.${c}.${d}`)
    }
    return false
  }
  return false
}

/**
 * Assert a user-supplied URL is safe to fetch server-side: http(s) scheme and a
 * non-loopback/private/link-local host. Hostnames are DNS-resolved so names that
 * point at internal addresses are also rejected.
 *
 * @param {string} url - The URL to validate
 * @returns {Promise<void>}
 * @throws {HttpError} 400 if malformed, non-http(s), unresolvable, or private-targeting
 */
export const assertPublicHttpUrl = async (url) => {
  let parsed
  try {
    parsed = new URL(url)
  } catch {
    throw new HttpError(HTTP_STATUS_CODE.BAD_REQUEST, "Invalid URL")
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new HttpError(HTTP_STATUS_CODE.BAD_REQUEST, "URL must use http or https")
  }

  const host = parsed.hostname.replace(/^\[|\]$/g, "").toLowerCase()
  if (host === "localhost" || host.endsWith(".localhost")) {
    throw new HttpError(HTTP_STATUS_CODE.BAD_REQUEST, "URL host is not allowed")
  }

  if (net.isIP(host)) {
    if (isPrivateIp(host)) {
      throw new HttpError(HTTP_STATUS_CODE.BAD_REQUEST, "URL host is not allowed")
    }
    return
  }

  let addresses
  try {
    addresses = await lookup(host, { all: true })
  } catch {
    throw new HttpError(HTTP_STATUS_CODE.BAD_REQUEST, "URL host could not be resolved")
  }
  if (addresses.some((a) => isPrivateIp(a.address))) {
    throw new HttpError(HTTP_STATUS_CODE.BAD_REQUEST, "URL host is not allowed")
  }
}
