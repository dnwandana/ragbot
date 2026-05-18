import { vi } from "vitest"
import crypto from "node:crypto"
import {
  request,
  createTestUser,
  getAuthHeaders,
  cleanAllTables,
  seedPermissions,
} from "../helpers.js"
import * as emailTokenModel from "../../src/models/email-tokens.js"

// Mock email service to avoid real Brevo calls.
// After vi.mock, any import of the module returns the mocked functions.
vi.mock("../../src/services/email.js", () => ({
  sendVerificationEmail: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
  sendInvitationEmail: vi.fn(),
}))

// Import the mocked functions — these are the vi.fn() instances from above
import { sendVerificationEmail, sendPasswordResetEmail } from "../../src/services/email.js"

beforeAll(async () => {
  await seedPermissions()
})

beforeEach(async () => {
  await cleanAllTables()
  vi.clearAllMocks()
})

describe("POST /api/auth/signup", () => {
  it("creates user and returns 201", async () => {
    const res = await (await request()).post("/api/auth/signup").send({
      email: "new@example.com",
      password: "Password123!",
      confirmation_password: "Password123!",
      full_name: "New User",
    })

    expect(res.status).toBe(201)
    expect(res.body.data.email).toBe("new@example.com")
    expect(res.body.data.full_name).toBe("New User")
    expect(res.body.data.password_hash).toBeUndefined()
  })

  it("sends a verification email after signup", async () => {
    await (await request()).post("/api/auth/signup").send({
      email: "verify-me@example.com",
      password: "Password123!",
      confirmation_password: "Password123!",
      full_name: "Verify Me",
    })

    expect(sendVerificationEmail).toHaveBeenCalledOnce()
    const call = sendVerificationEmail.mock.calls[0][0]
    expect(call.toEmail).toBe("verify-me@example.com")
    expect(call.fullName).toBe("Verify Me")
    expect(call.verificationUrl).toContain("/verify-email?token=")
  })

  it("returns 400 if email already registered", async () => {
    await createTestUser({ email: "taken@example.com" })
    const res = await (await request()).post("/api/auth/signup").send({
      email: "taken@example.com",
      password: "Password123!",
      confirmation_password: "Password123!",
      full_name: "Dup",
    })

    expect(res.status).toBe(400)
  })

  it("returns 400 if passwords do not match", async () => {
    const res = await (await request()).post("/api/auth/signup").send({
      email: "ok@example.com",
      password: "Password123!",
      confirmation_password: "Different!",
      full_name: "Test",
    })

    expect(res.status).toBe(400)
  })
})

describe("POST /api/auth/verify-email", () => {
  it("verifies email with valid token", async () => {
    // Signup to create user + token (mock captures the URL)
    await (await request()).post("/api/auth/signup").send({
      email: "verify@example.com",
      password: "Password123!",
      confirmation_password: "Password123!",
      full_name: "Verify User",
    })

    const call = sendVerificationEmail.mock.calls[0][0]
    const url = new URL(call.verificationUrl)
    const token = url.searchParams.get("token")

    const res = await (await request()).post("/api/auth/verify-email").send({ token })
    expect(res.status).toBe(200)
    expect(res.body.message).toBe("Email verified successfully")

    // Verify the user can now sign in
    const signinRes = await (await request())
      .post("/api/auth/signin")
      .send({ email: "verify@example.com", password: "Password123!" })

    expect(signinRes.status).toBe(200)
  })

  it("returns 400 for invalid token", async () => {
    const res = await (await request()).post("/api/auth/verify-email").send({ token: "deadbeef" })

    expect(res.status).toBe(400)
  })

  it("returns 400 for already-used token", async () => {
    await (await request()).post("/api/auth/signup").send({
      email: "used@example.com",
      password: "Password123!",
      confirmation_password: "Password123!",
      full_name: "Used Token",
    })

    const call = sendVerificationEmail.mock.calls[0][0]
    const url = new URL(call.verificationUrl)
    const token = url.searchParams.get("token")

    // Use it once
    await (await request()).post("/api/auth/verify-email").send({ token })

    // Try again
    const res = await (await request()).post("/api/auth/verify-email").send({ token })
    expect(res.status).toBe(400)
  })
})

