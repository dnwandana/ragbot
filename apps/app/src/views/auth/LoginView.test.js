// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest"
import { ref } from "vue"
import { mount } from "@vue/test-utils"
import pkg from "../../../package.json"

// LoginView reads route query (registered banner) and the auth composable.
vi.mock("vue-router", async (importOriginal) => ({
  ...(await importOriginal()),
  useRoute: () => ({ query: {} }),
}))

vi.mock("@/composables/useAuth", () => ({
  useAuth: () => ({
    formState: ref({ email: "", password: "" }),
    error: ref(""),
    loading: ref(false),
    emailRules: [],
    passwordRules: [],
    handleSignin: vi.fn(),
  }),
}))

import LoginView from "@/views/auth/LoginView.vue"

const STUBS = {
  "a-alert": true,
  "a-form": { template: "<form><slot /></form>" },
  "a-form-item": { template: "<div><slot name='label' /><slot /></div>" },
  "a-input": true,
  "a-input-password": true,
  "router-link": { template: "<a><slot /></a>" },
}

describe("LoginView", () => {
  it("renders the app version badge from the build-time constant", () => {
    const wrapper = mount(LoginView, { global: { stubs: STUBS } })
    const badge = wrapper.find(".login-version")
    expect(badge.exists()).toBe(true)
    expect(badge.text()).toBe(`v${pkg.version}`)
  })
})
