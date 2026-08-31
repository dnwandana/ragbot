import crypto from "node:crypto"
import { createHash } from "node:crypto"
import { timingSafeEqual } from "node:crypto"
import { getClient } from "./redis-client.js"

const TTL_SECONDS = 5 * 60
const COOLDOWN_SECONDS = 30
const keyFor = (userId) => `mfa:email:${userId}`
const cooldownKey = (userId) => `mfa:email:cooldown:${userId}`
const hash = (code) => createHash("sha256").update(code).digest("hex")

/**
 * Issues a 6-digit email OTP, stores its hash in Redis (5-min TTL), sets a resend cooldown.
 *
 * @param {string} userId - The user UUID.
 * @returns {Promise<string>} The plaintext 6-digit code (to email to the user).
 */
export const issue = async (userId) => {
  const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, "0")
  const redis = getClient()
  await redis.set(keyFor(userId), hash(code), "EX", TTL_SECONDS)
  await redis.set(cooldownKey(userId), "1", "EX", COOLDOWN_SECONDS)
  return code
}

/**
 * Verifies an email OTP and deletes it on success. Single-use is enforced
 * atomically: DEL arbitrates between concurrent verifiers, so at most one
 * caller can get true per issued code.
 *
 * @param {string} userId - The user UUID.
 * @param {string} code - The submitted 6-digit code.
 * @returns {Promise<boolean>} True if valid.
 */
export const verify = async (userId, code) => {
  const redis = getClient()
  const stored = await redis.get(keyFor(userId))
  if (!stored) return false
  const a = Buffer.from(stored, "hex")
  const b = Buffer.from(hash(String(code).trim()), "hex")
  if (a.length !== b.length || a.length === 0 || !timingSafeEqual(a, b)) return false
  // DEL's return value is atomic — exactly one concurrent verifier gets 1,
  // closing the GET-then-DEL race (CWE-367). A failed compare never deletes.
  return (await redis.del(keyFor(userId))) === 1
}

/**
 * Seconds remaining before another email OTP can be requested.
 *
 * @param {string} userId - The user UUID.
 * @returns {Promise<number>} Cooldown seconds (0 if none).
 */
export const cooldownRemaining = async (userId) => {
  const ttl = await getClient().ttl(cooldownKey(userId))
  return ttl > 0 ? ttl : 0
}
