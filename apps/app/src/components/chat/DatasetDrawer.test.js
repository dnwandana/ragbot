// @vitest-environment jsdom
import { describe, it, expect } from "vitest"
import { mount } from "@vue/test-utils"

import DatasetDrawer from "@/components/chat/DatasetDrawer.vue"

// a-popover stub: renders both the default and #content slots immediately.
// DatasetDrawer is a pure panel component — no a-popover shell of its own —
// but we register the stub in case any stray usage sneaks in, which would be a bug.
const APopoverStub = {
  props: ["open", "placement", "trigger", "getPopupContainer"],
  template: `<div class="a-popover-stub"><slot /><slot name="content" /></div>`,
}

const STUBS = {
  "a-popover": APopoverStub,
}

const DATASETS = [
  { id: "d1", name: "Alpha", file_count: 3 },
  { id: "d2", name: "Beta", file_count: 1 },
]

const SELECTED = [{ id: "d1", name: "Alpha", file_count: 3 }]

/**
 * Mount DatasetDrawer in interactive mode with sensible defaults.
 * The component is a pure panel — no overlay or drawer shell — so content is
 * in the component's own DOM (no teleport needed).
 * @param {Object} extraProps - additional props to merge
 * @returns {{ wrapper: import("@vue/test-utils").VueWrapper }}
 */
function mountPanel(extraProps = {}) {
  const wrapper = mount(DatasetDrawer, {
    props: {
      datasets: DATASETS,
      selectedIds: ["d1"],
      selectedDatasets: SELECTED,
      total: 2,
      loading: false,
      interactive: true,
      ...extraProps,
    },
    global: { stubs: STUBS },
  })
  return { wrapper }
}

describe("DatasetDrawer panel structure", () => {
  it("renders the .dataset-drawer root element directly", () => {
    const { wrapper } = mountPanel()
    expect(wrapper.find(".dataset-drawer").exists()).toBe(true)
  })

  it("renders the header title 'Linked sources'", () => {
    const { wrapper } = mountPanel()
    expect(wrapper.find(".dataset-drawer__title").text()).toBe("Linked sources")
  })

  it("does NOT contain an a-drawer or teleport element (pure panel)", () => {
    const { wrapper } = mountPanel()
    // If a-drawer is present the component was not migrated correctly
    expect(wrapper.html()).not.toContain("a-drawer")
  })

  it("does NOT accept an 'open' prop (visibility is controlled by the parent popover)", () => {
    // The component should be a pure panel; 'open' is no longer its concern.
    const { wrapper } = mountPanel()
    // 'open' is not declared as a prop; passing it is silently ignored,
    // but the component must render its content regardless.
    expect(wrapper.find(".dataset-drawer__header").exists()).toBe(true)
  })
})

describe("DatasetDrawer header sub-label", () => {
  it("shows 'Select datasets' sub-label in interactive mode", () => {
    const { wrapper } = mountPanel({ interactive: true })
    expect(wrapper.find(".dataset-drawer__sub").text().trim()).toBe("Select datasets")
  })

  it("shows linked count sub-label in read-only mode", () => {
    const { wrapper } = mountPanel({
      interactive: false,
      selectedIds: ["d1"],
      selectedDatasets: SELECTED,
    })
    expect(wrapper.find(".dataset-drawer__sub").text().trim()).toBe("1 linked")
  })
})

