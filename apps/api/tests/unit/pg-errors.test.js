import { describe, it, expect } from "vitest"
import { isUniqueViolation } from "../../src/utils/pg-errors.js"
import { uuidArray } from "../../src/utils/pg-array.js"
import { HTTP_STATUS_CODE } from "../../src/utils/constant.js"

describe("isUniqueViolation", () => {
  it("matches SQLSTATE 23505 and the constraint name", () => {
    const err = { code: "23505", constraint: "dataset_folders_sibling_name" }
    expect(isUniqueViolation(err, "dataset_folders_sibling_name")).toBe(true)
    expect(isUniqueViolation(err)).toBe(true)
    expect(isUniqueViolation(err, "other")).toBe(false)
    expect(isUniqueViolation({ code: "23503" })).toBe(false)
    expect(isUniqueViolation(undefined)).toBe(false)
  })

  it("builds a uuid[] literal and rejects a value that is not a UUID", () => {
    const id = "3f2c8a8e-8d7b-4c1e-9d2a-1b2c3d4e5f60"
    expect(uuidArray([id, id])).toBe(`{${id},${id}}`)
    expect(uuidArray([])).toBe("{}")
    expect(() => uuidArray(["x'); DROP TABLE t; --"])).toThrow("Not a UUID")
  })

  it("has the 422 status code", () => {
    expect(HTTP_STATUS_CODE.UNPROCESSABLE_ENTITY).toBe(422)
  })
})
