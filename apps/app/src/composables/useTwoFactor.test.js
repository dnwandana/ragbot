import { describe, it, expect, vi, beforeEach } from "vitest"
import { setActivePinia, createPinia } from "pinia"
import * as api from "@/api/twoFactor"
import { useTwoFactor } from "./useTwoFactor"

vi.mock("@/api/twoFactor", () => ({
  getStatus: vi.fn(),
  setup: vi.fn(),
  activate: vi.fn(),
  disable: vi.fn(),
  regenerateBackupCodes: vi.fn(),
}))

beforeEach(() => setActivePinia(createPinia()))

describe("useTwoFactor", () => {
  it("confirmPassword stores otpauth_url and advances to the scan step", async () => {
    api.setup.mockResolvedValue({
      data: { data: { otpauth_url: "otpauth://totp/x", secret: "JBSW" } },
    })
    const tf = useTwoFactor()
    tf.password.value = "pw"
    await tf.confirmPassword()
    expect(tf.otpauthUrl.value).toBe("otpauth://totp/x")
    expect(tf.step.value).toBe(2)
  })

  it("verifyCode stores backup codes and advances to the codes step", async () => {
    api.activate.mockResolvedValue({ data: { data: { backup_codes: ["a", "b"] } } })
    api.getStatus.mockResolvedValue({
      data: { data: { enabled: true, enabled_at: "2026-06-26", backup_codes_remaining: 8 } },
    })
    const tf = useTwoFactor()
    tf.code.value = "123456"
    await tf.verifyCode()
    expect(tf.backupCodes.value).toEqual(["a", "b"])
    expect(tf.step.value).toBe(3)
  })

  it("disable forwards password + code to the api", async () => {
    api.disable.mockResolvedValue({})
    api.getStatus.mockResolvedValue({
      data: { data: { enabled: false, enabled_at: null, backup_codes_remaining: 0 } },
    })
    const tf = useTwoFactor()
    await tf.disable("pw", "123456")
    expect(api.disable).toHaveBeenCalledWith("pw", "123456")
  })

  it("regenerate forwards password + code and returns new codes", async () => {
    api.regenerateBackupCodes.mockResolvedValue({ data: { data: { backup_codes: ["x", "y"] } } })
    api.getStatus.mockResolvedValue({
      data: { data: { enabled: true, enabled_at: "2026-06-26", backup_codes_remaining: 10 } },
    })
    const tf = useTwoFactor()
    const codes = await tf.regenerate("pw", "123456")
    expect(api.regenerateBackupCodes).toHaveBeenCalledWith("pw", "123456")
    expect(codes).toEqual(["x", "y"])
  })
})
