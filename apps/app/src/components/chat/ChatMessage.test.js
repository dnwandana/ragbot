// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest"
import { mount } from "@vue/test-utils"

vi.mock("@/components/chat/MarkdownRenderer.vue", () => ({ default: { template: "<div />" } }))
vi.mock("@/components/chat/SourceCitations.vue", () => ({ default: { template: "<div />" } }))

// a-alert stub: renders the message prop and a named icon slot inside a
// wrapper div. The data-type attribute lets us assert the type prop.
const AAlertStub = {
  name: "AAlert",
  props: {
    type: { type: String, default: "info" },
    message: { type: String, default: "" },
    description: { type: String, default: "" },
    showIcon: { type: Boolean, default: false },
  },
  template: `
    <div class="a-alert-stub" :data-type="type">
      <slot name="icon" />
      <span class="a-alert-stub__message">{{ message }}</span>
      <span class="a-alert-stub__description">{{ description }}</span>
    </div>
  `,
}

// a-button stub: renders its default slot inside a native <button> and
// forwards click events so tests can trigger them normally.
const AButtonStub = {
  name: "AButton",
  props: {
    type: { type: String, default: "default" },
    size: { type: String, default: "default" },
    title: { type: String, default: "" },
  },
  template: `<button class="a-button-stub" :title="title" @click="$emit('click', $event)"><slot /></button>`,
  emits: ["click"],
}

const GLOBAL = {
  stubs: {
    "a-alert": AAlertStub,
    "a-button": AButtonStub,
  },
}

function agentMsg(overrides = {}) {
  return { id: "m1", role: "assistant", text: "hello", time: "12:00", ...overrides }
}

function userMsg(overrides = {}) {
  return { id: "m2", role: "user", text: "hi", time: "12:00", ...overrides }
}

describe("ChatMessage isUser reactivity", () => {
  it("tracks the role prop reactively across updates", async () => {
    const wrapper = mount(ChatMessage, {
      props: { msg: { id: "m1", role: "user", text: "hi", time: "now" } },
      global: GLOBAL,
    })
    expect(wrapper.find(".chat-message--user").exists()).toBe(true)

    await wrapper.setProps({ msg: { id: "m1", role: "assistant", text: "hi", time: "now" } })
    expect(wrapper.find(".chat-message--user").exists()).toBe(false)
    expect(wrapper.find(".chat-message--agent").exists()).toBe(true)
  })
})

describe("ChatMessage error state", () => {
  it("renders an a-alert with type='error' when msg.error is true", () => {
    const wrapper = mount(ChatMessage, {
      props: { msg: agentMsg({ error: true, errorMsg: "Stream dropped" }) },
      global: GLOBAL,
    })
    const alert = wrapper.find(".a-alert-stub")
    expect(alert.exists()).toBe(true)
    expect(alert.attributes("data-type")).toBe("error")
  })

  it("passes the errorMsg as the description to a-alert", () => {
    const wrapper = mount(ChatMessage, {
      props: { msg: agentMsg({ error: true, errorMsg: "Custom error text" }) },
      global: GLOBAL,
    })
    expect(wrapper.find(".a-alert-stub__description").text()).toContain("Custom error text")
  })

  it("falls back to a default description when errorMsg is absent", () => {
    const wrapper = mount(ChatMessage, {
      props: { msg: agentMsg({ error: true }) },
      global: GLOBAL,
    })
    expect(wrapper.find(".a-alert-stub__description").text().length).toBeGreaterThan(0)
  })

  it("does not render a-alert when there is no error", () => {
    const wrapper = mount(ChatMessage, {
      props: { msg: agentMsg() },
      global: GLOBAL,
    })
    expect(wrapper.find(".a-alert-stub").exists()).toBe(false)
  })
})

describe("ChatMessage copy button", () => {
  it("renders an a-button for the agent copy action (no streaming, no error)", () => {
    const wrapper = mount(ChatMessage, {
      props: { msg: agentMsg() },
      global: GLOBAL,
    })
    // Should be at least one a-button-stub in the actions row
    expect(wrapper.find(".a-button-stub").exists()).toBe(true)
  })

  it("emits 'copy' with the message object when the copy a-button is clicked", async () => {
    const msg = agentMsg()
    const wrapper = mount(ChatMessage, {
      props: { msg },
      global: GLOBAL,
    })
    await wrapper.find(".a-button-stub").trigger("click")
    expect(wrapper.emitted("copy")).toBeTruthy()
    expect(wrapper.emitted("copy")[0][0]).toEqual(msg)
  })

  it("renders an a-button for the user copy action (no streaming, no error)", () => {
    const wrapper = mount(ChatMessage, {
      props: { msg: userMsg() },
      global: GLOBAL,
    })
    expect(wrapper.find(".a-button-stub").exists()).toBe(true)
  })

  it("emits 'copy' with the message object when the user copy a-button is clicked", async () => {
    const msg = userMsg()
    const wrapper = mount(ChatMessage, {
      props: { msg },
      global: GLOBAL,
    })
    await wrapper.find(".a-button-stub").trigger("click")
    expect(wrapper.emitted("copy")).toBeTruthy()
    expect(wrapper.emitted("copy")[0][0]).toEqual(msg)
  })
})

import ChatMessage from "@/components/chat/ChatMessage.vue"