describe("POST /api/auth/resend-verification", () => {
  it("sends new verification email for unverified user", async () => {
    await createTestUser({ email: "resend@example.com", email_verified: false })

    const res = await (await request())
      .post("/api/auth/resend-verification")
      .send({ email: "resend@example.com" })

    expect(res.status).toBe(200)
    expect(sendVerificationEmail).toHaveBeenCalledOnce()
    expect(sendVerificationEmail.mock.calls[0][0].toEmail).toBe("resend@example.com")
  })

  it("returns 200 but does not send email for verified user", async () => {
    await createTestUser({ email: "already@example.com", email_verified: true })

    const res = await (await request())
      .post("/api/auth/resend-verification")
      .send({ email: "already@example.com" })

    expect(res.status).toBe(200)
    expect(sendVerificationEmail).not.toHaveBeenCalled()
  })

  it("returns 200 for unknown email", async () => {
    const res = await (await request())
      .post("/api/auth/resend-verification")
      .send({ email: "ghost@example.com" })

    expect(res.status).toBe(200)
    expect(sendVerificationEmail).not.toHaveBeenCalled()
  })
})

describe("POST /api/auth/signin", () => {
  it("returns 401 for unknown email", async () => {
    const res = await (await request())
      .post("/api/auth/signin")
      .send({ email: "nobody@example.com", password: "Password123!" })

    expect(res.status).toBe(401)
  })

  it("returns 403 if email not verified", async () => {
    await createTestUser({ email: "unverified@example.com", email_verified: false })
    const res = await (await request())
      .post("/api/auth/signin")
      .send({ email: "unverified@example.com", password: "Password123!" })

    expect(res.status).toBe(403)
  })

  it("sets cookies and returns user data on success", async () => {
    await createTestUser({ email: "verified@example.com", email_verified: true })
    const res = await (await request())
      .post("/api/auth/signin")
      .send({ email: "verified@example.com", password: "Password123!" })

    expect(res.status).toBe(200)
    expect(res.body.data.email).toBe("verified@example.com")
    const cookies = res.headers["set-cookie"]
    expect(cookies.some((c) => c.startsWith("access_token="))).toBe(true)
    expect(cookies.some((c) => c.startsWith("refresh_token="))).toBe(true)
  })

  it("locks account after 5 failed attempts", async () => {
    await createTestUser({ email: "lockout@example.com", email_verified: true })

    // 5 failed attempts
    for (let i = 0; i < 5; i++) {
      await (await request())
        .post("/api/auth/signin")
        .send({ email: "lockout@example.com", password: "WrongPassword1!" })
    }

    // 6th attempt with correct password should be locked
    const res = await (await request())
      .post("/api/auth/signin")
      .send({ email: "lockout@example.com", password: "Password123!" })

    expect(res.status).toBe(401)
  })

  it("resets lockout on successful login", async () => {
    await createTestUser({ email: "resetlock@example.com", email_verified: true })

    // 3 failed attempts (below threshold)
    for (let i = 0; i < 3; i++) {
      await (await request())
        .post("/api/auth/signin")
        .send({ email: "resetlock@example.com", password: "WrongPassword1!" })
    }

    // Successful login resets counter
    const res = await (await request())
      .post("/api/auth/signin")
      .send({ email: "resetlock@example.com", password: "Password123!" })

    expect(res.status).toBe(200)
  })
})

describe("POST /api/auth/forgot-password", () => {
  it("sends reset email for existing user", async () => {
    await createTestUser({ email: "forgot@example.com" })

    const res = await (await request())
      .post("/api/auth/forgot-password")
      .send({ email: "forgot@example.com" })

    expect(res.status).toBe(200)
    expect(sendPasswordResetEmail).toHaveBeenCalledOnce()
    expect(sendPasswordResetEmail.mock.calls[0][0].toEmail).toBe("forgot@example.com")
  })

  it("returns 200 regardless of email existence", async () => {
    const res = await (await request())
      .post("/api/auth/forgot-password")
      .send({ email: "nobody@example.com" })

    expect(res.status).toBe(200)
    expect(sendPasswordResetEmail).not.toHaveBeenCalled()
  })
})

