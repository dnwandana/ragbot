// @vitest-environment jsdom
import { describe, it, expect } from "vitest"
import { mount } from "@vue/test-utils"
import ChatComposer from "@/components/chat/ChatComposer.vue"

// a-popover stub: renders both default slot and #content slot immediately,
// and emits open-change when needed for testing close behaviour.
const APopoverStub = {
  props: {
    open: { type: Boolean, default: false },
    placement: String,
    trigger: String,
    getPopupContainer: Function,
    overlayClassName: String,
  },
  emits: ["open-change"],
  template: `
    <div class="a-popover-stub" :data-open="open">
      <slot />
      <div v-if="open" class="a-popover-stub__content"><slot name="content" /></div>
    </div>
  `,
}

// a-textarea stub: renders a real <textarea> bound to value, re-emitting the
// native keydown/focus/blur the component listens for.
const ATextareaStub = {
  props: { value: { type: String, default: "" } },
  emits: ["update:value", "keydown", "focus", "blur"],
  template: `<textarea
    class="a-textarea-stub"
    :value="value"
    @input="$emit('update:value', $event.target.value)"
    @keydown="$emit('keydown', $event)"
    @focus="$emit('focus')"
    @blur="$emit('blur')"
  ></textarea>`,
}

// a-button stub: renders a <button>, forwarding disabled via $attrs.
const AButtonStub = {
  inheritAttrs: true,
  emits: ["click"],
  template: `<button class="a-button-stub" v-bind="$attrs" @click="$emit('click')"><slot /></button>`,
}

function mountComposer(props = {}) {
  return mount(ChatComposer, {
    props,
    global: {
      stubs: {
        DatasetDrawer: {
          template: "<div class='dataset-drawer-stub' />",
          emits: ["toggle", "search", "close"],
        },
        AgentDrawer: {
          name: "AgentDrawer",
          template: "<div class='agent-drawer-stub' />",
          emits: ["select", "search", "close"],
        },
        "a-popover": APopoverStub,
        "a-textarea": ATextareaStub,
        "a-button": AButtonStub,
      },
    },
  })
}

describe("ChatComposer seeding", () => {
  it("seeds the textarea from initialText once", async () => {
    const wrapper = mountComposer({ initialText: "How do I authenticate?" })
    await wrapper.vm.$nextTick()
    expect(wrapper.find("textarea").element.value).toBe("How do I authenticate?")
  })

  it("does not clobber text the user already typed", async () => {
    const wrapper = mountComposer({ initialText: "" })
    const textarea = wrapper.find("textarea")
    await textarea.setValue("my own text")
    await wrapper.setProps({ initialText: "seeded question" })
    expect(textarea.element.value).toBe("my own text")
  })

  it("seeds only once, even after the field is cleared", async () => {
    const wrapper = mountComposer({ initialText: "first question" })
    await wrapper.vm.$nextTick()
    const textarea = wrapper.find("textarea")
    expect(textarea.element.value).toBe("first question")

    await textarea.setValue("") // user clears it
    await wrapper.setProps({ initialText: "second question" })
    expect(textarea.element.value).toBe("") // one-shot guard: no re-seed
  })
})

describe("ChatComposer a-popover dataset integration", () => {
  it("renders an a-popover wrapping the sources trigger buttons", () => {
    const wrapper = mountComposer()
    expect(wrapper.findComponent(APopoverStub).exists()).toBe(true)
  })

  it("passes placement='topLeft' to the popover", () => {
    const wrapper = mountComposer()
    expect(wrapper.findComponent(APopoverStub).props("placement")).toBe("topLeft")
  })

  it("popover is closed by default", () => {
    const wrapper = mountComposer()
    const popover = wrapper.findComponent(APopoverStub)
    expect(popover.props("open")).toBe(false)
  })

  it("opens the popover when the Paperclip (data-attach) button is clicked", async () => {
    const wrapper = mountComposer()
    await wrapper.find("[data-attach]").trigger("click")
    expect(wrapper.findComponent(APopoverStub).props("open")).toBe(true)
  })

  it("opens the popover when the chip (data-sources) button is clicked", async () => {
    const wrapper = mountComposer({ selectedDatasetIds: ["d1"] })
    await wrapper.find("[data-sources]").trigger("click")
    expect(wrapper.findComponent(APopoverStub).props("open")).toBe(true)
  })

  it("hides the sources chip when no datasets are selected", () => {
    const wrapper = mountComposer({ selectedDatasetIds: [] })
    expect(wrapper.find("[data-sources]").exists()).toBe(false)
    // The Paperclip trigger remains so sources can still be opened/added.
    expect(wrapper.find("[data-attach]").exists()).toBe(true)
  })

  it("shows the sources chip once datasets are selected", () => {
    const wrapper = mountComposer({ selectedDatasetIds: ["d1", "d2"] })
    expect(wrapper.find("[data-sources]").exists()).toBe(true)
  })

  it("closes the popover when it is clicked again (toggle off)", async () => {
    const wrapper = mountComposer()
    await wrapper.find("[data-attach]").trigger("click")
    expect(wrapper.findComponent(APopoverStub).props("open")).toBe(true)
    await wrapper.find("[data-attach]").trigger("click")
    expect(wrapper.findComponent(APopoverStub).props("open")).toBe(false)
  })

  it("renders DatasetDrawer in the #content slot when the popover is open", async () => {
    const wrapper = mountComposer()
    await wrapper.find("[data-attach]").trigger("click")
    // The stub renders #content when :open is true
    expect(wrapper.find(".dataset-drawer-stub").exists()).toBe(true)
  })

  it("provides a getPopupContainer that resolves to a real element (not undefined)", () => {
    const wrapper = mountComposer()
    const getContainer = wrapper.findComponent(APopoverStub).props("getPopupContainer")
    expect(typeof getContainer).toBe("function")
    // Regression guard: the old `() => innerRef.value` returned undefined because
    // `innerRef` is already auto-unwrapped to the element in the template.
    expect(getContainer()).toBeInstanceOf(HTMLElement)
  })

  it("namespaces the popover with overlayClassName so its default chrome can be neutralized", () => {
    const wrapper = mountComposer()
    // The DatasetDrawer paints its own card surface; without this overlay class
    // the non-scoped CSS cannot strip Ant's .ant-popover-inner padding/background,
    // which otherwise renders a double-container frame around the rounded panel.
    expect(wrapper.findComponent(APopoverStub).props("overlayClassName")).toBe(
      "dataset-popover-overlay",
    )
  })
})

