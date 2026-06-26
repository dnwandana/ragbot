import "dotenv/config"
import { validateEnv } from "./utils/validate-env.js"

// validate environment variables before anything else
validateEnv()

// import app after env validation so all process.env values are set
const { default: app } = await import("./app.js")
const { default: logger } = await import("./utils/logger.js")
const { default: db } = await import("./config/database.js")
const { startWorker } = await import("./workers/file-processing.js")
const { fileProcessingQueue } = await import("./queues/file-processing.js")
const { startYoutubeWorker } = await import("./workers/youtube-processing.js")
const { youtubeProcessingQueue } = await import("./queues/youtube-processing.js")
const { killActiveChildren } = await import("./services/youtube.js")

const PORT = process.env.PORT

// start server
const server = app.listen(PORT, () => {
  logger.info(`Server started successfully`, {
    port: PORT,
    environment: process.env.NODE_ENV,
  })
})

// start inline BullMQ worker
const worker = startWorker()
logger.info("File processing worker started")

const youtubeWorker = startYoutubeWorker()
logger.info("YouTube processing worker started")

// graceful shutdown
const gracefulShutdown = async (signal) => {
  logger.info(`Received ${signal}, starting graceful shutdown`)
  await worker.close()
  logger.info("File processing worker closed")
  await fileProcessingQueue.close()
  logger.info("File processing queue closed")
  await youtubeWorker.close()
  logger.info("YouTube processing worker closed")
  killActiveChildren()
  logger.info("Killed in-flight YouTube subprocesses")
  await youtubeProcessingQueue.close()
  logger.info("YouTube processing queue closed")
  server.close(async () => {
    logger.info("HTTP server closed")
    try {
      await db.destroy()
      logger.info("Database connections closed")
      process.exit(0)
    } catch (err) {
      logger.error("Error closing database connections", { error: err.message })
      process.exit(1)
    }
  })
  setTimeout(() => {
    logger.error("Forced shutdown after timeout")
    process.exit(1)
  }, 10000)
}

process.on("unhandledRejection", (reason) => {
  logger.error("Unhandled promise rejection", {
    reason: reason instanceof Error ? reason.stack : reason,
  })
  setTimeout(() => process.exit(1), 1000).unref()
})
process.on("uncaughtException", (err) => {
  logger.error("Uncaught exception", { error: err.stack })
  setTimeout(() => process.exit(1), 1000).unref()
})

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"))
process.on("SIGINT", () => gracefulShutdown("SIGINT"))
