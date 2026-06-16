// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest"
import { ref } from "vue"
import { mount, flushPromises } from "@vue/test-utils"

vi.mock("vue-router", async (importOriginal) => ({
  ...(await importOriginal()),
  useRoute: () => ({ params: { workspaceId: "ws1" } }),
}))

vi.mock("@/composables/useDatasets", () => ({
  useDatasets: () => ({
    datasets: ref([
      {
        id: "d1",
        name: "Docs",
        description: "Handbook",
        file_count: 3,
        total_size_mb: 2,
        updated_at: "2026-03-01",
      },
    ]),
    loading: ref(false),
    pagination: ref({}),
    viewMode: ref("table"),
    query: ref(""),
    sortBy: ref("created_at"),
    sortOrder: ref("desc"),
    page: ref(1),
    setPage: vi.fn(),
    isModalVisible: ref(false),
    editingDataset: ref(null),
    openCreateModal: vi.fn(),
    openEditModal: vi.fn(),
    closeModal: vi.fn(),
    handleSubmit: vi.fn(),
    handleDelete: vi.fn(),
    nameRules: [],
  }),
}))

vi.mock("@/composables/usePaginationUI", () => ({
  usePaginationUI: () => ({
    SORT_OPTIONS: [{ key: "created_desc", label: "Recently created" }],
    currentSortLabel: ref("Recently created"),
    totalCount: ref(1),
    paginationInfo: ref("Showing 1–1 of 1"),
    pageNumbers: ref([1]),
    showPagination: ref(false),
  }),
}))

vi.mock("@/composables/useFormattedTime", () => ({
  useFormattedTime: () => ({ shortDate: () => "Mar 1" }),
}))

// The component also imports relativeTime directly from @/utils/time
vi.mock("@/utils/time", () => ({
  relativeTime: () => "2 months ago",
}))

import DatasetsListView from "@/views/datasets/DatasetsListView.vue"

const push = vi.fn()
const STUBS = {
  "a-modal": true,
  "a-form": true,
  "a-form-item": true,
  "a-input": true,
  "a-textarea": true,
}
const GLOBAL = { stubs: STUBS, mocks: { $router: { push } } }

describe("DatasetsListView keyboard access", () => {
  it("rows are focusable and expose a row role", async () => {
    const wrapper = mount(DatasetsListView, { global: GLOBAL })
    await flushPromises()
    const row = wrapper.find(".tbl-row")
    expect(row.exists()).toBe(true)
    expect(row.attributes("tabindex")).toBe("0")
    expect(row.attributes("role")).toBe("row")
  })

  it("navigates to the dataset on Enter", async () => {
    push.mockClear()
    const wrapper = mount(DatasetsListView, { global: GLOBAL })
    await flushPromises()
    await wrapper.find(".tbl-row").trigger("keydown.enter")
    expect(push).toHaveBeenCalledWith("/workspaces/ws1/datasets/d1")
  })

  it("does not navigate when activating the row menu by keyboard", async () => {
    push.mockClear()
    const wrapper = mount(DatasetsListView, { global: GLOBAL })
    await flushPromises()
    await wrapper.find(".tbl-row .menu-btn").trigger("keydown.enter")
    expect(push).not.toHaveBeenCalled()
  })
})
