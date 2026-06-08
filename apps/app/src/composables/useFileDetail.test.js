// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/api/datasetFiles", () => ({
  listFileQuestions: vi.fn(),
  listFileChunks: vi.fn(),
}))

import * as filesApi from "@/api/datasetFiles"
import { useFileDetail } from "@/composables/useFileDetail"

const completed = (id = "f1") => ({ id, status: "completed" })

function mockChunks(chunks, total) {
  return { data: { data: chunks, pagination: { total } }, status: 200 }
}

describe("useFileDetail", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("loads questions and first chunk page for a completed file", async () => {
    filesApi.listFileQuestions.mockResolvedValue({
      data: { data: [{ id: "q1", question: "Why?" }] },
      status: 200,
    })
    filesApi.listFileChunks.mockResolvedValue(
      mockChunks([{ id: "c1", chunk_index: 0, content: "a" }], 3),
    )

    const fd = useFileDetail("ws1", "ds1")
    await fd.loadFile(completed())

    expect(fd.questions.value).toHaveLength(1)
    expect(fd.chunks.value).toHaveLength(1)
    expect(fd.chunksTotal.value).toBe(3)
    expect(fd.hasMoreChunks.value).toBe(true)
    expect(filesApi.listFileChunks).toHaveBeenCalledWith("ws1", "ds1", "f1", {
      page: 1,
      limit: 5,
      sort_by: "chunk_index",
      sort_order: "asc",
    })
  })

  it("does not fetch for a non-completed file", async () => {
    const fd = useFileDetail("ws1", "ds1")
    await fd.loadFile({ id: "f2", status: "processing" })
    expect(filesApi.listFileQuestions).not.toHaveBeenCalled()
    expect(filesApi.listFileChunks).not.toHaveBeenCalled()
    expect(fd.questions.value).toEqual([])
  })

  it("appends the next page via loadMoreChunks", async () => {
    filesApi.listFileQuestions.mockResolvedValue({ data: { data: [] }, status: 200 })
    filesApi.listFileChunks
      .mockResolvedValueOnce(mockChunks([{ id: "c1", chunk_index: 0, content: "a" }], 2))
      .mockResolvedValueOnce(mockChunks([{ id: "c2", chunk_index: 1, content: "b" }], 2))

    const fd = useFileDetail("ws1", "ds1")
    const file = completed()
    await fd.loadFile(file)
    await fd.loadMoreChunks(file)

    expect(fd.chunks.value.map((c) => c.id)).toEqual(["c1", "c2"])
    expect(fd.chunksPage.value).toBe(2)
    expect(fd.hasMoreChunks.value).toBe(false)
    expect(filesApi.listFileChunks).toHaveBeenLastCalledWith("ws1", "ds1", "f1", {
      page: 2,
      limit: 5,
      sort_by: "chunk_index",
      sort_order: "asc",
    })
  })

  it("sets errored on fetch failure", async () => {
    filesApi.listFileQuestions.mockRejectedValue(new Error("boom"))
    filesApi.listFileChunks.mockRejectedValue(new Error("boom"))

    const fd = useFileDetail("ws1", "ds1")
    await fd.loadFile(completed())

    expect(fd.errored.value).toBe(true)
    expect(fd.loadingChunks.value).toBe(false)
  })

  it("sets loadMoreError without dropping chunks, and clears it on retry", async () => {
    filesApi.listFileQuestions.mockResolvedValue({ data: { data: [] }, status: 200 })
    filesApi.listFileChunks
      .mockResolvedValueOnce(mockChunks([{ id: "c1", chunk_index: 0, content: "a" }], 2))
      .mockRejectedValueOnce(new Error("more boom"))
      .mockResolvedValueOnce(mockChunks([{ id: "c2", chunk_index: 1, content: "b" }], 2))

    const fd = useFileDetail("ws1", "ds1")
    const file = completed()
    await fd.loadFile(file)
    expect(fd.loadMoreError.value).toBe(false)
    await fd.loadMoreChunks(file)

    expect(fd.loadMoreError.value).toBe(true)
    expect(fd.errored.value).toBe(false)
    expect(fd.chunks.value).toHaveLength(1) // already-loaded chunk preserved

    await fd.loadMoreChunks(file)
    expect(fd.loadMoreError.value).toBe(false)
    expect(fd.chunks.value.map((c) => c.id)).toEqual(["c1", "c2"])
  })

  it("keeps chunks when only the questions request fails", async () => {
    filesApi.listFileQuestions.mockRejectedValue(new Error("q boom"))
    filesApi.listFileChunks.mockResolvedValue(
      mockChunks([{ id: "c1", chunk_index: 0, content: "a" }], 1),
    )

    const fd = useFileDetail("ws1", "ds1")
    await fd.loadFile(completed())

    expect(fd.errored.value).toBe(false)
    expect(fd.chunks.value).toHaveLength(1)
    expect(fd.questions.value).toEqual([])
  })

  it("drops a stale response when the active file changes mid-flight", async () => {
    let resolveA
    const aPromise = new Promise((r) => (resolveA = r))
    filesApi.listFileQuestions
      .mockReturnValueOnce(aPromise) // file A questions — left pending
      .mockResolvedValueOnce({ data: { data: [{ id: "qB", question: "B?" }] }, status: 200 })
    filesApi.listFileChunks.mockResolvedValue(mockChunks([], 0))

    const fd = useFileDetail("ws1", "ds1")
    const loadA = fd.loadFile(completed("A")) // suspends on allSettled (A pending)
    await fd.loadFile(completed("B")) // switches activeFileId to "B", resolves
    resolveA({ data: { data: [{ id: "qA", question: "A?" }] }, status: 200 })
    await loadA

    // A's late response must not overwrite B's state
    expect(fd.questions.value).toEqual([{ id: "qB", question: "B?" }])
    expect(fd.loadingChunks.value).toBe(false)
    expect(fd.loadingQuestions.value).toBe(false)
  })

  it("loadMoreChunks is a no-op when there are no more chunks", async () => {
    filesApi.listFileQuestions.mockResolvedValue({ data: { data: [] }, status: 200 })
    filesApi.listFileChunks.mockResolvedValue(
      mockChunks([{ id: "c1", chunk_index: 0, content: "a" }], 1), // total 1 == loaded 1
    )

    const fd = useFileDetail("ws1", "ds1")
    const file = completed()
    await fd.loadFile(file)
    expect(fd.hasMoreChunks.value).toBe(false)

    await fd.loadMoreChunks(file)
    expect(filesApi.listFileChunks).toHaveBeenCalledTimes(1) // not fetched again
  })

  it("reset clears state", async () => {
    filesApi.listFileQuestions.mockResolvedValue({
      data: { data: [{ id: "q1", question: "Why?" }] },
      status: 200,
    })
    filesApi.listFileChunks.mockResolvedValue(mockChunks([{ id: "c1", chunk_index: 0 }], 1))

    const fd = useFileDetail("ws1", "ds1")
    await fd.loadFile(completed())
    fd.reset()

    expect(fd.questions.value).toEqual([])
    expect(fd.chunks.value).toEqual([])
    expect(fd.chunksTotal.value).toBe(0)
    expect(fd.chunksPage.value).toBe(1)
  })
})
