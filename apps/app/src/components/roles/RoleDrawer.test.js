// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { mount, flushPromises, enableAutoUnmount } from "@vue/test-utils"

vi.mock("ant-design-vue", async (importOriginal) => ({
  ...(await importOriginal()),
  message: { error: vi.fn(), success: vi.fn() },
}))

import { message } from "ant-design-vue"
import RoleDrawer from "@/components/roles/RoleDrawer.vue"

// Auto-unmount every mounted wrapper after each test so no suite leaks the
// document-level Escape keydown listener that RoleDrawer attaches while open.
enableAutoUnmount(afterEach)

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

const STUBS = {
  teleport: true,
  RolePermissionMatrix: MatrixStub,
}

function mountDrawer(props = {}, options = {}) {
  return mount(RoleDrawer, {
    props: {
      open: true,
      mode: "create",
      allPermissions: ALL_PERMISSIONS,
      ...props,
    },
    global: { stubs: STUBS },
    ...options,
  })
}

describe("RoleDrawer visibility", () => {
  beforeEach(() => vi.clearAllMocks())

  it("renders the drawer when open is true", () => {
    const wrapper = mountDrawer({ open: true })
    expect(wrapper.find(".drawer").exists()).toBe(true)
  })

  it("does not render the drawer when open is false", () => {
    const wrapper = mountDrawer({ open: false })
    expect(wrapper.find(".drawer").exists()).toBe(false)
  })
})

describe("RoleDrawer title by mode", () => {
  beforeEach(() => vi.clearAllMocks())

  it("shows 'Create role' in create mode", () => {
    const wrapper = mountDrawer({ mode: "create" })
    expect(wrapper.find(".drawer-title").text()).toBe("Create role")
  })

  it("shows 'Edit role' in edit mode", () => {
    const wrapper = mountDrawer({
      mode: "edit",
      role: { name: "Reviewer", permissions: [{ id: "p1", name: "workspace:read" }] },
    })
    expect(wrapper.find(".drawer-title").text()).toBe("Edit role")
  })

  it("shows the role name in view mode", () => {
    const wrapper = mountDrawer({
      mode: "view",
      role: { name: "Admin", permissions: [{ id: "p1", name: "workspace:read" }] },
    })
    expect(wrapper.find(".drawer-title").text()).toBe("Admin")
  })
})

describe("RoleDrawer read-only", () => {
  beforeEach(() => vi.clearAllMocks())

  it("hides the footer in view mode", () => {
    const wrapper = mountDrawer({
      mode: "view",
      role: { name: "Admin", permissions: [{ id: "p1", name: "workspace:read" }] },
    })
    expect(wrapper.find(".drawer-foot").exists()).toBe(false)
  })

  it("shows the locked banner in view mode", () => {
    const wrapper = mountDrawer({
      mode: "view",
      role: { name: "Admin", permissions: [{ id: "p1", name: "workspace:read" }] },
    })
    expect(wrapper.find(".locked-banner").exists()).toBe(true)
  })

  it("shows the footer when not read-only", () => {
    const wrapper = mountDrawer({ mode: "create" })
    expect(wrapper.find(".drawer-foot").exists()).toBe(true)
  })
})

describe("RoleDrawer save", () => {
  beforeEach(() => vi.clearAllMocks())

  it("emits save with the payload shape on a valid submit", async () => {
    const wrapper = mountDrawer({ mode: "create" })
    // create mode seeds the three core read perms via createDefaults()
    await wrapper.find("input.name-input").setValue("Compliance")
    await wrapper.find(".btn-save").trigger("click")
    await flushPromises()

    const saves = wrapper.emitted("save")
    expect(saves).toHaveLength(1)
    const payload = saves[0][0]
    expect(payload.name).toBe("Compliance")
    expect(Array.isArray(payload.permission_ids)).toBe(true)
    // createDefaults() seeds exactly the three core read perms (workspace/role/member:read)
    expect(payload.permission_ids).toHaveLength(3)
    expect(payload.permission_ids).toEqual(expect.arrayContaining(["p1", "p2", "p3"]))
  })

  it("does not emit save and shows an error when the name is empty", async () => {
    const wrapper = mountDrawer({ mode: "create" })
    await wrapper.find(".btn-save").trigger("click")
    await flushPromises()

    expect(wrapper.emitted("save")).toBeUndefined()
    expect(message.error).toHaveBeenCalled()
  })

  it("does not emit save and shows an error when no permissions are selected", async () => {
    const wrapper = mountDrawer({
      mode: "edit",
      role: { name: "Empty", permissions: [] },
    })
    await wrapper.find("input.name-input").setValue("Still empty")
    await wrapper.find(".btn-save").trigger("click")
    await flushPromises()

    expect(wrapper.emitted("save")).toBeUndefined()
    expect(message.error).toHaveBeenCalled()
  })
})

