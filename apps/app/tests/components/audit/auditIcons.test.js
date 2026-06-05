import { describe, it, expect } from "vitest"
import {
  Database,
  MessageSquare,
  Users,
  Bot,
  LayoutGrid,
  FileText,
  User,
  ShieldCheck,
  Paperclip,
} from "lucide-vue-next"
import { auditIcon } from "@/components/audit/auditIcons"

describe("auditIcon", () => {
  it("maps known keys to Lucide components", () => {
    expect(auditIcon("database")).toBe(Database)
    expect(auditIcon("message")).toBe(MessageSquare)
    expect(auditIcon("team")).toBe(Users)
    expect(auditIcon("robot")).toBe(Bot)
    expect(auditIcon("appstore")).toBe(LayoutGrid)
    expect(auditIcon("file")).toBe(FileText)
    expect(auditIcon("user")).toBe(User)
    expect(auditIcon("safety")).toBe(ShieldCheck)
    expect(auditIcon("paperclip")).toBe(Paperclip)
  })

  it("defaults unknown keys to FileText", () => {
    expect(auditIcon("nope")).toBe(FileText)
    expect(auditIcon(undefined)).toBe(FileText)
  })
})
