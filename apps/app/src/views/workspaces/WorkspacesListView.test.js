// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest"
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
    handleDelete: vi.fn(),
    fetchWorkspaces: vi.fn().mockResolvedValue(undefined),
  }),
}))

vi.mock("@/composables/useFormattedTime", () => ({
  useFormattedTime: () => ({ relativeTime: () => "2 days ago" }),
}))

import WorkspacesListView from "@/views/workspaces/WorkspacesListView.vue"

const STUBS = { "a-modal": true, "a-skeleton": true, WorkspaceFormModal: true }

describe("WorkspacesListView table", () => {
  it("renders a row per workspace with name, description, and role", async () => {
    const wrapper = mount(WorkspacesListView, { global: { stubs: STUBS } })
    await flushPromises()

    const tableRows = wrapper.findAll(".tbl-row")
    expect(tableRows).toHaveLength(2)

    expect(tableRows[0].find(".tbl-name").text()).toContain("Acme")
    expect(tableRows[0].find(".tbl-desc").text()).toBe("Support KB")
    expect(tableRows[0].text()).toContain("Owner")

    // No description → muted placeholder.
    expect(tableRows[1].find(".tbl-desc").text()).toBe("No description")
  })

  it("shows Delete only for owned workspaces", async () => {
    const wrapper = mount(WorkspacesListView, { global: { stubs: STUBS } })
    await flushPromises()

    const tableRows = wrapper.findAll(".tbl-row")

    // Open the ⋯ menu on the owned row (row 0, role_name: "owner").
    // The menu-btn is inside @click.stop so it won't bubble to .page's closeMenus.
    await tableRows[0].find(".menu-btn").trigger("click")
    const ownerPopup = tableRows[0].find(".menu-popup")
    expect(ownerPopup.exists()).toBe(true)
    const ownerItems = ownerPopup.findAll(".menu-item").map((b) => b.text())
    expect(ownerItems.some((t) => t.includes("Settings"))).toBe(true)
    expect(ownerItems.some((t) => t.includes("Delete"))).toBe(true)

    // Open the ⋯ menu on the non-owned row (row 1, role_name: "member").
    // This sets menuOpenId to row 1's id, closing row 0's popup.
    await tableRows[1].find(".menu-btn").trigger("click")
    expect(tableRows[0].find(".menu-popup").exists()).toBe(false)
    const memberPopup = tableRows[1].find(".menu-popup")
    expect(memberPopup.exists()).toBe(true)
    const memberItems = memberPopup.findAll(".menu-item").map((b) => b.text())
    expect(memberItems.some((t) => t.includes("Settings"))).toBe(true)
    expect(memberItems.some((t) => t.includes("Delete"))).toBe(false)
  })
})

describe("WorkspacesListView keyboard access", () => {
  it("rows are focusable and expose a row role", async () => {
    const wrapper = mount(WorkspacesListView, { global: { stubs: STUBS } })
    await flushPromises()
    const row = wrapper.find(".tbl-row")
    expect(row.attributes("tabindex")).toBe("0")
    expect(row.attributes("role")).toBe("row")
  })

  it("navigates to the workspace on Enter", async () => {
    push.mockClear()
    const wrapper = mount(WorkspacesListView, { global: { stubs: STUBS } })
    await flushPromises()
    await wrapper.find(".tbl-row").trigger("keydown.enter")
    expect(push).toHaveBeenCalledWith("/workspaces/1/datasets")
  })

  it("does not navigate when activating the row menu by keyboard", async () => {
    push.mockClear()
    const wrapper = mount(WorkspacesListView, { global: { stubs: STUBS } })
    await flushPromises()
    await wrapper.find(".tbl-row .menu-btn").trigger("keydown.enter")
    expect(push).not.toHaveBeenCalled()
  })
})
