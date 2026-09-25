// @vitest-environment jsdom
import { mount } from "@vue/test-utils"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { nextTick } from "vue"

const { chartCtor } = vi.hoisted(() => ({ chartCtor: vi.fn(() => ({ destroy: vi.fn() })) }))
vi.mock("chart.js/auto", () => ({ default: chartCtor }))

import ReadonlyThread from "./ReadonlyThread.vue"
import MessageBubble from "./MessageBubble.vue"

const chart = { type: "bar", data: { labels: ["a"], datasets: [{ data: [1] }] } }
const snapshot = (charts = []) => ({
  version: 1,
  title: "Q3",
  workspace_name: "Acme",
  agent_name: "Default",
  shared_at: "2026-09-18T10:00:00.000Z",
  messages: [
    {
      id: "m1",
      role: "user",
      content: "Which region grew?",
      created_at: "2026-09-18T09:00:00.000Z",
    },
    {
      id: "m2",
      role: "assistant",
      content: "APAC grew fastest [1], ahead of EMEA.",
      created_at: "2026-09-18T09:00:05.000Z",
      charts,
      citations: [{ n: 1, filename: "sales.csv", cited_text: "APAC +12%", relevance_score: 0.9 }],
    },
  ],
})

beforeEach(() => chartCtor.mockClear())

describe("ReadonlyThread", () => {
  it("renders both roles in bubbles, plus the charts", () => {
    const wrapper = mount(ReadonlyThread, { props: { snapshot: snapshot([chart]) } })
    const bubbles = wrapper.findAllComponents(MessageBubble)
    expect(bubbles.map((b) => b.props("role"))).toEqual(["user", "agent"])
    expect(bubbles[0].text()).toBe("Which region grew?")
    expect(bubbles[1].text()).toContain("APAC grew fastest")
    expect(chartCtor).toHaveBeenCalledTimes(1)
  })

  it("names the agent and the time under an answer only", () => {
    const wrapper = mount(ReadonlyThread, { props: { snapshot: snapshot() } })
    const metas = wrapper.findAll(".ro-thread__meta")
    expect(metas).toHaveLength(1)
    expect(metas[0].text()).toContain("RAGBot")
  })

  it("shows no citation marker and no source list", () => {
    const wrapper = mount(ReadonlyThread, { props: { snapshot: snapshot() } })
    expect(wrapper.text()).toContain("APAC grew fastest, ahead of EMEA.")
    expect(wrapper.text()).not.toContain("[1]")
    expect(wrapper.find(".cite-ref").exists()).toBe(false)
    expect(wrapper.find("#source-1").exists()).toBe(false)
    expect(wrapper.text()).not.toContain("sales.csv")
  })

  it("emits ready right away when there are no charts", async () => {
    const wrapper = mount(ReadonlyThread, { props: { snapshot: snapshot() } })
    await nextTick()
    expect(wrapper.emitted("ready")).toHaveLength(1)
  })

  it("emits ready once after every chart is built", async () => {
    const wrapper = mount(ReadonlyThread, { props: { snapshot: snapshot([chart, chart]) } })
    await nextTick()
    expect(chartCtor).toHaveBeenCalledTimes(2)
    expect(wrapper.emitted("ready")).toHaveLength(1)
  })
})
