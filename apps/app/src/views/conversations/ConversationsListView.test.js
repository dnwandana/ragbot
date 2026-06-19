// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest"
import { ref } from "vue"
import { mount, flushPromises } from "@vue/test-utils"

const { fetchAgents } = vi.hoisted(() => ({ fetchAgents: vi.fn() }))
const { handleDelete } = vi.hoisted(() => ({ handleDelete: vi.fn() }))

// Plain ref (not vi.hoisted, which runs before imports): the mock factory below
// closes over it lazily, so it's initialized by the time the mock is consumed.
const conversations = ref([])

vi.mock("vue-router", async (importOriginal) => ({
  ...(await importOriginal()),
  useRoute: () => ({ params: { workspaceId: "ws1" } }),
  useRouter: () => ({ push: vi.fn() }),
}))

vi.mock("@/composables/useConversations", () => ({
  useConversations: () => ({
    conversations,
    loading: ref(false),
    handleDelete,
    fetchConversations: vi.fn().mockResolvedValue(undefined),
  }),
}))

vi.mock("@/stores/agents", () => ({
  useAgentsStore: () => ({ agents: [], fetchAgents }),
}))

// Pass-through calendarDaysAgo: the test feeds each conversation a numeric
// `created_at` standing in for "days ago", so we exercise the bucketing
// thresholds in `grouped` directly (calendarDaysAgo's own math is covered in
// utils/time.test.js).
vi.mock("@/composables/useFormattedTime", () => ({
  useFormattedTime: () => ({
    relativeTime: () => "now",
    calendarDaysAgo: (days) => days,
  }),
}))

import ConversationsListView from "@/views/conversations/ConversationsListView.vue"

// a-table stub: renders a real .ant-table DOM tree with thead (conditional on
// showHeader), tbody, and one tr per dataSource entry. Invokes customRow(record)
// to spread attrs (tabindex, onClick, onKeydown) onto each tr — exercising the
// real component's row handlers.
const ATableStub = {
  props: {
    columns: { type: Array, default: () => [] },
    dataSource: { type: Array, default: () => [] },
    rowKey: [Function, String],
    pagination: { type: [Boolean, Object], default: false },
    showHeader: { type: Boolean, default: true },
    customRow: { type: Function, default: null },
    loading: { type: Boolean, default: false },
  },
  template: `
    <div class="ant-table">
      <table>
        <thead v-if="showHeader" class="ant-table-thead">
          <tr>
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

// Functional a-modal stub: always rendered (so findComponent resolves), exposes
// the `open` prop and re-emits ok/cancel. This lets the tests assert the real
// template wiring (`:open="!!deleteTarget"` and `@ok="confirmDelete"`) instead of
// reaching into the component instance.
const AModalStub = {
  name: "AModal",
  props: ["open"],
  emits: ["ok", "cancel"],
  template: '<div class="a-modal-stub"><slot /></div>',
}

const STUBS = {
  "a-skeleton": true,
  "a-table": ATableStub,
  RouterLink: true,
  "a-modal": AModalStub,
}

function mountView() {
  return mount(ConversationsListView, { global: { stubs: STUBS } })
}

describe("ConversationsListView delete confirmation", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    fetchAgents.mockResolvedValue([])
  })

  it("opens the confirm modal instead of deleting when the trash icon is clicked", async () => {
    conversations.value = [{ id: "c1", created_at: 0, title: "Chat" }]
    const wrapper = mountView()
    await flushPromises()

    const modal = wrapper.findComponent(AModalStub)
    expect(modal.props("open")).toBe(false)

    await wrapper.find(".conv-more").trigger("click")
    expect(handleDelete).not.toHaveBeenCalled()
    expect(modal.props("open")).toBe(true)
  })

  it("deletes only after the modal's confirm (ok) fires", async () => {
    conversations.value = [{ id: "c1", created_at: 0, title: "Chat" }]
    const wrapper = mountView()
    await flushPromises()

    await wrapper.find(".conv-more").trigger("click")
    const modal = wrapper.findComponent(AModalStub)
    modal.vm.$emit("ok")
    await flushPromises()

    expect(handleDelete).toHaveBeenCalledWith("c1")
    // The modal closes again once the deletion resolves.
    expect(modal.props("open")).toBe(false)
  })

  it("cancel closes the modal without deleting", async () => {
    conversations.value = [{ id: "c1", created_at: 0, title: "Chat" }]
    const wrapper = mountView()
    await flushPromises()

    await wrapper.find(".conv-more").trigger("click")
    const modal = wrapper.findComponent(AModalStub)
    modal.vm.$emit("cancel")
    await flushPromises()

    expect(handleDelete).not.toHaveBeenCalled()
    expect(modal.props("open")).toBe(false)
  })
})

describe("ConversationsListView — a-table structure", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    fetchAgents.mockResolvedValue([])
  })

  it("renders an a-table (.ant-table) with the conversations data", async () => {
    conversations.value = [{ id: "c1", created_at: 0, title: "Chat" }]
    const wrapper = mountView()
    await flushPromises()
    expect(wrapper.find(".ant-table").exists()).toBe(true)
  })

  it("renders one row per conversation in the tbody", async () => {
    conversations.value = [
      { id: "c1", created_at: 0, title: "First" },
      { id: "c2", created_at: 1, title: "Second" },
    ]
    const wrapper = mountView()
    await flushPromises()
    // findAll(".ant-table-tbody tr") spans ALL per-group tables in the DOM
    // (one table per date group), so the total row count equals the total
    // conversation count regardless of how many groups there are.
    expect(wrapper.findAll(".ant-table-tbody tr")).toHaveLength(2)
  })

  it("renders a .group-label for each non-empty date group", async () => {
    conversations.value = [
      { id: "c1", created_at: 0, title: "Today chat" },
      { id: "c2", created_at: 3, title: "This week chat" },
    ]
    const wrapper = mountView()
    await flushPromises()
    const labels = wrapper.findAll(".group-label").map((el) => el.text().trim())
    expect(labels).toContain("Today")
    expect(labels).toContain("Earlier this week")
  })

  it("renders the conversation title inside the name cell", async () => {
    conversations.value = [{ id: "c1", created_at: 0, title: "My Chat" }]
    const wrapper = mountView()
    await flushPromises()
    expect(wrapper.find(".conv-title").text()).toContain("My Chat")
  })
})

describe("ConversationsListView calendar-day grouping", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    fetchAgents.mockResolvedValue([])
  })

  it("buckets conversations into Today / Earlier this week / Older by calendar day", async () => {
    conversations.value = [
      { id: "today", created_at: 0 },
      { id: "yesterday", created_at: 1 },
      { id: "six-days", created_at: 6 },
      { id: "seven-days", created_at: 7 },
      { id: "no-date", created_at: null },
    ]
    const wrapper = mountView()
    await flushPromises()

    const grouped = wrapper.vm.grouped
    const byLabel = Object.fromEntries(grouped.map((g) => [g.label, g.items.map((c) => c.id)]))

    expect(byLabel["Today"]).toEqual(["today"])
    expect(byLabel["Earlier this week"]).toEqual(["yesterday", "six-days"])
    // 7 calendar days ago falls out of "this week"; a null date lands in Older too.
    expect(byLabel["Older"]).toEqual(["seven-days", "no-date"])
  })

  it("omits empty groups", async () => {
    conversations.value = [{ id: "a", created_at: 0 }]
    const wrapper = mountView()
    await flushPromises()

    expect(wrapper.vm.grouped.map((g) => g.label)).toEqual(["Today"])
  })
})
