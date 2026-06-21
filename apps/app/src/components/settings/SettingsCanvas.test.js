// apps/app/src/components/settings/SettingsCanvas.test.js
// @vitest-environment jsdom
import { describe, it, expect } from "vitest"
import { mount } from "@vue/test-utils"
import SettingsCanvas from "@/components/settings/SettingsCanvas.vue"

describe("SettingsCanvas", () => {
  it("wraps slotted content in .settings-canvas", () => {
    const wrapper = mount(SettingsCanvas, {
      slots: { default: "<p class='child'>hi</p>" },
    })
    const canvas = wrapper.find(".settings-canvas")
    expect(canvas.exists()).toBe(true)
    expect(canvas.find(".child").exists()).toBe(true)
  })
})
