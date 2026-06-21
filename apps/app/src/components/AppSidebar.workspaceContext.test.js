// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest"
import { mount } from "@vue/test-utils"

// ── Mutable mock state ──────────────────────────────────────────────────────
// route + workspaces store are read fresh on every component access, so tests
// can rewrite them before mounting to simulate different navigation contexts.

const { routeState, workspacesState } = vi.hoisted(() => ({
  routeState: { value: { path: "/settings", params: {} } },
  workspacesState: {
    value: {
      workspaces: [{ id: "ws1", name: "Acme Workspace" }],
      currentWorkspace: { id: "ws1", name: "Acme Workspace" },
    },
  },
}))

vi.mock("@/stores/auth", () => ({
  useAuthStore: () => ({
    currentUser: { full_name: "Ada Lovelace", email: "ada@example.com" },
    logout: vi.fn(),
  }),
}))

vi.mock("@/stores/workspaces", () => ({
  useWorkspacesStore: () => workspacesState.value,
}))

vi.mock("@/stores/conversations", () => ({
  useConversationsStore: () => ({
    conversations: [],
    fetchConversations: vi.fn(),
    updateConversation: vi.fn(),
    deleteConversation: vi.fn(),
  }),
}))

vi.mock("@/composables/useTheme", () => ({
  useTheme: () => ({ theme: "light", toggleTheme: vi.fn() }),
}))

vi.mock("@/composables/usePermissions", () => ({
  usePermissions: () => ({ can: () => true }),
}))

vi.mock("@/composables/useFormattedTime", () => ({
  useFormattedTime: () => ({ relativeTime: () => "2m", calendarDaysAgo: () => 0 }),
}))

vi.mock("vue-router", async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    useRoute: () => routeState.value,
    useRouter: () => ({ push: vi.fn() }),
  }
})

vi.mock("@/components/AppUserMenu.vue", () => ({
  default: { template: `<div class="app-user-menu-stub" />` },
}))

import AppSidebar from "@/components/AppSidebar.vue"

// Trivial passthrough stubs for the Ant components used in the template.
const passthrough = { template: `<div><slot /></div>` }
const STUBS = {
  "a-dropdown": passthrough,
  "a-menu": passthrough,
  "a-menu-item": passthrough,
  "a-modal": passthrough,
  "a-form": passthrough,
  "a-form-item": passthrough,
  "a-input": { template: `<input class="a-input-stub" />` },
}

function mountSidebar() {
  return mount(AppSidebar, { global: { stubs: STUBS } })
}

describe("AppSidebar — workspace context persistence", () => {
  beforeEach(() => {
    routeState.value = { path: "/settings", params: {} }
    workspacesState.value = {
      workspaces: [{ id: "ws1", name: "Acme Workspace" }],
      currentWorkspace: { id: "ws1", name: "Acme Workspace" },
    }
  })

  it("shows the persisted workspace name in the pill on a param-less route (/settings)", async () => {
    const wrapper = mountSidebar()
    await wrapper.vm.$nextTick()
    expect(wrapper.find(".ws-pill__name").text()).toBe("Acme Workspace")
    wrapper.unmount()
  })

  it("renders workspace-scoped nav on a param-less route when a workspace is active", async () => {
    const wrapper = mountSidebar()
    await wrapper.vm.$nextTick()
    const labels = wrapper.findAll("button.nav-item").map((b) => b.text().trim())
    expect(labels).toEqual(expect.arrayContaining(["Conversations", "Datasets", "Agents"]))
    wrapper.unmount()
  })

  it('falls back to "Select workspace" when no workspace is active', async () => {
    workspacesState.value = { workspaces: [], currentWorkspace: null }
    const wrapper = mountSidebar()
    await wrapper.vm.$nextTick()
    expect(wrapper.find(".ws-pill__name").text()).toBe("Select workspace")
    // No workspace-scoped nav when there is genuinely no active workspace.
    const labels = wrapper.findAll("button.nav-item").map((b) => b.text().trim())
    expect(labels).not.toContain("Conversations")
    wrapper.unmount()
  })

  it("still prefers the route param over the store when both are present", async () => {
    routeState.value = { path: "/workspaces/ws2/datasets", params: { workspaceId: "ws2" } }
    workspacesState.value = {
      workspaces: [
        { id: "ws1", name: "Acme Workspace" },
        { id: "ws2", name: "Beta Workspace" },
      ],
      currentWorkspace: { id: "ws1", name: "Acme Workspace" },
    }
    const wrapper = mountSidebar()
    await wrapper.vm.$nextTick()
    expect(wrapper.find(".ws-pill__name").text()).toBe("Beta Workspace")
    wrapper.unmount()
  })
})
