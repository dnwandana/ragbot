import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/utils/http", () => ({
  request: { get: vi.fn(), post: vi.fn(), del: vi.fn() },
}))

import { request } from "@/utils/http"
import { listFileQuestions, listFileChunks } from "@/api/datasetFiles"

describe("datasetFiles api", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    request.get.mockResolvedValue({ data: { data: [], pagination: {} }, status: 200 })
  })

  it("listFileQuestions hits the questions endpoint and returns the raw promise", () => {
    const result = listFileQuestions("ws1", "ds1", "f1")
    expect(request.get).toHaveBeenCalledWith("/workspaces/ws1/datasets/ds1/files/f1/questions")
    expect(result).toBe(request.get.mock.results[0].value)
  })

  it("listFileChunks hits the chunks endpoint with params", () => {
    const params = { page: 1, limit: 10, sort_by: "chunk_index", sort_order: "asc" }
    listFileChunks("ws1", "ds1", "f1", params)
    expect(request.get).toHaveBeenCalledWith("/workspaces/ws1/datasets/ds1/files/f1/chunks", {
      params,
    })
  })
})
