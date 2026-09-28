import { describe, it, expect } from "vitest"
import { readDroppedItems, filesFromInput, hasDroppedFiles } from "@/utils/droppedEntries"

const fileEntry = (name) => ({
  isFile: true,
  isDirectory: false,
  name,
  file: (ok) => ok(new File(["x"], name)),
})
// readEntries gives children in batches. An empty batch means the end.
const dirEntry = (name, children) => ({
  isFile: false,
  isDirectory: true,
  name,
  createReader() {
    const batches = [children.slice(0, 1), children.slice(1), []]
    return { readEntries: (ok) => ok(batches.shift()) }
  },
})
const transfer = (entries) => ({
  types: ["Files"],
  files: [],
  items: entries.map((e) => ({ kind: "file", webkitGetAsEntry: () => e })),
})

describe("readDroppedItems", () => {
  it("walks dropped folders and keeps the relative paths", async () => {
    const tree = [
      fileEntry("a.md"),
      dirEntry("docs", [fileEntry("b.pdf"), dirEntry("sub", [fileEntry("c.txt")])]),
    ]
    const out = await readDroppedItems(transfer(tree))
    expect(out.map((e) => e.relativePath).sort()).toEqual(["a.md", "docs/b.pdf", "docs/sub/c.txt"])
    expect(out.every((e) => e.file instanceof File)).toBe(true)
  })

  it("uses dataTransfer.files when the browser has no entry support", async () => {
    const file = new File(["x"], "a.md")
    const out = await readDroppedItems({ types: ["Files"], files: [file], items: [] })
    expect(out).toEqual([{ file, relativePath: "a.md" }])
  })
})

describe("filesFromInput and hasDroppedFiles", () => {
  it("uses webkitRelativePath from a folder picker", () => {
    const file = new File(["x"], "b.pdf")
    Object.defineProperty(file, "webkitRelativePath", { value: "docs/b.pdf" })
    expect(filesFromInput([file])).toEqual([{ file, relativePath: "docs/b.pdf" }])
  })

  it("detects a drag of files from the computer", () => {
    expect(hasDroppedFiles({ types: ["Files"] })).toBe(true)
    expect(hasDroppedFiles({ types: ["application/x-ragbot-items"] })).toBe(false)
  })
})