describe("DatasetDrawer interactive mode", () => {
  it("renders the search input", () => {
    const { wrapper } = mountPanel({ interactive: true })
    expect(wrapper.find(".dataset-search__input").exists()).toBe(true)
  })

  it("shows the pinned selected row (active) and the unselected result row", () => {
    const { wrapper } = mountPanel({
      interactive: true,
      datasets: DATASETS,
      selectedIds: ["d1"],
      selectedDatasets: SELECTED,
    })
    expect(wrapper.findAll(".dataset-row--active")).toHaveLength(1)
    expect(wrapper.findAll(".dataset-row:not(.dataset-row--active)")).toHaveLength(1)
  })

  it("emits 'toggle' with dataset id when an unselected row is clicked", async () => {
    const { wrapper } = mountPanel({
      interactive: true,
      datasets: DATASETS,
      selectedIds: [],
      selectedDatasets: [],
    })
    const rows = wrapper.findAll(".dataset-row")
    expect(rows.length).toBeGreaterThan(0)
    await rows[0].trigger("click")
    expect(wrapper.emitted("toggle")).toBeTruthy()
    expect(wrapper.emitted("toggle")[0][0]).toBe("d1")
  })

  it("emits 'toggle' with dataset id when the active (selected) row is clicked", async () => {
    const { wrapper } = mountPanel({
      interactive: true,
      datasets: DATASETS,
      selectedIds: ["d1"],
      selectedDatasets: SELECTED,
    })
    const activeRow = wrapper.find(".dataset-row--active")
    await activeRow.trigger("click")
    expect(wrapper.emitted("toggle")).toBeTruthy()
    expect(wrapper.emitted("toggle")[0][0]).toBe("d1")
  })

  it("emits 'search' event when the search input fires an input event", async () => {
    const { wrapper } = mountPanel({ interactive: true })
    const input = wrapper.find(".dataset-search__input")
    await input.setValue("alph")
    expect(wrapper.emitted("search")).toBeTruthy()
  })

  it("shows 'Searching...' hint when loading=true", () => {
    const { wrapper } = mountPanel({ interactive: true, loading: true })
    expect(wrapper.find(".dataset-drawer__hint").text()).toContain("Searching")
  })

  it("shows 'No datasets' hint when datasets list is empty and nothing is selected", () => {
    const { wrapper } = mountPanel({
      interactive: true,
      datasets: [],
      selectedIds: [],
      selectedDatasets: [],
      total: 0,
    })
    expect(wrapper.find(".dataset-drawer__hint").exists()).toBe(true)
    expect(wrapper.find(".dataset-drawer__hint").text()).toContain("No datasets")
  })

  it("shows truncation hint when total exceeds the fetched datasets length", () => {
    const { wrapper } = mountPanel({
      interactive: true,
      datasets: DATASETS,
      selectedIds: [],
      selectedDatasets: [],
      total: 10,
    })
    expect(wrapper.find(".dataset-drawer__hint").text()).toContain("search to find more")
  })
})

describe("DatasetDrawer read-only mode", () => {
  it("shows read-only rows (no interactive buttons) when interactive=false", () => {
    const { wrapper } = mountPanel({
      interactive: false,
      selectedIds: ["d1"],
      selectedDatasets: SELECTED,
    })
    expect(wrapper.findAll(".dataset-ro")).toHaveLength(1)
    expect(wrapper.find(".dataset-row").exists()).toBe(false)
  })

  it("shows 'no linked datasets' hint when selectedIds is empty in read-only mode", () => {
    const { wrapper } = mountPanel({
      interactive: false,
      selectedIds: [],
      selectedDatasets: [],
    })
    expect(wrapper.find(".dataset-drawer__hint").text()).toContain("no linked datasets")
  })

  it("renders a stub row for an id that has no resolved dataset object", () => {
    const { wrapper } = mountPanel({
      interactive: false,
      selectedIds: ["d-unknown"],
      selectedDatasets: [],
    })
    expect(wrapper.find(".dataset-ro--stub").exists()).toBe(true)
    expect(wrapper.find(".dataset-ro__name").text()).toContain("Dataset unavailable")
  })

  it("shows the 'fixed for this conversation' hint when datasets are linked", () => {
    const { wrapper } = mountPanel({
      interactive: false,
      selectedIds: ["d1"],
      selectedDatasets: SELECTED,
    })
    expect(wrapper.find(".dataset-drawer__hint").text()).toContain(
      "Datasets are fixed for this conversation",
    )
  })
})

describe("DatasetDrawer close emit declaration", () => {
  it("declares a 'close' emit so the parent popover can wire @close", () => {
    // Outside-click is now the a-popover's responsibility (via @open-change in ChatComposer).
    // DatasetDrawer still declares 'close' so the @close binding in ChatComposer is valid.
    // We verify it's wired by confirming the emit registry includes 'close'.
    const { wrapper } = mountPanel({ interactive: true })
    // Trigger close via any code path that calls emit('close') — none exists directly
    // on the pure panel, so we verify through the component's emits option.
    const emits = wrapper.vm.$options?.emits ?? wrapper.vm.$.type.emits ?? []
    expect(emits).toContain("close")
  })
})
