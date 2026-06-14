import { describe, it, expect } from "vitest"
// Import the router source as raw text (Vite `?raw`) so this assertion works in
// any test environment and needs no Node globals (fs/path/process) or file:// URL.
import routerSource from "./index.js?raw"

describe("router guard slimming", () => {
  it("source no longer declares a module-level workspacesFetched flag", () => {
    expect(routerSource).not.toMatch(/let\s+workspacesFetched/)
    expect(routerSource).not.toMatch(/workspacesStore\.fetchWorkspaces\(\)/)
  })
})
