import { describe, it, expect, vi, beforeEach, afterEach, afterAll } from "vitest"
import { authenticator } from "otplib"
import db from "../../src/config/database.js"
import { encryptSecret } from "../../src/utils/totp-crypto.js"
import { generateTotpSecret } from "../../src/utils/totp.js"
import * as backupCodes from "../../src/models/mfa-backup-codes.js"
import { consumeStep } from "../../src/utils/mfa-totp-replay.js"
import { request, createTestUser, cleanAllTables } from "../helpers.js"

// Email OTP + attempts run through Redis; stub both for the no-Redis test policy.
vi.mock("../../src/utils/mfa-email-otp.js", () => ({
  issue: vi.fn(async () => "654321"),
  verify: vi.fn(async (_id, code) => code === "654321"),
  cooldownRemaining: vi.fn(async () => 0),
}))
vi.mock("../../src/utils/mfa-attempts.js", () => ({
  MAX_ATTEMPTS: 5,
  record: vi.fn(async () => 1),
  reset: vi.fn(async () => {}),
}))
vi.mock("../../src/utils/mfa-totp-replay.js", () => ({
  consumeStep: vi.fn(),
}))

/** Creates a user with 2FA enabled; returns { user, secret, codes }. */
async function userWith2fa() {
  const user = await createTestUser()
  const secret = generateTotpSecret()
  await db("users")
    .where({ id: user.id })
    .update({
      totp_secret: encryptSecret(secret),
      totp_enabled: true,
      totp_enabled_at: new Date(),
    })
  const codes = backupCodes.generateCodes()
  await backupCodes.replaceForUser(user.id, codes)
  return { user, secret, codes }
}

afterEach(cleanAllTables)
afterAll(() => db.destroy())

describe("sign-in with 2FA", () => {
  beforeEach(() => {
    consumeStep.mockResolvedValue(true)
  })

  it("password-only returns mfa_required + challenge cookie, no session cookies", async () => {
    const { user } = await userWith2fa()
    const res = await (await request())
      .post("/api/auth/signin")
      .send({ email: user.email, password: "Password123!" })
    expect(res.status).toBe(200)
    expect(res.body.data.mfa_required).toBe(true)
    const cookies = res.headers["set-cookie"].join(";")
    expect(cookies).toContain("2fa_challenge=")
    expect(cookies).not.toContain("access_token=")
  })

  it("completes with a valid TOTP code", async () => {
    const { user, secret } = await userWith2fa()
    const agent = (await request()).post("/api/auth/signin").send({
      email: user.email,
      password: "Password123!",
    })
    const signin = await agent
    const challengeCookie = signin.headers["set-cookie"]

    const res = await (
      await request()
    )
      .post("/api/auth/signin/2fa")
      .set("Cookie", challengeCookie)
      .send({ method: "totp", code: authenticator.generate(secret) })
    expect(res.status).toBe(200)
    expect(res.headers["set-cookie"].join(";")).toContain("access_token=")
  })

  it("rejects a replayed TOTP code (same step used twice)", async () => {
    const { user, secret } = await userWith2fa()
    const code = authenticator.generate(secret)

    consumeStep.mockResolvedValueOnce(true)
    const first = await (await request())
      .post("/api/auth/signin")
      .send({ email: user.email, password: "Password123!" })
    const ok = await (await request())
      .post("/api/auth/signin/2fa")
      .set("Cookie", first.headers["set-cookie"])
      .send({ method: "totp", code })
    expect(ok.status).toBe(200)

    consumeStep.mockResolvedValueOnce(false)
    const second = await (await request())
      .post("/api/auth/signin")
      .send({ email: user.email, password: "Password123!" })
    const replay = await (await request())
      .post("/api/auth/signin/2fa")
      .set("Cookie", second.headers["set-cookie"])
      .send({ method: "totp", code })
    expect(replay.status).toBe(401)
  })

  it("completes with a backup code (single-use)", async () => {
    const { user, codes } = await userWith2fa()
    const signin = await (await request())
      .post("/api/auth/signin")
      .send({ email: user.email, password: "Password123!" })
    const res = await (await request())
      .post("/api/auth/signin/2fa")
      .set("Cookie", signin.headers["set-cookie"])
      .send({ method: "backup", code: codes[0] })
    expect(res.status).toBe(200)
    expect(await backupCodes.countActive(user.id)).toBe(9)
  })

  it("rejects an invalid code", async () => {
    const { user } = await userWith2fa()
    const signin = await (await request())
      .post("/api/auth/signin")
      .send({ email: user.email, password: "Password123!" })
    const res = await (await request())
      .post("/api/auth/signin/2fa")
      .set("Cookie", signin.headers["set-cookie"])
      .send({ method: "totp", code: "000000" })
    expect(res.status).toBe(401)
  })

  it("rejects /signin/2fa without a challenge cookie", async () => {
    const res = await (await request())
      .post("/api/auth/signin/2fa")
      .send({ method: "totp", code: "123456" })
    expect(res.status).toBe(401)
  })

  it("non-2FA users still sign in directly", async () => {
    const user = await createTestUser()
    const res = await (await request())
      .post("/api/auth/signin")
      .send({ email: user.email, password: "Password123!" })
    expect(res.status).toBe(200)
    expect(res.body.data.mfa_required).toBeUndefined()
    expect(res.headers["set-cookie"].join(";")).toContain("access_token=")
  })
})
