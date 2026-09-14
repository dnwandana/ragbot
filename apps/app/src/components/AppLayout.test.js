// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest"
import { reactive, h } from "vue"
import { mount, flushPromises } from "@vue/test-utils"

const route = reactive({
  name: "NewChat",
  params: { workspaceId: "ws1" },
  meta: {},
})

const replace = vi.fn()

const authStore = reactive({ isAuthenticated: true })

// The store starts empty, as it does on a hard reload, and each fetch fills it.
const workspacesStore = reactive({
  workspaces: [],
  currentWorkspace: null,
  fetchWorkspaces: vi.fn(),
  fetchWorkspaceById: vi.fn(),
})

function stubFetches() {
  workspacesStore.fetchWorkspaces.mockImplementation(async () => {
    workspacesStore.workspaces = [
      { id: "ws1", name: "WS 1" },
      { id: "ws2", name: "WS 2" },
    ]
  })
  workspacesStore.fetchWorkspaceById.mockImplementation(async (id) => {
    workspacesStore.currentWorkspace = { id, name: id }
  })
}

vi.mock("vue-router", async (importOriginal) => ({
  ...(await importOriginal()),
  useRoute: () => route,
  useRouter: () => ({ replace, push: vi.fn() }),
}))

vi.mock("@/stores/auth", () => ({ useAuthStore: () => authStore }))
vi.mock("@/stores/workspaces", () => ({ useWorkspacesStore: () => workspacesStore }))
vi.mock("@/composables/useInvitations", () => ({
  useInvitations: () => ({ fetchMyInvitations: vi.fn() }),
}))

import AppLayout from "@/components/AppLayout.vue"

// Slot content that counts its own mounts, so an unmount/remount is visible.
let mountCount = 0
const SlotProbe = {
  setup() {
    mountCount += 1
    return () => h("div", { class: "slot-probe" }, "view")
  },
}

function mountLayout() {
  return mount(AppLayout, {
    slots: { default: SlotProbe },
    global: { stubs: { AppSidebar: true } },
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  mountCount = 0
  route.name = "NewChat"
  route.params = { workspaceId: "ws1" }
  route.meta = {}
  workspacesStore.workspaces = []
  workspacesStore.currentWorkspace = null
  stubFetches()
})

describe("AppLayout hydration gate", () => {
  it("gates the slot on the first load", async () => {
    const wrapper = mountLayout()
    expect(wrapper.find(".app-layout__loading").exists()).toBe(true)
    expect(wrapper.find(".slot-probe").exists()).toBe(false)
    await flushPromises()
    expect(wrapper.find(".slot-probe").exists()).toBe(true)
  })

  it("keeps the slot mounted when the route name changes inside one workspace", async () => {
    // ChatView replaces /conversations/new with /conversations/:id in the middle
    // of a send. That changes route.name only. An unmount here destroys the view
    // that owns the live stream, so the answer never renders.
    const wrapper = mountLayout()
    await flushPromises()
    expect(mountCount).toBe(1)

    route.name = "Chat"
    route.params = { workspaceId: "ws1", conversationId: "c1" }
    await flushPromises()

    expect(wrapper.find(".app-layout__loading").exists()).toBe(false)
    expect(mountCount).toBe(1)
  })

  it("gates the slot again when the workspace changes", async () => {
    const wrapper = mountLayout()
    await flushPromises()

    let resolveFetch
    workspacesStore.fetchWorkspaceById.mockImplementation(
      () => new Promise((r) => (resolveFetch = r)),
    )
    route.params = { workspaceId: "ws2" }
    await flushPromises()
    expect(wrapper.find(".app-layout__loading").exists()).toBe(true)

    resolveFetch()
    await flushPromises()
    expect(wrapper.find(".slot-probe").exists()).toBe(true)
  })
})
