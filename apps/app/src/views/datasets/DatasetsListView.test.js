// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest"
import { ref } from "vue"
import { mount, flushPromises } from "@vue/test-utils"

const { push } = vi.hoisted(() => ({ push: vi.fn() }))

vi.mock("vue-router", async (importOriginal) => ({
  ...(await importOriginal()),
  useRoute: () => ({ params: { workspaceId: "ws1" } }),
  useRouter: () => ({ push }),
}))

const datasetsRef = ref([
  {
    id: "d1",
    name: "Docs",
    description: "Handbook",
    file_count: 3,
    total_size_mb: 2,
    updated_at: "2026-03-01",
    created_at: "2026-01-01",
  },
])

const viewModeRef = ref("table")

vi.mock("@/composables/useDatasets", () => ({
  useDatasets: () => ({
    datasets: datasetsRef,
    loading: ref(false),
    pagination: ref({}),
    viewMode: viewModeRef,
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
    SORT_OPTIONS: [
      { key: "created_desc", label: "Recently created", sortBy: "created_at", sortOrder: "desc" },
    ],
    currentSortLabel: ref("Recently created"),
    totalCount: ref(1),
    paginationInfo: ref("Showing 1-1 of 1"),
    pageNumbers: ref([1]),
    showPagination: ref(false),
  }),
}))

vi.mock("@/composables/useFormattedTime", () => ({
  useFormattedTime: () => ({ shortDate: () => "Mar 1" }),
}))

vi.mock("@/utils/time", () => ({
  relativeTime: () => "2 months ago",
}))

import DatasetsListView from "@/views/datasets/DatasetsListView.vue"

// Functional a-modal stub: always rendered, exposes `open` prop and re-emits ok/cancel.
const AModalStub = {
  name: "AModal",
  props: ["open"],
  emits: ["ok", "cancel"],
  template: '<div class="a-modal-stub"><slot /></div>',
}

/**
 * a-dropdown stub: renders trigger slot inline; teleports overlay to body
 * under the overlay-class-name div. Exposes setOpen for test control.
 */
const ADropdownStub = {
  props: {
    overlayClassName: { type: String, default: "" },
    trigger: { type: [Array, String], default: () => ["click"] },
    placement: { type: String, default: "" },
  },
  data() {
    return { open: false }
  },
  methods: {
    /** @param {boolean} val */
    setOpen(val) {
      this.open = val
    },
  },
  template: `
    <div class="a-dropdown-stub">
      <slot />
      <teleport to="body">
        <div v-if="open" :class="overlayClassName">
          <slot name="overlay" />
        </div>
      </teleport>
    </div>
  `,
}

/** a-menu stub: renders slot inside a nav. */
const AMenuStub = {
  template: `<nav class="a-menu-stub"><slot /></nav>`,
}

/** a-menu-item stub: clickable li that fires @click with key payload. */
const AMenuItemStub = {
  props: { itemKey: { type: String, default: "" } },
  template: `<li class="a-menu-item-stub" @click="$emit('click', { key: itemKey })"><slot /></li>`,
  emits: ["click"],
}

// a-table stub: renders a real .ant-table DOM tree with thead, tbody, and one tr
// per dataSource entry. Invokes customRow(record) to spread attrs onto each tr.
const ATableStub = {
  props: {
    columns: { type: Array, default: () => [] },
    dataSource: { type: Array, default: () => [] },
    rowKey: [Function, String],
    pagination: { type: [Boolean, Object], default: false },
    customRow: { type: Function, default: null },
    loading: { type: Boolean, default: false },
  },
  template: `
    <div class="ant-table">
      <table>
        <thead class="ant-table-thead">
          <tr>
            <th v-for="col in columns" :key="col.key" class="ant-table-cell">{{ col.title }}</th>
          </tr>
        </thead>
        <tbody class="ant-table-tbody">
          <tr
            v-for="record in dataSource"
            :key="rowKey ? (typeof rowKey === 'function' ? rowKey(record) : record[rowKey]) : record.id"
            class="ant-table-row"
            v-bind="customRow ? customRow(record) : {}"
          >
            <td v-for="col in columns" :key="col.key" class="ant-table-cell">
              <slot name="bodyCell" :column="col" :record="record" :text="record[col.dataIndex]" />
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  `,
}

