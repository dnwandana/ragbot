import { describe, it, expect, vi, beforeEach } from "vitest"

const { incr, lock, reset } = vi.hoisted(() => ({ incr: vi.fn(), lock: vi.fn(), reset: vi.fn() }))
vi.mock("../../src/models/users.js", () => ({
  incrementFailedAttempts: (...a) => incr(...a),
  lockAccount: (...a) => lock(...a),
  resetLoginState: (...a) => reset(...a),
}))

let lockout

beforeEach(async () => {
  vi.clearAllMocks()
  lockout = await vi.importActual("../../src/utils/account-lockout.js")
})

describe("account-lockout", () => {
  it("assertNotLocked is a no-op for null user", () => {
    expect(() => lockout.assertNotLocked(null)).not.toThrow()
  })

  it("assertNotLocked throws 401 when locked_until is in the future", () => {
    const future = new Date(Date.now() + 60_000)
    expect(() => lockout.assertNotLocked({ locked_until: future })).toThrow("Invalid credentials")
  })

  it("assertNotLocked passes when lock has expired", () => {
    const past = new Date(Date.now() - 60_000)
    expect(() => lockout.assertNotLocked({ locked_until: past })).not.toThrow()
  })

  it("recordFailedAttempt increments and does not lock below threshold", async () => {
    incr.mockResolvedValue([{ failed_login_attempts: 2 }])
    await lockout.recordFailedAttempt({ id: "u1" })
    expect(incr).toHaveBeenCalledWith("u1")
    expect(lock).not.toHaveBeenCalled()
  })

  it("recordFailedAttempt locks the account at the threshold", async () => {
    incr.mockResolvedValue([{ failed_login_attempts: lockout.MAX_FAILED_ATTEMPTS }])
    await lockout.recordFailedAttempt({ id: "u1" })
    expect(lock).toHaveBeenCalledWith("u1", expect.any(Date))
  })

  it("recordSuccess resets login state", async () => {
    await lockout.recordSuccess("u1")
    expect(reset).toHaveBeenCalledWith("u1")
  })
})
