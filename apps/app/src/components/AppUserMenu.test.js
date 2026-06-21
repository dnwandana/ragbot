// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest"
import { mount } from "@vue/test-utils"

// ── Mocks ────────────────────────────────────────────────────────────────────

const { mockLogout, mockPush } = vi.hoisted(() => ({ mockLogout: vi.fn(), mockPush: vi.fn() }))

vi.mock("@/stores/auth", () => ({
  useAuthStore: () => ({
    currentUser: { full_name: "Ada Lovelace", email: "ada@example.com" },
    logout: mockLogout,
  }),
}))

vi.mock("vue-router", async (importOriginal) => {
  const actual = await importOriginal()
  return { ...actual, useRouter: () => ({ push: mockPush }) }
})

import AppUserMenu from "@/components/AppUserMenu.vue"

// ── Stubs ────────────────────────────────────────────────────────────────────

/**
 * a-dropdown stub: renders its trigger slot inline and teleports the overlay
 * slot to document.body under the overlay-class-name wrapper div.
 * Only renders the overlay when `open` is true; since we use trigger="click"
 * the real component manages open state internally — stub exposes a `setOpen`
 * method so tests can open it.
 * `trigger` accepts String or Array to match Ant's flexible API without warnings.
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

const STUBS = {
  "a-dropdown": ADropdownStub,
  "a-menu": AMenuStub,
  "a-menu-item": AMenuItemStub,
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Mount AppUserMenu attached to document.body and return helpers.
 * @param {Object} [props]
 * @returns {{ wrapper: import("@vue/test-utils").VueWrapper, q: (sel: string) => Element|null, openMenu: () => Promise<void> }}
 */
function mountMenu(props = { workspaceId: "ws1" }) {
  const wrapper = mount(AppUserMenu, {
    props,
    attachTo: document.body,
    global: { stubs: STUBS },
  })
  const q = (sel) => document.querySelector(sel)
  /** Open the dropdown overlay via the stub's setOpen helper. */
  async function openMenu() {
    wrapper.findComponent(ADropdownStub).vm.setOpen(true)
    await wrapper.vm.$nextTick()
  }
  return { wrapper, q, openMenu }
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe("AppUserMenu — overlay", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    document.body.innerHTML = ""
  })

  it("mounts without rendering .user-menu-overlay by default", async () => {
    const { wrapper, q } = mountMenu()
    await wrapper.vm.$nextTick()
    expect(q(".user-menu-overlay")).toBe(null)
    wrapper.unmount()
  })

  it("renders .user-menu-overlay in the document after the trigger is opened", async () => {
    const { wrapper, q, openMenu } = mountMenu()
    await wrapper.vm.$nextTick()
    await openMenu()
    expect(q(".user-menu-overlay")).not.toBe(null)
    wrapper.unmount()
  })

  it("shows user name and email in the header", async () => {
    const { wrapper, openMenu } = mountMenu()
    await wrapper.vm.$nextTick()
    await openMenu()
    expect(document.body.textContent).toContain("Ada Lovelace")
    expect(document.body.textContent).toContain("ada@example.com")
    wrapper.unmount()
  })

  it("always shows an Account settings item", async () => {
    const { wrapper, q, openMenu } = mountMenu()
    await wrapper.vm.$nextTick()
    await openMenu()
    expect(q(".user-menu-overlay").textContent).toContain("Account settings")
    wrapper.unmount()
  })

  it("navigates to /settings when Account settings is clicked", async () => {
    const { wrapper, q, openMenu } = mountMenu()
    await wrapper.vm.$nextTick()
    await openMenu()
    const items = [...q(".user-menu-overlay").querySelectorAll(".a-menu-item-stub")]
    const accountItem = items.find((el) => el.textContent.includes("Account settings"))
    expect(accountItem).not.toBe(null)
    accountItem.click()
    await wrapper.vm.$nextTick()
    expect(mockPush).toHaveBeenCalledWith("/settings")
    wrapper.unmount()
  })

  it("shows a Sign out item", async () => {
    const { wrapper, q, openMenu } = mountMenu()
    await wrapper.vm.$nextTick()
    await openMenu()
    expect(q(".user-menu-overlay").textContent).toContain("Sign out")
    wrapper.unmount()
  })
})

describe("AppUserMenu — logout action", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    document.body.innerHTML = ""
  })

  it("calls authStore.logout when the Sign out item is clicked", async () => {
    mockLogout.mockResolvedValue(undefined)
    const { wrapper, q, openMenu } = mountMenu()
    await wrapper.vm.$nextTick()
    await openMenu()

    const items = [...q(".user-menu-overlay").querySelectorAll(".a-menu-item-stub")]
    const logoutItem = items.find((el) => el.textContent.includes("Sign out"))
    expect(logoutItem).not.toBe(null)
    logoutItem.click()
    await wrapper.vm.$nextTick()

    expect(mockLogout).toHaveBeenCalledTimes(1)
    wrapper.unmount()
  })
})

describe("AppUserMenu — avatar trigger", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    document.body.innerHTML = ""
  })

  it("renders the avatar with correct initials", async () => {
    const { wrapper, q } = mountMenu()
    await wrapper.vm.$nextTick()
    expect(q(".user-avatar").textContent.trim()).toBe("AL")
    wrapper.unmount()
  })

  it("renders the user name in the trigger", async () => {
    const { wrapper, q } = mountMenu()
    await wrapper.vm.$nextTick()
    expect(q(".user-name").textContent.trim()).toBe("Ada Lovelace")
    wrapper.unmount()
  })
})