const STUBS = {
  "a-table": ATableStub,
  "a-modal": AModalStub,
  "a-dropdown": ADropdownStub,
  "a-menu": AMenuStub,
  "a-menu-item": AMenuItemStub,
  "a-form": true,
  "a-form-item": true,
  "a-input": true,
  "a-textarea": true,
}

/**
 * Mount DatasetsListView attached to document.body and return helpers.
 * @returns {{ wrapper: import("@vue/test-utils").VueWrapper, q: (sel: string) => Element|null, qa: (sel: string) => Element[], openKebab: (index?: number) => Promise<void> }}
 */
function mountView() {
  const wrapper = mount(DatasetsListView, {
    attachTo: document.body,
    global: { stubs: STUBS, mocks: { $router: { push } } },
  })
  const q = (sel) => document.querySelector(sel)
  const qa = (sel) => [...document.querySelectorAll(sel)]

  /**
   * Open the row-actions-overlay dropdown for the nth kebab (0-indexed).
   * @param {number} [index=0]
   */
  async function openKebab(index = 0) {
    const dropdowns = wrapper.findAllComponents(ADropdownStub)
    const kebabs = dropdowns.filter((d) => d.props("overlayClassName") === "row-actions-overlay")
    if (!kebabs[index]) throw new Error(`No row-actions-overlay dropdown at index ${index}`)
    kebabs[index].vm.setOpen(true)
    await wrapper.vm.$nextTick()
  }

  return { wrapper, q, qa, openKebab }
}

describe("DatasetsListView — table mode", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    document.body.innerHTML = ""
    viewModeRef.value = "table"
    datasetsRef.value = [
      {
        id: "d1",
        name: "Docs",
        description: "Handbook",
        file_count: 3,
        total_size_mb: 2,
        updated_at: "2026-03-01",
        created_at: "2026-01-01",
      },
    ]
  })

  it("renders an a-table (.ant-table) in table mode", async () => {
    const { wrapper } = mountView()
    await flushPromises()
    expect(wrapper.find(".ant-table").exists()).toBe(true)
    wrapper.unmount()
  })

  it("does NOT render the card grid in table mode", async () => {
    const { wrapper } = mountView()
    await flushPromises()
    expect(wrapper.find(".ds-grid").exists()).toBe(false)
    wrapper.unmount()
  })

  it("renders column headers: Name, Files, Size, Updated", async () => {
    const { wrapper } = mountView()
    await flushPromises()
    const headers = wrapper.findAll(".ant-table-thead th").map((el) => el.text().trim())
    expect(headers).toContain("Name")
    expect(headers).toContain("Files")
    expect(headers).toContain("Size")
    expect(headers).toContain("Updated")
    wrapper.unmount()
  })

  it("renders one row per dataset", async () => {
    datasetsRef.value = [
      {
        id: "d1",
        name: "Docs",
        description: "Handbook",
        file_count: 3,
        total_size_mb: 2,
        updated_at: "2026-03-01",
        created_at: "2026-01-01",
      },
      {
        id: "d2",
        name: "Policies",
        description: null,
        file_count: 0,
        total_size_mb: null,
        updated_at: "2026-02-01",
        created_at: "2026-01-15",
      },
    ]
    const { wrapper } = mountView()
    await flushPromises()
    expect(wrapper.findAll(".ant-table-tbody tr")).toHaveLength(2)
    wrapper.unmount()
  })

  it("renders name and description inside the name cell", async () => {
    const { wrapper } = mountView()
    await flushPromises()
    expect(wrapper.find(".tbl-name").text()).toBe("Docs")
    expect(wrapper.find(".tbl-desc").text()).toBe("Handbook")
    wrapper.unmount()
  })

  it("renders file count and size in dedicated cells", async () => {
    const { wrapper } = mountView()
    await flushPromises()
    const cells = wrapper.findAll(".tbl-mono")
    expect(cells[0].text()).toBe("3")
    expect(cells[1].text()).toMatch(/2/)
    wrapper.unmount()
  })

  it("renders relative updated time", async () => {
    const { wrapper } = mountView()
    await flushPromises()
    expect(wrapper.find(".tbl-muted").text()).toBe("2 months ago")
    wrapper.unmount()
  })

  it("table rows are focusable (tabindex=0) via customRow", async () => {
    const { wrapper } = mountView()
    await flushPromises()
    const tbodyRows = wrapper.findAll(".ant-table-tbody tr")
    expect(tbodyRows.length).toBeGreaterThan(0)
    expect(tbodyRows[0].attributes("tabindex")).toBe("0")
    wrapper.unmount()
  })

  it("navigates to the dataset on Enter", async () => {
    push.mockClear()
    const { wrapper } = mountView()
    await flushPromises()
    const firstRow = wrapper.findAll(".ant-table-tbody tr")[0]
    await firstRow.trigger("keydown", { key: "Enter" })
    expect(push).toHaveBeenCalledWith("/workspaces/ws1/datasets/d1")
    wrapper.unmount()
  })

  it("navigates to the dataset on click", async () => {
    push.mockClear()
    const { wrapper } = mountView()
    await flushPromises()
    const firstRow = wrapper.findAll(".ant-table-tbody tr")[0]
    await firstRow.trigger("click")
    expect(push).toHaveBeenCalledWith("/workspaces/ws1/datasets/d1")
    wrapper.unmount()
  })

  it("does not render .row-actions-overlay by default", async () => {
    const { wrapper, q } = mountView()
    await flushPromises()
    expect(q(".row-actions-overlay")).toBe(null)
    wrapper.unmount()
  })

  it("renders .row-actions-overlay in the document after a kebab is opened", async () => {
    const { wrapper, q, openKebab } = mountView()
    await flushPromises()
    await openKebab(0)
    expect(q(".row-actions-overlay")).not.toBe(null)
    wrapper.unmount()
  })

  it("shows Edit and Delete items in the overlay", async () => {
    const { wrapper, q, openKebab } = mountView()
    await flushPromises()
    await openKebab(0)
    const overlayText = q(".row-actions-overlay").textContent
    expect(overlayText).toContain("Edit")
    expect(overlayText).toContain("Delete")
    wrapper.unmount()
  })
})

