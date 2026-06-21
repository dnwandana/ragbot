import { vi } from "vitest"
import crypto from "node:crypto"
import {
  request,
  createTestUser,
  getAuthHeaders,
  cleanAllTables,
  seedPermissions,
  createTestWorkspace,
  addWorkspaceMember,
} from "../helpers.js"
import * as emailTokenModel from "../../src/models/email-tokens.js"
import db from "../../src/config/database.js"

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

  it("signin creates a session row carrying the request User-Agent", async () => {
    const password = "Password123!"
    const user = await createTestUser({ password, email_verified: true })

    const res = await (await request())
      .post("/api/auth/signin")
      .set("User-Agent", "PlanTest/9.9")
      .send({ email: user.email, password })

    expect(res.status).toBe(200)
    const session = await db("refresh_tokens").where({ user_id: user.id }).first()
    expect(session.user_agent).toBe("PlanTest/9.9")
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

describe("PUT /api/auth/profile", () => {
  it("updates full_name and timezone for the authenticated user", async () => {
    const user = await createTestUser({ email_verified: true })
    const headers = await getAuthHeaders(user.id)

    const res = await (await request())
      .put("/api/auth/profile")
      .set("Cookie", headers.Cookie)
      .send({ full_name: "Updated Name", timezone: "Asia/Singapore" })

    expect(res.status).toBe(200)
    expect(res.body.data.full_name).toBe("Updated Name")
    expect(res.body.data.timezone).toBe("Asia/Singapore")
    expect(res.body.data.password_hash).toBeUndefined()
  })

  it("accepts any valid IANA timezone identifier", async () => {
    const user = await createTestUser({ email_verified: true })
    const headers = await getAuthHeaders(user.id)

    const res = await (await request())
      .put("/api/auth/profile")
      .set("Cookie", headers.Cookie)
      .send({ full_name: "Name", timezone: "America/Indiana/Vincennes" })

    expect(res.status).toBe(200)
    expect(res.body.data.timezone).toBe("America/Indiana/Vincennes")
  })

  it("returns 400 for an invalid timezone", async () => {
    const user = await createTestUser({ email_verified: true })
    const headers = await getAuthHeaders(user.id)

    const res = await (await request())
      .put("/api/auth/profile")
      .set("Cookie", headers.Cookie)
      .send({ full_name: "Name", timezone: "Not/AReal/Zone" })

    expect(res.status).toBe(400)
  })

  it("returns 401 when not authenticated", async () => {
    const res = await (await request())
      .put("/api/auth/profile")
      .send({ full_name: "Name", timezone: "UTC" })

    expect(res.status).toBe(401)
  })
})

describe("DELETE /api/auth/profile", () => {
  it("soft-deletes the user and clears cookies", async () => {
    const user = await createTestUser({ email_verified: true })
    const headers = await getAuthHeaders(user.id)

    const res = await (await request()).delete("/api/auth/profile").set("Cookie", headers.Cookie)

    expect(res.status).toBe(200)
    expect(res.body.message).toBe("Account deleted")

    // Cookie should be cleared
    const cookies = res.headers["set-cookie"] ?? []
    const accessCookie = cookies.find((c) => c.startsWith("access_token="))
    expect(accessCookie).toMatch(/access_token=;/)
  })

  it("returns 401 when not authenticated", async () => {
    const res = await (await request()).delete("/api/auth/profile")
    expect(res.status).toBe(401)
  })

  it("returns 409 when user is the sole owner of a workspace", async () => {
    const user = await createTestUser({ email_verified: true })
    await createTestWorkspace(user.id)
    const headers = await getAuthHeaders(user.id)

    const res = await (await request()).delete("/api/auth/profile").set("Cookie", headers.Cookie)

    expect(res.status).toBe(409)
    expect(res.body.message).toMatch(/sole owner/i)
  })

  it("deletes account when another active owner exists in the workspace", async () => {
    const user = await createTestUser({ email_verified: true })
    const other = await createTestUser({ email_verified: true })
    const ws = await createTestWorkspace(user.id)
    // ws.roles is { owner: uuid, admin: uuid, editor: uuid, viewer: uuid }
    await addWorkspaceMember(ws.id, other.id, ws.roles.owner)
    const headers = await getAuthHeaders(user.id)

    const res = await (await request()).delete("/api/auth/profile").set("Cookie", headers.Cookie)

    expect(res.status).toBe(200)
    expect(res.body.message).toBe("Account deleted")
  })
})

describe("PUT /api/auth/password", () => {
  it("updates the password when current_password is correct", async () => {
    const user = await createTestUser({ email_verified: true, password: "OldPass123!" })
    const headers = await getAuthHeaders(user.id)

    const res = await (await request())
      .put("/api/auth/password")
      .set("Cookie", headers.Cookie)
      .send({ current_password: "OldPass123!", new_password: "NewPass456!" })

    expect(res.status).toBe(200)
    expect(res.body.message).toBe("Password updated")
  })

  it("returns 400 when current_password is wrong", async () => {
    const user = await createTestUser({ email_verified: true, password: "OldPass123!" })
    const headers = await getAuthHeaders(user.id)

    const res = await (await request())
      .put("/api/auth/password")
      .set("Cookie", headers.Cookie)
      .send({ current_password: "WrongPass!", new_password: "NewPass456!" })

    expect(res.status).toBe(400)
    expect(res.body.message).toBe("Current password is incorrect")
  })

  it("returns 400 when new_password is too short", async () => {
    const user = await createTestUser({ email_verified: true })
    const headers = await getAuthHeaders(user.id)

    const res = await (await request())
      .put("/api/auth/password")
      .set("Cookie", headers.Cookie)
      .send({ current_password: "Password123!", new_password: "short" })

    expect(res.status).toBe(400)
  })

  it("returns 401 when not authenticated", async () => {
    const res = await (await request())
      .put("/api/auth/password")
      .send({ current_password: "any", new_password: "NewPass456!" })

    expect(res.status).toBe(401)
  })

  it("issues fresh auth cookies so the current session survives", async () => {
    const user = await createTestUser({ email_verified: true, password: "OldPass123!" })
    const headers = await getAuthHeaders(user.id)

    const res = await (await request())
      .put("/api/auth/password")
      .set("Cookie", headers.Cookie)
      .send({ current_password: "OldPass123!", new_password: "NewPass456!" })

    expect(res.status).toBe(200)
    const cookies = res.headers["set-cookie"]
    expect(cookies.some((c) => c.startsWith("access_token="))).toBe(true)
    expect(cookies.some((c) => c.startsWith("refresh_token="))).toBe(true)
  })

  it("lets the refreshed session keep calling protected routes after a password change", async () => {
    const user = await createTestUser({ email_verified: true, password: "OldPass123!" })
    const headers = await getAuthHeaders(user.id)

    const changeRes = await (await request())
      .put("/api/auth/password")
      .set("Cookie", headers.Cookie)
      .send({ current_password: "OldPass123!", new_password: "NewPass456!" })

    expect(changeRes.status).toBe(200)
    const newCookies = changeRes.headers["set-cookie"]

    // The newly-issued refresh cookie must be accepted by /auth/refresh (the old
    // one was revoked). This is exactly what broke the live session before the fix.
    const refreshRes = await (await request()).post("/api/auth/refresh").set("Cookie", newCookies)
    expect(refreshRes.status).toBe(200)
  })
})

describe("signin token — downstream compatibility", () => {
  it("cookies from real signin allow GET /api/workspaces", async () => {
    // Create a verified user (email_verified defaults to true in createTestUser)
    const user = await createTestUser({
      email: "signin-token-check@example.com",
      password: "Password123!",
    })

    // Sign in through the real endpoint — NOT getAuthHeaders()
    const signinRes = await (await request()).post("/api/auth/signin").send({
      email: user.email,
      password: user.plainPassword,
    })

    expect(signinRes.status).toBe(200)

    // Extract the Set-Cookie header issued by issueTokenPair
    const cookies = signinRes.headers["set-cookie"]
    expect(cookies.some((c) => c.startsWith("access_token="))).toBe(true)
    expect(cookies.some((c) => c.startsWith("refresh_token="))).toBe(true)

    // Use those cookies to hit a protected workspace route
    const workspacesRes = await (await request()).get("/api/workspaces").set("Cookie", cookies)

    // Must return 200 with an array (empty because no workspaces created yet)
    expect(workspacesRes.status).toBe(200)
    expect(Array.isArray(workspacesRes.body.data)).toBe(true)
  })
})
