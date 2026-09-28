import { describe, it, expect } from "vitest"
import { DRAG_TYPE, itemKey, splitKeys, writeDragKeys, readDragKeys } from "./itemKeys"

const transfer = () => {
  const data = {}
  return {
    types: [],
    setData(t, v) {
      data[t] = v
      this.types.push(t)
    },
    getData: (t) => data[t] ?? "",
  }
}

describe("itemKeys", () => {
  it("builds and splits keys", () => {
    expect(itemKey({ kind: "folder", id: "a" })).toBe("folder:a")
    expect(splitKeys(["folder:a", "file:b", "folder:c"])).toEqual({
      folder_ids: ["a", "c"],
      file_ids: ["b"],
    })
  })

  it("round-trips drag keys and ignores a drag from outside the app", () => {
    const dt = transfer()
    writeDragKeys(dt, ["folder:a"])
    expect(dt.types).toContain(DRAG_TYPE)
    expect(readDragKeys(dt)).toEqual(["folder:a"])
    expect(readDragKeys(transfer())).toBeNull()
  })
})
