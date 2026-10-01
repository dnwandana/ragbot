import { describe, expect, it } from "vitest"
import { createCitationRegistry } from "../../src/services/citation-registry.js"

const chunk = (id, content = `text ${id}`) => ({ chunk_id: id, content, similarity: 0.5 })

describe("createCitationRegistry", () => {
  it("numbers the first search 1..k", () => {
    const r = createCitationRegistry()
    const out = r.register([chunk("a"), chunk("b"), chunk("c")])
    expect(out.map((c) => c.n)).toEqual([1, 2, 3])
    expect(out[1]).toMatchObject({ chunk_id: "b", content: "text b", n: 2 })
  })

  it("continues the numbers for a second search", () => {
    const r = createCitationRegistry()
    r.register(Array.from({ length: 10 }, (_, i) => chunk(`s${i}`)))
    const out = r.register([chunk("t1"), chunk("t2")])
    expect(out.map((c) => c.n)).toEqual([11, 12])
  })

  it("keeps the first number for a repeated chunk_id", () => {
    const r = createCitationRegistry()
    r.register([chunk("a"), chunk("b")])
    const out = r.register([chunk("b"), chunk("c")])
    expect(out.map((c) => c.n)).toEqual([2, 3])
  })

  it("gives a chunk without chunk_id a new number each time", () => {
    const r = createCitationRegistry()
    const out = r.register([{ content: "x" }, { content: "x" }])
    expect(out.map((c) => c.n)).toEqual([1, 2])
  })

  it("returns the chunk for a number, and undefined for an unknown number", () => {
    const r = createCitationRegistry()
    r.register([chunk("a")])
    expect(r.get(1)).toMatchObject({ chunk_id: "a", n: 1 })
    expect(r.get(2)).toBeUndefined()
    expect(r.get(0)).toBeUndefined()
  })

  it("does not change the input objects", () => {
    const input = chunk("a")
    createCitationRegistry().register([input])
    expect(input).not.toHaveProperty("n")
  })
})
