import { describe, it, expect } from "vitest"
import { SOURCE_DETECTORS, detectSource } from "@/components/datasets/sourceDetectors"

describe("SOURCE_DETECTORS", () => {
  it("lists youtube first and a catch-all web detector last", () => {
    expect(SOURCE_DETECTORS[0].key).toBe("youtube")
    const last = SOURCE_DETECTORS[SOURCE_DETECTORS.length - 1]
    expect(last.key).toBe("web")
    expect(last.match("literally anything")).toBe(true)
  })

  it("every detector has the required descriptor fields", () => {
    for (const d of SOURCE_DETECTORS) {
      expect(typeof d.key).toBe("string")
      expect(typeof d.label).toBe("string")
      expect(typeof d.cue).toBe("string")
      expect(typeof d.cueClass).toBe("string")
      expect(d.icon).toBeTruthy()
      expect(typeof d.match).toBe("function")
    }
  })
})

describe("detectSource", () => {
  it("classifies youtube.com and youtu.be as youtube", () => {
    expect(detectSource("https://www.youtube.com/watch?v=aircAruvnKk").key).toBe("youtube")
    expect(detectSource("https://youtu.be/aircAruvnKk").key).toBe("youtube")
  })

  it("classifies a plain web page as web", () => {
    expect(detectSource("https://en.wikipedia.org/wiki/Bitcoin").key).toBe("web")
  })

  it("falls back to web for non-youtube hosts", () => {
    expect(detectSource("https://vimeo.com/1").key).toBe("web")
  })
})
