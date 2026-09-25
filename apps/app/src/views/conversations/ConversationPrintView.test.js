// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { mount, flushPromises } from "@vue/test-utils"

const { getConversation, getAgent, workspacesStore } = vi.hoisted(() => ({
  getConversation: vi.fn(),
  getAgent: vi.fn(),
  workspacesStore: { currentWorkspace: null, fetchWorkspaceById: vi.fn() },
}))

vi.mock("vue-router", async (importOriginal) => ({
  ...(await importOriginal()),
  useRoute: () => ({ params: { workspaceId: "ws1", conversationId: "c1" } }),
}))
vi.mock("@/api/conversations", () => ({ getConversation }))
vi.mock("@/api/agents", () => ({ getAgent }))
vi.mock("@/stores/workspaces", () => ({ useWorkspacesStore: () => workspacesStore }))

import ConversationPrintView from "./ConversationPrintView.vue"

const conversation = {
  id: "c1",
  title: "Q3 revenue",
  agent_id: "a1",
  messages: [
    {
      id: "m1",
      role: "user",
      step_type: "input",
      content: "hi",
      created_at: "2026-09-18T09:00:00.000Z",
    },
  ],
  citations: [],
}
const ReadonlyThread = {
  name: "ReadonlyThread",
  props: ["snapshot"],
  emits: ["ready"],
  template: `<div class="thread" />`,
}

const mountView = async () => {
  const wrapper = mount(ConversationPrintView, { global: { stubs: { ReadonlyThread } } })
  await flushPromises()
  return wrapper
}

describe("ConversationPrintView", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal("print", vi.fn())
    getConversation.mockResolvedValue({ data: { data: conversation } })
    getAgent.mockResolvedValue({ data: { data: { id: "a1", name: "Sales analyst" } } })
    workspacesStore.currentWorkspace = { id: "ws1", name: "Acme" }
  })
  afterEach(() => vi.unstubAllGlobals())

  it("loads the conversation and prints once after the thread is ready", async () => {
    const wrapper = await mountView()
    expect(getConversation).toHaveBeenCalledWith("ws1", "c1")
    const thread = wrapper.findComponent({ name: "ReadonlyThread" })
    expect(thread.props("snapshot").title).toBe("Q3 revenue")
    expect(thread.props("snapshot").workspace_name).toBe("Acme")
    expect(thread.props("snapshot").agent_name).toBe("Sales analyst")
    expect(window.print).not.toHaveBeenCalled()
    thread.vm.$emit("ready")
    thread.vm.$emit("ready")
    await flushPromises()
    expect(window.print).toHaveBeenCalledTimes(1)
  })

  it("fetches the workspace when the store has none", async () => {
    workspacesStore.currentWorkspace = null
    workspacesStore.fetchWorkspaceById.mockImplementation(async () => {
      workspacesStore.currentWorkspace = { id: "ws1", name: "Fetched" }
    })
    const wrapper = await mountView()
    expect(workspacesStore.fetchWorkspaceById).toHaveBeenCalledWith("ws1")
    expect(wrapper.findComponent({ name: "ReadonlyThread" }).props("snapshot").workspace_name).toBe(
      "Fetched",
    )
  })

  it("shows an error and never prints when the load fails", async () => {
    getConversation.mockRejectedValue(new Error("boom"))
    const wrapper = await mountView()
    expect(wrapper.text()).toContain("Could not load this conversation.")
    expect(wrapper.findComponent({ name: "ReadonlyThread" }).exists()).toBe(false)
    expect(window.print).not.toHaveBeenCalled()
  })
})
