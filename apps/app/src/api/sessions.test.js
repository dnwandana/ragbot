import { describe, it, expect, vi, beforeEach } from "vitest"
import { request } from "@/utils/http"
import { listSessions, revokeSession, revokeOtherSessions } from "@/api/sessions"

vi.mock("@/utils/http", () => ({
  request: { get: vi.fn(), del: vi.fn() },
}))

describe("api/sessions", () => {
  beforeEach(() => vi.clearAllMocks())

  it("listSessions GETs /auth/sessions", () => {
    listSessions()
    expect(request.get).toHaveBeenCalledWith("/auth/sessions")
  })

  it("revokeSession DELETEs the session path", () => {
    revokeSession("abc")
    expect(request.del).toHaveBeenCalledWith("/auth/sessions/abc")
  })

  it("revokeOtherSessions DELETEs /auth/sessions", () => {
    revokeOtherSessions()
    expect(request.del).toHaveBeenCalledWith("/auth/sessions")
  })
})
