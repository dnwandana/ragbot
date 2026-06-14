import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("ant-design-vue", () => ({ message: { error: vi.fn() } }))
vi.mock("@/router", () => ({ default: { push: vi.fn() } }))
vi.mock("./storage", () => ({ clearUserData: vi.fn() }))
vi.mock("@/stores/auth", () => ({ useAuthStore: () => ({ user: null }) }))

import { request } from "./http.js"

describe("request.put/patch options forwarding", () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it("put forwards { silent: true } so no error toast fires on failure", async () => {
    const { message } = await import("ant-design-vue")
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        statusText: "Bad Request",
        json: async () => ({ message: "rename failed" }),
      }),
    )

    await expect(request.put("/x", { a: 1 }, { silent: true })).rejects.toThrow()
    expect(message.error).not.toHaveBeenCalled()
  })

  it("patch forwards { silent: true } so no error toast fires on failure", async () => {
    const { message } = await import("ant-design-vue")
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        statusText: "Bad Request",
        json: async () => ({ message: "patch failed" }),
      }),
    )

    await expect(request.patch("/x", { a: 1 }, { silent: true })).rejects.toThrow()
    expect(message.error).not.toHaveBeenCalled()
  })
})

describe("refresh re-entrancy", () => {
  it("refreshes once for concurrent 401s and replays both requests", async () => {
    let refreshCalls = 0
    // Track hits per protected URL so each replay (the 2nd hit) succeeds.
    const hits = new Map()
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url) => {
        if (url.includes("/auth/refresh")) {
          refreshCalls++
          return Promise.resolve({ ok: true, status: 200, json: async () => ({}) })
        }
        const count = (hits.get(url) || 0) + 1
        hits.set(url, count)
        // First hit 401s (triggers refresh + replay); the replay (2nd hit) succeeds.
        return Promise.resolve(
          count >= 2
            ? { ok: true, status: 200, json: async () => ({ ok: 1 }) }
            : { ok: false, status: 401, statusText: "Unauthorized", json: async () => ({}) },
        )
      }),
    )

    const results = await Promise.allSettled([request.get("/a"), request.get("/b")])

    // Refresh happens at most once across both concurrent 401s.
    expect(refreshCalls).toBeLessThanOrEqual(1)
    // Both requests ultimately resolve — proving the replay succeeded.
    expect(results.map((r) => r.status)).toEqual(["fulfilled", "fulfilled"])
    expect(results[0].value).toEqual({ data: { ok: 1 }, status: 200 })
    expect(results[1].value).toEqual({ data: { ok: 1 }, status: 200 })
  })
})

describe("FormData 401 handling", () => {
  it("does not attempt transparent retry for multipart uploads", async () => {
    let refreshCalls = 0
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url) => {
        if (url.includes("/auth/refresh")) {
          refreshCalls++
          return Promise.resolve({ ok: true, status: 200, json: async () => ({}) })
        }
        return Promise.resolve({
          ok: false,
          status: 401,
          statusText: "Unauthorized",
          json: async () => ({ message: "unauthorized" }),
        })
      }),
    )

    const fd = new FormData()
    fd.append("file", new Blob(["x"]), "x.txt")
    await expect(request.post("/upload", fd, { silent: true })).rejects.toThrow()
    expect(refreshCalls).toBe(0)
  })
})
