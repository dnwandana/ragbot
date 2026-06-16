// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest"
import { setActivePinia, createPinia } from "pinia"
import { useWorkspaces } from "@/composables/useWorkspaces"
import { useWorkspacesStore } from "@/stores/workspaces"

const ROWS = [
  {
    id: "1",
    name: "Beta",
    description: "second",
    created_at: "2026-01-02",
    updated_at: "2026-03-01",
  },
  {
    id: "2",
    name: "Alpha",
    description: "first",
    created_at: "2026-01-03",
    updated_at: "2026-02-01",
  },
  {
    id: "3",
    name: "Gamma",
    description: "support stuff",
    created_at: "2026-01-01",
    updated_at: "2026-04-01",
  },
]

describe("useWorkspaces list state", () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    useWorkspacesStore().workspaces = [...ROWS]
  })

  it("sorts by recently updated by default", () => {
    const { displayedWorkspaces } = useWorkspaces()
    expect(displayedWorkspaces.value.map((w) => w.id)).toEqual(["3", "1", "2"])
  })

  it("sorts by name A–Z", () => {
    const { displayedWorkspaces, sortKey } = useWorkspaces()
    sortKey.value = "name_asc"
    expect(displayedWorkspaces.value.map((w) => w.name)).toEqual(["Alpha", "Beta", "Gamma"])
  })

  it("filters by name or description (case-insensitive)", () => {
    const { displayedWorkspaces, query } = useWorkspaces()
    query.value = "SUPPORT"
    expect(displayedWorkspaces.value.map((w) => w.id)).toEqual(["3"])
  })

  it("sorts by recently created", () => {
    const { displayedWorkspaces, sortKey } = useWorkspaces()
    sortKey.value = "created_desc"
    expect(displayedWorkspaces.value.map((w) => w.id)).toEqual(["2", "1", "3"])
  })
})
