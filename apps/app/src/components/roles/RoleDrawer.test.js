// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { mount, flushPromises } from "@vue/test-utils"

vi.mock("ant-design-vue", async (importOriginal) => ({
  ...(await importOriginal()),
  message: { error: vi.fn(), success: vi.fn() },
}))

import { message } from "ant-design-vue"
import RoleDrawer from "@/components/roles/RoleDrawer.vue"

const ALL_PERMISSIONS = [
  { id: "p1", name: "workspace:read" },
  { id: "p2", name: "role:read" },
  { id: "p3", name: "member:read" },
  { id: "p4", name: "agent:create" },
]

const MatrixStub = {
  props: ["modelValue", "permissions", "editable"],
  emits: ["update:modelValue"],
  template: "<div class='matrix-stub' />",
}

// a-drawer stub: teleports its default slot to document.body, applies root-class-name
// as a class on the wrapper div, and only renders content when :open is true.
const ADrawerStub = {
  props: {
    open: { type: Boolean, default: false },
    rootClassName: { type: String, default: "" },
    placement: String,
    width: [Number, String],
    closable: Boolean,
    mask: Boolean,
    bodyStyle: Object,
    headerStyle: Object,
  },
  emits: ["close"],
  template: `
    <div>
      <teleport to="body">
        <div v-if="open" :class="rootClassName">
          <slot />
        </div>
      </teleport>
    </div>
  `,
}

const STUBS = {
  "a-drawer": ADrawerStub,
  RolePermissionMatrix: MatrixStub,
}

function mountDrawer(props = {}) {
  return mount(RoleDrawer, {
    props: {
      open: true,
      mode: "create",
      allPermissions: ALL_PERMISSIONS,
      ...props,
    },
    attachTo: document.body,
    global: { stubs: STUBS },
  })
}

describe("RoleDrawer visibility", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    document.body.innerHTML = ""
  })
  afterEach(() => {
    document.body.innerHTML = ""
  })

  it("renders the drawer when open is true", async () => {
    const wrapper = mountDrawer({ open: true })
    await wrapper.vm.$nextTick()
    expect(document.querySelector(".role-drawer-root")).not.toBe(null)
    wrapper.unmount()
  })

  it("does not render the drawer when open is false", async () => {
    const wrapper = mountDrawer({ open: false })
    await wrapper.vm.$nextTick()
    expect(document.querySelector(".role-drawer-root")).toBe(null)
    wrapper.unmount()
  })
})

describe("RoleDrawer title by mode", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    document.body.innerHTML = ""
  })
  afterEach(() => {
    document.body.innerHTML = ""
  })

  it("shows 'Create role' in create mode", async () => {
    const wrapper = mountDrawer({ mode: "create" })
    await wrapper.vm.$nextTick()
    expect(document.querySelector(".drawer-title").textContent).toBe("Create role")
    wrapper.unmount()
  })

  it("shows 'Edit role' in edit mode", async () => {
    const wrapper = mountDrawer({
      mode: "edit",
      role: { name: "Reviewer", permissions: [{ id: "p1", name: "workspace:read" }] },
    })
    await wrapper.vm.$nextTick()
    expect(document.querySelector(".drawer-title").textContent).toBe("Edit role")
    wrapper.unmount()
  })

  it("shows the role name in view mode", async () => {
    const wrapper = mountDrawer({
      mode: "view",
      role: { name: "Admin", permissions: [{ id: "p1", name: "workspace:read" }] },
    })
    await wrapper.vm.$nextTick()
    expect(document.querySelector(".drawer-title").textContent).toBe("Admin")
    wrapper.unmount()
  })
})

describe("RoleDrawer read-only", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    document.body.innerHTML = ""
  })
  afterEach(() => {
    document.body.innerHTML = ""
  })

  it("hides the footer in view mode", async () => {
    const wrapper = mountDrawer({
      mode: "view",
      role: { name: "Admin", permissions: [{ id: "p1", name: "workspace:read" }] },
    })
    await wrapper.vm.$nextTick()
    expect(document.querySelector(".drawer-foot")).toBe(null)
    wrapper.unmount()
  })

  it("shows the locked banner in view mode", async () => {
    const wrapper = mountDrawer({
      mode: "view",
      role: { name: "Admin", permissions: [{ id: "p1", name: "workspace:read" }] },
    })
    await wrapper.vm.$nextTick()
    expect(document.querySelector(".locked-banner")).not.toBe(null)
    wrapper.unmount()
  })

  it("shows the footer when not read-only", async () => {
    const wrapper = mountDrawer({ mode: "create" })
    await wrapper.vm.$nextTick()
    expect(document.querySelector(".drawer-foot")).not.toBe(null)
    wrapper.unmount()
  })
})

