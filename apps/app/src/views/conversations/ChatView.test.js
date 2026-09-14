// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { reactive, ref } from "vue"
import { mount, flushPromises } from "@vue/test-utils"

// Reactive route we mutate to drive the conversationId watcher. The vue-router
// mock and the store mocks below close over these consts lazily — the factories
// run when ChatView imports them (at mount), by which point these are defined.
const route = reactive({
  name: "NewChat",
  params: { workspaceId: "ws1", conversationId: undefined },
  query: {},
})

// router.replace mimics real navigation: it flips the reactive route so the
// conversationId watcher fires exactly as it would in the app.
const replace = vi.fn(async ({ name, params }) => {
  route.name = name
  route.params = { ...route.params, conversationId: params.conversationId }
})

// Plain reactive store doubles. fetchConversation is a no-op spy: it leaves
// currentConversation untouched, which is exactly the "stale on re-entry"
// situation the narrowed guard must handle.
const conversationsStore = reactive({
  currentConversation: null,
  fetchConversation: vi.fn(),
  clearCurrentConversation: vi.fn(),
  createConversation: vi.fn(),
})

const chatStore = reactive({
  isStreaming: false,
  currentContent: "",
  thoughts: [],
  observations: [],
  pendingCitations: [],
  charts: [],
  error: null,
  reset: vi.fn(),
})

const sendMessage = vi.fn().mockResolvedValue(undefined)
const abort = vi.fn()

vi.mock("vue-router", async (importOriginal) => ({
  ...(await importOriginal()),
  useRoute: () => route,
  useRouter: () => ({ replace, push: vi.fn() }),
  onBeforeRouteLeave: vi.fn(),
}))

vi.mock("@/stores/conversations", () => ({
  useConversationsStore: () => conversationsStore,
}))

vi.mock("@/stores/chat", () => ({
  useChatStore: () => chatStore,
}))

vi.mock("@/composables/useChat", () => ({
  useChat: () => ({ sendMessage, abort }),
}))

vi.mock("@/composables/useChatActions", () => ({
  useChatActions: () => ({ copyMessage: vi.fn() }),
}))

vi.mock("@/composables/useTheme", () => ({
  useTheme: () => ({ theme: ref("light") }),
}))

vi.mock("@/composables/useSuggestedPrompts", () => ({
  useSuggestedPrompts: () => ({ prompts: ref([]) }),
}))

vi.mock("@/composables/useFormattedTime", () => ({
  useFormattedTime: () => ({ clockTime: () => "12:00", timeZone: ref("UTC") }),
}))

vi.mock("@/api/agents", () => ({
  listAgents: vi.fn().mockResolvedValue({ data: { data: [], pagination: {} } }),
  getAgent: vi.fn().mockResolvedValue({ data: { data: null } }),
}))

vi.mock("@/api/datasets", () => ({
  listDatasets: vi.fn().mockResolvedValue({ data: { data: [], pagination: {} } }),
  getDataset: vi.fn().mockResolvedValue({ data: { data: null } }),
}))

import { getDataset } from "@/api/datasets"
import ChatView from "@/views/conversations/ChatView.vue"
import { groupThreadMessages } from "./chat-thread-grouping.js"

const STUBS = { ChatThread: true, ChatComposer: true, MarkdownRenderer: true }

/**
 * Mount ChatView, let onMounted's async fetches settle, then clear all spy
 * call-history captured during setup/mount so each test asserts from zero.
 */
async function mountFresh() {
  const wrapper = mount(ChatView, { global: { stubs: STUBS } })
  await flushPromises()
  vi.clearAllMocks()
  return wrapper
}

beforeEach(() => {
  vi.clearAllMocks()
  route.name = "NewChat"
  route.params = { workspaceId: "ws1", conversationId: undefined }
  route.query = {}
  conversationsStore.currentConversation = null
  conversationsStore.createConversation.mockResolvedValue({ id: "new1", dataset_ids: [] })
  chatStore.isStreaming = false
  chatStore.currentContent = ""
  chatStore.thoughts = []
  chatStore.observations = []
  chatStore.charts = []
})

