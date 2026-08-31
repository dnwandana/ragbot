import { request } from "@/utils/http"

/** GET /auth/2fa — current 2FA status. @returns {Promise} */
export const getStatus = () => request.get("/auth/2fa")

/** POST /auth/2fa/setup. @param {string} password @returns {Promise} */
export const setup = (password) => request.post("/auth/2fa/setup", { password })

/** POST /auth/2fa/activate. @param {string} code @returns {Promise} */
export const activate = (code) => request.post("/auth/2fa/activate", { code })

/** POST /auth/2fa/disable. @param {string} password @param {string} code @returns {Promise} */
export const disable = (password, code) => request.post("/auth/2fa/disable", { password, code })

/** POST /auth/2fa/backup-codes/regenerate. @param {string} password @param {string} code @returns {Promise} */
export const regenerateBackupCodes = (password, code) =>
  request.post("/auth/2fa/backup-codes/regenerate", { password, code })

/** POST /auth/signin/2fa. @param {{method:string, code:string}} body @returns {Promise} */
export const verifySignin = ({ method, code }) => request.post("/auth/signin/2fa", { method, code })

/** POST /auth/signin/2fa/email — request an emailed code. @returns {Promise} */
export const requestEmailCode = () => request.post("/auth/signin/2fa/email")
