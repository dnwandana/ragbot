// @vitest-environment node
import { describe, it, expect } from "vitest"
import { routerViewKey } from "@/router/view-key.js"

const newChat = (workspaceId, query = {}) => ({
  name: "NewChat",
  params: { workspaceId },
  query,
  fullPath: `/workspaces/${workspaceId}/conversations/new`,
})

const chat = (workspaceId, conversationId) => ({
  name: "Chat",
  params: { workspaceId, conversationId },
  query: {},
  fullPath: `/workspaces/${workspaceId}/conversations/${conversationId}`,
})

describe("routerViewKey", () => {
  it("gives NewChat and Chat one key inside a workspace", () => {
    // ChatView creates the conversation and replaces the URL mid-send. A key
    // that changes here destroys the view and kills the live stream.
    expect(routerViewKey(newChat("ws1"))).toBe(routerViewKey(chat("ws1", "c1")))
  })

  it("gives two conversations in one workspace the same key", () => {
    expect(routerViewKey(chat("ws1", "c1"))).toBe(routerViewKey(chat("ws1", "c2")))
  })

  it("ignores the query string on a chat route", () => {
    expect(routerViewKey(newChat("ws1", { dataset: "d1" }))).toBe(routerViewKey(newChat("ws1")))
  })

  it("gives each workspace its own key", () => {
    expect(routerViewKey(chat("ws1", "c1"))).not.toBe(routerViewKey(chat("ws2", "c1")))
  })

  it("falls back to the full path for every other route", () => {
    const route = {
      name: "DatasetDetail",
      params: { workspaceId: "ws1", datasetId: "d1" },
      query: {},
      fullPath: "/workspaces/ws1/datasets/d1?tab=files",
    }
    expect(routerViewKey(route)).toBe("/workspaces/ws1/datasets/d1?tab=files")
  })
})
