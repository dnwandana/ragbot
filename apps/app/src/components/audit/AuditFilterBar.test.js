// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest"
import { mount } from "@vue/test-utils"
import AuditFilterBar from "./AuditFilterBar.vue"

vi.mock("@/components/audit/auditMaps", () => ({
  ENTITY_TYPE_OPTIONS: [
    { value: "workspace", label: "Workspace" },
    { value: "dataset", label: "Dataset" },
    { value: "agent", label: "Agent" },
  ],
  ACTION_OPTIONS: [
    { value: "created", label: "Created" },
    { value: "updated", label: "Updated" },
    { value: "deleted", label: "Deleted" },
  ],
  entityTypeLabel: (v) => ({ workspace: "Workspace", dataset: "Dataset", agent: "Agent" })[v] || v,
  actionLabel: (v) => ({ created: "Created", updated: "Updated", deleted: "Deleted" })[v] || v,
  memberFilterOptions: (members) =>
    members
      .filter((m) => m.user_id)
      .map((m) => ({ value: m.user_id, label: m.full_name || m.email || m.user_id })),
}))

/**
 * A-select stub that fires onChange with the new value when its internal
 * <select> element changes — mirrors the real a-select onChange callback
 * convention used in AuditFilterBar.vue.
 */
const ASelectStub = {
  props: {
    value: { default: null },
    options: { type: Array, default: () => [] },
    placeholder: { type: String, default: "" },
    allowClear: { type: Boolean, default: false },
    disabled: { type: Boolean, default: false },
  },
  emits: ["change", "update:value"],
  template: `
    <select
      class="a-select-stub"
      :value="value"
      :aria-label="placeholder"
      @change="(e) => { $emit('change', e.target.value || null); $emit('update:value', e.target.value || null) }"
    >
      <option value="">{{ placeholder }}</option>
      <option v-for="o in options" :key="o.value" :value="o.value">{{ o.label }}</option>
    </select>
  `,
}

/** Sample members fixture with one joined member (has user_id) and one pending (no user_id). */
const MEMBERS = [
  { user_id: "usr_1", full_name: "Alice Admin", email: "alice@example.com" },
  { user_id: "usr_2", full_name: "Bob Builder", email: "bob@example.com" },
  { email: "pending@example.com" }, // no user_id — excluded by memberFilterOptions
]

const GLOBAL = {
  stubs: {
    "a-select": ASelectStub,
  },
}

/**
 * Mount AuditFilterBar with sensible defaults.
 * @param {Object} [props] - Props to override
 * @returns {import("@vue/test-utils").VueWrapper}
 */
function mountBar(props = {}) {
  return mount(AuditFilterBar, {
    props: {
      entityType: null,
      action: null,
      userId: null,
      members: MEMBERS,
      count: 0,
      hasFilters: false,
      ...props,
    },
    global: GLOBAL,
  })
}

describe("AuditFilterBar — renders three a-select filter controls", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders three a-select elements", () => {
    const wrapper = mountBar()
    expect(wrapper.findAll(".a-select-stub")).toHaveLength(3)
  })

  it("entity-type select renders all ENTITY_TYPE_OPTIONS", () => {
    const wrapper = mountBar()
    const selects = wrapper.findAll(".a-select-stub")
    const options = selects[0].findAll("option").map((o) => o.element.value)
    expect(options).toContain("workspace")
    expect(options).toContain("dataset")
    expect(options).toContain("agent")
  })

  it("action select renders all ACTION_OPTIONS", () => {
    const wrapper = mountBar()
    const selects = wrapper.findAll(".a-select-stub")
    const options = selects[1].findAll("option").map((o) => o.element.value)
    expect(options).toContain("created")
    expect(options).toContain("updated")
    expect(options).toContain("deleted")
  })

  it("actor select renders joined members only (excludes pending-only entries)", () => {
    const wrapper = mountBar()
    const selects = wrapper.findAll(".a-select-stub")
    const options = selects[2].findAll("option").map((o) => o.element.value)
    expect(options).toContain("usr_1")
    expect(options).toContain("usr_2")
    // pending member has no user_id, should not appear; blank is the placeholder sentinel
    expect(options.filter((v) => v !== "")).toHaveLength(2)
  })
})

