// @vitest-environment jsdom
import { describe, it, expect } from "vitest"
import { mount } from "@vue/test-utils"

import OtpInput from "./OtpInput.vue"

describe("OtpInput", () => {
  it("emits the joined value as cells are filled", async () => {
    const wrapper = mount(OtpInput, { props: { length: 6, modelValue: "" } })
    const inputs = wrapper.findAll("input")
    await inputs[0].setValue("4")
    expect(wrapper.emitted("update:modelValue").at(-1)[0]).toBe("4")
  })

  it("distributes a pasted code across cells and emits complete", async () => {
    const wrapper = mount(OtpInput, { props: { length: 6, modelValue: "" } })
    const first = wrapper.find("input")
    await first.trigger("paste", {
      clipboardData: { getData: () => "481947" },
    })
    expect(wrapper.emitted("update:modelValue").at(-1)[0]).toBe("481947")
    expect(wrapper.emitted("complete")).toBeTruthy()
  })

  it("ignores non-numeric paste content", async () => {
    const wrapper = mount(OtpInput, { props: { length: 6, modelValue: "" } })
    await wrapper.find("input").trigger("paste", {
      clipboardData: { getData: () => "ab!" },
    })
    expect(wrapper.emitted("update:modelValue")?.at(-1)?.[0] ?? "").toBe("")
  })

  it("marks cells that hold a character with the is-filled class", async () => {
    const wrapper = mount(OtpInput, { props: { length: 6, modelValue: "" } })
    const inputs = wrapper.findAll("input")
    await inputs[0].setValue("7")
    expect(inputs[0].classes()).toContain("is-filled")
    expect(inputs[1].classes()).not.toContain("is-filled")
  })
})
