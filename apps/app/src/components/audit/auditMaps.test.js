import { describe, it, expect } from "vitest"
import { Link } from "lucide-vue-next"
import {
  verb,
  entityIcon,
  categoryKey,
  entityTypeLabel,
  actionLabel,
  ENTITY_TYPE_OPTIONS,
  ACTION_OPTIONS,
} from "./auditMaps.js"
import { auditIcon } from "./auditIcons.js"

describe("auditMaps — conversation_share", () => {
  it("composes verbs for the share actions", () => {
    expect(verb("shared", "conversation_share")).toBe("Shared share link")
    expect(verb("unshared", "conversation_share")).toBe("Unshared share link")
    expect(verb("updated", "conversation_share")).toBe("Updated share link")
  })

  it("maps the entity to the conversations category and the link icon", () => {
    expect(categoryKey("conversation_share")).toBe("conversations")
    expect(entityIcon("conversation_share")).toBe("link")
    expect(auditIcon("link")).toBe(Link)
  })

  it("offers the entity and the actions as filter options", () => {
    expect(entityTypeLabel("conversation_share")).toBe("Share link")
    expect(actionLabel("shared")).toBe("Shared")
    expect(actionLabel("unshared")).toBe("Unshared")
    expect(ENTITY_TYPE_OPTIONS).toContainEqual({ value: "conversation_share", label: "Share link" })
    expect(ACTION_OPTIONS.map((o) => o.value)).toEqual(
      expect.arrayContaining(["shared", "unshared"]),
    )
  })
})