describe("DatasetsListView — cards mode", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    document.body.innerHTML = ""
    viewModeRef.value = "cards"
    datasetsRef.value = [
      {
        id: "d1",
        name: "Docs",
        description: "Handbook",
        file_count: 3,
        total_size_mb: 2,
        updated_at: "2026-03-01",
        created_at: "2026-01-01",
      },
    ]
  })

  it("renders the card grid (.ds-grid) in cards mode", async () => {
    const { wrapper } = mountView()
    await flushPromises()
    expect(wrapper.find(".ds-grid").exists()).toBe(true)
    wrapper.unmount()
  })

  it("does NOT render an a-table in cards mode", async () => {
    const { wrapper } = mountView()
    await flushPromises()
    expect(wrapper.find(".ant-table").exists()).toBe(false)
    wrapper.unmount()
  })

  it("renders one card per dataset", async () => {
    const { wrapper } = mountView()
    await flushPromises()
    expect(wrapper.findAll(".ds-card")).toHaveLength(1)
    wrapper.unmount()
  })

  it("card displays the dataset name", async () => {
    const { wrapper } = mountView()
    await flushPromises()
    expect(wrapper.find(".card-name").text()).toBe("Docs")
    wrapper.unmount()
  })

  it("does not render .row-actions-overlay by default in cards mode", async () => {
    const { wrapper, q } = mountView()
    await flushPromises()
    expect(q(".row-actions-overlay")).toBe(null)
    wrapper.unmount()
  })

  it("renders .row-actions-overlay when card kebab is opened", async () => {
    const { wrapper, q, openKebab } = mountView()
    await flushPromises()
    await openKebab(0)
    expect(q(".row-actions-overlay")).not.toBe(null)
    wrapper.unmount()
  })

  it("shows Edit and Delete in card overlay", async () => {
    const { wrapper, q, openKebab } = mountView()
    await flushPromises()
    await openKebab(0)
    const overlayText = q(".row-actions-overlay").textContent
    expect(overlayText).toContain("Edit")
    expect(overlayText).toContain("Delete")
    wrapper.unmount()
  })
})
