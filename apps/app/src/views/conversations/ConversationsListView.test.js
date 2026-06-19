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

const STUBS = { "a-skeleton": true, RouterLink: true, "a-modal": AModalStub }

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
