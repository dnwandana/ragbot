import joi from "joi"
import HttpError from "../utils/http-error.js"
import apiResponse from "../utils/response.js"
import { HTTP_STATUS_CODE } from "../utils/constant.js"
import { verifyPassword } from "../utils/argon2.js"
import { generateTotpSecret, buildOtpauthUrl, verifyTotp, getMatchedStep } from "../utils/totp.js"
import { encryptSecret, decryptSecret } from "../utils/totp-crypto.js"
import * as userModel from "../models/users.js"
import * as backupCodes from "../models/mfa-backup-codes.js"
import * as totpReplay from "../utils/mfa-totp-replay.js"
import { assertNotLocked, recordFailedAttempt, recordSuccess } from "../utils/account-lockout.js"

/** Joi schema for password re-auth bodies. */
const passwordSchema = joi
  .object({ password: joi.string().required() })
  .options({ stripUnknown: true })

/** Joi schema for the activate body. */
const codeSchema = joi.object({ code: joi.string().required() }).options({ stripUnknown: true })

/** Joi schema for password + second-factor re-auth bodies. */
const passwordCodeSchema = joi
  .object({ password: joi.string().required(), code: joi.string().required() })
  .options({ stripUnknown: true })

/**
 * Loads the user and verifies their password, throwing 400 on mismatch.
 *
 * @param {string} userId - The authenticated user id.
 * @param {string} password - The submitted password.
 * @returns {Promise<Object>} The user row (with password_hash).
 */
const reauth = async (userId, password) => {
  const user = await userModel.findOneWithPassword({ id: userId })
  if (!user) throw new HttpError(HTTP_STATUS_CODE.NOT_FOUND, "User not found")
  assertNotLocked(user)
  if (!(await verifyPassword(user.password_hash, password))) {
    await recordFailedAttempt(user)
    throw new HttpError(HTTP_STATUS_CODE.BAD_REQUEST, "Password is incorrect")
  }
  await recordSuccess(user.id)
  return user
}

/**
 * Verifies a current second factor for sensitive 2FA changes: a TOTP code first
 * (with replay protection, so a code can't be reused within its validity window),
 * falling back to a single-use backup code.
 *
 * @param {Object} user - User row including `id` and `totp_secret`.
 * @param {string} code - The submitted TOTP or backup code.
 * @returns {Promise<boolean>} True if the code is a valid second factor.
 */
const verifySecondFactor = async (user, code) => {
  if (user.totp_secret) {
    const step = getMatchedStep({ secret: decryptSecret(user.totp_secret), token: code })
    if (step !== null && (await totpReplay.consumeStep(user.id, step))) return true
  }
  return backupCodes.consume(user.id, code)
}

