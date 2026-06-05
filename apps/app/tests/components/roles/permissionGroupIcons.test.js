import { describe, it, expect } from "vitest"
import {
  LayoutGrid,
  ShieldCheck,
  Users,
  ClipboardCheck,
  Database,
  FileText,
  Bot,
  MessageSquare,
} from "lucide-vue-next"
import { permissionGroupIcon } from "@/components/roles/permissionGroupIcons"

describe("permissionGroupIcon", () => {
  it("maps known catalog keys to Lucide components", () => {
    expect(permissionGroupIcon("workspace")).toBe(LayoutGrid)
    expect(permissionGroupIcon("roles")).toBe(ShieldCheck)
    expect(permissionGroupIcon("members")).toBe(Users)
    expect(permissionGroupIcon("audit")).toBe(ClipboardCheck)
    expect(permissionGroupIcon("datasets")).toBe(Database)
    expect(permissionGroupIcon("files")).toBe(FileText)
    expect(permissionGroupIcon("agents")).toBe(Bot)
    expect(permissionGroupIcon("conversations")).toBe(MessageSquare)
  })

  it("defaults unknown keys to LayoutGrid", () => {
    expect(permissionGroupIcon("nope")).toBe(LayoutGrid)
    expect(permissionGroupIcon(undefined)).toBe(LayoutGrid)
  })
})
