import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"

const spec = JSON.parse(readFileSync(new URL("../../openapi.json", import.meta.url), "utf8"))
const SHARE = "/api/workspaces/{workspace_id}/conversations/{conversation_id}/share"

describe("openapi share endpoints", () => {
  it("documents the share, export and public share paths", () => {
    expect(Object.keys(spec.paths[SHARE]).toSorted()).toEqual(["delete", "get", "post", "put"])
    expect(
      spec.paths[`${SHARE.replace("/share", "/export")}`].get.parameters.some(
        (p) => p.name === "format",
      ),
    ).toBe(true)
    expect(spec.paths["/api/share/{id}"].get.security).toEqual([])
    expect(spec.components.schemas.ConversationShare.properties.url).toBeDefined()
    expect(spec.components.schemas.ConversationShare.properties.token).toBeUndefined()
    expect(spec.components.schemas.ConversationSnapshot.properties.version.enum).toEqual([1])
    expect(spec.tags.find((t) => t.name === "Permissions").description).toContain("32")
  })
})
