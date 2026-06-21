import crypto from "node:crypto"
import joi from "joi"
import db from "../config/database.js"
import HttpError from "../utils/http-error.js"
import apiResponse from "../utils/response.js"
import { HTTP_STATUS_CODE } from "../utils/constant.js"
import { hashPassword, verifyPassword } from "../utils/argon2.js"
import { generateAccessToken, generateRefreshToken } from "../utils/jwt.js"
import { setAccessTokenCookie, setRefreshTokenCookie, clearAuthCookies } from "../utils/cookies.js"
import * as userModel from "../models/users.js"
import * as refreshTokenModel from "../models/refresh-tokens.js"
import * as emailTokenModel from "../models/email-tokens.js"
import * as emailService from "../services/email.js"
import { lookupLocation } from "../services/ip-geolocation.js"
import { denySession } from "../utils/session-denylist.js"
const MAX_FAILED_ATTEMPTS = 5
const LOCKOUT_DURATION_MS = 15 * 60 * 1000

// Pre-computed dummy hash for timing-safe signin.
// Ensures verifyPassword always runs, even when the user doesn't exist,
// so response times don't reveal whether an email is registered.
const dummyHash = await hashPassword("dummy-timing-safe-password")

/**
 * Parses a duration string (e.g. "15m", "7d") into an absolute expiry Date.
 * Falls back to 7 days from now if the format doesn't match.
 *
 * @param {string} duration - Duration string in the format `<number><unit>` (s/m/h/d).
 * @returns {Date} The absolute expiry timestamp.
 */
const parseExpiresIn = (duration) => {
  const match = duration.match(/^(\d+)([smhd])$/)
  if (!match) return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

  const value = parseInt(match[1])
  const unit = match[2]
  const ms = { s: 1000, m: 60000, h: 3600000, d: 86400000 }[unit]
  return new Date(Date.now() + value * ms)
}

/** Joi schema for signup request body. */
const signupSchema = joi
  .object({
    email: joi.string().email().lowercase().required(),
    password: joi.string().min(8).max(72).required(),
    confirmation_password: joi.valid(joi.ref("password")).required().messages({
      "any.only": "Passwords do not match",
    }),
    full_name: joi.string().min(1).max(100).required(),
  })
  .options({ stripUnknown: true })

/** Joi schema for signin request body. */
const signinSchema = joi
  .object({
    email: joi.string().email().lowercase().required(),
    password: joi.string().required(),
  })
  .options({ stripUnknown: true })

/** Joi schema for email verification request body. */
const verifyEmailSchema = joi
  .object({ token: joi.string().required() })
  .options({ stripUnknown: true })

/** Joi schema for resend verification request body. */
const resendVerificationSchema = joi
  .object({ email: joi.string().email().lowercase().required() })
  .options({ stripUnknown: true })

/** Joi schema for forgot password request body. */
const forgotPasswordSchema = joi
  .object({ email: joi.string().email().lowercase().required() })
  .options({ stripUnknown: true })

/** Joi schema for reset password request body. */
const resetPasswordSchema = joi
  .object({
    token: joi.string().required(),
    password: joi.string().min(8).max(72).required(),
    confirmation_password: joi.valid(joi.ref("password")).required().messages({
      "any.only": "Passwords do not match",
    }),
  })
  .options({ stripUnknown: true })

const VALID_TIMEZONES = Intl.supportedValuesOf("timeZone")

/** Joi schema for profile update request body. */
const updateProfileSchema = joi
  .object({
    full_name: joi.string().min(1).max(100).required(),
    timezone: joi
      .string()
      .valid(...VALID_TIMEZONES)
      .required(),
  })
  .options({ stripUnknown: true })

/** Joi schema for password change request body. */
const changePasswordSchema = joi
  .object({
    current_password: joi.string().required(),
    new_password: joi.string().min(8).max(72).required(),
  })
  .options({ stripUnknown: true })

/**
 * Generates a 64-character hex token for email verification flows.
 *
 * @returns {string} Random hex string.
 */
const generateEmailToken = () => crypto.randomBytes(32).toString("hex")

