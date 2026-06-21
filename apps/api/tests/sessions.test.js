import crypto from "node:crypto"
import { request, createTestUser, getAuthHeaders, cleanAllTables } from "./helpers.js"
import db from "../src/config/database.js"
import { isSessionDenied } from "../src/utils/session-denylist.js"
import { generateAccessToken, generateRefreshToken } from "../src/utils/jwt.js"
import { hashToken } from "../src/models/refresh-tokens.js"

describe("sessions API", () => {
  beforeEach(async () => {
    await cleanAllTables()
    isSessionDenied.mockResolvedValue(false)
  })

  const addSession = (userId, overrides = {}) =>
    db("refresh_tokens").insert({
      id: overrides.id ?? crypto.randomUUID(),
      user_id: userId,
      token_hash: crypto.randomUUID(),
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      user_agent: overrides.user_agent ?? "Mozilla/5.0 (Macintosh) Chrome/120.0",
      ip_address: overrides.ip_address ?? "203.0.113.5",
      last_used_at: new Date(),
      created_at: new Date(),
      updated_at: new Date(),
    })

  it("lists the caller's active sessions with a parsed device label and is_current", async () => {
    const user = await createTestUser()
    const headers = await getAuthHeaders(user.id) // creates the current session
    await addSession(user.id) // a second device

    const res = await (await request()).get("/api/auth/sessions").set(headers)
    expect(res.status).toBe(200)
    expect(res.body.data.length).toBe(2)
    expect(res.body.data.some((s) => s.is_current)).toBe(true)
    expect(res.body.data.every((s) => typeof s.device === "string")).toBe(true)
  })

  it("revokes a single session and denylists it", async () => {
    const { denySession } = await import("../src/utils/session-denylist.js")
    const user = await createTestUser()
    const headers = await getAuthHeaders(user.id)
    const otherId = crypto.randomUUID()
    await addSession(user.id, { id: otherId })

    const res = await (await request()).delete(`/api/auth/sessions/${otherId}`).set(headers)
    expect(res.status).toBe(200)
    expect(denySession).toHaveBeenCalledWith(otherId)

    const stored = await db("refresh_tokens").where({ id: otherId }).first()
    expect(stored.revoked_at).not.toBeNull()
  })

  it("404s when revoking another user's session", async () => {
    const user = await createTestUser()
    const headers = await getAuthHeaders(user.id)
    const other = await createTestUser({ email: `o-${crypto.randomUUID()}@x.com` })
    const otherId = crypto.randomUUID()
    await addSession(other.id, { id: otherId })

    const res = await (await request()).delete(`/api/auth/sessions/${otherId}`).set(headers)
    expect(res.status).toBe(404)
  })

  it("revokes all other sessions, keeping the current one", async () => {
    const user = await createTestUser()
    const headers = await getAuthHeaders(user.id)
    await addSession(user.id)
    await addSession(user.id)

    const res = await (await request()).delete("/api/auth/sessions").set(headers)
    expect(res.status).toBe(200)
    expect(res.body.data.revoked).toBe(2)

    const list = await (await request()).get("/api/auth/sessions").set(headers)
    expect(list.body.data.length).toBe(1)
    expect(list.body.data[0].is_current).toBe(true)
  })

  it("returns 400 and does not revoke sessions when access token has no sid claim", async () => {
    const user = await createTestUser()

    // Insert a refresh_token row so the refresh cookie is valid
    const sessionId = crypto.randomUUID()
    const refreshToken = generateRefreshToken(user.id)
    const tokenHash = hashToken(refreshToken)
    await db("refresh_tokens").insert({
      id: sessionId,
      user_id: user.id,
      token_hash: tokenHash,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      last_used_at: new Date(),
      created_at: new Date(),
      updated_at: new Date(),
    })

    // Build a sid-less access token (no second arg → no sid claim)
    const sidlessAccessToken = generateAccessToken(user.id)

    // Add a second session that must survive the request
    const otherId = crypto.randomUUID()
    await addSession(user.id, { id: otherId })

    const headers = { Cookie: `access_token=${sidlessAccessToken}; refresh_token=${refreshToken}` }
    const res = await (await request()).delete("/api/auth/sessions").set(headers)

    expect(res.status).toBe(400)

    // The second session must still be active — nothing was mass-revoked
    const other = await db("refresh_tokens").where({ id: otherId }).first()
    expect(other.revoked_at).toBeNull()
  })
})
