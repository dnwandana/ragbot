// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest"
import { ref } from "vue"
import { mount, flushPromises } from "@vue/test-utils"

const { fetchAgents } = vi.hoisted(() => ({ fetchAgents: vi.fn() }))

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
    handleDelete: vi.fn(),
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

const STUBS = { "a-skeleton": true, RouterLink: true }

function mountView() {
  return mount(ConversationsListView, { global: { stubs: STUBS } })
}

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
