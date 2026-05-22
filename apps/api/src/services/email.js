import { BrevoClient } from "@getbrevo/brevo"
import { render } from "../emails/render.js"

const brevo = new BrevoClient({ apiKey: process.env.BREVO_API_KEY })

const sender = {
  name: process.env.EMAIL_FROM_NAME,
  email: process.env.EMAIL_FROM_ADDRESS,
}

/**
 * Sends a transactional email via Brevo using inline HTML content.
 *
 * @param {Object} params
 * @param {Object} params.to - Recipient object.
 * @param {string} params.to.email - Recipient email address.
 * @param {string} [params.to.name] - Recipient display name.
 * @param {string} params.subject - Email subject line.
 * @param {string} params.html - Rendered HTML body.
 * @returns {Promise<Object>} Brevo API response.
 */
const send = ({ to, subject, html }) =>
  brevo.transactionalEmails.sendTransacEmail({ sender, to: [to], subject, htmlContent: html })

/**
 * Sends an email verification link to a newly registered user.
 *
 * @param {Object} params
 * @param {string} params.toEmail - Recipient email address.
 * @param {string} params.fullName - User's full name for the greeting.
 * @param {string} params.verificationUrl - Full URL with the verification token.
 * @returns {Promise<Object>} Brevo API response.
 */
export const sendVerificationEmail = ({ toEmail, fullName, verificationUrl }) =>
  send({
    to: { email: toEmail, name: fullName },
    subject: "Verify your email — RAGbot",
    html: render("verify-email", {
      full_name: fullName,
      email: toEmail,
      verification_url: verificationUrl,
      year: new Date().getFullYear(),
    }),
  })

/**
 * Sends a password reset link to a user.
 *
 * @param {Object} params
 * @param {string} params.toEmail - Recipient email address.
 * @param {string} params.fullName - User's full name for the greeting.
 * @param {string} params.resetUrl - Full URL with the reset token.
 * @returns {Promise<Object>} Brevo API response.
 */
export const sendPasswordResetEmail = ({ toEmail, fullName, resetUrl }) =>
  send({
    to: { email: toEmail, name: fullName },
    subject: "Reset your password — RAGbot",
    html: render("reset-password", {
      reset_url: resetUrl,
      year: new Date().getFullYear(),
    }),
  })

/**
 * Sends a workspace invitation email.
 *
 * @param {Object} params
 * @param {string} params.toEmail - Recipient email address.
 * @param {string} params.inviterName - Name of the person sending the invitation.
 * @param {string} params.workspaceName - Name of the workspace.
 * @param {string} params.roleName - Role name to display in the invitation email.
 * @param {string} params.acceptUrl - Full URL to accept the invitation.
 * @returns {Promise<Object>} Brevo API response.
 */
export const sendInvitationEmail = ({ toEmail, inviterName, workspaceName, roleName, acceptUrl }) =>
  send({
    to: { email: toEmail },
    subject: `You're invited to join ${workspaceName} — RAGbot`,
    html: render("workspace-invitation", {
      inviter_name: inviterName,
      workspace_name: workspaceName,
      workspace_initial: workspaceName.charAt(0).toUpperCase(),
      role: roleName,
      accept_url: acceptUrl,
      year: new Date().getFullYear(),
    }),
  })
