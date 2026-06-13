// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest"
import { ref } from "vue"
import { mount } from "@vue/test-utils"

vi.mock("@/composables/useFileDetail", () => ({ useFileDetail: vi.fn() }))
vi.mock("@/composables/useMarkdown", () => ({
  useMarkdown: () => ({ renderChunk: (s) => s ?? "" }),
}))
vi.mock("@/composables/useFormattedTime", () => ({
  useFormattedTime: () => ({ shortDate: (s) => s ?? "" }),
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

  const makeQuestions = (n) =>
    Array.from({ length: n }, (_, i) => ({ id: `q${i + 1}`, question: `Question ${i + 1}?` }))

  it("renders only 5 questions when the source has more than 5", () => {
    vi.mocked(useFileDetail).mockReturnValue(stubState({ questions: ref(makeQuestions(10)) }))
    const wrapper = mountPanel({ id: "f1", filename: "doc.pdf", status: "completed" })
    expect(wrapper.findAll(".q-row")).toHaveLength(5)
  })

  it("shows a 'Showing 5 of 10' style count revealing the full total", () => {
    vi.mocked(useFileDetail).mockReturnValue(stubState({ questions: ref(makeQuestions(10)) }))
    const wrapper = mountPanel({ id: "f1", filename: "doc.pdf", status: "completed" })
    expect(wrapper.find(".explore-section .sec-count").text()).toContain("Showing 5 of 10")
  })

  it("hides the Shuffle button when there are 5 or fewer questions", () => {
    vi.mocked(useFileDetail).mockReturnValue(stubState({ questions: ref(makeQuestions(5)) }))
    const wrapper = mountPanel({ id: "f1", filename: "doc.pdf", status: "completed" })
    expect(wrapper.find(".shuffle-btn").exists()).toBe(false)
    expect(wrapper.findAll(".q-row")).toHaveLength(5)
  })

  it("shows the Shuffle button when there are more than 5 questions", () => {
    vi.mocked(useFileDetail).mockReturnValue(stubState({ questions: ref(makeQuestions(6)) }))
    const wrapper = mountPanel({ id: "f1", filename: "doc.pdf", status: "completed" })
    expect(wrapper.find(".shuffle-btn").exists()).toBe(true)
  })

  it("shuffle keeps exactly 5 displayed, all drawn from the source set", async () => {
    const source = makeQuestions(10)
    const sourceIds = new Set(source.map((q) => q.id))
    vi.mocked(useFileDetail).mockReturnValue(stubState({ questions: ref(source) }))
    const wrapper = mountPanel({ id: "f1", filename: "doc.pdf", status: "completed" })

    await wrapper.find(".shuffle-btn").trigger("click")

    const rows = wrapper.findAll(".q-row")
    expect(rows).toHaveLength(5)
    const displayedTexts = rows.map((r) => r.find(".q-txt").text())
    const sourceTexts = new Set(source.map((q) => q.question))
    for (const t of displayedTexts) expect(sourceTexts.has(t)).toBe(true)
    // The full count is still revealed.
    expect(wrapper.find(".explore-section .sec-count").text()).toContain("of 10")
    expect(sourceIds.size).toBe(10)
  })

  it("emits ask with the displayed question's text when a row is clicked", async () => {
    vi.mocked(useFileDetail).mockReturnValue(stubState({ questions: ref(makeQuestions(10)) }))
    const wrapper = mountPanel({ id: "f1", filename: "doc.pdf", status: "completed" })
    await wrapper.findAll(".q-row")[0].trigger("click")
    expect(wrapper.emitted("ask")).toBeTruthy()
    expect(wrapper.emitted("ask")[0][0]).toMatch(/Question \d+\?/)
  })

  it("prefers chunksTotal for the header chunk count when completed and chunks loaded", () => {
    const state = stubState({
      chunks: ref([{ id: "c1", chunk_index: 0, content: "body" }]),
      chunksTotal: ref(42),
    })
    vi.mocked(useFileDetail).mockReturnValue(state)
    const wrapper = mountPanel({
      id: "f1",
      filename: "doc.pdf",
      status: "completed",
      chunk_count: 7,
    })
    expect(wrapper.find(".panel-meta").text()).toContain("42 chunks")
    expect(wrapper.find(".panel-meta").text()).not.toContain("7 chunks")
  })

  it("falls back to file.chunk_count when chunks have not loaded", () => {
    vi.mocked(useFileDetail).mockReturnValue(stubState({ chunksTotal: ref(0) }))
    const wrapper = mountPanel({
      id: "f1",
      filename: "doc.pdf",
      status: "completed",
      chunk_count: 7,
    })
    expect(wrapper.find(".panel-meta").text()).toContain("7 chunks")
  })

  it("shows 'Showing X of Y' in the chunk-section header and drops 'chunks indexed'", () => {
    const state = stubState({
      chunks: ref([
        { id: "c1", chunk_index: 0, content: "body one" },
        { id: "c2", chunk_index: 1, content: "body two" },
      ]),
      chunksTotal: ref(42),
      hasMoreChunks: ref(true),
    })
    vi.mocked(useFileDetail).mockReturnValue(state)
    const wrapper = mountPanel({ id: "f1", filename: "doc.pdf", status: "completed" })

    const secCount = wrapper.find(".chunk-section .sec-count")
    expect(secCount.exists()).toBe(true)
    expect(secCount.text()).toContain("Showing 2 of 42")
    expect(wrapper.text()).not.toContain("chunks indexed")
  })

  it("hides the chunk-section count when completed but no chunks are loaded", () => {
    vi.mocked(useFileDetail).mockReturnValue(stubState({ chunks: ref([]), chunksTotal: ref(0) }))
    const wrapper = mountPanel({ id: "f1", filename: "doc.pdf", status: "completed" })
    expect(wrapper.find(".chunk-section .sec-count").exists()).toBe(false)
  })
})
