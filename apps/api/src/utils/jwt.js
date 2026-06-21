import crypto from "node:crypto"
import jwt from "jsonwebtoken"

/**
 * Generates a signed access token for a given user, optionally bound to a session.
 *
 * @param {string|number} id The unique identifier of the user.
 * @param {string} [sid] The session id (refresh_tokens row id) to bind the token to.
 * @returns {string} A signed JWT string.
 */
export const generateAccessToken = (id, sid) => {
  const jwtPayload = {
    id,
    type: "access",
  }

  if (sid) {
    jwtPayload.sid = sid
  }

  return jwt.sign(jwtPayload, process.env.ACCESS_TOKEN_SECRET, {
    algorithm: "HS256",
    expiresIn: process.env.ACCESS_TOKEN_EXPIRES_IN,
    issuer: process.env.JWT_ISSUER,
    audience: process.env.JWT_AUDIENCE,
  })
}

/**
 * Generates a refresh token for a given user.
 *
 * @param {string|number} id The unique identifier of the user.
 * @returns {string} A signed refresh token string.
 */
export const generateRefreshToken = (id) => {
  const jwtPayload = {
    id,
    type: "refresh",
    jti: crypto.randomUUID(),
  }

  return jwt.sign(jwtPayload, process.env.REFRESH_TOKEN_SECRET, {
    algorithm: "HS256",
    expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN,
    issuer: process.env.JWT_ISSUER,
    audience: process.env.JWT_AUDIENCE,
  })
}

/**
 * Verifies and decodes a JSON Web Token.
 *
 * @param {string} token The JWT string to verify.
 * @returns {Object} The decoded token payload.
 * @throws {Error} If verification fails (e.g., token expired, invalid signature, missing secret).
 */
export const verifyAccessToken = (token) => {
  return jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, {
    algorithms: ["HS256"],
    issuer: process.env.JWT_ISSUER,
    audience: process.env.JWT_AUDIENCE,
  })
}

/**
 * Verifies and decodes a refresh token.
 *
 * @param {string} token The refresh token string to verify.
 * @returns {Object} The decoded token payload.
 * @throws {Error} If verification fails (e.g., token expired, invalid signature, missing secret).
 */
export const verifyRefreshToken = (token) => {
  return jwt.verify(token, process.env.REFRESH_TOKEN_SECRET, {
    algorithms: ["HS256"],
    issuer: process.env.JWT_ISSUER,
    audience: process.env.JWT_AUDIENCE,
  })
}
