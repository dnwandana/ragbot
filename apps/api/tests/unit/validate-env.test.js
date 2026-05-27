import { validateEnv } from "../../src/utils/validate-env.js"

// Minimum env required for the Joi schema to pass validation.
// Covers all `required()` fields from validate-env.js.
const REQUIRED_ENV = {
  DATABASE_URL: "postgres://user:pass@localhost:5432/db",
  REDIS_URL: "redis://localhost:6379",
  ACCESS_TOKEN_SECRET: "a".repeat(32),
  REFRESH_TOKEN_SECRET: "b".repeat(32),
  JWT_ISSUER: "http://localhost",
  JWT_AUDIENCE: "http://localhost",
  OPENROUTER_API_KEY: "sk-test",
  BREVO_API_KEY: "test-key",
  EMAIL_FROM_ADDRESS: "test@example.com",
  APP_URL: "http://localhost:3000",
  S3_BUCKET: "test-bucket",
  S3_ACCESS_KEY: "test-access-key",
  S3_SECRET_KEY: "test-secret-key",
  S3_ENDPOINT: "https://s3.example.com",
  LLAMAINDEX_API_KEY: "test-llamaindex-key",
  FIRECRAWL_API_KEY: "test-firecrawl-key",
}

describe("validateEnv — default propagation", () => {
  let snapshot

  beforeEach(() => {
    snapshot = { ...process.env }
    Object.assign(process.env, REQUIRED_ENV)
  })

  afterEach(() => {
    for (const key of Object.keys(process.env)) delete process.env[key]
    Object.assign(process.env, snapshot)
  })

  it("writes Joi default for OPENROUTER_STREAM_TIMEOUT_MS when the key is absent", () => {
    delete process.env.OPENROUTER_STREAM_TIMEOUT_MS

    validateEnv()

    expect(process.env.OPENROUTER_STREAM_TIMEOUT_MS).toBe("60000")
  })

  it("does not overwrite OPENROUTER_STREAM_TIMEOUT_MS when it is explicitly set", () => {
    process.env.OPENROUTER_STREAM_TIMEOUT_MS = "30000"

    validateEnv()

    expect(process.env.OPENROUTER_STREAM_TIMEOUT_MS).toBe("30000")
  })

  it("writes Joi default for LOG_TO_FILE as string 'true' when absent", () => {
    delete process.env.LOG_TO_FILE

    validateEnv()

    expect(process.env.LOG_TO_FILE).toBe("true")
  })

  it("writes Joi default for PORT as string '3000' when absent", () => {
    delete process.env.PORT

    validateEnv()

    expect(process.env.PORT).toBe("3000")
  })
})