describe("ChatView — conversationId watcher guard (Finding 1)", () => {
  it("skips refetch for the just-created conversation, then refetches on later re-entry", async () => {
    const wrapper = await mountFresh() // NewChat route, spies cleared

    // First message: creates the conversation, seeds the store, navigates to Chat.
    await wrapper.vm.onSend("hello")
    await flushPromises()

    // Guard consumed justCreatedId → no abort/reset/refetch for "new1".
    expect(conversationsStore.fetchConversation).not.toHaveBeenCalled()
    expect(chatStore.reset).not.toHaveBeenCalled()
    expect(abort).not.toHaveBeenCalled()
    expect(sendMessage).toHaveBeenCalledWith("hello")

    // Navigate to a different conversation → falls through, refetches + resets.
    route.params = { ...route.params, conversationId: "other1" }
    await flushPromises()
    expect(conversationsStore.fetchConversation).toHaveBeenCalledWith("ws1", "other1")
    expect(chatStore.reset).toHaveBeenCalled()

    // Re-enter "new1": the flag is already consumed, so it now refetches.
    // (Under the old broad guard this was wrongly skipped — the regression.)
    conversationsStore.fetchConversation.mockClear()
    route.params = { ...route.params, conversationId: "new1" }
    await flushPromises()
    expect(conversationsStore.fetchConversation).toHaveBeenCalledWith("ws1", "new1")
  })
})

describe("ChatView — new-chat re-entry without a remount", () => {
  // resolveSelectedDatasets drops an id the workspace cannot read, so the query
  // ids only survive when getDataset returns a dataset for them.
  beforeEach(() => {
    getDataset.mockImplementation(async (_ws, id) => ({ data: { data: { id, name: id } } }))
  })

  afterEach(() => {
    getDataset.mockReset().mockResolvedValue({ data: { data: null } })
  })

  // The router keys the chat routes by workspace, so ChatView survives every
  // navigation inside one workspace. Re-entry must re-read the query itself.
  it("re-reads the dataset and draft query when the new-chat route is re-entered", async () => {
    route.query = { dataset: "d1", q: "first draft" }
    const wrapper = mount(ChatView, { global: { stubs: STUBS } })
    await flushPromises()
    expect(wrapper.vm.pendingDatasetIds).toEqual(["d1"])
    expect(wrapper.vm.pendingDraft).toBe("first draft")

    // Same route name, different query — no remount happens.
    route.query = { dataset: "d2", q: "second draft" }
    await flushPromises()
    expect(wrapper.vm.pendingDatasetIds).toEqual(["d2"])
    expect(wrapper.vm.pendingDraft).toBe("second draft")
  })

  it("re-initialises when the user leaves a conversation for the new-chat route", async () => {
    route.name = "Chat"
    route.params = { workspaceId: "ws1", conversationId: "c1" }
    const wrapper = mount(ChatView, { global: { stubs: STUBS } })
    await flushPromises()

    route.name = "NewChat"
    route.params = { workspaceId: "ws1", conversationId: undefined }
    route.query = { dataset: "d3" }
    await flushPromises()
    expect(wrapper.vm.pendingDatasetIds).toEqual(["d3"])
  })
})

describe("ChatView — loadingLabel pluralization (Findings 2 & 3)", () => {
  it.each([
    [[], "Searching…"],
    [["d1"], "Searching 1 source…"],
    [["d1", "d2"], "Searching 2 sources…"],
  ])("renders %j datasets as %s for an existing conversation", async (datasetIds, expected) => {
    // Existing (non-new) conversation: linkedDatasetIds reads dataset_ids from
    // the loaded conversation. The create endpoint echoes dataset_ids, so the
    // first-message label is correct too (Finding 3 — no code change needed).
    route.name = "Chat"
    route.params = { workspaceId: "ws1", conversationId: "c1" }
    conversationsStore.currentConversation = {
      id: "c1",
      dataset_ids: datasetIds,
      messages: [],
    }
    const wrapper = mount(ChatView, { global: { stubs: STUBS } })
    await flushPromises()
    expect(wrapper.vm.loadingLabel).toBe(expected)
  })
})

