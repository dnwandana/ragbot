import joi from "joi"
import { DEFAULT_MODEL } from "./allowed-models.js"

const envSchema = joi
  .object({
    NODE_ENV: joi.string().valid("development", "production", "test").default("development"),
    PORT: joi.number().default(3000),

    DATABASE_URL: joi.string().uri().required(),
    REDIS_URL: joi
      .string()
      .uri({ scheme: ["redis", "rediss"] })
      .required(),

    ACCESS_TOKEN_SECRET: joi.string().min(32).required(),
    ACCESS_TOKEN_EXPIRES_IN: joi.string().default("15m"),
    REFRESH_TOKEN_SECRET: joi.string().min(32).disallow(joi.ref("ACCESS_TOKEN_SECRET")).required(),
    REFRESH_TOKEN_EXPIRES_IN: joi.string().default("7d"),
    JWT_ISSUER: joi.string().uri().required(),
    JWT_AUDIENCE: joi.string().uri().required(),

    LOG_LEVEL: joi.string().valid("error", "warn", "info", "debug").default("info"),
    LOG_TO_FILE: joi.boolean().default(true),

    CORS_ALLOWED_ORIGINS: joi.string().when("NODE_ENV", {
      is: "production",
      // oxlint-disable-next-line no-thenable -- `then` is a Joi `.when()` option, not a Promise
      then: joi
        .string()
        .required()
        .custom((val, helpers) =>
          /localhost|127\.0\.0\.1|0\.0\.0\.0|::1/.test(val) ? helpers.error("any.invalid") : val,
        )
        .messages({
          "any.invalid": "CORS_ALLOWED_ORIGINS must not be localhost in production",
        }),
      otherwise: joi.string().default("http://localhost:8080"),
    }),
    RATE_LIMIT_AUTH_MAX: joi.number().max(50).default(10),
    RATE_LIMIT_GENERAL_MAX: joi.number().default(100),

    // AI
    OPENROUTER_API_KEY: joi.string().required(),
    DEFAULT_EMBEDDINGS_MODEL: joi.string().default("openai/text-embedding-3-small"),
    DEFAULT_CHAT_MODEL: joi.string().default(DEFAULT_MODEL),
    OPENROUTER_STREAM_TIMEOUT_MS: joi.number().default(60000),
    OPENROUTER_TIMEOUT_MS: joi.number().default(30000),
    FIRECRAWL_TIMEOUT_MS: joi.number().default(60000),
    LLAMAINDEX_TIMEOUT_MS: joi.number().default(30000),
    S3_TIMEOUT_MS: joi.number().default(10000),
    WHISPER_MODEL: joi.string().default("openai/whisper-large-v3-turbo"),
    OPENROUTER_TRANSCRIBE_TIMEOUT_MS: joi.number().default(120000),

    // YouTube ingestion
    YTDLP_PATH: joi.string().default("yt-dlp"),
    FFMPEG_PATH: joi.string().default("ffmpeg"),
    YOUTUBE_AUDIO_SEGMENT_SECONDS: joi.number().default(600),
    YOUTUBE_WORKER_CONCURRENCY: joi.number().default(1),
    YOUTUBE_DOWNLOAD_TIMEOUT_MS: joi.number().default(600000),
    YOUTUBE_MAX_DURATION_SECONDS: joi.number().default(7200),
    YOUTUBE_MAX_FILESIZE: joi.string().default("150M"),

    // Email
    BREVO_API_KEY: joi.string().required(),
    EMAIL_FROM_NAME: joi.string().default("RAGBot"),
    EMAIL_FROM_ADDRESS: joi.string().email().required(),
    APP_URL: joi.string().uri().required(),

    // Storage
    S3_BUCKET: joi.string().required(),
    S3_REGION: joi.string().default("auto"),
    S3_ACCESS_KEY: joi.string().required(),
    S3_SECRET_KEY: joi.string().required(),
    S3_ENDPOINT: joi.string().uri().required(),

    // Parsing
    LLAMAINDEX_API_KEY: joi.string().required(),
    LLAMAINDEX_PARSE_TIER: joi
      .string()
      .valid("fast", "cost_effective", "agentic", "agentic_plus")
      .default("cost_effective"),
    FIRECRAWL_API_KEY: joi.string().required(),

    // Geolocation
    IP_GEOLOCATION_ENABLED: joi.boolean().default(false),
    IPGEOLOCATION_API_KEY: joi.string().when("IP_GEOLOCATION_ENABLED", {
      is: true,
      // oxlint-disable-next-line no-thenable -- `then` is a Joi `.when()` option, not a Promise
      then: joi.string().required(),
      otherwise: joi.string().optional(),
    }),
    IPGEOLOCATION_TIMEOUT_MS: joi.number().default(5000),
  })
  .unknown(true)

export function validateEnv() {
  const { error, value } = envSchema.validate(process.env, { abortEarly: false })
  if (error) {
    const missing = error.details.map((d) => d.message).join("\n")
    console.error(`Environment validation failed:\n${missing}`)
    process.exit(1)
  }
  for (const [key, val] of Object.entries(value)) {
    if (process.env[key] === undefined && val != null) {
      process.env[key] = String(val)
    }
  }
  return value
}
