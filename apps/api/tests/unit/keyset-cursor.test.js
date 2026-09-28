import { describe, it, expect } from "vitest"
import { encodeCursor, decodeCursor, parseLimit } from "../../src/utils/keyset-cursor.js"

const id = "3f2c8a8e-8d7b-4c1e-9d2a-1b2c3d4e5f60"

describe("keyset cursor", () => {
  it("round-trips a cursor", () => {
    const cursor = encodeCursor({ kind: "file", name: "report é/ü.pdf", id })
    expect(cursor).not.toMatch(/[+/=]/)
    expect(decodeCursor(cursor)).toEqual({ kind: "file", name: "report é/ü.pdf", id })
  })

  it("returns null for an empty cursor", () => {
    expect(decodeCursor(undefined)).toBeNull()
    expect(decodeCursor("")).toBeNull()
  })

  it.each([
    "not-base64-json",
    Buffer.from(JSON.stringify({ kind: "other", name: "a", id })).toString("base64url"),
    Buffer.from(JSON.stringify({ kind: "file", name: 5, id })).toString("base64url"),
    Buffer.from(JSON.stringify({ kind: "file", name: "a", id: "nope" })).toString("base64url"),
    Buffer.from("[]").toString("base64url"),
  ])("rejects a bad cursor %#", (value) => {
    expect(() => decodeCursor(value)).toThrow(
      expect.objectContaining({ status: 400, message: "Invalid cursor" }),
    )
  })

  it("parses the limit", () => {
    expect(parseLimit(undefined)).toBe(50)
    expect(parseLimit("200")).toBe(200)
    expect(() => parseLimit("201")).toThrow(expect.objectContaining({ status: 400 }))
    expect(() => parseLimit("0")).toThrow(expect.objectContaining({ status: 400 }))
    expect(() => parseLimit("2.5")).toThrow(expect.objectContaining({ status: 400 }))
  })
})
