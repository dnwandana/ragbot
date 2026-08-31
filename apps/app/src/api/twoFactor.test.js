import { describe, it, expect, vi } from "vitest"

import { request } from "@/utils/http"
import * as twoFactor from "./twoFactor"

vi.mock("@/utils/http", () => ({
  request: { get: vi.fn(), post: vi.fn() },
}))

describe("twoFactor api", () => {
  it("setup posts the password", () => {
    twoFactor.setup("pw")
    expect(request.post).toHaveBeenCalledWith("/auth/2fa/setup", { password: "pw" })
  })

  it("verifySignin posts method + code", () => {
    twoFactor.verifySignin({ method: "totp", code: "123456" })
    expect(request.post).toHaveBeenCalledWith("/auth/signin/2fa", {
      method: "totp",
      code: "123456",
    })
  })

  it("getStatus gets the status endpoint", () => {
    twoFactor.getStatus()
    expect(request.get).toHaveBeenCalledWith("/auth/2fa")
  })

  it("disable posts password + code", () => {
    twoFactor.disable("pw", "123456")
    expect(request.post).toHaveBeenCalledWith("/auth/2fa/disable", {
      password: "pw",
      code: "123456",
    })
  })

  it("regenerateBackupCodes posts password + code", () => {
    twoFactor.regenerateBackupCodes("pw", "123456")
    expect(request.post).toHaveBeenCalledWith("/auth/2fa/backup-codes/regenerate", {
      password: "pw",
      code: "123456",
    })
  })
})
