// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest"
import { ref } from "vue"
import { flushPromises } from "@vue/test-utils"

vi.mock("@/api/datasets", () => ({
  listDatasetQuestions: vi.fn(),
}))

import { listDatasetQuestions } from "@/api/datasets"
import { useSuggestedPrompts } from "@/composables/useSuggestedPrompts"

const ok = (questions) => ({
  data: { data: questions.map((q, i) => ({ id: `q${i}`, question: q, dataset_file_id: "f" })) },
  status: 200,
})

describe("useSuggestedPrompts", () => {
  beforeEach(() => vi.clearAllMocks())

  it("does not fetch while no dataset is selected", async () => {
    const ids = ref([])
    const { prompts } = useSuggestedPrompts(ref("ws1"), ids)
    await flushPromises()
    expect(listDatasetQuestions).not.toHaveBeenCalled()
    expect(prompts.value).toEqual([])
  })

  it("fetches the first dataset only and caps at 4 prompts", async () => {
    listDatasetQuestions.mockResolvedValue(ok(["A?", "B?", "C?", "D?", "E?"]))
    const ids = ref([])
    const { prompts } = useSuggestedPrompts(ref("ws1"), ids)

    ids.value = ["d1", "d2"]
    await flushPromises()

    expect(listDatasetQuestions).toHaveBeenCalledTimes(1)
    expect(listDatasetQuestions).toHaveBeenCalledWith("ws1", "d1", { limit: 4 })
    expect(prompts.value).toEqual([{ text: "A?" }, { text: "B?" }, { text: "C?" }, { text: "D?" }])
  })

  it("refetches when the first dataset changes", async () => {
    listDatasetQuestions.mockResolvedValueOnce(ok(["A?"])).mockResolvedValueOnce(ok(["B?"]))
    const ids = ref(["a"])
    const { prompts } = useSuggestedPrompts(ref("ws1"), ids)
    await flushPromises()
    expect(prompts.value).toEqual([{ text: "A?" }])

    ids.value = ["b"]
    await flushPromises()

    expect(listDatasetQuestions).toHaveBeenCalledTimes(2)
    expect(listDatasetQuestions).toHaveBeenLastCalledWith("ws1", "b", { limit: 4 })
    expect(prompts.value).toEqual([{ text: "B?" }])
  })

  it("does not refetch when only trailing datasets change", async () => {
    listDatasetQuestions.mockResolvedValue(ok(["A?"]))
    const ids = ref(["a"])
    const { prompts } = useSuggestedPrompts(ref("ws1"), ids)
    await flushPromises()

    ids.value = ["a", "b"]
    await flushPromises()
    ids.value = ["a", "b", "c"]
    await flushPromises()

    expect(listDatasetQuestions).toHaveBeenCalledTimes(1)
    expect(prompts.value).toEqual([{ text: "A?" }])
  })

  it("clears prompts when all datasets are deselected", async () => {
    listDatasetQuestions.mockResolvedValue(ok(["A?"]))
    const ids = ref(["a"])
    const { prompts } = useSuggestedPrompts(ref("ws1"), ids)
    await flushPromises()
    expect(prompts.value).toEqual([{ text: "A?" }])

    ids.value = []
    await flushPromises()
    expect(prompts.value).toEqual([])
  })

  it("discards a stale response when the first dataset changes mid-flight", async () => {
    let resolveA
    listDatasetQuestions
      .mockImplementationOnce(
        () =>
          new Promise((r) => {
            resolveA = () => r(ok(["A?"]))
          }),
      )
      .mockResolvedValueOnce(ok(["B?"]))
    const ids = ref([])
    const { prompts } = useSuggestedPrompts(ref("ws1"), ids)

    ids.value = ["a"] // starts fetch A (pending)
    await flushPromises()
    ids.value = ["b"] // starts fetch B (resolves)
    await flushPromises()
    resolveA() // A resolves late — must be discarded
    await flushPromises()

    expect(prompts.value).toEqual([{ text: "B?" }])
  })

  it("degrades to empty prompts when the fetch fails", async () => {
    listDatasetQuestions.mockRejectedValue(new Error("boom"))
    const ids = ref([])
    const { prompts } = useSuggestedPrompts(ref("ws1"), ids)

    ids.value = ["d1"]
    await flushPromises()
    expect(prompts.value).toEqual([])
  })
})
