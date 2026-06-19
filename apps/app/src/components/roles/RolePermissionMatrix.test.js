// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest"
import { mount } from "@vue/test-utils"

// Switch is imported directly from ant-design-vue (resolved at compile time),
// so name-based global.stubs cannot intercept it — mock the module.
vi.mock("ant-design-vue", () => ({
  Switch: {
    name: "Switch",
    props: {
      checked: { type: Boolean, default: false },
      disabled: { type: Boolean, default: false },
    },
    emits: ["change"],
    template: `<button class="switch-stub" :data-checked="checked" :disabled="disabled" @click="$emit('change', !checked)"></button>`,
  },
}))

// Control the grouping so the test does not depend on the real catalog data.
vi.mock("@/utils/permissionCatalog", () => ({
  groupPermissions: () => [
    {
      resource: "dataset",
      label: "Datasets",
      icon: "datasets",
      permissions: [
        { id: "p1", label: "Read", destructive: false },
        { id: "p2", label: "Delete", destructive: true },
      ],
    },
  ],
}))

vi.mock("./permissionGroupIcons", () => ({
  permissionGroupIcon: () => ({ template: "<span class='grp-icon' />" }),
}))

import RolePermissionMatrix from "./RolePermissionMatrix.vue"

const PERMS = [
  { id: "p1", label: "Read" },
  { id: "p2", label: "Delete" },
]

function mountMatrix(props = {}) {
  return mount(RolePermissionMatrix, {
    props: { permissions: PERMS, modelValue: [], editable: true, ...props },
  })
}

describe("RolePermissionMatrix", () => {
  it("renders one Ant Switch per permission", () => {
    const wrapper = mountMatrix()
    expect(wrapper.findAll(".switch-stub")).toHaveLength(2)
  })

  it("reflects the modelValue as the checked state of each switch", () => {
    const wrapper = mountMatrix({ modelValue: ["p1"] })
    const switches = wrapper.findAll(".switch-stub")
    expect(switches[0].attributes("data-checked")).toBe("true")
    expect(switches[1].attributes("data-checked")).toBe("false")
  })

  it("toggling an off permission emits update:modelValue with the id added", async () => {
    const wrapper = mountMatrix({ modelValue: [] })
    await wrapper.findAll(".switch-stub")[0].trigger("click")
    expect(wrapper.emitted("update:modelValue")[0]).toEqual([["p1"]])
  })

  it("toggling an on permission emits update:modelValue with the id removed", async () => {
    const wrapper = mountMatrix({ modelValue: ["p1", "p2"] })
    await wrapper.findAll(".switch-stub")[0].trigger("click")
    expect(wrapper.emitted("update:modelValue")[0]).toEqual([["p2"]])
  })

  it("does not emit when not editable (switches disabled)", async () => {
    const wrapper = mountMatrix({ editable: false, modelValue: [] })
    expect(wrapper.findAll(".switch-stub")[0].attributes("disabled")).toBeDefined()
    await wrapper.findAll(".switch-stub")[0].trigger("click")
    expect(wrapper.emitted("update:modelValue")).toBeFalsy()
  })

  it("shows the enabled count per group", () => {
    const wrapper = mountMatrix({ modelValue: ["p1"] })
    expect(wrapper.find(".group-count").text()).toBe("1/2")
  })
})