/**
 * GET /api/auth/2fa — Report the caller's 2FA status.
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export const getStatus = async (req, res, next) => {
  try {
    const user = await userModel.findOneWith2fa({ id: req.user.id })
    if (!user) throw new HttpError(HTTP_STATUS_CODE.NOT_FOUND, "User not found")
    const remaining = user.totp_enabled ? await backupCodes.countActive(user.id) : 0
    return res.json(
      apiResponse({
        message: "OK",
        data: {
          enabled: user.totp_enabled,
          enabled_at: user.totp_enabled_at,
          backup_codes_remaining: remaining,
        },
      }),
    )
  } catch (error) {
    return next(error)
  }
}

/**
 * POST /api/auth/2fa/setup — Re-auth, then store a pending (encrypted) TOTP secret.
 *
 * Does NOT enable 2FA — the secret is inert until /activate verifies a code.
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export const setup = async (req, res, next) => {
  try {
    const { error, value } = passwordSchema.validate(req.body)
    if (error) throw new HttpError(HTTP_STATUS_CODE.BAD_REQUEST, error.details[0].message)

    const user = await reauth(req.user.id, value.password)
    const current = await userModel.findOneWith2fa({ id: user.id })
    if (current?.totp_enabled) {
      throw new HttpError(HTTP_STATUS_CODE.CONFLICT, "Two-factor authentication is already enabled")
    }

    const secret = generateTotpSecret()
    await userModel.update(
      { id: user.id },
      { totp_secret: encryptSecret(secret), totp_enabled: false, updated_at: new Date() },
    )

    return res.json(
      apiResponse({
        message: "OK",
        data: { otpauth_url: buildOtpauthUrl({ email: user.email, secret }), secret },
      }),
    )
  } catch (error) {
    return next(error)
  }
}

/**
 * POST /api/auth/2fa/activate — Verify a code against the pending secret and enable 2FA.
 *
 * On success, generates and returns 10 one-time backup codes (shown once).
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export const activate = async (req, res, next) => {
  try {
    const { error, value } = codeSchema.validate(req.body)
    if (error) throw new HttpError(HTTP_STATUS_CODE.BAD_REQUEST, error.details[0].message)

    const user = await userModel.findOneWith2fa({ id: req.user.id })
    if (!user?.totp_secret || user.totp_enabled) {
      throw new HttpError(HTTP_STATUS_CODE.BAD_REQUEST, "No pending two-factor setup")
    }

    const secret = decryptSecret(user.totp_secret)
    if (!verifyTotp({ secret, token: value.code })) {
      throw new HttpError(HTTP_STATUS_CODE.BAD_REQUEST, "Invalid verification code")
    }

    await userModel.update(
      { id: user.id },
      { totp_enabled: true, totp_enabled_at: new Date(), updated_at: new Date() },
    )
    const codes = backupCodes.generateCodes()
    await backupCodes.replaceForUser(user.id, codes)

    return res.json(
      apiResponse({ message: "Two-factor authentication enabled", data: { backup_codes: codes } }),
    )
  } catch (error) {
    return next(error)
  }
}

/**
 * POST /api/auth/2fa/disable — Re-auth, then turn off 2FA and delete secret + backup codes.
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export const disable = async (req, res, next) => {
  try {
    const { error, value } = passwordCodeSchema.validate(req.body)
    if (error) throw new HttpError(HTTP_STATUS_CODE.BAD_REQUEST, error.details[0].message)

    const user = await reauth(req.user.id, value.password)
    const fresh = await userModel.findOneWith2fa({ id: user.id })
    if (!fresh?.totp_enabled) {
      throw new HttpError(HTTP_STATUS_CODE.BAD_REQUEST, "Two-factor authentication is not enabled")
    }
    if (!(await verifySecondFactor(fresh, value.code))) {
      throw new HttpError(HTTP_STATUS_CODE.BAD_REQUEST, "Invalid verification code")
    }
    await userModel.update(
      { id: user.id },
      { totp_secret: null, totp_enabled: false, totp_enabled_at: null, updated_at: new Date() },
    )
    await backupCodes.deleteForUser(user.id)

    return res.json(apiResponse({ message: "Two-factor authentication disabled", data: null }))
  } catch (error) {
    return next(error)
  }
}

/**
 * POST /api/auth/2fa/backup-codes/regenerate — Re-auth, then issue a fresh set of backup codes.
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export const regenerateBackupCodes = async (req, res, next) => {
  try {
    const { error, value } = passwordCodeSchema.validate(req.body)
    if (error) throw new HttpError(HTTP_STATUS_CODE.BAD_REQUEST, error.details[0].message)

    const user = await reauth(req.user.id, value.password)
    const fresh = await userModel.findOneWith2fa({ id: user.id })
    if (!fresh.totp_enabled) {
      throw new HttpError(HTTP_STATUS_CODE.BAD_REQUEST, "Two-factor authentication is not enabled")
    }
    if (!(await verifySecondFactor(fresh, value.code))) {
      throw new HttpError(HTTP_STATUS_CODE.BAD_REQUEST, "Invalid verification code")
    }
    const codes = backupCodes.generateCodes()
    await backupCodes.replaceForUser(user.id, codes)

    return res.json(apiResponse({ message: "OK", data: { backup_codes: codes } }))
  } catch (error) {
    return next(error)
  }
}
