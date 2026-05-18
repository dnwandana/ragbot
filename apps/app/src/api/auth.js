import { request } from "../utils/http.js"

/**
 * Registers a new user account.
 *
 * @param {Object} params
 * @param {string} params.email - User's email address.
 * @param {string} params.password - Chosen password.
 * @param {string} params.confirmation_password - Password confirmation.
 * @param {string} params.full_name - User's full name.
 * @returns {Promise<Object>} API response.
 */
export const signup = ({ email, password, confirmation_password, full_name }) =>
  request.post("/auth/signup", { email, password, confirmation_password, full_name })

/**
 * Verifies a user's email with a token from the verification link.
 *
 * @param {string} token - The verification token.
 * @returns {Promise<Object>} API response.
 */
export const verifyEmail = (token) => request.post("/auth/verify-email", { token })

/**
 * Requests a new verification email to be sent.
 *
 * @param {string} email - The email address to resend verification to.
 * @returns {Promise<Object>} API response.
 */
export const resendVerification = (email) => request.post("/auth/resend-verification", { email })

/**
 * Authenticates a user with email and password.
 *
 * @param {string} email - User's email address.
 * @param {string} password - User's password.
 * @returns {Promise<Object>} API response with user data.
 */
export const signin = (email, password) => request.post("/auth/signin", { email, password })

/**
 * Requests a password reset email.
 *
 * @param {string} email - The email address to send the reset link to.
 * @returns {Promise<Object>} API response.
 */
export const forgotPassword = (email) => request.post("/auth/forgot-password", { email })

/**
 * Resets a user's password using a valid reset token.
 *
 * @param {Object} params
 * @param {string} params.token - The reset token from the email link.
 * @param {string} params.password - New password.
 * @param {string} params.confirmation_password - New password confirmation.
 * @returns {Promise<Object>} API response.
 */
export const resetPassword = ({ token, password, confirmation_password }) =>
  request.post("/auth/reset-password", { token, password, confirmation_password })

/**
 * Fetches the authenticated user's profile.
 *
 * @returns {Promise<Object>} API response with user data.
 */
export const getMe = () => request.get("/auth/me")

/**
 * Logs out the current user by revoking the refresh token.
 *
 * @returns {Promise<Object>} API response.
 */
export const logout = () => request.post("/auth/logout")
