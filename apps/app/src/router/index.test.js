// apps/app/src/router/index.test.js
// @vitest-environment jsdom
import { describe, it, expect } from "vitest"
import routerSource from "./index.js?raw"
import router from "./index.js"

describe("router guard slimming", () => {
  it("source no longer declares a module-level workspacesFetched flag", () => {
    expect(routerSource).not.toMatch(/let\s+workspacesFetched/)
    expect(routerSource).not.toMatch(/workspacesStore\.fetchWorkspaces\(\)/)
  })
})

describe("flattened workspace settings routes", () => {
  it("maps /workspaces/:id/settings to SettingsGeneral and captures workspaceId", () => {
    const r = router.resolve("/workspaces/ws1/settings")
    expect(r.name).toBe("SettingsGeneral")
    expect(r.params.workspaceId).toBe("ws1")
  })

  it("maps /workspaces/:id/members to SettingsMembers", () => {
    expect(router.resolve("/workspaces/ws1/members").name).toBe("SettingsMembers")
  })

  it("maps /workspaces/:id/roles to SettingsRoles", () => {
    expect(router.resolve("/workspaces/ws1/roles").name).toBe("SettingsRoles")
  })

  it("redirects the bare workspace path to SettingsGeneral instead of an empty layout shell", () => {
    // resolve() does not follow redirects in this setup, so assert the parent
    // layout record carries a redirect that targets SettingsGeneral with the
    // captured workspaceId — preventing a blank WorkspaceSettingsLayout shell.
    const layoutRecord = router.resolve("/workspaces/ws1").matched[0]
    expect(typeof layoutRecord.redirect).toBe("function")
    expect(layoutRecord.redirect({ params: { workspaceId: "ws1" } })).toEqual({
      name: "SettingsGeneral",
      params: { workspaceId: "ws1" },
    })
  })

  it("treats the old nested settings paths as unknown — they fall through to the catch-all redirect", () => {
    // Clean break: the removed paths must not resolve to a named route, and
    // should hit the catch-all (`/:pathMatch(.*)*` → `/workspaces`) like any
    // unknown URL, rather than silently matching the new layout parent.
    const oldPaths = [
      "/workspaces/ws1/settings/members",
      "/workspaces/ws1/settings/roles",
      "/workspaces/ws1/settings/profile",
      "/workspaces/ws1/settings/account",
    ]
    for (const path of oldPaths) {
      const resolved = router.resolve(path)
      expect(resolved.name).toBeUndefined()
      const matched = resolved.matched[resolved.matched.length - 1]
      expect(matched.path).toBe("/:pathMatch(.*)*")
      expect(matched.redirect).toBe("/workspaces")
    }
  })
})

describe("top-level user settings route", () => {
  it("maps /settings to AccountSettings", () => {
    expect(router.resolve("/settings").name).toBe("AccountSettings")
  })

  it("marks /settings to skip the workspace guard", () => {
    expect(router.resolve("/settings").meta.skipWorkspaceGuard).toBe(true)
  })
})
