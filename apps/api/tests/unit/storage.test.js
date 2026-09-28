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
  DeleteObjectsCommand: vi.fn(function (input) {
    this.input = input
    this.cmd = "deleteMany"
  }),
}))
vi.mock("@aws-sdk/s3-request-presigner", () => ({ getSignedUrl: vi.fn() }))

const { getObjectBuffer, deleteObjects } = await import("../../src/services/storage.js")

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

describe("deleteObjects", () => {
  beforeEach(() => {
    sendMock.mockReset()
  })

  it("sends nothing when no key is left", async () => {
    expect(await deleteObjects([null, undefined, ""])).toEqual({ failed: [] })
    expect(sendMock).not.toHaveBeenCalled()
  })

  it("sends quiet batches of at most 1000 unique keys", async () => {
    sendMock.mockResolvedValue({})
    const keys = Array.from({ length: 2500 }, (_, i) => `k/${i}`)
    await deleteObjects([...keys, "k/0"])
    const sizes = sendMock.mock.calls.map(([cmd]) => cmd.input.Delete.Objects.length)
    expect(sizes).toEqual([1000, 1000, 500])
    const first = sendMock.mock.calls[0][0]
    expect(first.cmd).toBe("deleteMany")
    expect(first.input.Delete.Quiet).toBe(true)
    expect(first.input.Delete.Objects[0]).toEqual({ Key: "k/0" })
  })

  it("returns the keys that R2 reports as failed", async () => {
    sendMock.mockResolvedValue({ Errors: [{ Key: "b", Code: "AccessDenied" }] })
    expect(await deleteObjects(["a", "b"])).toEqual({ failed: ["b"] })
  })

  it("treats a rejected batch as failed and continues with the next batch", async () => {
    sendMock.mockRejectedValueOnce(new Error("timeout")).mockResolvedValueOnce({})
    const keys = Array.from({ length: 1001 }, (_, i) => `k/${i}`)
    const { failed } = await deleteObjects(keys)
    expect(failed).toHaveLength(1000)
    expect(sendMock).toHaveBeenCalledTimes(2)
  })
})
