// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest"
import { mount, flushPromises } from "@vue/test-utils"
import { createPinia, setActivePinia } from "pinia"

vi.mock("@/api/agents", () => ({
  listAgents: vi.fn(),
  createAgent: vi.fn(),
  updateAgent: vi.fn(),
  deleteAgent: vi.fn(),
}))
vi.mock("ant-design-vue", () => ({ message: { success: vi.fn(), error: vi.fn() } }))

import * as agentsApi from "@/api/agents"
import { useAgents } from "@/composables/useAgents"
import { useAgentsStore } from "@/stores/agents"

/** Mount a throwaway host component so lifecycle hooks run, and capture the composable. */
function withAgents(pinia) {
  let api
  mount(
    {
      setup() {
        api = useAgents("ws1")
        return () => null
      },
    },
    { global: { plugins: [pinia] } },
  )
  return api
}

describe("useAgents drawer state", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    agentsApi.listAgents.mockResolvedValue({
      data: {
        data: [
          { id: "a1", name: "A", is_default: true },
          { id: "a2", name: "B", is_default: false },
        ],
        pagination: null,
      },
    })
  })

  it("drawerAgent reflects the store and updates after setDefaultAgent without reopening", async () => {
    agentsApi.updateAgent.mockResolvedValue({
      data: { data: { id: "a2", name: "B", is_default: true } },
    })
    const pinia = createPinia()
    const api = withAgents(pinia)
    await flushPromises() // initial fetch populates the store

    api.openEdit({ id: "a2", name: "B", is_default: false })
    expect(api.drawerAgent.value.id).toBe("a2")
    expect(api.drawerAgent.value.is_default).toBe(false)
    expect(api.isEditing.value).toBe(true)

    setActivePinia(pinia)
    await useAgentsStore().setDefaultAgent("ws1", "a2")

    expect(api.drawerAgent.value.is_default).toBe(true)
  })

  it("openCreate and closeDrawer clear the drawer agent", async () => {
    const pinia = createPinia()
    const api = withAgents(pinia)
    await flushPromises()

    api.openEdit({ id: "a1", name: "A" })
    expect(api.drawerAgent.value.id).toBe("a1")

    api.openCreate()
    expect(api.drawerAgent.value).toBe(null)
    expect(api.isEditing.value).toBe(false)

    api.openEdit({ id: "a1", name: "A" })
    api.closeDrawer()
    expect(api.drawerAgent.value).toBe(null)
  })

  it("isEditing is false when the drawer id is not in the store", async () => {
    const pinia = createPinia()
    const api = withAgents(pinia)
    await flushPromises() // initial fetch populates the store with a1, a2

    api.openEdit({ id: "ghost", name: "Ghost" })
    expect(api.drawerAgent.value).toBe(null)
    expect(api.isEditing.value).toBe(false)
  })
})
