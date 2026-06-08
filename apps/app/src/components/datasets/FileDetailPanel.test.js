// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest"
import { ref } from "vue"
import { mount } from "@vue/test-utils"

vi.mock("@/composables/useFileDetail", () => ({ useFileDetail: vi.fn() }))
vi.mock("@/composables/useMarkdown", () => ({
  useMarkdown: () => ({ renderChunk: (s) => s ?? "" }),
}))

import { useFileDetail } from "@/composables/useFileDetail"
import FileDetailPanel from "@/components/datasets/FileDetailPanel.vue"

function stubState(overrides = {}) {
  return {
    questions: ref([]),
    chunks: ref([]),
    chunksTotal: ref(0),
    loadingQuestions: ref(false),
    loadingChunks: ref(false),
    errored: ref(false),
    loadMoreError: ref(false),
    hasMoreChunks: ref(false),
    loadFile: vi.fn(),
    loadMoreChunks: vi.fn(),
    reset: vi.fn(),
    ...overrides,
  }
}

function mountPanel(file) {
  return mount(FileDetailPanel, {
    props: { file, open: true, workspaceId: "ws1", datasetId: "ds1" },
    global: { stubs: { teleport: true } },
  })
}

describe("FileDetailPanel", () => {
  beforeEach(() => vi.clearAllMocks())

  it("shows the real error_message for a failed file", () => {
    vi.mocked(useFileDetail).mockReturnValue(stubState())
    const wrapper = mountPanel({
      id: "f1",
      filename: "broken.pdf",
      status: "failed",
      error_message: "Unsupported MIME type",
      file_size_bytes: 0,
      chunk_count: 0,
    })
    expect(wrapper.text()).toContain("Unsupported MIME type")
  })

  it("keeps chunks and shows an inline retry when loadMoreError is set", async () => {
    const state = stubState({
      chunks: ref([{ id: "c1", chunk_index: 0, content: "chunk body text" }]),
      chunksTotal: ref(5),
      hasMoreChunks: ref(true),
      loadMoreError: ref(true),
    })
    vi.mocked(useFileDetail).mockReturnValue(state)
    const file = { id: "f1", filename: "doc.pdf", status: "completed" }
    const wrapper = mountPanel(file)
    expect(wrapper.text()).toContain("chunk body text") // chunks preserved
    expect(wrapper.text()).toContain("Couldn't load more chunks")

    const retry = wrapper.find(".load-more-err .btn-link")
    expect(retry.exists()).toBe(true)
    await retry.trigger("click")
    expect(state.loadMoreChunks).toHaveBeenCalledWith(expect.objectContaining({ id: "f1" }))
  })
})
