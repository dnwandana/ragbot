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

  it("writes Joi default for EMAIL_FROM_NAME as 'RAGBot' when absent", () => {
    delete process.env.EMAIL_FROM_NAME
    validateEnv()
    expect(process.env.EMAIL_FROM_NAME).toBe("RAGBot")
  })

  it("does not overwrite EMAIL_FROM_NAME when it is explicitly set", () => {
    process.env.EMAIL_FROM_NAME = "Custom Sender"
    validateEnv()
    expect(process.env.EMAIL_FROM_NAME).toBe("Custom Sender")
  })

  it("writes Joi default for IP_GEOLOCATION_ENABLED as 'false' when absent", () => {
    delete process.env.IP_GEOLOCATION_ENABLED

    validateEnv()

    expect(process.env.IP_GEOLOCATION_ENABLED).toBe("false")
  })

  it("writes Joi default for IPGEOLOCATION_TIMEOUT_MS as '5000' when absent", () => {
    delete process.env.IPGEOLOCATION_TIMEOUT_MS

    validateEnv()

    expect(process.env.IPGEOLOCATION_TIMEOUT_MS).toBe("5000")
  })

  it("applies YouTube + Whisper defaults when unset", () => {
    delete process.env.YTDLP_PATH
    delete process.env.FFMPEG_PATH
    delete process.env.WHISPER_MODEL
    delete process.env.YOUTUBE_AUDIO_SEGMENT_SECONDS
    delete process.env.YOUTUBE_WORKER_CONCURRENCY
    delete process.env.YOUTUBE_DOWNLOAD_TIMEOUT_MS
    delete process.env.OPENROUTER_TRANSCRIBE_TIMEOUT_MS

    const value = validateEnv()

    expect(process.env.YTDLP_PATH).toBe("yt-dlp")
    expect(process.env.FFMPEG_PATH).toBe("ffmpeg")
    expect(process.env.WHISPER_MODEL).toBe("openai/whisper-large-v3-turbo")
    expect(Number(process.env.YOUTUBE_AUDIO_SEGMENT_SECONDS)).toBe(600)
    expect(Number(process.env.YOUTUBE_WORKER_CONCURRENCY)).toBe(1)
    expect(value.OPENROUTER_TRANSCRIBE_TIMEOUT_MS).toBe(120000)
  })

  it("applies YouTube size/duration caps when unset", () => {
    delete process.env.YOUTUBE_MAX_DURATION_SECONDS
    delete process.env.YOUTUBE_MAX_FILESIZE

    validateEnv()

    expect(Number(process.env.YOUTUBE_MAX_DURATION_SECONDS)).toBe(7200)
    expect(process.env.YOUTUBE_MAX_FILESIZE).toBe("150M")
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

describe("validateEnv — geolocation guard", () => {
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

  it("fails fast when IP_GEOLOCATION_ENABLED=true but IPGEOLOCATION_API_KEY is missing", () => {
    process.env.IP_GEOLOCATION_ENABLED = "true"
    delete process.env.IPGEOLOCATION_API_KEY
    expect(() => validateEnv()).toThrow("process.exit called")
  })

  it("passes when IP_GEOLOCATION_ENABLED=true and IPGEOLOCATION_API_KEY is set", () => {
    process.env.IP_GEOLOCATION_ENABLED = "true"
    process.env.IPGEOLOCATION_API_KEY = "geo-test-key"
    expect(() => validateEnv()).not.toThrow()
  })

  it("does not require IPGEOLOCATION_API_KEY when geolocation is disabled", () => {
    process.env.IP_GEOLOCATION_ENABLED = "false"
    delete process.env.IPGEOLOCATION_API_KEY
    expect(() => validateEnv()).not.toThrow()
  })
})
