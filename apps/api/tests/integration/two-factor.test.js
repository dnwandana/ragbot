import { describe, it, expect, vi, beforeEach, afterEach, afterAll } from "vitest"
import { authenticator } from "otplib"
import db from "../../src/config/database.js"
import { decryptSecret } from "../../src/utils/totp-crypto.js"
import { request, createTestUser, getAuthHeaders, cleanAllTables } from "../helpers.js"

vi.mock("../../src/utils/mfa-totp-replay.js", () => ({
  consumeStep: vi.fn(),
}))
vi.mock("../../src/models/mfa-backup-codes.js", async (importOriginal) => {
  const actual = await importOriginal()
  return { ...actual, replaceForUser: vi.fn(actual.replaceForUser) }
})
import { consumeStep } from "../../src/utils/mfa-totp-replay.js"
import * as backupCodes from "../../src/models/mfa-backup-codes.js"

// Default the replay tracker to "fresh" so the second-factor gate accepts a valid TOTP code.
beforeEach(() => consumeStep.mockResolvedValue(true))
afterEach(cleanAllTables)
afterAll(() => db.destroy())

/** Drives setup→activate and returns { headers, secret }. */
async function enable2fa(user) {
  const headers = await getAuthHeaders(user.id)
  const agent = await request()
  const setup = await agent
    .post("/api/auth/2fa/setup")
    .set(headers)
    .send({ password: "Password123!" })
  const row = await db("users").where({ id: user.id }).first()
  const secret = decryptSecret(row.totp_secret)
  const code = authenticator.generate(secret)
  await agent.post("/api/auth/2fa/activate").set(headers).send({ code })
  return { headers, secret, setupBody: setup.body }
}

