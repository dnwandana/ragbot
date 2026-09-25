import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

vi.mock("@/utils/http", () => ({
  baseURL: "/api",
  request: { get: vi.fn(), post: vi.fn(), del: vi.fn(), put: vi.fn() },
}))

import { request } from "@/utils/http"
import {
  getShare,
  createShare,
  updateShare,
  revokeShare,
  exportMarkdown,
} from "@/api/conversationShares"

const share = "/workspaces/ws1/conversations/c1/share"

describe("conversationShares api", () => {
  beforeEach(() => vi.clearAllMocks())
  afterEach(() => vi.unstubAllGlobals())

  it("getShare is a silent GET on the share path", () => {
    getShare("ws1", "c1")
    expect(request.get).toHaveBeenCalledWith(share, { silent: true })
  })

  it("createShare is a silent POST with no body", () => {
    createShare("ws1", "c1")
    expect(request.post).toHaveBeenCalledWith(share, undefined, { silent: true })
  })

  it("updateShare and revokeShare hit the same path", () => {
    updateShare("ws1", "c1")
    revokeShare("ws1", "c1")
    expect(request.put).toHaveBeenCalledWith(share, undefined)
    expect(request.del).toHaveBeenCalledWith(share)
  })

  it("exportMarkdown fetches with credentials and reads the filename header", async () => {
    const blob = new Blob(["# hi"], { type: "text/markdown" })
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        headers: new Headers({ "content-disposition": 'attachment; filename="q3.md"' }),
        blob: () => Promise.resolve(blob),
      }),
    )
    const result = await exportMarkdown("ws1", "c1")
    expect(fetch).toHaveBeenCalledWith(
      `/api${share.replace("/share", "/export")}?format=markdown`,
      {
        credentials: "include",
      },
    )
    expect(result).toEqual({ blob, filename: "q3.md" })
  })

  it("exportMarkdown falls back to conversation.md and throws on failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue({
          ok: true,
          headers: new Headers(),
          blob: () => Promise.resolve(new Blob()),
        }),
    )
    expect((await exportMarkdown("ws1", "c1")).filename).toBe("conversation.md")
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 404, headers: new Headers() }),
    )
    await expect(exportMarkdown("ws1", "c1")).rejects.toThrow("Export failed")
  })
})
