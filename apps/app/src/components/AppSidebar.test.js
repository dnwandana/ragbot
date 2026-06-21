// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest"
import { mount, flushPromises } from "@vue/test-utils"

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const { mockFetchConversations, mockUpdateConversation, mockDeleteConversation, mockPush } =
  vi.hoisted(() => ({
    mockFetchConversations: vi.fn(),
    mockUpdateConversation: vi.fn(),
    mockDeleteConversation: vi.fn(),
    mockPush: vi.fn(),
  }))

vi.mock("@/stores/auth", () => ({
  useAuthStore: () => ({
    currentUser: { full_name: "Ada Lovelace", email: "ada@example.com" },
    logout: vi.fn(),
  }),
}))

vi.mock("@/stores/workspaces", () => ({
  useWorkspacesStore: () => ({ workspaces: [] }),
}))

vi.mock("@/stores/conversations", () => ({
  useConversationsStore: () => ({
    conversations: [
      { id: "c1", title: "First chat", created_at: new Date().toISOString(), updated_at: null },
      { id: "c2", title: "Second chat", created_at: new Date().toISOString(), updated_at: null },
    ],
    fetchConversations: mockFetchConversations,
    updateConversation: mockUpdateConversation,
    deleteConversation: mockDeleteConversation,
  }),
}))

vi.mock("@/composables/useTheme", () => ({
  useTheme: () => ({ theme: "light", toggleTheme: vi.fn() }),
}))

vi.mock("@/composables/usePermissions", () => ({
  usePermissions: () => ({ can: () => true }),
}))

vi.mock("@/composables/useFormattedTime", () => ({
  useFormattedTime: () => ({
    relativeTime: () => "2m",
    calendarDaysAgo: () => 0,
  }),
}))

vi.mock("vue-router", async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    useRoute: () => ({ path: "/workspaces/ws1/conversations", params: { workspaceId: "ws1" } }),
    useRouter: () => ({ push: mockPush }),
  }
})

// AppUserMenu is rendered inside AppSidebar — stub it so the test doesn't
// need to satisfy its own store/router dependencies.
vi.mock("@/components/AppUserMenu.vue", () => ({
  default: { template: `<div class="app-user-menu-stub" />` },
}))

import AppSidebar from "@/components/AppSidebar.vue"

// ── Stubs ─────────────────────────────────────────────────────────────────────

/**
 * a-dropdown stub: renders its trigger slot inline and teleports the overlay
 * slot to document.body under the overlay-class-name wrapper div.
 * Only renders the overlay when `open` is true; exposes `setOpen` so tests can
 * toggle it without relying on real pointer events.
 * Accepts trigger as String or Array to match Ant's flexible API.
 */
