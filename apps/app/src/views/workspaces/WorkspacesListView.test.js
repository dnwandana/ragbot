// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest"
import { ref } from "vue"
import { mount, flushPromises } from "@vue/test-utils"

const rows = ref([
  {
    id: "1",
    name: "Acme",
    description: "Support KB",
    role_name: "owner",
    updated_at: "2026-03-01",
  },
  {
    id: "2",
    name: "Sandbox",
    description: null,
    role_name: "member",
    updated_at: "2026-02-01",
  },
])

const { push } = vi.hoisted(() => ({ push: vi.fn() }))
const { handleDelete } = vi.hoisted(() => ({ handleDelete: vi.fn() }))

vi.mock("vue-router", async (importOriginal) => ({
  ...(await importOriginal()),
  useRouter: () => ({ push }),
}))

vi.mock("@/composables/useWorkspaces", () => ({
  useWorkspaces: () => ({
    displayedWorkspaces: rows,
    loading: ref(false),
    query: ref(""),
    sortKey: ref("updated_desc"),
    SORT_OPTIONS: [{ key: "updated_desc", label: "Recently updated" }],
    isModalVisible: ref(false),
    editingWorkspace: ref(null),
    openCreateModal: vi.fn(),
    closeModal: vi.fn(),
    handleSubmit: vi.fn(),
    handleDelete,
    fetchWorkspaces: vi.fn().mockResolvedValue(undefined),
  }),
}))

vi.mock("@/composables/useFormattedTime", () => ({
  useFormattedTime: () => ({ relativeTime: () => "2 days ago" }),
}))

import WorkspacesListView from "@/views/workspaces/WorkspacesListView.vue"

// Functional a-modal stub: always rendered, exposes `open` prop and re-emits
// ok/cancel so tests can assert wiring (`:open="!!deleteTarget"`, `@ok`, `@cancel`).
const AModalStub = {
  name: "AModal",
  props: ["open"],
  emits: ["ok", "cancel"],
  template: '<div class="a-modal-stub"><slot /></div>',
}

/**
 * a-dropdown stub: renders its trigger slot inline and teleports the overlay
 * slot to document.body under the overlay-class-name wrapper div.
 * Only renders the overlay when `open` is true; exposes `setOpen` so tests
 * can toggle it without relying on real pointer events.
 * Accepts trigger as String or Array to match Ant's flexible API.
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

/**
 * a-menu stub: renders its default slot inside a nav element.
 */
const AMenuStub = {
  template: `<nav class="a-menu-stub"><slot /></nav>`,
}

/**
 * a-menu-item stub: renders its default slot as a clickable li,
 * emitting a native click so handlers attached via @click fire.
 */
const AMenuItemStub = {
  props: { itemKey: { type: String, default: "" } },
  template: `<li class="a-menu-item-stub" @click="$emit('click', { key: itemKey })"><slot /></li>`,
  emits: ["click"],
}

// a-table stub: renders a real .ant-table DOM tree with thead, tbody, and one tr
// per dataSource entry. Invokes customRow(record) to spread attrs (tabindex,
// onClick, onKeydown) onto each tr — exercising the real component's row handlers.
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
  "a-skeleton": true,
  "a-table": ATableStub,
  "a-modal": AModalStub,
  "a-dropdown": ADropdownStub,
  "a-menu": AMenuStub,
  "a-menu-item": AMenuItemStub,
  "a-input": true,
  WorkspaceFormModal: true,
}

/**
 * Mount WorkspacesListView attached to document.body and return helpers.
 * @returns {{ wrapper: import("@vue/test-utils").VueWrapper, q: (sel: string) => Element|null, qa: (sel: string) => Element[], openKebab: (index?: number) => Promise<void> }}
 */
