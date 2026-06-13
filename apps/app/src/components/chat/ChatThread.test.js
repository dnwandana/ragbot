// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import { mount } from "@vue/test-utils"

vi.mock("@/components/chat/ChatMessage.vue", () => ({ default: { template: "<div />" } }))
vi.mock("@/components/chat/promptIcons", () => ({
  promptIcon: () => ({ template: "<span class='icon-stub' />" }),
}))

import ChatThread from "@/components/chat/ChatThread.vue"

function mountThread(prompts, extraProps = {}) {
  return mount(ChatThread, {
    props: {
      messages: [],
      loading: false,
      prompts,
      theme: "light",
      sourceLabel: "your sources",
      ...extraProps,
    },
  })
}

describe("ChatThread welcome prompts", () => {
  it("renders text-only prompts without an icon", () => {
    const wrapper = mountThread([{ text: "What is A?" }, { text: "What is B?" }])
    expect(wrapper.findAll(".chat-thread__prompt")).toHaveLength(2)
    expect(wrapper.find(".chat-thread__prompt-icon").exists()).toBe(false)
    expect(wrapper.text()).toContain("What is A?")
    expect(wrapper.text()).toContain("Start with one of these")
  })

  it("hides the prompt grid and tail sentence when there are no prompts", () => {
    const wrapper = mountThread([])
    expect(wrapper.find(".chat-thread__prompts").exists()).toBe(false)
    expect(wrapper.text()).not.toContain("Start with one of these")
  })

  it("renders an icon only when a prompt provides one", () => {
    const wrapper = mountThread([{ text: "Icon one", icon: "key" }])
    expect(wrapper.find(".chat-thread__prompt-icon").exists()).toBe(true)
  })
})

// A fixed instant where two zones fall in different greeting buckets:
//   Asia/Tokyo (UTC+9)     → 11:00         → "Good morning"
//   America/New_York (EDT) → prev day 22:00 → "Good evening"
const INSTANT = "2026-06-04T02:00:00Z"

/** Mount the welcome state (empty thread) and read the greeting text. */
function greetingFor(timeZone) {
  const wrapper = mountThread([], { timeZone })
  return wrapper.find(".chat-thread__greeting").text()
}

describe("ChatThread greeting", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(INSTANT))
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it("greets by the hour in the supplied timezone", () => {
    expect(greetingFor("Asia/Tokyo")).toBe("Good morning")
    expect(greetingFor("America/New_York")).toBe("Good evening")
  })
})