/**
 * Creates a brand-new session: persists the refresh-token hash with request
 * metadata (UA, IP, optional geo), then issues an access token bound to that
 * session id. Used on signin and after a password change.
 *
 * @param {Object} params
 * @param {Object} params.req - Express request (for UA + IP).
 * @param {Object} params.res - Express response (for cookies).
 * @param {string} params.userId - The user UUID to issue tokens for.
 * @returns {Promise<void>}
 */
const issueTokenPair = async ({ req, res, userId }) => {
  const refreshToken = generateRefreshToken(userId)
  const tokenHash = refreshTokenModel.hashToken(refreshToken)

  const ip = req.ip
  const location = process.env.IP_GEOLOCATION_ENABLED === "true" ? await lookupLocation(ip) : null

  const [session] = await refreshTokenModel.create({
    user_id: userId,
    token_hash: tokenHash,
    expires_at: parseExpiresIn(process.env.REFRESH_TOKEN_EXPIRES_IN),
    user_agent: req.headers["user-agent"] ?? null,
    ip_address: ip ?? null,
    location,
  })

  const accessToken = generateAccessToken(userId, session.id)

  setAccessTokenCookie(res, accessToken)
  setRefreshTokenCookie(res, refreshToken)
}

/**
 * Rotates an existing session's tokens in place — the session id (and its row)
 * stays stable so the session remains listable across refreshes.
 *
 * @param {Object} params
 * @param {Object} params.res - Express response (for cookies).
 * @param {string} params.userId - The user UUID.
 * @param {string} params.sessionId - The existing session (refresh_tokens) id.
 * @returns {Promise<void>}
 */
const rotateSessionTokens = async ({ res, userId, sessionId }) => {
  const refreshToken = generateRefreshToken(userId)
  const tokenHash = refreshTokenModel.hashToken(refreshToken)

  await refreshTokenModel.rotate({
    id: sessionId,
    token_hash: tokenHash,
    expires_at: parseExpiresIn(process.env.REFRESH_TOKEN_EXPIRES_IN),
  })

  const accessToken = generateAccessToken(userId, sessionId)

  setAccessTokenCookie(res, accessToken)
  setRefreshTokenCookie(res, refreshToken)
}

/**
 * Denylists every active session for a user so their access tokens stop working
 * immediately (used on password change, account deletion, and password reset).
 *
 * @param {string} userId - User UUID.
 * @returns {Promise<void>}
 */
const denyAllSessions = async (userId) => {
  const ids = await refreshTokenModel.findActiveIdsByUserId(userId)
  await Promise.all(ids.map((id) => denySession(id)))
}

