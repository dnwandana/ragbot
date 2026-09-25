// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { ref } from "vue"

const { success } = vi.hoisted(() => ({ success: vi.fn() }))
vi.mock("ant-design-vue", () => ({ message: { success, error: vi.fn() } }))

const api = vi.hoisted(() =>
  Object.fromEntries(
    ["getShare", "createShare", "updateShare", "revokeShare", "exportMarkdown"].map((n) => [
      n,
      vi.fn(),
    ]),
  ),
)
vi.mock("@/api/conversationShares", () => api)

import { useConversationShare } from "@/composables/useConversationShare"

const shareRow = { id: "s1", url: "http://localhost:8080/chat/s1" }
const ok = (data) => ({ data: { data } })
const httpError = (status, data) => Object.assign(new Error("x"), { status, data: { data } })

describe("useConversationShare", () => {
  beforeEach(() => vi.clearAllMocks())
  afterEach(() => vi.unstubAllGlobals())

  it("load sets share, and treats 404 as not shared", async () => {
    api.getShare.mockResolvedValue(ok(shareRow))
    const s = useConversationShare(ref("ws1"), ref("c1"))
    await s.load()
    expect(api.getShare).toHaveBeenCalledWith("ws1", "c1")
    expect(s.share.value).toEqual(shareRow)
    api.getShare.mockRejectedValue(httpError(404))
    await s.load()
    expect(s.share.value).toBeNull()
  })

  it("create sets share and toasts; 409 adopts the existing share", async () => {
    api.createShare.mockResolvedValue(ok(shareRow))
    const s = useConversationShare("ws1", "c1")
    await s.create()
    expect(s.share.value).toEqual(shareRow)
    expect(success).toHaveBeenCalledWith("Share link created")
    api.createShare.mockRejectedValue(httpError(409, { ...shareRow, id: "old" }))
    await s.create()
    expect(s.share.value.id).toBe("old")
  })

  it("update and revoke toast and update state", async () => {
    api.updateShare.mockResolvedValue(ok({ ...shareRow, updated_at: "later" }))
    api.revokeShare.mockResolvedValue(ok(null))
    const s = useConversationShare("ws1", "c1")
    await s.update()
    expect(s.loading.value).toBe(false)
    expect(s.share.value.updated_at).toBe("later")
    expect(success).toHaveBeenCalledWith("Share link updated")
    await s.revoke()
    expect(s.share.value).toBeNull()
    expect(success).toHaveBeenCalledWith("Share link revoked")
  })

  it("copy writes the url to the clipboard", async () => {
    const writeText = vi.fn().mockResolvedValue()
    vi.stubGlobal("navigator", { clipboard: { writeText } })
    const s = useConversationShare("ws1", "c1")
    s.share.value = shareRow
    await s.copy()
    expect(writeText).toHaveBeenCalledWith(shareRow.url)
    expect(success).toHaveBeenCalledWith("Link copied")
  })

  it("downloadMarkdown clicks a temporary anchor named from the response", async () => {
    api.exportMarkdown.mockResolvedValue({ blob: new Blob(["#"]), filename: "q3.md" })
    vi.stubGlobal("URL", { createObjectURL: vi.fn(() => "blob:1"), revokeObjectURL: vi.fn() })
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {})
    const s = useConversationShare("ws1", "c1")
    await s.downloadMarkdown()
    expect(click).toHaveBeenCalledTimes(1)
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:1")
  })
})
