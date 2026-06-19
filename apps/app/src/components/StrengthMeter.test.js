// @vitest-environment jsdom
import { describe, it, expect } from "vitest"
import { mount } from "@vue/test-utils"
import StrengthMeter from "./StrengthMeter.vue"

const AProgressStub = {
  props: ["percent", "strokeColor", "showInfo", "strokeLinecap", "size"],
  template: `<div class="ant-progress" />`,
}

const GLOBAL = {
  stubs: {
    "a-progress": AProgressStub,
  },
}

describe("StrengthMeter", () => {
  it("renders nothing when password is empty", () => {
    const wrapper = mount(StrengthMeter, { props: { password: "" }, global: GLOBAL })
    expect(wrapper.find(".strength-meter").exists()).toBe(false)
  })

  it("renders an a-progress bar with the strength label for a strong password", () => {
    const wrapper = mount(StrengthMeter, { props: { password: "Abcdefg1!longer" }, global: GLOBAL })
    expect(wrapper.find(".ant-progress").exists()).toBe(true)
    expect(wrapper.text()).toContain("Strong")
  })

  it("maps a weak password to the error color (score 1)", () => {
    const wrapper = mount(StrengthMeter, { props: { password: "password" }, global: GLOBAL })
    expect(wrapper.text()).toContain("Weak")
    const progress = wrapper.findComponent(AProgressStub)
    expect(progress.props("strokeColor")).toBe("var(--err)")
  })
})
