import { describe, it, expect } from "vitest"
import { diffRows, memberFilterOptions, shortId } from "@/components/audit/auditMaps"

describe("diffRows", () => {
  it("renders a pure diff field as before → after", () => {
    expect(diffRows({ name: { from: "A", to: "B" } })).toEqual([
      { field: "name", before: "A", after: "B" },
    ])
  })

  it("supports before/after key naming", () => {
    expect(diffRows({ name: { before: "A", after: "B" } })).toEqual([
      { field: "name", before: "A", after: "B" },
    ])
  })

  it("renders a scalar field with an em-dash before value (the bug)", () => {
    expect(diffRows({ name: { from: "A", to: "B" }, status: "active" })).toEqual([
      { field: "name", before: "A", after: "B" },
      { field: "status", before: "—", after: "active" },
    ])
  })

  it("renders an all-scalar changes object", () => {
    expect(diffRows({ status: "active" })).toEqual([
      { field: "status", before: "—", after: "active" },
    ])
  })

  it("renders a one-sided diff field (only 'to') with em-dash before", () => {
    expect(diffRows({ name: { to: "B" } })).toEqual([{ field: "name", before: "—", after: "B" }])
  })

  it("renders a null field value as em-dash after", () => {
    expect(diffRows({ status: null })).toEqual([{ field: "status", before: "—", after: "—" }])
  })

  it("formats array and object scalar values", () => {
    expect(diffRows({ tags: ["a", "b"], meta: { x: 1 } })).toEqual([
      { field: "tags", before: "—", after: "a, b" },
      { field: "meta", before: "—", after: '{"x":1}' },
    ])
  })

  it("returns null for null or non-object input", () => {
    expect(diffRows(null)).toBeNull()
    expect(diffRows("nope")).toBeNull()
  })

  it("returns null for an empty changes object", () => {
    expect(diffRows({})).toBeNull()
  })
})

describe("memberFilterOptions", () => {
  it("maps members with a user_id to value/label", () => {
    const members = [{ user_id: "u1", full_name: "Ada Lovelace", email: "ada@x.com" }]
    expect(memberFilterOptions(members)).toEqual([{ value: "u1", label: "Ada Lovelace" }])
  })

  it("falls back to email when full_name is missing", () => {
    const members = [{ user_id: "u2", email: "grace@x.com" }]
    expect(memberFilterOptions(members)).toEqual([{ value: "u2", label: "grace@x.com" }])
  })

  it("excludes members without a user_id (pending invites)", () => {
    const members = [
      { user_id: "u1", full_name: "Ada", email: "ada@x.com" },
      { user_id: null, id: "m99", email: "pending@x.com" },
    ]
    expect(memberFilterOptions(members)).toEqual([{ value: "u1", label: "Ada" }])
  })

  it("falls back to a short id when both full_name and email are absent", () => {
    const members = [{ user_id: "11111111-2222-3333-4444-555555555555" }]
    expect(memberFilterOptions(members)).toEqual([
      {
        value: "11111111-2222-3333-4444-555555555555",
        label: shortId("11111111-2222-3333-4444-555555555555"),
      },
    ])
  })

  it("returns an empty array for null/undefined input", () => {
    expect(memberFilterOptions(null)).toEqual([])
    expect(memberFilterOptions(undefined)).toEqual([])
  })
})