function mountView() {
  const wrapper = mount(WorkspacesListView, {
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

describe("WorkspacesListView table", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    document.body.innerHTML = ""
    rows.value = [
      {
        id: "1",
        name: "Acme",
        description: "Support KB",
        role_name: "owner",
        updated_at: "2026-03-01",
      },
      {
        id: "2",
        name: "Sandbox",
        description: null,
        role_name: "member",
        updated_at: "2026-02-01",
      },
    ]
  })

  it("renders a row per workspace with name, description, and role", async () => {
    const { wrapper } = mountView()
    await flushPromises()

    expect(wrapper.find(".ant-table").exists()).toBe(true)
    expect(wrapper.findAll(".ant-table-tbody tr")).toHaveLength(2)
    expect(wrapper.find(".tbl-name").text()).toBe("Acme")
    expect(wrapper.find(".tbl-desc").text()).toBe("Support KB")
    expect(wrapper.findAll(".badge")[0].text()).toBe("Owner")
    expect(wrapper.find(".tbl-muted").text()).toBe("2 days ago")
    wrapper.unmount()
  })

  it("renders No description placeholder for null description", async () => {
    const { wrapper } = mountView()
    await flushPromises()

    const descs = wrapper.findAll(".tbl-desc")
    expect(descs[1].text()).toBe("No description")
    expect(descs[1].classes()).toContain("tbl-desc--empty")
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

  it("shows Settings item in the overlay for any row", async () => {
    const { wrapper, q, openKebab } = mountView()
    await flushPromises()
    await openKebab(0)
    expect(q(".row-actions-overlay").textContent).toContain("Settings")
    wrapper.unmount()
  })

  it("shows Delete item in the overlay for an owned workspace", async () => {
    const { wrapper, q, openKebab } = mountView()
    await flushPromises()
    await openKebab(0)
    expect(q(".row-actions-overlay").textContent).toContain("Delete")
    wrapper.unmount()
  })

  it("does NOT show Delete in the overlay for a non-owner workspace", async () => {
    const { wrapper, q, openKebab } = mountView()
    await flushPromises()
    await openKebab(1)
    expect(q(".row-actions-overlay").textContent).not.toContain("Delete")
    wrapper.unmount()
  })
})

describe("WorkspacesListView delete modal", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    document.body.innerHTML = ""
    rows.value = [
      {
        id: "1",
        name: "Acme",
        description: "",
        role_name: "owner",
        updated_at: "2026-03-01",
      },
    ]
    handleDelete.mockResolvedValue(undefined)
  })

  it("delete modal is closed by default", async () => {
    const { wrapper } = mountView()
    await flushPromises()

    const modal = wrapper.findComponent(AModalStub)
    expect(modal.props("open")).toBe(false)
    wrapper.unmount()
  })

  it("opens the delete modal when Delete is clicked in the kebab menu", async () => {
    const { wrapper, qa, openKebab } = mountView()
    await flushPromises()

    await openKebab(0)
    const deleteItem = qa(".row-actions-overlay .a-menu-item-stub").find((el) =>
      el.textContent.includes("Delete"),
    )
    expect(deleteItem).toBeDefined()
    deleteItem.click()
    await wrapper.vm.$nextTick()

    const modal = wrapper.findComponent(AModalStub)
    expect(modal.props("open")).toBe(true)
    expect(handleDelete).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  it("calls handleDelete and closes modal on ok", async () => {
    const { wrapper, qa, openKebab } = mountView()
    await flushPromises()

    await openKebab(0)
    const deleteItem = qa(".row-actions-overlay .a-menu-item-stub").find((el) =>
      el.textContent.includes("Delete"),
    )
    deleteItem.click()
    await wrapper.vm.$nextTick()

    const modal = wrapper.findComponent(AModalStub)
    modal.vm.$emit("ok")
    await flushPromises()

    expect(handleDelete).toHaveBeenCalledWith("1")
    expect(modal.props("open")).toBe(false)
    wrapper.unmount()
  })

  it("cancel closes modal without deleting", async () => {
    const { wrapper, qa, openKebab } = mountView()
    await flushPromises()

    await openKebab(0)
    const deleteItem = qa(".row-actions-overlay .a-menu-item-stub").find((el) =>
      el.textContent.includes("Delete"),
    )
    deleteItem.click()
    await wrapper.vm.$nextTick()

    const modal = wrapper.findComponent(AModalStub)
    modal.vm.$emit("cancel")
    await flushPromises()

    expect(handleDelete).not.toHaveBeenCalled()
    expect(modal.props("open")).toBe(false)
    wrapper.unmount()
  })
})

describe("WorkspacesListView keyboard access", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    document.body.innerHTML = ""
    rows.value = [
      {
        id: "1",
        name: "Acme",
        description: "Support KB",
        role_name: "owner",
        updated_at: "2026-03-01",
      },
      {
        id: "2",
        name: "Sandbox",
        description: null,
        role_name: "member",
        updated_at: "2026-02-01",
      },
    ]
  })

  it("table body rows are focusable (tabindex=0) via customRow", async () => {
    const { wrapper } = mountView()
    await flushPromises()

    const tbodyRows = wrapper.findAll(".ant-table-tbody tr")
    expect(tbodyRows.length).toBeGreaterThan(0)
    expect(tbodyRows[0].attributes("tabindex")).toBe("0")
    wrapper.unmount()
  })

  it("navigates to the workspace on Enter", async () => {
    push.mockClear()
    const { wrapper } = mountView()
    await flushPromises()

    const firstRow = wrapper.findAll(".ant-table-tbody tr")[0]
    await firstRow.trigger("keydown", { key: "Enter" })
    expect(push).toHaveBeenCalledWith("/workspaces/1/datasets")
    wrapper.unmount()
  })

  it("navigates to the workspace on click", async () => {
    push.mockClear()
    const { wrapper } = mountView()
    await flushPromises()

    const firstRow = wrapper.findAll(".ant-table-tbody tr")[0]
    await firstRow.trigger("click")
    expect(push).toHaveBeenCalledWith("/workspaces/1/datasets")
    wrapper.unmount()
  })

  it("clicking Settings navigates to workspace settings", async () => {
    push.mockClear()
    const { wrapper, qa, openKebab } = mountView()
    await flushPromises()

    await openKebab(0)
    const settingsItem = qa(".row-actions-overlay .a-menu-item-stub").find((el) =>
      el.textContent.includes("Settings"),
    )
    expect(settingsItem).toBeDefined()
    settingsItem.click()
    await wrapper.vm.$nextTick()

    expect(push).toHaveBeenCalledWith("/workspaces/1/settings")
    wrapper.unmount()
  })
})
