import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/utils/http", () => ({
  request: { get: vi.fn(), post: vi.fn(), del: vi.fn(), put: vi.fn() },
}))

import { request } from "@/utils/http"
import { listDatasetQuestions } from "@/api/datasets"

describe("datasets api", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    request.get.mockResolvedValue({ data: { data: [] }, status: 200 })
  })

  it("listDatasetQuestions hits the questions endpoint with params", () => {
    listDatasetQuestions("ws1", "ds1", { limit: 4 })
    expect(request.get).toHaveBeenCalledWith("/workspaces/ws1/datasets/ds1/questions", {
      params: { limit: 4 },
    })
  })
})
