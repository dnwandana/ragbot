import Redis from "ioredis"
import { parseRedisUrl } from "./redis.js"
import logger from "./logger.js"

let client

/**
 * Returns a lazily-created shared ioredis client for the MFA email-OTP,
 * attempt-counter, and TOTP-replay utilities.
 *
 * @returns {import('ioredis').Redis} The Redis client.
 */
export const getClient = () => {
  if (!client) {
    client = new Redis(parseRedisUrl(process.env.REDIS_URL))
    client.on("error", (err) => {
      logger.warn("MFA Redis error", { message: err.message })
    })
  }
  return client
}
