// @vitest-environment jsdom
import { mount } from "@vue/test-utils"
import { beforeEach, describe, expect, it, vi } from "vitest"

// Hoisted so the vi.mock factory (which vitest lifts to the top of the file) can
// reach the spies without a temporal-dead-zone error.
const { chartCtor, destroySpy } = vi.hoisted(() => {
  const destroy = vi.fn()
  return { chartCtor: vi.fn(() => ({ destroy })), destroySpy: destroy }
})
vi.mock("chart.js/auto", () => ({ default: chartCtor }))

import ChartCard from "./ChartCard.vue"

const spec = { type: "bar", data: { labels: ["a"], datasets: [{ data: [1] }] } }

describe("ChartCard", () => {
  beforeEach(() => {
    chartCtor.mockClear()
    destroySpy.mockClear()
  })

  it("creates a chart from the spec on mount", () => {
    mount(ChartCard, { props: { spec } })
    expect(chartCtor).toHaveBeenCalledTimes(1)
    const [canvas, config] = chartCtor.mock.calls[0]
    expect(canvas.tagName).toBe("CANVAS")
    expect(config.type).toBe("bar")
  })

  it("destroys the chart on unmount", () => {
    mount(ChartCard, { props: { spec } }).unmount()
    expect(destroySpy).toHaveBeenCalledTimes(1)
  })

  it("rebuilds when the spec changes", async () => {
    const wrapper = mount(ChartCard, { props: { spec } })
    await wrapper.setProps({ spec: { ...spec, type: "line" } })
    expect(destroySpy).toHaveBeenCalledTimes(1)
    expect(chartCtor).toHaveBeenCalledTimes(2)
  })

  it("renders nothing without a spec", () => {
    const wrapper = mount(ChartCard, { props: { spec: null } })
    expect(chartCtor).not.toHaveBeenCalled()
    expect(wrapper.find("canvas").exists()).toBe(false)
  })

  it("emits ready after the chart is built", () => {
    const wrapper = mount(ChartCard, { props: { spec } })
    expect(wrapper.emitted("ready")).toHaveLength(1)
    expect(mount(ChartCard, { props: { spec: null } }).emitted("ready")).toBeUndefined()
  })
})
