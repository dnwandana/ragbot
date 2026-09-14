import { Buffer } from "node:buffer"
import { beforeEach, describe, expect, it, vi } from "vitest"

const sendMock = vi.fn()

// Vitest constructs a mock implementation with Reflect.construct, so these
// implementations must be function expressions, not arrow functions.
vi.mock("@aws-sdk/client-s3", () => ({
  S3Client: vi.fn(function () {
    this.send = sendMock
  }),
  PutObjectCommand: vi.fn(function (input) {
    this.input = input
    this.cmd = "put"
  }),
  DeleteObjectCommand: vi.fn(function (input) {
    this.input = input
    this.cmd = "delete"
  }),
  GetObjectCommand: vi.fn(function (input) {
    this.input = input
    this.cmd = "get"
  }),
}))
vi.mock("@aws-sdk/s3-request-presigner", () => ({ getSignedUrl: vi.fn() }))

const { getObjectBuffer } = await import("../../src/services/storage.js")

describe("getObjectBuffer", () => {
  // A block body is required: Vitest runs a function returned by a hook as a
  // teardown callback, and mockReset() returns the mock itself.
  beforeEach(() => {
    sendMock.mockReset()
  })

  it("returns the object body as a Buffer", async () => {
    sendMock.mockResolvedValue({
      Body: { transformToByteArray: async () => new Uint8Array([104, 105]) },
    })
    const buf = await getObjectBuffer("datasets/x.csv")
    expect(Buffer.isBuffer(buf)).toBe(true)
    expect(buf.toString()).toBe("hi")
    expect(sendMock.mock.calls[0][0].input.Key).toBe("datasets/x.csv")
  })

  it("propagates client errors", async () => {
    sendMock.mockRejectedValue(new Error("NoSuchKey"))
    await expect(getObjectBuffer("missing")).rejects.toThrow("NoSuchKey")
  })
})
