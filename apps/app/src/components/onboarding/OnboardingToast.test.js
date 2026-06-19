// @vitest-environment jsdom
import { describe, it, expect } from "vitest"
import { mount } from "@vue/test-utils"
import OnboardingToast from "./OnboardingToast.vue"

/**
 * Stub for a-alert — renders a div with data-type and data-message attributes so
 * assertions can check both the mapped Ant type and the message text without
 * mounting the real Ant Design component.
 */
const AAlertStub = {
  props: ["type", "message", "showIcon", "banner"],
  template: `<div class="ant-alert-stub" :data-type="type" :data-message="message" :data-show-icon="showIcon" />`,
}

const GLOBAL = {
  stubs: { "a-alert": AAlertStub },
}

/**
 * Mount OnboardingToast with the given toast prop.
 * @param {Object|null} toast - The toast object ({ msg, tone }) or null
 * @returns {import("@vue/test-utils").VueWrapper}
 */
function mountToast(toast) {
  return mount(OnboardingToast, {
    props: { toast },
    global: GLOBAL,
  })
}

describe("OnboardingToast", () => {
  it("renders nothing when toast prop is null", () => {
    const wrapper = mountToast(null)
    expect(wrapper.find(".ant-alert-stub").exists()).toBe(false)
  })

  it("renders an a-alert when toast prop is set", () => {
    const wrapper = mountToast({ msg: "Workspace created", tone: "ok" })
    expect(wrapper.find(".ant-alert-stub").exists()).toBe(true)
  })

  it("maps tone=ok to a-alert type='success'", () => {
    const wrapper = mountToast({ msg: "Workspace created", tone: "ok" })
    expect(wrapper.find(".ant-alert-stub").attributes("data-type")).toBe("success")
  })

  it("maps tone=err to a-alert type='error'", () => {
    const wrapper = mountToast({ msg: "Something went wrong", tone: "err" })
    expect(wrapper.find(".ant-alert-stub").attributes("data-type")).toBe("error")
  })

  it("passes the toast message as the a-alert message prop", () => {
    const wrapper = mountToast({ msg: "Dataset added", tone: "ok" })
    expect(wrapper.find(".ant-alert-stub").attributes("data-message")).toBe("Dataset added")
  })

  it("passes show-icon to a-alert", () => {
    const wrapper = mountToast({ msg: "Done", tone: "ok" })
    expect(wrapper.find(".ant-alert-stub").attributes("data-show-icon")).toBe("true")
  })
})
