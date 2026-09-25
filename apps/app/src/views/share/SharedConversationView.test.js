// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { mount, flushPromises, enableAutoUnmount } from "@vue/test-utils"

vi.mock("vue-router", async (importOriginal) => ({
  ...(await importOriginal()),
  useRoute: () => ({ params: { id: "abc" } }),
}))

import { baseURL } from "@/utils/http"
import SharedConversationView from "./SharedConversationView.vue"

enableAutoUnmount(afterEach)

const snapshot = {
  version: 1,
  title: "Q3 revenue",
  workspace_name: "Acme",
  agent_name: "Default",
  shared_at: "2026-09-18T10:00:00.000Z",
  messages: [{ id: "m1", role: "user", content: "hi", created_at: "2026-09-18T09:00:00.000Z" }],
}
const reply = (status, body) =>
  vi.fn().mockResolvedValue({ ok: status < 400, status, json: () => Promise.resolve(body) })

const mountView = async () => {
  const wrapper = mount(SharedConversationView, { global: { stubs: { ReadonlyThread: true } } })
  await flushPromises()
  return wrapper
}

describe("SharedConversationView", () => {
  beforeEach(() =>
    vi.stubGlobal(
      "fetch",
      reply(200, { data: { snapshot, updated_at: "2026-09-18T10:00:00.000Z" } }),
    ),
  )
  afterEach(() => vi.unstubAllGlobals())

  it("fetches the snapshot without credentials and renders it", async () => {
    const wrapper = await mountView()
    expect(fetch).toHaveBeenCalledWith(`${baseURL}/share/abc`, { credentials: "omit" })
    expect(wrapper.find("h1").text()).toBe("Q3 revenue")
    expect(wrapper.find(".share-page__meta").text()).toBe(
      new Date("2026-09-18T10:00:00.000Z").toLocaleDateString(undefined, { dateStyle: "long" }),
    )
    expect(wrapper.text()).not.toContain("Acme")
    expect(wrapper.text()).not.toContain("1 message")
    expect(wrapper.findComponent({ name: "ReadonlyThread" }).props("snapshot")).toEqual(snapshot)
    expect(wrapper.text()).toContain("This is a read-only snapshot.")
  })

  it("shows the missing state on 404", async () => {
    vi.stubGlobal("fetch", reply(404, { message: "Share link not found" }))
    const wrapper = await mountView()
    expect(wrapper.text()).toContain("This link is no longer available.")
  })

  it("shows the error state with a retry", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")))
    const wrapper = await mountView()
    expect(wrapper.text()).toContain("Something went wrong.")
    await wrapper.find("button.share-page__retry").trigger("click")
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it("adds a noindex meta while mounted", async () => {
    const wrapper = await mountView()
    expect(document.head.querySelector('meta[name="robots"]').content).toBe("noindex")
    wrapper.unmount()
    expect(document.head.querySelector('meta[name="robots"]')).toBeNull()
  })
})