describe("RoleDrawer cancel", () => {
  beforeEach(() => vi.clearAllMocks())

  it("emits cancel when the close button is clicked", async () => {
    const wrapper = mountDrawer({ mode: "create" })
    await wrapper.find(".close-btn").trigger("click")
    expect(wrapper.emitted("cancel")).toHaveLength(1)
  })

  it("emits cancel when the Cancel button is clicked", async () => {
    const wrapper = mountDrawer({ mode: "create" })
    await wrapper.find(".btn-cancel").trigger("click")
    expect(wrapper.emitted("cancel")).toHaveLength(1)
  })

  it("emits cancel when the scrim is clicked", async () => {
    const wrapper = mountDrawer({ mode: "create" })
    await wrapper.find(".scrim").trigger("click")
    expect(wrapper.emitted("cancel")).toHaveLength(1)
  })
})

describe("RoleDrawer loading guards", () => {
  beforeEach(() => vi.clearAllMocks())

  it("does not emit cancel from the scrim while loading", async () => {
    const wrapper = mountDrawer({ mode: "create", loading: true })
    await wrapper.find(".scrim").trigger("click")
    expect(wrapper.emitted("cancel")).toBeUndefined()
  })

  it("does not emit cancel from the close button while loading", async () => {
    const wrapper = mountDrawer({ mode: "create", loading: true })
    expect(wrapper.find(".close-btn").attributes("disabled")).toBeDefined()
    await wrapper.find(".close-btn").trigger("click")
    expect(wrapper.emitted("cancel")).toBeUndefined()
  })

  it("does not emit cancel on Escape while loading", () => {
    const wrapper = mountDrawer({ open: true, loading: true })
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }))
    expect(wrapper.emitted("cancel")).toBeUndefined()
  })
})

describe("RoleDrawer focus management", () => {
  beforeEach(() => vi.clearAllMocks())

  it("moves focus to the close button when opened", async () => {
    const wrapper = mountDrawer({ open: true }, { attachTo: document.body })
    await flushPromises()
    expect(document.activeElement).toBe(wrapper.find(".close-btn").element)
  })

  it("traps Tab from the last focusable back to the first", async () => {
    const wrapper = mountDrawer({ open: true }, { attachTo: document.body })
    await flushPromises()
    const drawer = wrapper.find(".drawer").element
    const focusables = drawer.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    )
    const last = focusables[focusables.length - 1]
    last.focus()
    await wrapper.find(".drawer").trigger("keydown", { key: "Tab" })
    expect(document.activeElement).toBe(focusables[0])
  })
})

describe("RoleDrawer escape", () => {
  beforeEach(() => vi.clearAllMocks())

  it("emits cancel when Escape is pressed while open", () => {
    const wrapper = mountDrawer({ open: true })
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }))
    expect(wrapper.emitted("cancel")).toHaveLength(1)
  })

  it("ignores non-Escape keys", () => {
    const wrapper = mountDrawer({ open: true })
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }))
    expect(wrapper.emitted("cancel")).toBeUndefined()
  })

  it("stops listening for Escape after the drawer closes", async () => {
    const wrapper = mountDrawer({ open: true })
    await wrapper.setProps({ open: false })
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }))
    expect(wrapper.emitted("cancel")).toBeUndefined()
  })
})
