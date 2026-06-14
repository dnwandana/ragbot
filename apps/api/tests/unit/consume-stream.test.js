import { consumeStream } from "../../src/controllers/chat.js"

/** Build a ReadableStream that emits the given byte chunks then closes. */
const streamOf = (chunks) => {
  const enc = new TextEncoder()
  let i = 0
  return new ReadableStream({
    pull(controller) {
      if (i < chunks.length) controller.enqueue(enc.encode(chunks[i++]))
      else controller.close()
    },
  })
}

const tokenChunk = (content) =>
  `data: ${JSON.stringify({ choices: [{ delta: { content }, finish_reason: null }] })}\n\n`

describe("consumeStream", () => {
  it("forwards all text deltas when not aborted", async () => {
    const tokens = []
    const stream = streamOf([tokenChunk("Hello "), tokenChunk("world"), "data: [DONE]\n\n"])
    const result = await consumeStream(stream, (t) => tokens.push(t))
    expect(tokens.join("")).toBe("Hello world")
    expect(result.toolCall).toBeNull()
  })

  it("stops early without forwarding tokens when already aborted", async () => {
    const tokens = []
    const stream = streamOf([tokenChunk("should-not-read")])
    const controller = new AbortController()
    controller.abort()
    const result = await consumeStream(stream, (t) => tokens.push(t), controller.signal)
    expect(tokens).toEqual([])
    expect(result.finishReason).toBeNull()
  })

  it("returns partial tokens without throwing when aborted mid-stream", async () => {
    const tokens = []
    const controller = new AbortController()
    // Abort after the first chunk is delivered, before the second is read.
    const stream = streamOf([tokenChunk("first"), tokenChunk("second"), "data: [DONE]\n\n"])
    const onToken = (t) => {
      tokens.push(t)
      controller.abort()
    }
    const result = await consumeStream(stream, onToken, controller.signal)
    expect(tokens).toEqual(["first"])
    expect(result.finishReason).toBeNull()
  })
})
