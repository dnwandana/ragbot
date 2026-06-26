import { parseYouTubeUrl } from "../../src/services/youtube.js"

describe("parseYouTubeUrl", () => {
  it("parses a standard watch URL", () => {
    expect(parseYouTubeUrl("https://www.youtube.com/watch?v=aircAruvnKk")).toEqual({
      videoId: "aircAruvnKk",
      canonicalUrl: "https://www.youtube.com/watch?v=aircAruvnKk",
    })
  })

  it("parses a youtu.be short URL", () => {
    expect(parseYouTubeUrl("https://youtu.be/aircAruvnKk")).toEqual({
      videoId: "aircAruvnKk",
      canonicalUrl: "https://www.youtube.com/watch?v=aircAruvnKk",
    })
  })

  it("ignores a playlist param but keeps the single video", () => {
    expect(parseYouTubeUrl("https://www.youtube.com/watch?v=aircAruvnKk&list=PL123").videoId).toBe(
      "aircAruvnKk",
    )
  })

  it("accepts m. and music. hosts", () => {
    expect(parseYouTubeUrl("https://m.youtube.com/watch?v=aircAruvnKk").videoId).toBe("aircAruvnKk")
    expect(parseYouTubeUrl("https://music.youtube.com/watch?v=aircAruvnKk").videoId).toBe(
      "aircAruvnKk",
    )
  })

  it("rejects a non-YouTube host", () => {
    expect(() => parseYouTubeUrl("https://vimeo.com/12345")).toThrow(/only youtube/i)
  })

  it("rejects a playlist/channel URL with no video id", () => {
    expect(() => parseYouTubeUrl("https://www.youtube.com/playlist?list=PL123")).toThrow(
      /video id/i,
    )
  })

  it("rejects a malformed URL", () => {
    expect(() => parseYouTubeUrl("not a url")).toThrow(/invalid url/i)
  })
})
