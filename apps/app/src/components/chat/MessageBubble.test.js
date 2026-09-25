// @vitest-environment jsdom
import { describe, it, expect } from "vitest"
import { mount } from "@vue/test-utils"
import MessageBubble from "./MessageBubble.vue"

describe("MessageBubble", () => {
  it("renders the slot inside a role-specific bubble", () => {
    const wrapper = mount(MessageBubble, {
      props: { role: "user" },
      slots: { default: "Which region grew?" },
    })
    expect(wrapper.classes()).toContain("message-bubble")
    expect(wrapper.classes()).toContain("message-bubble--user")
    expect(wrapper.text()).toBe("Which region grew?")
  })

  it("uses the agent modifier for an answer", () => {
    const wrapper = mount(MessageBubble, { props: { role: "agent" } })
    expect(wrapper.classes()).toContain("message-bubble--agent")
    expect(wrapper.classes()).not.toContain("message-bubble--user")
  })
})