/**
 * POST /api/auth/signup — Register a new user account.
 *
 * Creates the user with a hashed password, generates an email verification token,
 * and sends a verification email via Brevo. Returns user data without tokens.
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export const signup = async (req, res, next) => {
  try {
    const { error, value } = signupSchema.validate(req.body)
    if (error) throw new HttpError(HTTP_STATUS_CODE.BAD_REQUEST, error.details[0].message)

    const { email, password, full_name } = value

    const existing = await userModel.findOne({ email })
    if (existing) throw new HttpError(HTTP_STATUS_CODE.BAD_REQUEST, "Email already registered")

    const password_hash = await hashPassword(password)
    const userId = crypto.randomUUID()
    const [user] = await userModel.create({
      id: userId,
      email,
      password_hash,
      full_name,
      email_verified: false,
      created_at: new Date(),
      updated_at: new Date(),
    })

    const rawToken = generateEmailToken()
    const tokenHash = emailTokenModel.hashToken(rawToken)
    await emailTokenModel.create({
      id: crypto.randomUUID(),
      user_id: userId,
      token_hash: tokenHash,
      type: "verify_email",
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
      created_at: new Date(),
    })
    const verificationUrl = `${process.env.APP_URL}/verify-email?token=${rawToken}`
    await emailService.sendVerificationEmail({
      toEmail: email,
      fullName: full_name,
      verificationUrl,
    })

    return res.status(HTTP_STATUS_CODE.CREATED).json(
      apiResponse({
        message: "Account created. Please check your email to verify your account.",
        data: { id: user.id, email: user.email, full_name: user.full_name },
      }),
    )
  } catch (error) {
    return next(error)
  }
}

/**
 * POST /api/auth/verify-email — Verify a user's email address.
 *
 * Validates the token from the verification link, marks the user as verified,
 * and expires the token. Tokens are SHA-256 hashed and expire after 24 hours.
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export const verifyEmail = async (req, res, next) => {
  try {
    const { error, value } = verifyEmailSchema.validate(req.body)
    if (error) throw new HttpError(HTTP_STATUS_CODE.BAD_REQUEST, error.details[0].message)

    const tokenHash = emailTokenModel.hashToken(value.token)
    const record = await emailTokenModel.findActiveByHash(tokenHash, "verify_email")
    if (!record)
      throw new HttpError(HTTP_STATUS_CODE.BAD_REQUEST, "Invalid or expired verification token")

    await userModel.update({ id: record.user_id }, { email_verified: true, updated_at: new Date() })
    await emailTokenModel.markUsed(record.id)

    return res.json(apiResponse({ message: "Email verified successfully", data: null }))
  } catch (error) {
    return next(error)
  }
}

/**
 * POST /api/auth/resend-verification — Resend the email verification link.
 *
 * Always returns 200 regardless of whether the email exists or is already verified.
 * This prevents email enumeration attacks. Only sends if the user exists and is unverified.
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export const resendVerification = async (req, res, next) => {
  try {
    const { error, value } = resendVerificationSchema.validate(req.body)
    if (error) throw new HttpError(HTTP_STATUS_CODE.BAD_REQUEST, error.details[0].message)

    const user = await userModel.findOne({ email: value.email })
    if (user && !user.email_verified) {
      await emailTokenModel.deleteByUser(user.id, "verify_email")
      const rawToken = generateEmailToken()
      const tokenHash = emailTokenModel.hashToken(rawToken)
      await emailTokenModel.create({
        id: crypto.randomUUID(),
        user_id: user.id,
        token_hash: tokenHash,
        type: "verify_email",
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
        created_at: new Date(),
      })
      const verificationUrl = `${process.env.APP_URL}/verify-email?token=${rawToken}`
      await emailService.sendVerificationEmail({
        toEmail: user.email,
        fullName: user.full_name,
        verificationUrl,
      })
    }

    return res.json(
      apiResponse({
        message: "If the email exists and is unverified, a verification link has been sent",
        data: null,
      }),
    )
  } catch (error) {
    return next(error)
  }
}

/**
 * POST /api/auth/signin — Authenticate a user with email and password.
 *
 * Requires a verified email address. Uses timing-safe password verification
 * to prevent email enumeration. Implements account lockout after 5 failed attempts.
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export const signin = async (req, res, next) => {
  try {
    const { error, value } = signinSchema.validate(req.body)
    if (error) throw new HttpError(HTTP_STATUS_CODE.BAD_REQUEST, error.details[0].message)

    const user = await userModel.findOneWithPassword({ email: value.email })
    const hashToVerify = user?.password_hash ?? dummyHash
    const isPasswordValid = await verifyPassword(hashToVerify, value.password)

    // Check account lockout (only for existing users)
    if (user?.locked_until && new Date(user.locked_until) > new Date()) {
      throw new HttpError(HTTP_STATUS_CODE.UNAUTHORIZED, "Invalid credentials")
    }

    if (!user || !isPasswordValid) {
      // Increment failed login attempts for existing users
      if (user) {
        const [updated] = await userModel.incrementFailedAttempts(user.id)
        if (updated.failed_login_attempts >= MAX_FAILED_ATTEMPTS) {
          await userModel.lockAccount(user.id, new Date(Date.now() + LOCKOUT_DURATION_MS))
        }
      }
      throw new HttpError(HTTP_STATUS_CODE.UNAUTHORIZED, "Invalid credentials")
    }

    if (!user.email_verified) {
      throw new HttpError(HTTP_STATUS_CODE.FORBIDDEN, "Please verify your email before signing in")
    }

    // Successful login — reset lockout fields
    await userModel.resetLoginState(user.id)

    await issueTokenPair({ req, res, userId: user.id })

    return res.json(
      apiResponse({
        message: "OK",
        data: { id: user.id, email: user.email, full_name: user.full_name },
      }),
    )
  } catch (error) {
    return next(error)
  }
}

/**
 * POST /api/auth/forgot-password — Initiate a password reset.
 *
 * Always returns 200 regardless of whether the email exists.
 * This prevents email enumeration attacks. Only sends a reset email if the user is found.
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export const forgotPassword = async (req, res, next) => {
  try {
    const { error, value } = forgotPasswordSchema.validate(req.body)
    if (error) throw new HttpError(HTTP_STATUS_CODE.BAD_REQUEST, error.details[0].message)

    const user = await userModel.findOne({ email: value.email })
    if (user) {
      await emailTokenModel.deleteByUser(user.id, "reset_password")
      const rawToken = generateEmailToken()
      const tokenHash = emailTokenModel.hashToken(rawToken)
      await emailTokenModel.create({
        id: crypto.randomUUID(),
        user_id: user.id,
        token_hash: tokenHash,
        type: "reset_password",
        expires_at: new Date(Date.now() + 60 * 60 * 1000),
        created_at: new Date(),
      })
      const resetUrl = `${process.env.APP_URL}/reset-password?token=${rawToken}`
      await emailService.sendPasswordResetEmail({
        toEmail: user.email,
        fullName: user.full_name,
        resetUrl,
      })
    }

    return res.json(
      apiResponse({
        message: "If the email exists, a password reset link has been sent",
        data: null,
      }),
    )
  } catch (error) {
    return next(error)
  }
}

/**
 * POST /api/auth/reset-password — Reset a user's password using a valid reset token.
 *
 * Validates the reset token, updates the password hash, marks the token as used,
 * and revokes all refresh tokens to force re-authentication on all devices.
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export const resetPassword = async (req, res, next) => {
  try {
    const { error, value } = resetPasswordSchema.validate(req.body)
    if (error) throw new HttpError(HTTP_STATUS_CODE.BAD_REQUEST, error.details[0].message)

    const tokenHash = emailTokenModel.hashToken(value.token)
    const record = await emailTokenModel.findActiveByHash(tokenHash, "reset_password")
    if (!record) throw new HttpError(HTTP_STATUS_CODE.BAD_REQUEST, "Invalid or expired reset token")

    const password_hash = await hashPassword(value.password)
    await userModel.update({ id: record.user_id }, { password_hash, updated_at: new Date() })
    await emailTokenModel.markUsed(record.id)
    await denyAllSessions(record.user_id)
    await refreshTokenModel.revokeAllForUser(record.user_id)

    return res.json(apiResponse({ message: "Password reset successfully", data: null }))
  } catch (error) {
    return next(error)
  }
}

/**
 * GET /api/auth/me — Return the authenticated user's profile.
 *
 * Requires a valid access token. Returns user data without the password_hash field.
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export const getMe = async (req, res, next) => {
  try {
    const user = await userModel.findOne({ id: req.user.id })
    if (!user) throw new HttpError(HTTP_STATUS_CODE.NOT_FOUND, "User not found")

    return res.json(apiResponse({ message: "OK", data: user }))
  } catch (error) {
    return next(error)
  }
}

/**
 * PUT /api/auth/profile — Update the current user's profile.
 *
 * Updates full_name and timezone for the authenticated user.
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Promise<void>}
 */
