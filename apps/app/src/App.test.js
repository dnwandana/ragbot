// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest"
import { mount } from "@vue/test-utils"
import { reactive, ref } from "vue"

const route = reactive({
  name: "SharedConversation",
  path: "/chat/abc",
  fullPath: "/chat/abc",
  params: { id: "abc" },
  meta: { bare: true },
})

vi.mock("vue-router", async (importOriginal) => ({
  ...(await importOriginal()),
  useRoute: () => route,
}))
vi.mock("@/composables/useTheme", () => ({ useTheme: () => ({ theme: ref("light") }) }))
vi.mock("@/components/AppLayout.vue", () => ({
  default: { name: "AppLayout", template: `<div class="layout"><slot /></div>` },
}))

import App from "./App.vue"

const mountApp = () =>
  mount(App, {
    global: {
      mocks: { $route: route },
      stubs: {
        RouterView: { template: `<div class="view" />` },
        ConfigProvider: { template: `<div><slot /></div>` },
      },
    },
  })

describe("App", () => {
  it("renders a bare route without the layout", () => {
    const wrapper = mountApp()
    expect(wrapper.find(".view").exists()).toBe(true)
    expect(wrapper.find(".layout").exists()).toBe(false)
  })

  it("wraps other routes in the layout", async () => {
    const wrapper = mountApp()
    Object.assign(route, {
      name: "WorkspacesList",
      path: "/workspaces",
      fullPath: "/workspaces",
      meta: {},
    })
    await wrapper.vm.$nextTick()
    expect(wrapper.find(".layout .view").exists()).toBe(true)
  })
})
