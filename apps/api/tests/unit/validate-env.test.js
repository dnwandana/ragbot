import { vi } from "vitest"
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

  it("writes Joi default for OPENROUTER_TIMEOUT_MS when absent", () => {
    delete process.env.OPENROUTER_TIMEOUT_MS
    validateEnv()
    expect(process.env.OPENROUTER_TIMEOUT_MS).toBe("30000")
  })

  it("writes Joi default for FIRECRAWL_TIMEOUT_MS when absent", () => {
    delete process.env.FIRECRAWL_TIMEOUT_MS
    validateEnv()
    expect(process.env.FIRECRAWL_TIMEOUT_MS).toBe("60000")
  })

  it("writes Joi default for LLAMAINDEX_TIMEOUT_MS when absent", () => {
    delete process.env.LLAMAINDEX_TIMEOUT_MS
    validateEnv()
    expect(process.env.LLAMAINDEX_TIMEOUT_MS).toBe("30000")
  })

  it("writes Joi default for S3_TIMEOUT_MS when absent", () => {
    delete process.env.S3_TIMEOUT_MS
    validateEnv()
    expect(process.env.S3_TIMEOUT_MS).toBe("10000")
  })

  it("does not overwrite OPENROUTER_TIMEOUT_MS when it is explicitly set", () => {
    process.env.OPENROUTER_TIMEOUT_MS = "5000"
    validateEnv()
    expect(process.env.OPENROUTER_TIMEOUT_MS).toBe("5000")
  })

  it("does not overwrite FIRECRAWL_TIMEOUT_MS when it is explicitly set", () => {
    process.env.FIRECRAWL_TIMEOUT_MS = "12000"
    validateEnv()
    expect(process.env.FIRECRAWL_TIMEOUT_MS).toBe("12000")
  })

  it("does not overwrite LLAMAINDEX_TIMEOUT_MS when it is explicitly set", () => {
    process.env.LLAMAINDEX_TIMEOUT_MS = "15000"
    validateEnv()
    expect(process.env.LLAMAINDEX_TIMEOUT_MS).toBe("15000")
  })

  it("does not overwrite S3_TIMEOUT_MS when it is explicitly set", () => {
    process.env.S3_TIMEOUT_MS = "2000"
    validateEnv()
    expect(process.env.S3_TIMEOUT_MS).toBe("2000")
  })
})

describe("validateEnv — CORS production guard", () => {
  let snapshot, exitSpy, errSpy

  beforeEach(() => {
    snapshot = { ...process.env }
    Object.assign(process.env, REQUIRED_ENV)
    exitSpy = vi.spyOn(process, "exit").mockImplementation(() => {
      throw new Error("process.exit called")
    })
    errSpy = vi.spyOn(console, "error").mockImplementation(() => {})
  })

  afterEach(() => {
    exitSpy.mockRestore()
    errSpy.mockRestore()
    for (const key of Object.keys(process.env)) delete process.env[key]
    Object.assign(process.env, snapshot)
  })

  it("rejects a localhost CORS origin in production", () => {
    process.env.NODE_ENV = "production"
    process.env.CORS_ALLOWED_ORIGINS = "http://localhost:8080"
    expect(() => validateEnv()).toThrow("process.exit called")
  })

  it("accepts an https CORS origin in production", () => {
    process.env.NODE_ENV = "production"
    process.env.CORS_ALLOWED_ORIGINS = "https://app.example.com"
    expect(() => validateEnv()).not.toThrow()
  })

  it("keeps the localhost default in non-production", () => {
    process.env.NODE_ENV = "development"
    delete process.env.CORS_ALLOWED_ORIGINS
    validateEnv()
    expect(process.env.CORS_ALLOWED_ORIGINS).toBe("http://localhost:8080")
  })
})
