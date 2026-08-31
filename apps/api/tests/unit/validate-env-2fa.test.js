import { validateEnv } from "../../src/utils/validate-env.js"

// Minimum env required for the Joi schema to pass validation (validateEnv() does not run in the
// test worker process, so process.env is not pre-populated with the base required vars).
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
  TOTP_ENCRYPTION_KEY: "a-totp-encryption-key-of-at-least-32-chars",
}

describe("validate-env — 2FA vars", () => {
  let original

  beforeEach(() => {
    original = { ...process.env }
    Object.assign(process.env, REQUIRED_ENV)
    vi.spyOn(process, "exit").mockImplementation((code) => {
      throw new Error(`exit ${code}`)
    })
    vi.spyOn(console, "error").mockImplementation(() => {})
  })

  afterEach(() => {
    for (const key of Object.keys(process.env)) delete process.env[key]
    Object.assign(process.env, original)
    vi.restoreAllMocks()
  })

  it("exits when TOTP_ENCRYPTION_KEY is missing", () => {
    delete process.env.TOTP_ENCRYPTION_KEY
    expect(() => validateEnv()).toThrow(/exit 1/)
  })

  it("defaults TOTP_ISSUER to RAGbot", () => {
    process.env.TOTP_ENCRYPTION_KEY = "a-totp-encryption-key-of-at-least-32-chars"
    delete process.env.TOTP_ISSUER
    const value = validateEnv()
    expect(value.TOTP_ISSUER).toBe("RAGbot")
  })
})
