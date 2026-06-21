import { Router } from "express"
import db from "../config/database.js"
import apiResponse from "../utils/response.js"
import pkg from "../../package.json" with { type: "json" }

const router = Router()

router.get("/", (req, res, next) => {
  db.raw("SELECT 1")
    .then(() => "ok")
    .catch(() => "error")
    .then((dbStatus) => {
      const healthy = dbStatus === "ok"
      let statusCode = 503
      let statusLabel = "unhealthy"
      if (healthy) {
        statusCode = 200
        statusLabel = "healthy"
      }

      return res.status(statusCode).json(
        apiResponse({
          message: statusLabel,
          data: {
            status: statusLabel,
            timestamp: new Date().toISOString(),
            version: pkg.version,
            ...(process.env.NODE_ENV !== "production" && {
              uptime: process.uptime(),
              database: dbStatus,
            }),
          },
        }),
      )
    })
    .catch(next)
})

export default router
