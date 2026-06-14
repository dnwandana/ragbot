// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest"
import { mount } from "@vue/test-utils"

vi.mock("@/components/chat/MarkdownRenderer.vue", () => ({ default: { template: "<div />" } }))
vi.mock("@/components/chat/SourceCitations.vue", () => ({ default: { template: "<div />" } }))

import ChatMessage from "@/components/chat/ChatMessage.vue"

describe("ChatMessage isUser reactivity", () => {
  it("tracks the role prop reactively across updates", async () => {
    const wrapper = mount(ChatMessage, {
      props: { msg: { id: "m1", role: "user", text: "hi", time: "now" } },
    })
    expect(wrapper.find(".chat-message--user").exists()).toBe(true)

    await wrapper.setProps({ msg: { id: "m1", role: "assistant", text: "hi", time: "now" } })
    expect(wrapper.find(".chat-message--user").exists()).toBe(false)
    expect(wrapper.find(".chat-message--agent").exists()).toBe(true)
  })
})
