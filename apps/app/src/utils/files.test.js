import { describe, it, expect } from "vitest"
import { fileType, isYouTubeUrl } from "@/utils/files"

describe("isYouTubeUrl", () => {
  it("accepts youtube.com and youtu.be", () => {
    expect(isYouTubeUrl("https://www.youtube.com/watch?v=aircAruvnKk")).toBe(true)
    expect(isYouTubeUrl("https://youtu.be/aircAruvnKk")).toBe(true)
  })
  it("rejects other hosts and junk", () => {
    expect(isYouTubeUrl("https://vimeo.com/1")).toBe(false)
    expect(isYouTubeUrl("not a url")).toBe(false)
  })
})

describe("fileType", () => {
  it("classifies youtube URLs as youtube", () => {
    expect(fileType("https://www.youtube.com/watch?v=aircAruvnKk")).toBe("youtube")
    expect(fileType("https://youtu.be/aircAruvnKk")).toBe("youtube")
  })
  it("still classifies pdf and md", () => {
    expect(fileType("a.pdf")).toBe("pdf")
    expect(fileType("a.md")).toBe("md")
  })
  it("classifies a youtube source by metadata even when the filename is a title", () => {
    // After the filename is promoted from the URL to the video title, the string
    // is no longer a URL — source_type is the authoritative signal.
    expect(fileType("Kenapa Kalian Wajib Buat Aplikasi Gateway", "youtube")).toBe("youtube")
  })
  it("prefers the youtube source type over filename heuristics", () => {
    expect(fileType("a.pdf", "youtube")).toBe("youtube")
  })
  it("classifies the five tabular extensions as tabular", () => {
    // Same set as TABULAR_EXTENSIONS in the API controller. These files skip
    // LlamaIndex and get profiled in the sandbox instead.
    expect(fileType("sales.csv")).toBe("tabular")
    expect(fileType("sales.tsv")).toBe("tabular")
    expect(fileType("sales.xls")).toBe("tabular")
    expect(fileType("sales.xlsx")).toBe("tabular")
    expect(fileType("sales.json")).toBe("tabular")
  })
  it("classifies a tabular source by metadata even when the filename has no extension", () => {
    expect(fileType("quarterly report", "tabular")).toBe("tabular")
  })
})
