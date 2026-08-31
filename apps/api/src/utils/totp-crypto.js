import crypto from "node:crypto"

const VERSION = "v1"
const ALGORITHM = "aes-256-gcm"
const IV_BYTES = 12

/**
 * Derives a stable 32-byte key from the configured TOTP_ENCRYPTION_KEY env var.
 * Read lazily so env validation has run before first use.
 *
 * @returns {Buffer} 32-byte AES key.
 */
const getKey = () => {
  const raw = process.env.TOTP_ENCRYPTION_KEY
  if (!raw) throw new Error("TOTP_ENCRYPTION_KEY is not set")
  return crypto.createHash("sha256").update(raw).digest()
}

/**
 * Encrypts a plaintext TOTP secret for storage at rest.
 *
 * @param {string} plain - The base32 TOTP secret.
 * @returns {string} `v1:<iv>:<tag>:<ciphertext>` with base64url parts.
 */
export const encryptSecret = (plain) => {
  const iv = crypto.randomBytes(IV_BYTES)
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv)
  const ct = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()])
  const tag = cipher.getAuthTag()
  return [
    VERSION,
    iv.toString("base64url"),
    tag.toString("base64url"),
    ct.toString("base64url"),
  ].join(":")
}

/**
 * Decrypts a payload produced by {@link encryptSecret}.
 *
 * @param {string} payload - The `v1:<iv>:<tag>:<ct>` string.
 * @returns {string} The plaintext TOTP secret.
 * @throws {Error} If the payload is malformed or fails authentication.
 */
export const decryptSecret = (payload) => {
  const parts = String(payload).split(":")
  if (parts.length !== 4 || parts[0] !== VERSION) {
    throw new Error("Invalid TOTP secret payload")
  }
  const [, ivB64, tagB64, ctB64] = parts
  const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), Buffer.from(ivB64, "base64url"))
  decipher.setAuthTag(Buffer.from(tagB64, "base64url"))
  return Buffer.concat([
    decipher.update(Buffer.from(ctB64, "base64url")),
    decipher.final(),
  ]).toString("utf8")
}
