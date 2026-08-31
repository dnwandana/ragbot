import { authenticator } from "otplib"

// Allow ±1 time-step (±30s) to tolerate device/server clock skew.
authenticator.options = { window: 1 }

/**
 * Generates a new base32 TOTP secret.
 *
 * @returns {string} The base32-encoded secret.
 */
export const generateTotpSecret = () => authenticator.generateSecret()

/**
 * Builds an otpauth:// provisioning URI for QR rendering.
 *
 * @param {Object} params
 * @param {string} params.email - The account label shown in the authenticator app.
 * @param {string} params.secret - The base32 TOTP secret.
 * @returns {string} The otpauth URI.
 */
export const buildOtpauthUrl = ({ email, secret }) =>
  authenticator.keyuri(email, process.env.TOTP_ISSUER || "RAGbot", secret)

/**
 * Verifies a 6-digit TOTP token against a secret (±1 step window).
 *
 * @param {Object} params
 * @param {string} params.secret - The base32 TOTP secret.
 * @param {string} params.token - The 6-digit code from the authenticator app.
 * @returns {boolean} True if the token is valid.
 */
export const verifyTotp = ({ secret, token }) => {
  try {
    return authenticator.verify({ token: String(token).trim(), secret })
  } catch {
    return false
  }
}

/**
 * Returns the absolute TOTP time-step that a valid token matches (accounting for
 * the ±1-step window), or null if the token is invalid. Used to prevent replay.
 *
 * @param {Object} params
 * @param {string} params.secret - The base32 TOTP secret.
 * @param {string} params.token - The 6-digit code from the authenticator app.
 * @returns {number|null} The matched absolute time-step, or null.
 */
export const getMatchedStep = ({ secret, token }) => {
  try {
    const delta = authenticator.checkDelta(String(token).trim(), secret)
    if (delta === null) return null
    return Math.floor(Date.now() / 1000 / (authenticator.options.step || 30)) + delta
  } catch {
    return null
  }
}
