// apps/app/src/views/settings/AccountSettingsView.test.js
// @vitest-environment jsdom
import { describe, it, expect } from "vitest"
import { mount } from "@vue/test-utils"
import AccountSettingsView from "@/views/settings/AccountSettingsView.vue"

// Stub the section components by registered name so the view can mount without
// pulling in their stores/composables.
const STUBS = {
  ProfileSection: { template: `<div class="profile-section-stub" />` },
  SecuritySection: { template: `<div class="security-section-stub" />` },
}

// Stubs for the header test — SettingsCanvas is also stubbed so the test only
// exercises the view's own template.
const HEADER_STUBS = {
  SettingsCanvas: { template: "<div><slot /></div>" },
  ProfileSection: true,
  SecuritySection: true,
}

describe("AccountSettingsView", () => {
  it("renders the profile and security sections inside the settings canvas", () => {
    const wrapper = mount(AccountSettingsView, { global: { stubs: STUBS } })
    expect(wrapper.find(".settings-canvas").exists()).toBe(true)
    expect(wrapper.find(".profile-section-stub").exists()).toBe(true)
    expect(wrapper.find(".security-section-stub").exists()).toBe(true)
  })

  it("renders the page header above the sections", () => {
    const wrapper = mount(AccountSettingsView, { global: { stubs: HEADER_STUBS } })
    expect(wrapper.find(".page-eyebrow").text()).toBe("Your account")
    expect(wrapper.find("h1.page-title").text()).toBe("Account & security")
    expect(wrapper.find(".page-sub").text()).toContain("profile, sign-in")
  })
})