describe("RoleDrawer save", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    document.body.innerHTML = ""
  })
  afterEach(() => {
    document.body.innerHTML = ""
  })

  it("emits save with the payload shape on a valid submit", async () => {
    const wrapper = mountDrawer({ mode: "create" })
    await wrapper.vm.$nextTick()
    // create mode seeds the three core read perms via createDefaults()
    const input = document.querySelector("input.name-input")
    input.value = "Compliance"
    input.dispatchEvent(new Event("input"))
    await wrapper.vm.$nextTick()
    document.querySelector(".btn-save").click()
    await flushPromises()

    const saves = wrapper.emitted("save")
    expect(saves).toHaveLength(1)
    const payload = saves[0][0]
    expect(payload.name).toBe("Compliance")
    expect(Array.isArray(payload.permission_ids)).toBe(true)
    // createDefaults() seeds exactly the three core read perms (workspace/role/member:read)
    expect(payload.permission_ids).toHaveLength(3)
    expect(payload.permission_ids).toEqual(expect.arrayContaining(["p1", "p2", "p3"]))
    wrapper.unmount()
  })

  it("does not emit save and shows an error when the name is empty", async () => {
    const wrapper = mountDrawer({ mode: "create" })
    await wrapper.vm.$nextTick()
    document.querySelector(".btn-save").click()
    await flushPromises()

    expect(wrapper.emitted("save")).toBeUndefined()
    expect(message.error).toHaveBeenCalled()
    wrapper.unmount()
  })

  it("does not emit save and shows an error when no permissions are selected", async () => {
    const wrapper = mountDrawer({
      mode: "edit",
      role: { name: "Empty", permissions: [] },
    })
    await wrapper.vm.$nextTick()
    const input = document.querySelector("input.name-input")
    input.value = "Still empty"
    input.dispatchEvent(new Event("input"))
    await wrapper.vm.$nextTick()
    document.querySelector(".btn-save").click()
    await flushPromises()

    expect(wrapper.emitted("save")).toBeUndefined()
    expect(message.error).toHaveBeenCalled()
    wrapper.unmount()
  })
})

describe("RoleDrawer cancel", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    document.body.innerHTML = ""
  })
  afterEach(() => {
    document.body.innerHTML = ""
  })

  it("emits cancel when the close button is clicked", async () => {
    const wrapper = mountDrawer({ mode: "create" })
    await wrapper.vm.$nextTick()
    document.querySelector(".close-btn").click()
    expect(wrapper.emitted("cancel")).toHaveLength(1)
    wrapper.unmount()
  })

  it("emits cancel when the Cancel button is clicked", async () => {
    const wrapper = mountDrawer({ mode: "create" })
    await wrapper.vm.$nextTick()
    document.querySelector(".btn-cancel").click()
    expect(wrapper.emitted("cancel")).toHaveLength(1)
    wrapper.unmount()
  })

  it("emits cancel when the scrim is clicked (a-drawer @close)", async () => {
    const wrapper = mountDrawer({ mode: "create" })
    await wrapper.vm.$nextTick()
    // a-drawer emits "close" when the mask is clicked; the stub relays @close to emit("cancel").
    // Trigger it directly via the stub's emitted close event.
    wrapper.findComponent(ADrawerStub).vm.$emit("close")
    await wrapper.vm.$nextTick()
    expect(wrapper.emitted("cancel")).toHaveLength(1)
    wrapper.unmount()
  })
})

describe("RoleDrawer loading guards", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    document.body.innerHTML = ""
  })
  afterEach(() => {
    document.body.innerHTML = ""
  })

  it("does not emit cancel from the a-drawer close event while loading", async () => {
    const wrapper = mountDrawer({ mode: "create", loading: true })
    await wrapper.vm.$nextTick()
    wrapper.findComponent(ADrawerStub).vm.$emit("close")
    await wrapper.vm.$nextTick()
    expect(wrapper.emitted("cancel")).toBeUndefined()
    wrapper.unmount()
  })

  it("does not emit cancel from the close button while loading", async () => {
    const wrapper = mountDrawer({ mode: "create", loading: true })
    await wrapper.vm.$nextTick()
    const btn = document.querySelector(".close-btn")
    expect(btn.disabled).toBe(true)
    btn.click()
    expect(wrapper.emitted("cancel")).toBeUndefined()
    wrapper.unmount()
  })

  it("does not emit cancel on Escape while loading", async () => {
    const wrapper = mountDrawer({ open: true, loading: true })
    await wrapper.vm.$nextTick()
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }))
    expect(wrapper.emitted("cancel")).toBeUndefined()
    wrapper.unmount()
  })
})

describe("RoleDrawer focus management", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    document.body.innerHTML = ""
  })
  afterEach(() => {
    document.body.innerHTML = ""
  })

  it("moves focus to the close button when opened", async () => {
    const wrapper = mountDrawer({ open: true })
    await flushPromises()
    expect(document.activeElement).toBe(document.querySelector(".close-btn"))
    wrapper.unmount()
  })

  it("traps Tab from the last focusable back to the first", async () => {
    const wrapper = mountDrawer({ open: true })
    await flushPromises()
    const root = document.querySelector(".role-drawer-root")
    const focusables = root.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    )
    const last = focusables[focusables.length - 1]
    last.focus()
    // Tab keydown on the drawer inner container
    const drawerInner = root.querySelector(".drawer-inner")
    drawerInner.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", bubbles: true }))
    await wrapper.vm.$nextTick()
    expect(document.activeElement).toBe(focusables[0])
    wrapper.unmount()
  })
})

describe("RoleDrawer escape", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    document.body.innerHTML = ""
  })
  afterEach(() => {
    document.body.innerHTML = ""
  })

  it("emits cancel when Escape is pressed while open", async () => {
    const wrapper = mountDrawer({ open: true })
    await wrapper.vm.$nextTick()
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }))
    expect(wrapper.emitted("cancel")).toHaveLength(1)
    wrapper.unmount()
  })

  it("ignores non-Escape keys", async () => {
    const wrapper = mountDrawer({ open: true })
    await wrapper.vm.$nextTick()
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }))
    expect(wrapper.emitted("cancel")).toBeUndefined()
    wrapper.unmount()
  })

  it("stops listening for Escape after the drawer closes", async () => {
    const wrapper = mountDrawer({ open: true })
    await wrapper.vm.$nextTick()
    await wrapper.setProps({ open: false })
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }))
    expect(wrapper.emitted("cancel")).toBeUndefined()
    wrapper.unmount()
  })
})
