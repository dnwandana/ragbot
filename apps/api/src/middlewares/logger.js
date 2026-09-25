import logger from "../utils/logger.js"
import morgan from "morgan"
import { redactUrl } from "../utils/redact-url.js"

// Register custom Morgan token for request ID
morgan.token("request-id", (req) => req.id)

// Override the url token so that the public share token never reaches the log
morgan.token("url", (req) => redactUrl(req.originalUrl || req.url))

// Use Morgan for HTTP request logging with our logger stream
const httpLogger = morgan(
  ":request-id :method :url :status :res[content-length] - :response-time ms",
  {
    stream: logger.stream,
  },
)

// Custom request logging middleware for detailed information
const requestLogger = (req, res, next) => {
  const startTime = Date.now()

  // Log incoming request details
  logger.http("Incoming request", {
    requestId: req.id,
    method: req.method,
    url: redactUrl(req.originalUrl),
    ip: req.ip,
    userAgent: req.get("user-agent"),
  })

  res.on("finish", () => {
    const duration = Date.now() - startTime

    logger.http("Outgoing response", {
      requestId: req.id,
      method: req.method,
      url: redactUrl(req.originalUrl),
      status: res.statusCode,
      duration: `${duration}ms`,
    })
  })

  next()
}

export { httpLogger, requestLogger }