describe("POST /api/auth/reset-password", () => {
  it("resets password with valid token", async () => {
    const user = await createTestUser({ email: "reset@example.com" })

    // Manually create a reset token
    const rawToken = crypto.randomBytes(32).toString("hex")
    const tokenHash = emailTokenModel.hashToken(rawToken)
    await emailTokenModel.create({
      id: crypto.randomUUID(),
      user_id: user.id,
      token_hash: tokenHash,
      type: "reset_password",
      expires_at: new Date(Date.now() + 60 * 60 * 1000),
      created_at: new Date(),
    })

    const res = await (await request()).post("/api/auth/reset-password").send({
      token: rawToken,
      password: "NewPassword456!",
      confirmation_password: "NewPassword456!",
    })

    expect(res.status).toBe(200)
    expect(res.body.message).toBe("Password reset successfully")

    // Old password should no longer work
    const oldSignin = await (await request())
      .post("/api/auth/signin")
      .send({ email: "reset@example.com", password: "Password123!" })
    expect(oldSignin.status).toBe(401)

    // New password should work (user is verified by default in createTestUser)
    const newSignin = await (await request())
      .post("/api/auth/signin")
      .send({ email: "reset@example.com", password: "NewPassword456!" })
    expect(newSignin.status).toBe(200)
  })

  it("returns 400 for invalid token", async () => {
    const res = await (await request()).post("/api/auth/reset-password").send({
      token: "bogus",
      password: "NewPassword456!",
      confirmation_password: "NewPassword456!",
    })

    expect(res.status).toBe(400)
  })

  it("returns 400 for expired token", async () => {
    const user = await createTestUser({ email: "expired@example.com" })

    const rawToken = crypto.randomBytes(32).toString("hex")
    const tokenHash = emailTokenModel.hashToken(rawToken)
    await emailTokenModel.create({
      id: crypto.randomUUID(),
      user_id: user.id,
      token_hash: tokenHash,
      type: "reset_password",
      expires_at: new Date(Date.now() - 1000), // already expired
      created_at: new Date(),
    })

    const res = await (await request()).post("/api/auth/reset-password").send({
      token: rawToken,
      password: "NewPassword456!",
      confirmation_password: "NewPassword456!",
    })

    expect(res.status).toBe(400)
  })
})

describe("GET /api/auth/me", () => {
  it("returns user data for authenticated user", async () => {
    const user = await createTestUser()
    const res = await (await request()).get("/api/auth/me").set(await getAuthHeaders(user.id))

    expect(res.status).toBe(200)
    expect(res.body.data.email).toBe(user.email)
    expect(res.body.data.password_hash).toBeUndefined()
  })

  it("returns 401 without token", async () => {
    const res = await (await request()).get("/api/auth/me")
    expect(res.status).toBe(401)
  })
})

describe("POST /api/auth/refresh", () => {
  it("issues new cookies on refresh", async () => {
    const user = await createTestUser()
    const headers = await getAuthHeaders(user.id)

    const res = await (await request()).post("/api/auth/refresh").set(headers)

    expect(res.status).toBe(200)
    const cookies = res.headers["set-cookie"]
    expect(cookies.some((c) => c.startsWith("access_token="))).toBe(true)
    expect(cookies.some((c) => c.startsWith("refresh_token="))).toBe(true)
  })

  it("rejects reused refresh token", async () => {
    const user = await createTestUser()
    const headers = await getAuthHeaders(user.id)

    // First refresh succeeds
    await (await request()).post("/api/auth/refresh").set(headers)

    // Second refresh with same token should fail
    const res = await (await request()).post("/api/auth/refresh").set(headers)
    expect(res.status).toBe(401)
  })
})

describe("POST /api/auth/logout", () => {
  it("clears cookies and revokes token", async () => {
    const user = await createTestUser()
    const headers = await getAuthHeaders(user.id)
    const res = await (await request()).post("/api/auth/logout").set(headers)

    expect(res.status).toBe(200)
    const cookies = res.headers["set-cookie"] || []
    const refreshCookie = cookies.find((c) => c.startsWith("refresh_token="))
    expect(refreshCookie).toMatch(/refresh_token=;/)

    // Token should be revoked — refresh with same token should fail
    const refreshRes = await (await request()).post("/api/auth/refresh").set(headers)
    expect(refreshRes.status).toBe(401)
  })
})