describe("ChatView — onSend seeds the conversation before navigating (Finding 2)", () => {
  it("sets currentConversation with the new id before router.replace resolves", async () => {
    const wrapper = await mountFresh()

    // Capture the store state at the moment navigation runs, proving the seed
    // happens before the route changes (so the optimistic message has a home).
    let seededIdAtNav = null
    replace.mockImplementationOnce(async ({ name, params }) => {
      seededIdAtNav = conversationsStore.currentConversation?.id
      route.name = name
      route.params = { ...route.params, conversationId: params.conversationId }
    })

    await wrapper.vm.onSend("hi")
    await flushPromises()

    expect(seededIdAtNav).toBe("new1")
    expect(conversationsStore.currentConversation.id).toBe("new1")
    expect(conversationsStore.currentConversation.messages).toEqual([])
  })
})

const row = (step_type, content_json = null, content = "") => ({
  id: step_type + Math.random(),
  step_type,
  content,
  content_json,
})

describe("groupThreadMessages", () => {
  it("attaches thought/observation pairs and charts to the next answer", () => {
    const thread = [
      row("input", null, "sum it"),
      row("thought", JSON.stringify({ tool: "execute_code", code: "print(1)", file_ids: [] })),
      row(
        "observation",
        JSON.stringify({ stdout: "1", stderr: "", error: null, charts: [{ type: "bar" }] }),
      ),
      row("final_answer", null, "The sum is 1"),
    ]
    const grouped = groupThreadMessages(thread)
    expect(grouped).toHaveLength(2)
    expect(grouped[1].steps).toHaveLength(1)
    expect(grouped[1].steps[0].thought.code).toBe("print(1)")
    expect(grouped[1].steps[0].observation.stdout).toBe("1")
    expect(grouped[1].charts).toEqual([{ type: "bar" }])
  })

  it("keeps search thoughts out of execution steps", () => {
    const thread = [
      row("input", null, "q"),
      row("thought", JSON.stringify({ tool_call: { name: "search" } })),
      row("observation", JSON.stringify({ results: [] })),
      row("final_answer", null, "a"),
    ]
    const grouped = groupThreadMessages(thread)
    expect(grouped[1].steps).toHaveLength(0)
  })

  it("parses content_json that arrives as an object (jsonb)", () => {
    const thread = [
      row("thought", { tool: "execute_code", code: "x", file_ids: [] }),
      row("observation", { stdout: "", stderr: "", error: null, charts: [] }),
      row("final_answer", null, "a"),
    ]
    expect(groupThreadMessages(thread)[0].steps).toHaveLength(1)
  })

  it("marks a thought with no observation yet as running", () => {
    const thread = [
      row("input", null, "q"),
      row("thought", { tool: "execute_code", code: "x", file_ids: [] }),
    ]
    const grouped = groupThreadMessages(thread)
    expect(grouped).toHaveLength(1)
    expect(grouped[0].steps).toHaveLength(0)
  })

  it("keeps plain messages without a step_type", () => {
    const grouped = groupThreadMessages([{ id: "m1", content: "hi" }])
    expect(grouped).toHaveLength(1)
    expect(grouped[0].steps).toEqual([])
    expect(grouped[0].charts).toEqual([])
  })
})

describe("ChatView — live execution steps on the streaming message", () => {
  it("pairs execute_code thoughts with observations and exposes chart specs", async () => {
    route.name = "Chat"
    route.params = { workspaceId: "ws1", conversationId: "c1" }
    conversationsStore.currentConversation = { id: "c1", dataset_ids: [], messages: [] }
    const wrapper = mount(ChatView, { global: { stubs: STUBS } })
    await flushPromises()

    chatStore.isStreaming = true
    chatStore.thoughts = [
      { content: "Searching: x", tool_call: { name: "search_knowledge_base" } },
      { tool: "execute_code", code: "print(1)", file_ids: [] },
    ]
    chatStore.observations = [{ content: "excerpt", sources: [] }]
    chatStore.charts = [{ message_id: "o1", index: 0, spec: { type: "bar" } }]
    await flushPromises()

    const streaming = wrapper.vm.displayMessages.at(-1)
    expect(streaming.id).toBe("streaming")
    expect(streaming.steps).toHaveLength(1)
    expect(streaming.steps[0].thought.code).toBe("print(1)")
    // The second observation has not arrived — the step renders as running.
    expect(streaming.steps[0].observation).toBe(null)
    expect(streaming.charts).toEqual([{ type: "bar" }])
  })
})