describe("ChatComposer agent picker", () => {
  const agentProps = {
    agents: [{ id: "a1", name: "Helper" }],
    agentPickerInteractive: true,
  }

  // With agents provided there are two a-popovers (agent first, dataset second);
  // grab the agent one by its overlay class so the dataset popover is ignored.
  const agentPopover = (wrapper) =>
    wrapper
      .findAllComponents(APopoverStub)
      .find((p) => p.props("overlayClassName") === "agent-popover-overlay")

  it("renders the agent selector as an a-popover when agents are provided", () => {
    const wrapper = mountComposer(agentProps)
    expect(agentPopover(wrapper)).toBeTruthy()
  })

  it("does not render the agent popover when no agents are provided", () => {
    const wrapper = mountComposer()
    expect(agentPopover(wrapper)).toBeUndefined()
  })

  it("opens the agent popover when the agent button is clicked", async () => {
    const wrapper = mountComposer(agentProps)
    expect(agentPopover(wrapper).props("open")).toBe(false)
    await wrapper.find("[data-agent]").trigger("click")
    expect(agentPopover(wrapper).props("open")).toBe(true)
  })

  it("renders AgentDrawer in the #content slot when the popover is open", async () => {
    const wrapper = mountComposer(agentProps)
    await wrapper.find("[data-agent]").trigger("click")
    expect(wrapper.find(".agent-drawer-stub").exists()).toBe(true)
  })

  it("namespaces the agent popover so its default chrome can be neutralized", () => {
    const wrapper = mountComposer(agentProps)
    expect(agentPopover(wrapper).props("overlayClassName")).toBe("agent-popover-overlay")
  })

  it("provides a getPopupContainer that resolves to a real element", () => {
    const wrapper = mountComposer(agentProps)
    const getContainer = agentPopover(wrapper).props("getPopupContainer")
    expect(typeof getContainer).toBe("function")
    expect(getContainer()).toBeInstanceOf(HTMLElement)
  })

  it("emits agent-change and closes when AgentDrawer emits select", async () => {
    const wrapper = mountComposer(agentProps)
    await wrapper.find("[data-agent]").trigger("click")
    wrapper.findComponent({ name: "AgentDrawer" }).vm.$emit("select", "a1")
    await wrapper.vm.$nextTick()
    expect(wrapper.emitted("agent-change")[0]).toEqual(["a1"])
    expect(agentPopover(wrapper).props("open")).toBe(false)
  })
})

describe("ChatComposer a-textarea + a-button send/abort", () => {
  it("renders the message field as an a-textarea", () => {
    const wrapper = mountComposer()
    expect(wrapper.find(".a-textarea-stub").exists()).toBe(true)
  })

  it("typing in the textarea updates the model", async () => {
    const wrapper = mountComposer()
    await wrapper.find(".a-textarea-stub").setValue("hello world")
    expect(wrapper.find(".a-textarea-stub").element.value).toBe("hello world")
  })

  it("clicking Send emits send with the trimmed message and clears the field", async () => {
    const wrapper = mountComposer()
    await wrapper.find(".a-textarea-stub").setValue("  what is RAG?  ")
    await wrapper.find(".chat-composer__send").trigger("click")
    expect(wrapper.emitted("send")[0]).toEqual(["what is RAG?"])
    expect(wrapper.find(".a-textarea-stub").element.value).toBe("")
  })

  it("does not emit send when the field is empty (Send disabled)", async () => {
    const wrapper = mountComposer()
    await wrapper.find(".chat-composer__send").trigger("click")
    expect(wrapper.emitted("send")).toBeFalsy()
  })

  it("shows a Stop button while streaming and emits abort when clicked", async () => {
    const wrapper = mountComposer({ streaming: true })
    const stop = wrapper.find(".chat-composer__stop")
    expect(stop.exists()).toBe(true)
    await stop.trigger("click")
    expect(wrapper.emitted("abort")).toBeTruthy()
  })
})