export const updateProfile = async (req, res, next) => {
  try {
    const { error, value } = updateProfileSchema.validate(req.body)
    if (error) throw new HttpError(HTTP_STATUS_CODE.BAD_REQUEST, error.details[0].message)

    const [updated] = await userModel.update(
      { id: req.user.id },
      { ...value, updated_at: new Date() },
    )
    if (!updated) throw new HttpError(HTTP_STATUS_CODE.NOT_FOUND, "User not found")

    return res.json(apiResponse({ message: "Profile updated", data: updated }))
  } catch (error) {
    return next(error)
  }
}

/**
 * DELETE /api/auth/profile — Delete the current user's account.
 *
 * Soft-deletes the user, revokes all refresh tokens, and clears auth cookies.
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Promise<void>}
 */
export const deleteProfile = async (req, res, next) => {
  try {
    const soleOwnerWorkspaces = await db("workspace_members as wm")
      .join("roles as r", "wm.role_id", "r.id")
      .where({ "wm.user_id": req.user.id, "r.name": "owner" })
      .whereNull("wm.deleted_at")
      .whereNotExists(
        db("workspace_members as wm2")
          .join("roles as r2", "wm2.role_id", "r2.id")
          .whereRaw("wm2.workspace_id = wm.workspace_id")
          .where("r2.name", "owner")
          .whereNot("wm2.user_id", req.user.id)
          .whereNull("wm2.deleted_at")
          .select(db.raw("1")),
      )
      .select("wm.workspace_id")

    if (soleOwnerWorkspaces.length > 0) {
      throw new HttpError(
        HTTP_STATUS_CODE.CONFLICT,
        "You are the sole owner of one or more workspaces. Transfer ownership before deleting your account.",
      )
    }

    await userModel.softDelete(req.user.id)
    await denyAllSessions(req.user.id)
    await refreshTokenModel.revokeAllForUser(req.user.id)
    clearAuthCookies(res)

    return res.json(apiResponse({ message: "Account deleted", data: null }))
  } catch (error) {
    return next(error)
  }
}