describe("AuditFilterBar — filter changes emit correct update events", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("selecting an entity type emits update:entityType with the value", async () => {
    const wrapper = mountBar()
    const selects = wrapper.findAll(".a-select-stub")
    await selects[0].setValue("dataset")
    expect(wrapper.emitted("update:entityType")).toBeTruthy()
    expect(wrapper.emitted("update:entityType")[0][0]).toBe("dataset")
  })

  it("selecting an action emits update:action with the value", async () => {
    const wrapper = mountBar()
    const selects = wrapper.findAll(".a-select-stub")
    await selects[1].setValue("created")
    expect(wrapper.emitted("update:action")).toBeTruthy()
    expect(wrapper.emitted("update:action")[0][0]).toBe("created")
  })

  it("selecting an actor emits update:userId with the value", async () => {
    const wrapper = mountBar()
    const selects = wrapper.findAll(".a-select-stub")
    await selects[2].setValue("usr_2")
    expect(wrapper.emitted("update:userId")).toBeTruthy()
    expect(wrapper.emitted("update:userId")[0][0]).toBe("usr_2")
  })

  it("clearing the entity-type select emits update:entityType with null", async () => {
    const wrapper = mountBar({ entityType: "dataset" })
    const selects = wrapper.findAll(".a-select-stub")
    // simulate clearing — stub emits null when value is empty string
    await selects[0].setValue("")
    expect(wrapper.emitted("update:entityType")).toBeTruthy()
    expect(wrapper.emitted("update:entityType")[0][0]).toBeNull()
  })
})

describe("AuditFilterBar — active-filters chips and clear behaviour", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("does not render chips row when hasFilters is false", () => {
    const wrapper = mountBar()
    expect(wrapper.find(".afb-chip").exists()).toBe(false)
    expect(wrapper.find(".afb-clear").exists()).toBe(false)
  })

  it("renders entity-type chip when entityType is set and hasFilters is true", () => {
    const wrapper = mountBar({ entityType: "dataset", hasFilters: true, count: 5 })
    const chips = wrapper.findAll(".afb-chip")
    const labels = chips.map((c) => c.text())
    expect(labels.some((l) => l.includes("Dataset"))).toBe(true)
  })

  it("renders action chip when action is set and hasFilters is true", () => {
    const wrapper = mountBar({ action: "created", hasFilters: true, count: 3 })
    const chips = wrapper.findAll(".afb-chip")
    expect(chips.some((c) => c.text().includes("Created"))).toBe(true)
  })

  it("renders actor chip when userId is set and hasFilters is true", () => {
    const wrapper = mountBar({ userId: "usr_1", members: MEMBERS, hasFilters: true, count: 2 })
    const chips = wrapper.findAll(".afb-chip")
    expect(chips.some((c) => c.text().includes("Alice Admin"))).toBe(true)
  })

  it("clicking chip X for entity type emits update:entityType with null", async () => {
    const wrapper = mountBar({ entityType: "dataset", hasFilters: true, count: 5 })
    const chips = wrapper.findAll(".afb-chip")
    const entityChip = chips.find((c) => c.text().includes("Dataset"))
    await entityChip.find(".afb-chip-x").trigger("click")
    expect(wrapper.emitted("update:entityType")).toBeTruthy()
    expect(wrapper.emitted("update:entityType")[0][0]).toBeNull()
  })

  it("clicking chip X for action emits update:action with null", async () => {
    const wrapper = mountBar({ action: "updated", hasFilters: true, count: 2 })
    const chips = wrapper.findAll(".afb-chip")
    const actionChip = chips.find((c) => c.text().includes("Updated"))
    await actionChip.find(".afb-chip-x").trigger("click")
    expect(wrapper.emitted("update:action")).toBeTruthy()
    expect(wrapper.emitted("update:action")[0][0]).toBeNull()
  })

  it("clicking chip X for userId emits update:userId with null", async () => {
    const wrapper = mountBar({ userId: "usr_1", members: MEMBERS, hasFilters: true, count: 2 })
    const chips = wrapper.findAll(".afb-chip")
    const actorChip = chips.find((c) => c.text().includes("Alice Admin"))
    await actorChip.find(".afb-chip-x").trigger("click")
    expect(wrapper.emitted("update:userId")).toBeTruthy()
    expect(wrapper.emitted("update:userId")[0][0]).toBeNull()
  })

  it("clicking Clear all emits 'clear'", async () => {
    const wrapper = mountBar({ entityType: "agent", hasFilters: true, count: 1 })
    await wrapper.find(".afb-clear").trigger("click")
    expect(wrapper.emitted("clear")).toBeTruthy()
  })

  it("displays event count in the chips row", () => {
    const wrapper = mountBar({ entityType: "dataset", hasFilters: true, count: 7 })
    expect(wrapper.find(".afb-count").text()).toContain("7")
  })

  it("pluralises 'events' when count is not 1", () => {
    const wrapper = mountBar({ entityType: "dataset", hasFilters: true, count: 7 })
    expect(wrapper.find(".afb-count").text()).toMatch(/events/)
  })

  it("uses singular 'event' when count is 1", () => {
    const wrapper = mountBar({ entityType: "dataset", hasFilters: true, count: 1 })
    expect(wrapper.find(".afb-count").text()).toMatch(/1 event$/)
  })
})
