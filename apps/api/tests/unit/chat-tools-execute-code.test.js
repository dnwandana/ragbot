import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("../../src/services/openrouter.js", () => ({
  embedText: vi.fn(),
}))

vi.mock("../../src/services/rag.js", () => ({
  searchChunks: vi.fn(),
}))

vi.mock("../../src/services/storage.js", () => ({
  getObjectBuffer: vi.fn(),
}))

// sandbox.js is already mocked globally in tests/setup.js, with the sandbox disabled.
const { executeCode, isSandboxEnabled } = await import("../../src/services/sandbox.js")
const { getObjectBuffer } = await import("../../src/services/storage.js")
const { executeTool, getAvailableTools } = await import("../../src/services/chat-tools.js")

const tabularFile = {
  id: "f1",
  filename: "sales report.xlsx",
  storage_path: "datasets/d1/f1.xlsx",
}

const context = {
  workspaceId: "w1",
  datasetIds: ["d1"],
  conversation: { id: "c1" },
  tabularFiles: [tabularFile],
}

describe("execute_code tool", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(isSandboxEnabled).mockReturnValue(true)
    vi.mocked(getObjectBuffer).mockResolvedValue(Buffer.from("bytes"))
    vi.mocked(executeCode).mockResolvedValue({
      ok: true,
      stdout: "42",
      stderr: "",
      charts: [{ type: "bar" }],
      error: null,
      duration_ms: 1900,
    })
  })

  it("requires a title so the UI can label the step", () => {
    const tool = getAvailableTools(context).find((t) => t.function.name === "execute_code")
    const { properties, required } = tool.function.parameters

    expect(properties.title.type).toBe("string")
    expect(required).toContain("title")
  })

  it("tells the model which libraries exist and that show_chart is the only way to plot", () => {
    // The sandbox ships no plotting library. Without this in the description the
    // model writes `import matplotlib` and burns a ReAct iteration on the failure.
    const tool = getAvailableTools(context).find((t) => t.function.name === "execute_code")
    const description = tool.function.description

    for (const library of ["pandas", "numpy", "duckdb", "pyarrow", "openpyxl"]) {
      expect(description).toContain(library)
    }
    expect(description).toContain("matplotlib")
    expect(description).toContain("show_chart")
    expect(description).toContain("no internet")
  })

  it("is offered only when enabled and tabular files exist", () => {
    const names = (ctx) => getAvailableTools(ctx).map((t) => t.function.name)

    expect(names(context)).toContain("execute_code")
    expect(names({ ...context, tabularFiles: [] })).not.toContain("execute_code")
    expect(names({ ...context, tabularFiles: undefined })).not.toContain("execute_code")

    vi.mocked(isSandboxEnabled).mockReturnValue(false)
    expect(names(context)).not.toContain("execute_code")
  })

  it("downloads files and sanitizes names for the sandbox", async () => {
    const { observation, extra } = await executeTool(
      "execute_code",
      { code: "print(42)", file_ids: ["f1"] },
      context,
    )

    expect(getObjectBuffer).toHaveBeenCalledWith("datasets/d1/f1.xlsx")
    const sent = vi.mocked(executeCode).mock.calls[0][0].files[0]
    expect(sent.name).toBe("sales_report.xlsx")
    expect(sent.name).toMatch(/^[A-Za-z0-9._-]+$/)
    expect(Buffer.isBuffer(sent.content)).toBe(true)
    expect(observation).toEqual({ stdout: "42", stderr: "", error: null, duration_ms: 1900 })
    expect(extra.charts).toEqual([{ type: "bar" }])
  })

  it("renames a file that collides with a sandbox reserved name", async () => {
    const reserved = { ...tabularFile, filename: "charts.json" }
    await executeTool(
      "execute_code",
      { code: "1", file_ids: ["f1"] },
      { ...context, tabularFiles: [reserved] },
    )

    const sent = vi.mocked(executeCode).mock.calls[0][0].files[0]
    expect(sent.name).toBe("_charts.json")
  })

  it("rejects unknown file ids without calling the sandbox", async () => {
    const { observation } = await executeTool(
      "execute_code",
      { code: "1", file_ids: ["evil"] },
      context,
    )

    expect(observation.error).toContain("unknown file id")
    expect(getObjectBuffer).not.toHaveBeenCalled()
    expect(executeCode).not.toHaveBeenCalled()
  })

  it("maps a download failure to an observation", async () => {
    vi.mocked(getObjectBuffer).mockRejectedValue(new Error("NoSuchKey"))

    const { observation } = await executeTool(
      "execute_code",
      { code: "1", file_ids: ["f1"] },
      context,
    )

    expect(observation.error).toContain("could not download")
    expect(executeCode).not.toHaveBeenCalled()
  })

  it("runs code with no files when file_ids is missing", async () => {
    const { observation } = await executeTool("execute_code", { code: "print(1)" }, context)

    expect(vi.mocked(executeCode).mock.calls[0][0].files).toEqual([])
    expect(observation.stdout).toBe("42")
  })

  it("passes a sandbox failure through as an observation", async () => {
    vi.mocked(executeCode).mockResolvedValue({
      ok: false,
      stdout: "",
      stderr: "sandbox is busy, try again",
      charts: [],
      error: "busy",
    })

    const { observation, extra } = await executeTool(
      "execute_code",
      { code: "1", file_ids: ["f1"] },
      context,
    )

    expect(observation.error).toBe("busy")
    expect(observation.stderr).toBe("sandbox is busy, try again")
    expect(extra.charts).toEqual([])
  })
})