/**
 * PUT /api/auth/password — Change the current user's password.
 *
 * Verifies the current password, updates the hash, revokes all existing
 * refresh tokens (signing out other devices), then re-issues a fresh token
 * pair so the current session stays valid.
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Promise<void>}
 */
export const changePassword = async (req, res, next) => {
  try {
    const { error, value } = changePasswordSchema.validate(req.body)
    if (error) throw new HttpError(HTTP_STATUS_CODE.BAD_REQUEST, error.details[0].message)

    const user = await userModel.findOneWithPassword({ id: req.user.id })
    if (!user) throw new HttpError(HTTP_STATUS_CODE.NOT_FOUND, "User not found")

    const matches = await verifyPassword(user.password_hash, value.current_password)
    if (!matches) {
      throw new HttpError(HTTP_STATUS_CODE.BAD_REQUEST, "Current password is incorrect")
    }

    const newHash = await hashPassword(value.new_password)
    await userModel.update({ id: req.user.id }, { password_hash: newHash, updated_at: new Date() })
    // Denylist all active sessions so existing access tokens stop working immediately,
    // then revoke every refresh token (signs out other devices), then re-issue a fresh
    // pair for THIS session so the active session isn't half-invalidated. Mirrors
    // refreshAccessToken's revoke-then-issue flow.
    await denyAllSessions(req.user.id)
    await refreshTokenModel.revokeAllForUser(req.user.id)
    await issueTokenPair({ req, res, userId: req.user.id })

    return res.json(apiResponse({ message: "Password updated", data: null }))
  } catch (error) {
    return next(error)
  }
}

/**
 * POST /api/auth/refresh — Rotate the access/refresh token pair.
 *
 * Revokes the old refresh token and issues a new pair. Prevents token reuse —
 * if a revoked token is used again, it is rejected.
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export const refreshAccessToken = async (req, res, next) => {
  try {
    const user = await userModel.findOne({ id: req.user.id })
    if (!user) throw new HttpError(HTTP_STATUS_CODE.UNAUTHORIZED, "User not found")

    await rotateSessionTokens({ res, userId: user.id, sessionId: req.refreshTokenId })

    return res.json(apiResponse({ message: "OK", data: { id: user.id, email: user.email } }))
  } catch (error) {
    return next(error)
  }
}

/**
 * POST /api/auth/logout — Revoke the refresh token and clear auth cookies.
 *
 * Idempotent — succeeds even if the token was already revoked.
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export const logout = async (req, res, next) => {
  try {
    await denySession(req.refreshTokenId)
    await refreshTokenModel.revokeById(req.refreshTokenId)
    clearAuthCookies(res)
    return res.json(apiResponse({ message: "Logged out", data: null }))
  } catch (error) {
    return next(error)
  }
}
