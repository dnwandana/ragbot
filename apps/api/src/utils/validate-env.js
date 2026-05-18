import joi from "joi"

const envSchema = joi
  .object({
    NODE_ENV: joi.string().valid("development", "production", "test").default("development"),
    PORT: joi.number().default(3000),

    DATABASE_URL: joi.string().uri().required(),

    ACCESS_TOKEN_SECRET: joi.string().min(32).required(),
    ACCESS_TOKEN_EXPIRES_IN: joi.string().default("15m"),
    REFRESH_TOKEN_SECRET: joi.string().min(32).disallow(joi.ref("ACCESS_TOKEN_SECRET")).required(),
    REFRESH_TOKEN_EXPIRES_IN: joi.string().default("7d"),
    JWT_ISSUER: joi.string().uri().required(),
    JWT_AUDIENCE: joi.string().uri().required(),

    LOG_LEVEL: joi.string().valid("error", "warn", "info", "debug").default("info"),
    LOG_TO_FILE: joi.boolean().default(true),

    CORS_ALLOWED_ORIGINS: joi.string().default("http://localhost:8080"),
    RATE_LIMIT_AUTH_MAX: joi.number().max(50).default(10),
    RATE_LIMIT_GENERAL_MAX: joi.number().default(100),

    // AI
    OPENROUTER_API_KEY: joi.string().required(),
    DEFAULT_EMBEDDINGS_MODEL: joi.string().default("openai/text-embedding-3-small"),
    DEFAULT_CHAT_MODEL: joi.string().default("openai/gpt-4.1"),

    // Email
    BREVO_API_KEY: joi.string().required(),
    EMAIL_FROM_NAME: joi.string().default("RAG Chatbot"),
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
    LLAMAINDEX_WEBHOOK_SECRET: joi.string().min(16).required(),
    FIRECRAWL_API_KEY: joi.string().required(),
  })
  .unknown(true)

export function validateEnv() {
  const { error, value } = envSchema.validate(process.env, { abortEarly: false })
  if (error) {
    const missing = error.details.map((d) => d.message).join("\n")
    console.error(`Environment validation failed:\n${missing}`)
    process.exit(1)
  }
  return value
}
