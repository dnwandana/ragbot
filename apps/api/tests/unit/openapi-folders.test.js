import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"

const spec = JSON.parse(readFileSync(new URL("../../openapi.json", import.meta.url), "utf8"))
const DS = "/api/workspaces/{workspace_id}/datasets/{dataset_id}"
const op = (path, method) => spec.paths[`${DS}${path}`]?.[method]

describe("openapi folder endpoints", () => {
  it("documents every folder and item operation", () => {
    expect(op("/items", "get").operationId).toBe("listItems")
    expect(op("/items", "get").parameters.map((p) => p.name ?? p.$ref)).toEqual(
      expect.arrayContaining(["folder_id", "cursor", "q", "status"]),
    )
    expect(op("/items/move", "post").responses).toHaveProperty("409")
    expect(op("/items/move", "post").responses).toHaveProperty("422")
    expect(op("/items/summary", "post").operationId).toBe("summarizeItems")
    expect(op("/items/delete", "post").description).toContain("file:delete")
    expect(op("/folders", "post").responses).toHaveProperty("201")
    expect(op("/folders/ensure-paths", "post").operationId).toBe("ensureFolderPaths")
    expect(op("/folders/{folder_id}", "put").operationId).toBe("renameFolder")
    expect(op("/files/status", "post").operationId).toBe("getFileStatuses")
  })

  it("adds folder_id and path to the file schemas", () => {
    const s = spec.components.schemas
    expect(s.DatasetFile.properties.folder_id.nullable).toBe(true)
    expect(s.ScrapeUrlRequest.properties.folder_id).toBeDefined()
    expect(s.YoutubeRequest.properties.folder_id).toBeDefined()
    expect(s.DatasetFileWithSignedUrl.allOf[1].properties.path.items.$ref).toBe(
      "#/components/schemas/PathSegment",
    )
    expect(
      op("/files/upload", "post").requestBody.content["multipart/form-data"].schema.properties
        .folder_id,
    ).toBeDefined()
    expect(s.MoveItemsRequest.required).toEqual(["target_folder_id"])
    expect(s.FileStatusRequest.properties.ids.maxItems).toBe(100)
    expect(s.EnsurePathsRequest.properties.paths.maxItems).toBe(1000)
  })

  it("gives 422 only to create, move, and ensure-paths", () => {
    const with422 = Object.entries(spec.paths)
      .flatMap(([path, ops]) =>
        Object.entries(ops).map(([method, o]) => [`${method} ${path}`, o.responses]),
      )
      .filter(([, responses]) => responses && "422" in responses)
      .map(([key]) => key)
    expect(with422.toSorted()).toEqual(
      [`post ${DS}/folders`, `post ${DS}/folders/ensure-paths`, `post ${DS}/items/move`].toSorted(),
    )
  })
})
