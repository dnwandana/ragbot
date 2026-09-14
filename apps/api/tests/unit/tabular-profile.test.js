import { beforeEach, describe, expect, it, vi } from "vitest"
import { executeCode } from "../../src/services/sandbox.js"
import { getObjectBuffer } from "../../src/services/storage.js"

vi.mock("../../src/services/storage.js", () => ({
  getObjectBuffer: vi.fn(),
}))
// sandbox.js is already mocked globally in tests/setup.js

const { profileTabularFile } = await import("../../src/services/tabular/profile.js")

const datasetFile = {
  id: "f1",
  filename: "cities.csv",
  storage_path: "datasets/d1/cities.csv",
  metadata: { source_type: "tabular" },
}

const goodProfile = { format: "csv", sheets: [], truncated: false }

describe("profileTabularFile", () => {
  beforeEach(() => {
    vi.mocked(getObjectBuffer).mockResolvedValue(Buffer.from("a,b\n1,2"))
    vi.mocked(executeCode).mockResolvedValue({
      ok: true,
      stdout: JSON.stringify(goodProfile),
      stderr: "",
      charts: [],
      error: null,
    })
  })

  it("downloads the file and posts it as data.<ext>", async () => {
    await profileTabularFile(datasetFile)
    expect(getObjectBuffer).toHaveBeenCalledWith("datasets/d1/cities.csv")
    const call = vi.mocked(executeCode).mock.calls[0][0]
    expect(call.files[0].name).toBe("data.csv")
    expect(Buffer.isBuffer(call.files[0].content)).toBe(true)
    expect(call.code).toContain("MAX_PROFILE_BYTES")
  })

  it("returns the parsed profile and rendered markdown", async () => {
    const { profile, markdown } = await profileTabularFile(datasetFile)
    expect(profile).toEqual(goodProfile)
    expect(markdown).toContain("cities.csv")
  })

  it("throws when the sandbox run fails", async () => {
    vi.mocked(executeCode).mockResolvedValue({
      ok: false,
      stdout: "",
      stderr: "boom",
      charts: [],
      error: "exception",
    })
    await expect(profileTabularFile(datasetFile)).rejects.toThrow(/boom/)
  })

  it("throws when stdout is not valid JSON", async () => {
    vi.mocked(executeCode).mockResolvedValue({
      ok: true,
      stdout: "not json",
      stderr: "",
      charts: [],
      error: null,
    })
    await expect(profileTabularFile(datasetFile)).rejects.toThrow()
  })
})
