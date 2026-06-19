// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest"
import { mount } from "@vue/test-utils"

// DeleteRoleModal imports Modal/Select/Button directly from ant-design-vue.
// Directly-imported components are resolved at compile time, so name-based
// global.stubs cannot intercept them — mock the module instead.
vi.mock("ant-design-vue", () => ({
  Modal: {
    name: "Modal",
    props: { open: { type: Boolean, default: false }, title: { type: String, default: "" } },
    emits: ["cancel"],
    template: `<div v-if="open" class="modal-stub"><div class="modal-title">{{ title }}</div><slot /></div>`,
  },
  Select: {
    name: "Select",
    props: { value: { default: undefined }, options: { type: Array, default: () => [] } },
    emits: ["update:value"],
    template: `<select class="select-stub" @change="$emit('update:value', $event.target.value)">
      <option v-for="o in options" :key="o.value" :value="o.value">{{ o.label }}</option>
    </select>`,
  },
  Button: {
    name: "Button",
    props: { disabled: { type: Boolean, default: false } },
    template: `<button class="btn-stub" :disabled="disabled"><slot /></button>`,
  },
}))

import DeleteRoleModal from "./DeleteRoleModal.vue"

const ROLES = [
  { id: "r1", name: "owner", is_system: true },
  { id: "r2", name: "editor", is_system: false },
  { id: "r3", name: "viewer", is_system: false },
]

// Mount closed, then open — the component preselects the reassign target via a
// watch(open) that only fires on a false→true transition (mirrors real usage).
async function mountModal(role) {
  const wrapper = mount(DeleteRoleModal, {
    props: { open: false, role, roles: ROLES, loading: false },
  })
  await wrapper.setProps({ open: true })
  return wrapper
}

describe("DeleteRoleModal", () => {
  it("renders the modal with the role name in the title when open", async () => {
    const wrapper = await mountModal({
      id: "r2",
      name: "editor",
      is_system: false,
      member_count: 0,
    })
    expect(wrapper.find(".modal-stub").exists()).toBe(true)
    expect(wrapper.find(".modal-title").text()).toContain("editor")
  })

  it("shows a reassignment Select (excluding the deleted role and owner) for a role with members", async () => {
    const wrapper = await mountModal({
      id: "r2",
      name: "editor",
      is_system: false,
      member_count: 3,
    })
    const select = wrapper.find(".select-stub")
    expect(select.exists()).toBe(true)
    const values = wrapper.findAll(".select-stub option").map((o) => o.attributes("value"))
    // Options exclude the role being deleted (r2) and the owner role
    expect(values).toEqual(["r3"])
  })

  it("emits confirm with the chosen reassign role id when members must be reassigned", async () => {
    const wrapper = await mountModal({
      id: "r2",
      name: "editor",
      is_system: false,
      member_count: 3,
    })
    // Preselects the first reassign option (r3) on open
    await wrapper.findAll(".btn-stub").at(1).trigger("click")
    expect(wrapper.emitted("confirm")[0]).toEqual(["r3"])
  })

  it("emits confirm with undefined for an empty role (no reassignment needed)", async () => {
    const wrapper = await mountModal({
      id: "r2",
      name: "editor",
      is_system: false,
      member_count: 0,
    })
    await wrapper.findAll(".btn-stub").at(1).trigger("click")
    expect(wrapper.emitted("confirm")[0]).toEqual([undefined])
  })

  it("emits cancel when the Cancel button is clicked", async () => {
    const wrapper = await mountModal({
      id: "r2",
      name: "editor",
      is_system: false,
      member_count: 0,
    })
    await wrapper.findAll(".btn-stub").at(0).trigger("click")
    expect(wrapper.emitted("cancel")).toBeTruthy()
  })
})
