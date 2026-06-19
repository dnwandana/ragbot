// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest"
import { mount } from "@vue/test-utils"
import AuditTable from "./AuditTable.vue"

vi.mock("@/composables/useFormattedTime", () => ({
  useFormattedTime: () => ({
    relativeTime: () => "2 minutes ago",
    timeOfDay: () => "10:25 AM",
  }),
}))

vi.mock("@/components/audit/auditIcons", () => ({
  auditIcon: () => ({ template: "<span />" }),
}))

vi.mock("@/components/audit/auditMaps", () => ({
  category: () => ({ softBg: "#eee", text: "#333", icon: "database", label: "Datasets" }),
  entityIcon: () => "database",
  verb: () => "Created dataset",
  resourceLabel: () => "my-dataset · abc12345",
}))

// a-table stub: renders an .ant-table wrapper, thead with column titles, and tbody
// with one row per dataSource entry. Invokes customRow(record) to spread attributes
// (tabindex, class, onClick, onKeydown) onto each row — matching Ant Design's API
// and exercising the click + keyboard a11y handlers in the real component.
const ATableStub = {
  props: {
    columns: { type: Array, default: () => [] },
    dataSource: { type: Array, default: () => [] },
    rowKey: [Function, String],
    pagination: { type: [Boolean, Object], default: false },
    customRow: { type: Function, default: null },
    loading: { type: Boolean, default: false },
  },
  template: `
    <div class="ant-table">
      <table>
        <thead class="ant-table-thead">
          <tr class="ant-table-row">
            <th v-for="col in columns" :key="col.key" class="ant-table-cell">{{ col.title }}</th>
          </tr>
        </thead>
        <tbody class="ant-table-tbody">
          <tr
            v-for="record in dataSource"
            :key="rowKey ? (typeof rowKey === 'function' ? rowKey(record) : record[rowKey]) : record.id"
            class="ant-table-row"
            v-bind="customRow ? customRow(record) : {}"
          >
            <td v-for="col in columns" :key="col.key" class="ant-table-cell">
              <slot name="bodyCell" :column="col" :record="record" :text="record[col.dataIndex]" />
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  `,
}

/** Sample audit event fixture. */
const event1 = {
  id: "evt_1",
  user_id: "usr_1",
  entity_type: "dataset",
  action: "created",
  created_at: "2026-06-19T02:00:00Z",
  changes: null,
  context: null,
  entity_id: "ds_1",
}

const event2 = {
  id: "evt_2",
  user_id: "usr_2",
  entity_type: "agent",
  action: "updated",
  created_at: "2026-06-18T08:00:00Z",
  changes: null,
  context: null,
  entity_id: "ag_1",
}

/**
 * Actor resolver stub — returns a stable display object for any user id.
 * @param {string} userId
 * @returns {{ name: string, email: string, initials: string, color: string }}
 */
function actorFor(userId) {
  return {
    name: `User ${userId}`,
    email: `${userId}@example.com`,
    initials: "US",
    color: "#c2603a",
  }
}

const GLOBAL = { stubs: { "a-table": ATableStub } }

/**
 * Mount AuditTable with a standard two-event fixture.
 * @param {Object} [overrides] - Additional props to spread
 * @returns {import("@vue/test-utils").VueWrapper}
 */
function mountTable(overrides = {}) {
  return mount(AuditTable, {
    props: { events: [event1, event2], actorFor, selectedId: null, ...overrides },
    global: GLOBAL,
  })
}

describe("AuditTable a-table shell", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders .ant-table when events are provided", () => {
    const wrapper = mountTable()
    expect(wrapper.find(".ant-table").exists()).toBe(true)
  })

  it("renders one row per event", () => {
    const wrapper = mountTable()
    expect(wrapper.findAll(".ant-table-tbody .ant-table-row")).toHaveLength(2)
  })

  it("renders column headers: Actor, Action, Category, Timestamp", () => {
    const wrapper = mountTable()
    const headers = wrapper
      .findAll(".ant-table-thead .ant-table-cell")
      .map((el) => el.text().trim())
    expect(headers).toContain("Actor")
    expect(headers).toContain("Action")
    expect(headers).toContain("Category")
    expect(headers).toContain("Timestamp")
  })

  it("renders empty table (no rows) when events is empty", () => {
    const wrapper = mountTable({ events: [] })
    expect(wrapper.findAll(".ant-table-tbody .ant-table-row")).toHaveLength(0)
  })
})

describe("AuditTable row interaction", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("emits 'open' with the event when a row is clicked", async () => {
    const wrapper = mountTable()
    const rows = wrapper.findAll(".ant-table-tbody .ant-table-row")
    await rows[0].trigger("click")
    expect(wrapper.emitted("open")).toBeTruthy()
    expect(wrapper.emitted("open")[0][0]).toMatchObject({ id: "evt_1" })
  })

  it("emits 'open' with the second event when the second row is clicked", async () => {
    const wrapper = mountTable()
    const rows = wrapper.findAll(".ant-table-tbody .ant-table-row")
    await rows[1].trigger("click")
    expect(wrapper.emitted("open")[0][0]).toMatchObject({ id: "evt_2" })
  })

  it("emits 'open' when Enter is pressed on a row (keyboard a11y)", async () => {
    const wrapper = mountTable()
    const rows = wrapper.findAll(".ant-table-tbody .ant-table-row")
    await rows[0].trigger("keydown", { key: "Enter" })
    expect(wrapper.emitted("open")).toBeTruthy()
    expect(wrapper.emitted("open")[0][0]).toMatchObject({ id: "evt_1" })
  })

  it("emits 'open' when Space is pressed on a row (keyboard a11y)", async () => {
    const wrapper = mountTable()
    const rows = wrapper.findAll(".ant-table-tbody .ant-table-row")
    await rows[0].trigger("keydown", { key: " " })
    expect(wrapper.emitted("open")).toBeTruthy()
    expect(wrapper.emitted("open")[0][0]).toMatchObject({ id: "evt_1" })
  })

  it("rows are focusable (tabindex=0)", () => {
    const wrapper = mountTable()
    const rows = wrapper.findAll(".ant-table-tbody .ant-table-row")
    for (const row of rows) {
      expect(row.attributes("tabindex")).toBe("0")
    }
  })
})

describe("AuditTable selected row", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("adds at-row--sel class to the selected row", () => {
    const wrapper = mountTable({ selectedId: "evt_1" })
    const rows = wrapper.findAll(".ant-table-tbody .ant-table-row")
    expect(rows[0].classes()).toContain("at-row--sel")
    expect(rows[1].classes()).not.toContain("at-row--sel")
  })
})
