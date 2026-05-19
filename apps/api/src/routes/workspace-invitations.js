import { Router } from "express"
import { requireAccessToken } from "../middlewares/authorization.js"
import db from "../config/database.js"
import * as members from "../controllers/members.js"
import * as emailTokenModel from "../models/email-tokens.js"
import apiResponse from "../utils/response.js"
import HttpError from "../utils/http-error.js"

const router = Router()

router.get("/:token", async (req, res, next) => {
  try {
    // Token format: memberId:rawToken — split to get the random part for hash lookup
    const colonIdx = req.params.token.indexOf(":")
    if (colonIdx === -1) throw new HttpError(400, "Invalid token format")
    const memberId = req.params.token.slice(0, colonIdx)
    const rawPart = req.params.token.slice(colonIdx + 1)

    const tokenHash = emailTokenModel.hashToken(rawPart)
    const record = await emailTokenModel.findActiveByHash(tokenHash, "workspace_invitation")
    if (!record) throw new HttpError(400, "Invalid or expired invitation")

    const row = await db("workspace_members as wm")
      .select("w.name as workspace_name", "r.name as role_name", "u.full_name as inviter_name")
      .join("workspaces as w", "w.id", "wm.workspace_id")
      .join("roles as r", "r.id", "wm.role_id")
      .leftJoin("users as u", "u.id", "wm.invited_by")
      .where({ "wm.id": memberId, "wm.status": "invited" })
      .first()

    if (!row) throw new HttpError(404, "Invitation not found")

    return res.json(
      apiResponse({
        message: "OK",
        data: {
          workspace_name: row.workspace_name,
          role: { name: row.role_name },
          invited_by: row.inviter_name ?? "A team member",
        },
      }),
    )
  } catch (error) {
    return next(error)
  }
})

router.post("/accept", requireAccessToken, members.acceptInvitation)

export default router
