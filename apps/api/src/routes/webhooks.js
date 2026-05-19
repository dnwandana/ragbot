import { Router } from "express"
import * as webhooks from "../controllers/webhooks.js"

/**
 * Verify the incoming webhook request carries the correct shared secret.
 * LlamaIndex v2 supports custom headers — the secret is sent as X-Webhook-Secret.
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const verifyWebhookSecret = (req, res, next) => {
  if (req.headers["x-webhook-secret"] !== process.env.LLAMAINDEX_WEBHOOK_SECRET) {
    return res.status(401).json({ message: "Invalid webhook secret" })
  }
  next()
}

const router = Router()

router.post("/llamaindex/callback", verifyWebhookSecret, webhooks.handleLlamaIndexCallback)

export default router
