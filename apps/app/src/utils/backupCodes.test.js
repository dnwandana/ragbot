// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest"
import { copyCodes, downloadCodes } from "./backupCodes"

describe("backupCodes utils", () => {
  it("copyCodes writes one code per line to the clipboard", async () => {
    const writeText = vi.fn(async () => {})
    Object.assign(navigator, { clipboard: { writeText } })
    await copyCodes(["aaaa-1111", "bbbb-2222"])
    expect(writeText).toHaveBeenCalledWith("aaaa-1111\nbbbb-2222")
  })

  it("downloadCodes triggers an anchor download named ragbot-backup-codes.txt", () => {
    const click = vi.fn()
    vi.spyOn(document, "createElement").mockReturnValueOnce({ click, set href(v) {}, download: "" })
    vi.stubGlobal("URL", { createObjectURL: vi.fn(() => "blob:x"), revokeObjectURL: vi.fn() })
    downloadCodes(["aaaa-1111"])
    expect(click).toHaveBeenCalled()
  })
})
