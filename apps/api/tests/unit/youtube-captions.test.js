import { cleanJson3Captions } from "../../src/services/youtube.js"

const sample = JSON.stringify({
  events: [
    { tStartMs: 0, dDurationMs: 1000 }, // formatting-only event, no segs
    { segs: [{ utf8: "[Music]" }] },
    { segs: [{ utf8: "\n" }] },
    { segs: [{ utf8: "Hello" }, { utf8: " world" }] },
    { segs: [{ utf8: "Hello world" }] }, // rolling duplicate of the prior line
    { segs: [{ utf8: "second line" }] },
  ],
})

describe("cleanJson3Captions", () => {
  it("joins segment text into a single cleaned transcript", () => {
    expect(cleanJson3Captions(sample)).toBe("Hello world second line")
  })

  it("removes consecutive duplicate caption lines", () => {
    expect(cleanJson3Captions(sample).match(/Hello world/g)).toHaveLength(1)
  })

  it("returns an empty string for unparseable input", () => {
    expect(cleanJson3Captions("{not json")).toBe("")
  })

  it("returns an empty string when there are no events", () => {
    expect(cleanJson3Captions(JSON.stringify({}))).toBe("")
  })
})
