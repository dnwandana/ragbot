import { afterEach, vi } from "vitest"
import { transcribeAudio } from "../../src/services/openrouter.js"

afterEach(() => vi.restoreAllMocks())

describe("transcribeAudio", () => {
  it("posts base64 audio and returns the transcript text", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(JSON.stringify({ text: "hello world" }), { status: 200 }))

    const text = await transcribeAudio("BASE64", "mp3", "openai/whisper-large-v3-turbo")

    expect(text).toBe("hello world")
    const [url, opts] = fetchMock.mock.calls[0]
    expect(url).toContain("/audio/transcriptions")
    const body = JSON.parse(opts.body)
    expect(body).toMatchObject({
      model: "openai/whisper-large-v3-turbo",
      input_audio: { data: "BASE64", format: "mp3" },
    })
  })

  it("throws on a non-2xx response", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("nope", { status: 500 }))
    await expect(transcribeAudio("BASE64", "mp3")).rejects.toThrow(/transcription error 500/i)
  })
})
