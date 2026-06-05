import { describe, it, expect } from "vitest"
import { KeyRound, Code, Table, Book, MessageSquare } from "lucide-vue-next"
import { promptIcon } from "@/components/chat/promptIcons"

describe("promptIcon", () => {
  it("maps known keys to Lucide components", () => {
    expect(promptIcon("key")).toBe(KeyRound)
    expect(promptIcon("code")).toBe(Code)
    expect(promptIcon("table")).toBe(Table)
    expect(promptIcon("book")).toBe(Book)
  })

  it("defaults unknown keys to MessageSquare", () => {
    expect(promptIcon("nope")).toBe(MessageSquare)
    expect(promptIcon(undefined)).toBe(MessageSquare)
  })
})
