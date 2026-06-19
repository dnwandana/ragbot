// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest"
import { ref } from "vue"
import { mount, flushPromises } from "@vue/test-utils"

vi.mock("vue-router", async (importOriginal) => ({
  ...(await importOriginal()),
  useRoute: () => ({ params: { workspaceId: "ws1" } }),
}))

const agentsRef = ref([
  {
    id: "a1",
    name: "Support Bot",
    description: "Handles support queries",
    is_default: false,
    is_system: false,
    model_config: { model: "openai/gpt-4o" },
    created_at: "2026-01-01",
    updated_at: "2026-03-01",
  },
])

const viewModeRef = ref("table")

const handleSetDefault = vi.fn()
const openEdit = vi.fn()
const openCreate = vi.fn()
const handleDelete = vi.fn()
const closeDrawer = vi.fn()
const handleSubmit = vi.fn()

vi.mock("@/composables/useAgents", () => ({
  useAgents: () => ({
    agents: agentsRef,
    loading: ref(false),
    pagination: ref({}),
    viewMode: viewModeRef,
    query: ref(""),
    sortBy: ref("created_at"),
    sortOrder: ref("desc"),
    page: ref(1),
    setPage: vi.fn(),
    isDrawerOpen: ref(false),
    drawerAgent: ref(null),
    openCreate,
    openEdit,
    closeDrawer,
    handleSubmit,
    handleDelete,
    handleSetDefault,
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
  useFormattedTime: () => ({ shortDate: () => "Jan 1" }),
}))

vi.mock("@/utils/time", () => ({
  relativeTime: () => "2 months ago",
}))

import AgentsListView from "@/views/agents/AgentsListView.vue"

// Functional a-modal stub.
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
    rowClassName: { type: Function, default: null },
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
  "a-input": true,
  AgentFormDrawer: true,
}

/**
 * Mount AgentsListView attached to document.body and return helpers.
 * @returns {{ wrapper: import("@vue/test-utils").VueWrapper, q: (sel: string) => Element|null, qa: (sel: string) => Element[], openKebab: (index?: number) => Promise<void> }}
 */
function mountView() {
  const wrapper = mount(AgentsListView, {
    attachTo: document.body,
    global: { stubs: STUBS },
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

describe("AgentsListView — table mode", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    document.body.innerHTML = ""
    viewModeRef.value = "table"
    agentsRef.value = [
      {
        id: "a1",
        name: "Support Bot",
        description: "Handles support queries",
        is_default: false,
        is_system: false,
        model_config: { model: "openai/gpt-4o" },
        created_at: "2026-01-01",
        updated_at: "2026-03-01",
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
    expect(wrapper.find(".agent-grid").exists()).toBe(false)
    wrapper.unmount()
  })

  it("renders column headers: Name, Model, Created, Updated", async () => {
    const { wrapper } = mountView()
    await flushPromises()
    const headers = wrapper.findAll(".ant-table-thead th").map((el) => el.text().trim())
    expect(headers).toContain("Name")
    expect(headers).toContain("Model")
    expect(headers).toContain("Created")
    expect(headers).toContain("Updated")
    wrapper.unmount()
  })

  it("renders one row per agent", async () => {
    agentsRef.value = [
      {
        id: "a1",
        name: "Support Bot",
        description: "Help desk",
        is_default: false,
        is_system: false,
        model_config: { model: "openai/gpt-4o" },
        created_at: "2026-01-01",
        updated_at: "2026-03-01",
      },
      {
        id: "a2",
        name: "Sales Bot",
        description: null,
        is_default: true,
        is_system: false,
        model_config: { model: "openai/gpt-3.5-turbo" },
        created_at: "2026-02-01",
        updated_at: "2026-04-01",
      },
    ]
    const { wrapper } = mountView()
    await flushPromises()
    expect(wrapper.findAll(".ant-table-tbody tr")).toHaveLength(2)
    wrapper.unmount()
  })

  it("renders agent name inside the name cell", async () => {
    const { wrapper } = mountView()
    await flushPromises()
    expect(wrapper.find(".tbl-name").text()).toContain("Support Bot")
    wrapper.unmount()
  })

  it("renders description below name when present", async () => {
    const { wrapper } = mountView()
    await flushPromises()
    expect(wrapper.find(".tbl-desc").text()).toBe("Handles support queries")
    wrapper.unmount()
  })

  it("renders the model label in the model cell", async () => {
    const { wrapper } = mountView()
    await flushPromises()
    expect(wrapper.find(".tbl-mono").text()).toBe("gpt-4o")
    wrapper.unmount()
  })

  it("renders created date in the created cell", async () => {
    const { wrapper } = mountView()
    await flushPromises()
    expect(wrapper.text()).toContain("Jan 1")
    wrapper.unmount()
  })

  it("renders relative updated time in the updated cell", async () => {
    const { wrapper } = mountView()
    await flushPromises()
    const mutedCells = wrapper.findAll(".tbl-muted")
    expect(mutedCells.map((el) => el.text()).some((t) => t.includes("2 months ago"))).toBe(true)
    wrapper.unmount()
  })

  it("shows Default chip for the default agent", async () => {
    agentsRef.value = [
      {
        id: "a1",
        name: "Support Bot",
        description: null,
        is_default: true,
        is_system: false,
        model_config: { model: "openai/gpt-4o" },
        created_at: "2026-01-01",
        updated_at: "2026-03-01",
      },
    ]
    const { wrapper } = mountView()
    await flushPromises()
    expect(wrapper.find(".chip--default").exists()).toBe(true)
    wrapper.unmount()
  })

  it("shows System chip for system agents", async () => {
    agentsRef.value = [
      {
        id: "a1",
        name: "System Agent",
        description: null,
        is_default: false,
        is_system: true,
        model_config: null,
        created_at: "2026-01-01",
        updated_at: "2026-03-01",
      },
    ]
    const { wrapper } = mountView()
    await flushPromises()
    expect(wrapper.find(".chip--sys").exists()).toBe(true)
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
    expect(q(".row-actions-overlay").textContent).toContain("Edit")
    expect(q(".row-actions-overlay").textContent).toContain("Delete")
    wrapper.unmount()
  })

  it("shows Set as default for non-default agents", async () => {
    const { wrapper, q, openKebab } = mountView()
    await flushPromises()
    await openKebab(0)
    expect(q(".row-actions-overlay").textContent).toContain("Set as default")
    wrapper.unmount()
  })

  it("calls openEdit when the Edit menu item is clicked", async () => {
    const { wrapper, qa, openKebab } = mountView()
    await flushPromises()
    await openKebab(0)
    const editItem = qa(".row-actions-overlay .a-menu-item-stub").find((el) =>
      el.textContent.includes("Edit"),
    )
    expect(editItem).toBeDefined()
    editItem.click()
    await wrapper.vm.$nextTick()
    expect(openEdit).toHaveBeenCalledWith(agentsRef.value[0])
    wrapper.unmount()
  })

  it("opens the delete confirm when Delete menu item is clicked", async () => {
    const { wrapper, qa, openKebab } = mountView()
    await flushPromises()
    await openKebab(0)
    const deleteItem = qa(".row-actions-overlay .a-menu-item-stub").find((el) =>
      el.textContent.includes("Delete"),
    )
    expect(deleteItem).toBeDefined()
    deleteItem.click()
    await wrapper.vm.$nextTick()
    expect(wrapper.findComponent(AModalStub).props("open")).toBe(true)
    wrapper.unmount()
  })

  it("calls handleSetDefault when Set as default menu item is clicked", async () => {
    const { wrapper, qa, openKebab } = mountView()
    await flushPromises()
    await openKebab(0)
    const defaultItem = qa(".row-actions-overlay .a-menu-item-stub").find((el) =>
      el.textContent.includes("Set as default"),
    )
    expect(defaultItem).toBeDefined()
    defaultItem.click()
    await wrapper.vm.$nextTick()
    expect(handleSetDefault).toHaveBeenCalledWith("a1")
    wrapper.unmount()
  })

  it("calls handleDelete when confirm delete modal ok is triggered", async () => {
    handleDelete.mockResolvedValue(undefined)
    const { wrapper, qa, openKebab } = mountView()
    await flushPromises()
    await openKebab(0)
    const deleteItem = qa(".row-actions-overlay .a-menu-item-stub").find((el) =>
      el.textContent.includes("Delete"),
    )
    deleteItem.click()
    await wrapper.vm.$nextTick()
    const modal = wrapper.findComponent(AModalStub)
    await modal.vm.$emit("ok")
    await flushPromises()
    expect(handleDelete).toHaveBeenCalledWith("a1")
    wrapper.unmount()
  })
})

describe("AgentsListView — cards mode", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    document.body.innerHTML = ""
    viewModeRef.value = "cards"
    agentsRef.value = [
      {
        id: "a1",
        name: "Support Bot",
        description: "Handles support queries",
        is_default: false,
        is_system: false,
        model_config: { model: "openai/gpt-4o" },
        created_at: "2026-01-01",
        updated_at: "2026-03-01",
      },
    ]
  })

  it("renders the card grid (.agent-grid) in cards mode", async () => {
    const { wrapper } = mountView()
    await flushPromises()
    expect(wrapper.find(".agent-grid").exists()).toBe(true)
    wrapper.unmount()
  })

  it("does NOT render an a-table in cards mode", async () => {
    const { wrapper } = mountView()
    await flushPromises()
    expect(wrapper.find(".ant-table").exists()).toBe(false)
    wrapper.unmount()
  })

  it("renders one card per agent", async () => {
    const { wrapper } = mountView()
    await flushPromises()
    expect(wrapper.findAll(".agent-card")).toHaveLength(1)
    wrapper.unmount()
  })

  it("card displays the agent name", async () => {
    const { wrapper } = mountView()
    await flushPromises()
    expect(wrapper.find(".card-name").text()).toBe("Support Bot")
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

  it("shows Edit, Delete, Set as default in card overlay", async () => {
    const { wrapper, q, openKebab } = mountView()
    await flushPromises()
    await openKebab(0)
    const overlayText = q(".row-actions-overlay").textContent
    expect(overlayText).toContain("Edit")
    expect(overlayText).toContain("Delete")
    expect(overlayText).toContain("Set as default")
    wrapper.unmount()
  })
})