const ADropdownStub = {
  props: {
    overlayClassName: { type: String, default: "" },
    trigger: { type: [Array, String], default: () => ["click"] },
    placement: { type: String, default: "" },
  },
  emits: ["open-change"],
  data() {
    return { open: false }
  },
  methods: {
    /**
     * Open or close the dropdown programmatically from tests.
     * Also emits `open-change` so parent @open-change handlers (e.g. openMenuId
     * tracking) fire just as they would with the real a-dropdown.
     * @param {boolean} val
     */
    setOpen(val) {
      this.open = val
      this.$emit("open-change", val)
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
 * a-menu-item stub: renders its default slot as a clickable li.
 *
 * NOTE: `key` is a Vue-reserved attribute and is never forwarded to component
 * props or $attrs — it is silently dropped. Tests therefore identify items by
 * their text content rather than by an emitted key value. The `itemKey` prop
 * exists for completeness but will always be "" when the component binds
 * `key="..."` (the standard Ant Design binding).
 *
 * `disabled` guards the click so a disabled item never fires, making future
 * disabled-state assertions reliable.
 */
const AMenuItemStub = {
  props: {
    itemKey: { type: String, default: "" },
    disabled: { type: Boolean, default: false },
  },
  template: `<li class="a-menu-item-stub" v-bind="$attrs" @click="!disabled && $emit('click', { key: itemKey })"><slot /></li>`,
  emits: ["click"],
}

/**
 * Functional a-modal stub: renders title + body slot only when `open` is true,
 * and exposes OK/Cancel buttons wired to the real @ok/@cancel events so the
 * confirm/cancel flows are exercised (not just rendered).
 */
const AModalStub = {
  name: "AModal",
  props: {
    open: { type: Boolean, default: false },
    title: { type: String, default: "" },
    okText: { type: String, default: "OK" },
    wrapClassName: { type: String, default: "" },
    okButtonProps: { type: Object, default: () => ({}) },
  },
  emits: ["ok", "cancel"],
  template: `
    <div v-if="open" class="a-modal-stub" :data-wrap="wrapClassName">
      <div class="a-modal-title">{{ title }}</div>
      <slot />
      <button class="a-modal-ok" @click="$emit('ok')">{{ okText }}</button>
      <button class="a-modal-cancel" @click="$emit('cancel')">Cancel</button>
    </div>
  `,
}

/** a-form stub: renders its default slot in a form element. */
const AFormStub = { template: `<form class="a-form-stub"><slot /></form>` }
/** a-form-item stub: renders its default slot in a div. */
const AFormItemStub = { template: `<div class="a-form-item-stub"><slot /></div>` }
/** a-input stub: two-way bound text input mirroring v-model:value. */
const AInputStub = {
  props: { value: { type: String, default: "" } },
  emits: ["update:value"],
  template: `<input class="a-input-stub" :value="value" @input="$emit('update:value', $event.target.value)" />`,
}

const STUBS = {
  "a-dropdown": ADropdownStub,
  "a-menu": AMenuStub,
  "a-menu-item": AMenuItemStub,
  "a-modal": AModalStub,
  "a-form": AFormStub,
  "a-form-item": AFormItemStub,
  "a-input": AInputStub,
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Mount AppSidebar attached to document.body and return helpers.
 * @returns {{ wrapper: import("@vue/test-utils").VueWrapper, q: (sel: string) => Element|null, openKebabForFirst: () => Promise<void> }}
 */
function mountSidebar() {
  const wrapper = mount(AppSidebar, {
    attachTo: document.body,
    global: { stubs: STUBS },
  })
  const q = (sel) => document.querySelector(sel)
  const qa = (sel) => [...document.querySelectorAll(sel)]

  /**
   * Open the kebab dropdown for the first conversation row by calling
   * setOpen(true) on the first ADropdownStub found.
   */
  async function openKebabForFirst() {
    const dropdowns = wrapper.findAllComponents(ADropdownStub)
    // Find the first dropdown that has a sidebar-menu-overlay class prop
    const kebab = dropdowns.find((d) => d.props("overlayClassName") === "sidebar-menu-overlay")
    if (!kebab) throw new Error("No sidebar-menu-overlay dropdown found")
    kebab.vm.setOpen(true)
    await wrapper.vm.$nextTick()
  }

  return { wrapper, q, qa, openKebabForFirst }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("AppSidebar — kebab menu overlay", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    document.body.innerHTML = ""
  })

  it("does not render .sidebar-menu-overlay by default", async () => {
    const { wrapper, q } = mountSidebar()
    await wrapper.vm.$nextTick()
    expect(q(".sidebar-menu-overlay")).toBe(null)
    wrapper.unmount()
  })

  it("renders .sidebar-menu-overlay after the kebab is opened", async () => {
    const { wrapper, q, openKebabForFirst } = mountSidebar()
    await wrapper.vm.$nextTick()
    await openKebabForFirst()
    expect(q(".sidebar-menu-overlay")).not.toBe(null)
    wrapper.unmount()
  })

  it("shows a Rename item in the overlay", async () => {
    const { wrapper, q, openKebabForFirst } = mountSidebar()
    await wrapper.vm.$nextTick()
    await openKebabForFirst()
    expect(q(".sidebar-menu-overlay").textContent).toContain("Rename")
    wrapper.unmount()
  })

  it("shows a Delete item in the overlay", async () => {
    const { wrapper, q, openKebabForFirst } = mountSidebar()
    await wrapper.vm.$nextTick()
    await openKebabForFirst()
    expect(q(".sidebar-menu-overlay").textContent).toContain("Delete")
    wrapper.unmount()
  })
})

describe("AppSidebar — kebab menu handlers", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    document.body.innerHTML = ""
  })

  it("clicking Rename opens the rename modal (sets modalState to rename)", async () => {
    const { wrapper, qa, openKebabForFirst } = mountSidebar()
    await wrapper.vm.$nextTick()
    await openKebabForFirst()

    const items = qa(".sidebar-menu-overlay .a-menu-item-stub")
    const renameItem = items.find((el) => el.textContent.includes("Rename"))
    expect(renameItem).toBeDefined()
    renameItem.click()
    await wrapper.vm.$nextTick()

    // The rename modal markup (Teleport'd to body) should now be present
    // It contains the text "Rename conversation"
    expect(document.body.textContent).toContain("Rename conversation")
    wrapper.unmount()
  })

  it("clicking Delete opens the delete modal (sets modalState to delete)", async () => {
    const { wrapper, qa, openKebabForFirst } = mountSidebar()
    await wrapper.vm.$nextTick()
    await openKebabForFirst()

    const items = qa(".sidebar-menu-overlay .a-menu-item-stub")
    const deleteItem = items.find((el) => el.textContent.includes("Delete"))
    expect(deleteItem).toBeDefined()
    deleteItem.click()
    await wrapper.vm.$nextTick()

    // The delete modal markup should now be present
    expect(document.body.textContent).toContain("Delete conversation?")
    wrapper.unmount()
  })
})

