// @vitest-environment jsdom
import { describe, it, expect } from "vitest"
import { mount } from "@vue/test-utils"
import VariationsToggle from "./VariationsToggle.vue"

const options = [
  { label: "Cards", value: "cards" },
  { label: "Table", value: "table" },
]

// Faithful interactive stub for a-segmented.
// Renders .ant-segmented > .ant-segmented-item per option,
// emits 'change' with the value on click so the component's
// onChange handler can relay update:modelValue.
const ASegmented = {
  props: ["value", "options"],
  emits: ["change"],
  template: `
    <div class="ant-segmented">
      <div
        v-for="opt in options"
        :key="opt.value"
        class="ant-segmented-item"
        @click="$emit('change', opt.value)"
      >{{ opt.label }}</div>
    </div>
  `,
}

const GLOBAL = {
  stubs: {
    "a-segmented": ASegmented,
  },
}

describe("VariationsToggle", () => {
  it("renders an a-segmented control with the option labels", () => {
    const wrapper = mount(VariationsToggle, {
      props: { options, modelValue: "cards" },
      global: GLOBAL,
    })
    expect(wrapper.find(".ant-segmented").exists()).toBe(true)
    expect(wrapper.text()).toContain("Cards")
    expect(wrapper.text()).toContain("Table")
  })

  it("emits update:modelValue when another option is chosen", async () => {
    const wrapper = mount(VariationsToggle, {
      props: { options, modelValue: "cards" },
      global: GLOBAL,
    })
    await wrapper.findAll(".ant-segmented-item").at(1).trigger("click")
    expect(wrapper.emitted("update:modelValue")[0]).toEqual(["table"])
  })
})