describe("2FA management", () => {
  it("GET /2fa reports disabled by default", async () => {
    const user = await createTestUser()
    const headers = await getAuthHeaders(user.id)
    const res = await (await request()).get("/api/auth/2fa").set(headers)
    expect(res.status).toBe(200)
    expect(res.body.data.enabled).toBe(false)
  })

  it("setup requires the correct password", async () => {
    const user = await createTestUser()
    const headers = await getAuthHeaders(user.id)
    const res = await (await request())
      .post("/api/auth/2fa/setup")
      .set(headers)
      .send({ password: "wrong" })
    expect(res.status).toBe(400)
  })

  it("locks the account after repeated wrong passwords on setup", async () => {
    const user = await createTestUser()
    const headers = await getAuthHeaders(user.id)
    const agent = await request()
    for (let i = 0; i < 5; i += 1) {
      await agent.post("/api/auth/2fa/setup").set(headers).send({ password: "wrong" })
    }
    const row = await db("users").where({ id: user.id }).first()
    expect(row.locked_until).not.toBeNull()
    const res = await agent
      .post("/api/auth/2fa/setup")
      .set(headers)
      .send({ password: "Password123!" })
    expect(res.status).toBe(401)
  })

  it("setup stores a pending (encrypted, still-disabled) secret and returns otpauth_url", async () => {
    const user = await createTestUser()
    const headers = await getAuthHeaders(user.id)
    const res = await (await request())
      .post("/api/auth/2fa/setup")
      .set(headers)
      .send({ password: "Password123!" })
    expect(res.status).toBe(200)
    expect(res.body.data.otpauth_url).toContain("otpauth://totp/")
    const row = await db("users").where({ id: user.id }).first()
    expect(row.totp_secret).toBeTruthy()
    expect(row.totp_enabled).toBe(false)
  })

  it("activate enables 2FA with a valid code and returns 10 backup codes", async () => {
    const user = await createTestUser()
    const { setupBody } = await enable2fa(user)
    expect(setupBody.data.secret).toBeTruthy()
    const status = await (await request()).get("/api/auth/2fa").set(await getAuthHeaders(user.id))
    expect(status.body.data.enabled).toBe(true)
    expect(status.body.data.backup_codes_remaining).toBe(10)
  })

  it("activate rejects an invalid code", async () => {
    const user = await createTestUser()
    const headers = await getAuthHeaders(user.id)
    await (await request())
      .post("/api/auth/2fa/setup")
      .set(headers)
      .send({ password: "Password123!" })
    const res = await (await request())
      .post("/api/auth/2fa/activate")
      .set(headers)
      .send({ code: "000000" })
    expect(res.status).toBe(400)
  })

  it("disable requires password + a valid code and clears secret + codes", async () => {
    const user = await createTestUser()
    const { headers, secret } = await enable2fa(user)
    const res = await (
      await request()
    )
      .post("/api/auth/2fa/disable")
      .set(headers)
      .send({ password: "Password123!", code: authenticator.generate(secret) })
    expect(res.status).toBe(200)
    const row = await db("users").where({ id: user.id }).first()
    expect(row.totp_enabled).toBe(false)
    expect(row.totp_secret).toBeNull()
    expect(await db("mfa_backup_codes").where({ user_id: user.id })).toHaveLength(0)
  })

  it("disable rejects a missing or wrong code", async () => {
    const user = await createTestUser()
    const { headers } = await enable2fa(user)
    const missing = await (await request())
      .post("/api/auth/2fa/disable")
      .set(headers)
      .send({ password: "Password123!" })
    expect(missing.status).toBe(400)
    const wrong = await (await request())
      .post("/api/auth/2fa/disable")
      .set(headers)
      .send({ password: "Password123!", code: "000000" })
    expect(wrong.status).toBe(400)
  })

  it("disable accepts a backup code as the second factor", async () => {
    const user = await createTestUser()
    const { headers } = await enable2fa(user)
    const secret2 = (await db("users").where({ id: user.id }).first()).totp_secret
    const regen = await (
      await request()
    )
      .post("/api/auth/2fa/backup-codes/regenerate")
      .set(headers)
      .send({ password: "Password123!", code: authenticator.generate(decryptSecret(secret2)) })
    const backupCode = regen.body.data.backup_codes[0]
    const res = await (await request())
      .post("/api/auth/2fa/disable")
      .set(headers)
      .send({ password: "Password123!", code: backupCode })
    expect(res.status).toBe(200)
  })

  it("regenerate requires password + a valid code and replaces backup codes", async () => {
    const user = await createTestUser()
    const { headers, secret } = await enable2fa(user)
    const res = await (
      await request()
    )
      .post("/api/auth/2fa/backup-codes/regenerate")
      .set(headers)
      .send({ password: "Password123!", code: authenticator.generate(secret) })
    expect(res.status).toBe(200)
    expect(res.body.data.backup_codes).toHaveLength(10)
  })

  it("regenerate rejects a missing code", async () => {
    const user = await createTestUser()
    const { headers } = await enable2fa(user)
    const res = await (await request())
      .post("/api/auth/2fa/backup-codes/regenerate")
      .set(headers)
      .send({ password: "Password123!" })
    expect(res.status).toBe(400)
  })

  it("does not enable 2FA when backup-code persistence fails, and stays retryable", async () => {
    const user = await createTestUser()
    const headers = await getAuthHeaders(user.id)
    const agent = await request()
    await agent.post("/api/auth/2fa/setup").set(headers).send({ password: "Password123!" })
    const row = await db("users").where({ id: user.id }).first()
    const code = authenticator.generate(decryptSecret(row.totp_secret))

    backupCodes.replaceForUser.mockRejectedValueOnce(new Error("insert failed"))
    const failed = await agent.post("/api/auth/2fa/activate").set(headers).send({ code })
    expect(failed.status).toBe(500)
    const after = await db("users").where({ id: user.id }).first()
    expect(after.totp_enabled).toBe(false)

    const retry = await agent.post("/api/auth/2fa/activate").set(headers).send({ code })
    expect(retry.status).toBe(200)
    expect(retry.body.data.backup_codes).toHaveLength(10)
  })

  it("regenerate rejects a replayed TOTP code (same step used twice)", async () => {
    const user = await createTestUser()
    const { headers, secret } = await enable2fa(user)
    const code = authenticator.generate(secret)
    // The replay tracker reports the step as already used → the gate must reject it.
    consumeStep.mockResolvedValueOnce(false)
    const res = await (await request())
      .post("/api/auth/2fa/backup-codes/regenerate")
      .set(headers)
      .send({ password: "Password123!", code })
    expect(res.status).toBe(400)
  })
})