describe("AppSidebar — rename/delete a-modal flows", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    document.body.innerHTML = ""
  })

  /** Open the rename modal for the first conversation. */
  async function openRename(wrapper, qa, openKebabForFirst) {
    await openKebabForFirst()
    qa(".sidebar-menu-overlay .a-menu-item-stub")
      .find((el) => el.textContent.includes("Rename"))
      .click()
    await wrapper.vm.$nextTick()
  }

  it("renders the rename modal with the convo-rename-wrap wrap class", async () => {
    const { wrapper, q, qa, openKebabForFirst } = mountSidebar()
    await wrapper.vm.$nextTick()
    await openRename(wrapper, qa, openKebabForFirst)
    expect(q(".a-modal-stub[data-wrap='convo-rename-wrap']")).not.toBe(null)
    wrapper.unmount()
  })

  it("rename OK with a valid name calls updateConversation with the trimmed title", async () => {
    const { wrapper, q, qa, openKebabForFirst } = mountSidebar()
    await wrapper.vm.$nextTick()
    await openRename(wrapper, qa, openKebabForFirst)

    const input = q("[data-wrap='convo-rename-wrap'] .a-input-stub")
    input.value = "  Renamed chat  "
    input.dispatchEvent(new Event("input"))
    await wrapper.vm.$nextTick()

    q(".a-modal-stub[data-wrap='convo-rename-wrap'] .a-modal-ok").click()
    await flushPromises()

    expect(mockUpdateConversation).toHaveBeenCalledWith("ws1", "c1", { title: "Renamed chat" })
    wrapper.unmount()
  })

  it("rename OK with an empty name does NOT call updateConversation (validation blocks)", async () => {
    const { wrapper, q, qa, openKebabForFirst } = mountSidebar()
    await wrapper.vm.$nextTick()
    await openRename(wrapper, qa, openKebabForFirst)

    const input = q("[data-wrap='convo-rename-wrap'] .a-input-stub")
    input.value = "   "
    input.dispatchEvent(new Event("input"))
    await wrapper.vm.$nextTick()

    q(".a-modal-stub[data-wrap='convo-rename-wrap'] .a-modal-ok").click()
    await flushPromises()

    expect(mockUpdateConversation).not.toHaveBeenCalled()
    // Validation failure keeps the modal open so field errors stay visible
    expect(q(".a-modal-stub[data-wrap='convo-rename-wrap']")).not.toBe(null)
    wrapper.unmount()
  })

  it("rename Cancel closes the modal without calling updateConversation", async () => {
    const { wrapper, q, qa, openKebabForFirst } = mountSidebar()
    await wrapper.vm.$nextTick()
    await openRename(wrapper, qa, openKebabForFirst)

    q(".a-modal-stub[data-wrap='convo-rename-wrap'] .a-modal-cancel").click()
    await wrapper.vm.$nextTick()

    expect(mockUpdateConversation).not.toHaveBeenCalled()
    expect(q(".a-modal-stub[data-wrap='convo-rename-wrap']")).toBe(null)
    wrapper.unmount()
  })

  it("delete OK calls deleteConversation; Cancel does not", async () => {
    const { wrapper, q, qa, openKebabForFirst } = mountSidebar()
    await wrapper.vm.$nextTick()
    await openKebabForFirst()
    qa(".sidebar-menu-overlay .a-menu-item-stub")
      .find((el) => el.textContent.includes("Delete"))
      .click()
    await wrapper.vm.$nextTick()

    q(".a-modal-stub[data-wrap='convo-delete-wrap'] .a-modal-ok").click()
    await flushPromises()
    expect(mockDeleteConversation).toHaveBeenCalledWith("ws1", "c1")
    wrapper.unmount()
  })

  it("delete Cancel closes the modal without calling deleteConversation", async () => {
    const { wrapper, q, qa, openKebabForFirst } = mountSidebar()
    await wrapper.vm.$nextTick()
    await openKebabForFirst()
    qa(".sidebar-menu-overlay .a-menu-item-stub")
      .find((el) => el.textContent.includes("Delete"))
      .click()
    await wrapper.vm.$nextTick()

    q(".a-modal-stub[data-wrap='convo-delete-wrap'] .a-modal-cancel").click()
    await wrapper.vm.$nextTick()

    expect(mockDeleteConversation).not.toHaveBeenCalled()
    expect(q(".a-modal-stub[data-wrap='convo-delete-wrap']")).toBe(null)
    wrapper.unmount()
  })
})

describe("AppSidebar — workspace nav targets", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    document.body.innerHTML = ""
  })

  /** Click the workspace nav button whose label contains `label`. */
  function clickNav(label) {
    const btn = [...document.querySelectorAll("button.nav-item")].find((b) =>
      b.textContent.trim().includes(label),
    )
    if (!btn) throw new Error(`nav-item not found: ${label}`)
    btn.click()
  }

  it("General navigates to the flattened /settings path", async () => {
    const { wrapper } = mountSidebar()
    await wrapper.vm.$nextTick()
    clickNav("General")
    expect(mockPush).toHaveBeenCalledWith("/workspaces/ws1/settings")
    wrapper.unmount()
  })

  it("Members navigates to /members", async () => {
    const { wrapper } = mountSidebar()
    await wrapper.vm.$nextTick()
    clickNav("Members")
    expect(mockPush).toHaveBeenCalledWith("/workspaces/ws1/members")
    wrapper.unmount()
  })

  it("Roles navigates to /roles", async () => {
    const { wrapper } = mountSidebar()
    await wrapper.vm.$nextTick()
    clickNav("Roles")
    expect(mockPush).toHaveBeenCalledWith("/workspaces/ws1/roles")
    wrapper.unmount()
  })
})
