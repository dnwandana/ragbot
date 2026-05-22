/**
 * Integration tests for permission enforcement and cross-tenant isolation.
 *
 * Covers:
 * - Owner role has all permissions (spot-checked via workspace-scoped endpoints)
 * - Viewer role has read-only permissions and is denied write/delete actions
 * - A member without a required permission receives 403 from requirePermission
 * - Workspace isolation: a member of workspace A cannot access workspace B
 * - GET /api/permissions returns the full permission list
 */
import { vi } from "vitest"
import {
  request,
  createTestUser,
  getAuthHeaders,
  cleanAllTables,
  seedPermissions,
  createTestWorkspace,
  addWorkspaceMember,
} from "../helpers.js"

vi.mock("../../src/services/email.js", () => ({
  sendVerificationEmail: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
  sendInvitationEmail: vi.fn(),
}))

beforeAll(async () => {
  await seedPermissions()
})

beforeEach(async () => {
  await cleanAllTables()
})

// ---------------------------------------------------------------------------
// GET /api/permissions — public reference endpoint
// ---------------------------------------------------------------------------

describe("GET /api/permissions", () => {
  it("returns 200 with an array of permission objects when authenticated", async () => {
    const user = await createTestUser()
    const headers = await getAuthHeaders(user.id)

    const res = await (await request()).get("/api/permissions").set(headers)

    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.data)).toBe(true)
    expect(res.body.data.length).toBeGreaterThan(0)

    const names = res.body.data.map((p) => p.name)
    expect(names).toContain("workspace:read")
    expect(names).toContain("role:create")
    expect(names).toContain("conversation:delete")
    expect(names).toContain("dataset:read")
  })

  it("returns 401 when called without authentication", async () => {
    const res = await (await request()).get("/api/permissions")

    expect(res.status).toBe(401)
  })
})

// ---------------------------------------------------------------------------
// Owner role — all permissions
// ---------------------------------------------------------------------------

describe("Owner role permissions", () => {
  it("owner can read the workspace (workspace:read)", async () => {
    const owner = await createTestUser()
    const workspace = await createTestWorkspace(owner.id)
    const headers = await getAuthHeaders(owner.id)

    const res = await (await request()).get(`/api/workspaces/${workspace.id}`).set(headers)

    expect(res.status).toBe(200)
    expect(res.body.data.id).toBe(workspace.id)
  })

  it("owner can create a role (role:create)", async () => {
    const owner = await createTestUser()
    const workspace = await createTestWorkspace(owner.id)
    const headers = await getAuthHeaders(owner.id)

    const permsRes = await (await request()).get("/api/permissions").set(headers)
    const permissionId = permsRes.body.data[0].id

    const res = await (
      await request()
    )
      .post(`/api/workspaces/${workspace.id}/roles`)
      .set(headers)
      .send({ name: "custom-role", description: "A custom role", permission_ids: [permissionId] })

    expect(res.status).toBe(201)
  })

  it("owner can delete a conversation (conversation:delete)", async () => {
    const owner = await createTestUser()
    const workspace = await createTestWorkspace(owner.id)
    const headers = await getAuthHeaders(owner.id)

    const agentsRes = await (await request())
      .get(`/api/workspaces/${workspace.id}/agents`)
      .set(headers)
    const agentId = agentsRes.body.data.find((a) => a.is_system).id

    // First create a conversation so we have something to delete
    const createRes = await (await request())
      .post(`/api/workspaces/${workspace.id}/conversations`)
      .set(headers)
      .send({ agent_id: agentId })

    expect(createRes.status).toBe(201)
    const conversationId = createRes.body.data.id

    const deleteRes = await (await request())
      .delete(`/api/workspaces/${workspace.id}/conversations/${conversationId}`)
      .set(headers)

    expect(deleteRes.status).toBe(200)
  })
})

// ---------------------------------------------------------------------------
// Viewer role — read-only
// ---------------------------------------------------------------------------

describe("Viewer role permissions", () => {
  it("viewer can read the workspace (workspace:read)", async () => {
    const owner = await createTestUser()
    const viewer = await createTestUser()
    const workspace = await createTestWorkspace(owner.id)
    const viewerHeaders = await getAuthHeaders(viewer.id)

    await addWorkspaceMember(workspace.id, viewer.id, workspace.roles.viewer)

    const res = await (await request()).get(`/api/workspaces/${workspace.id}`).set(viewerHeaders)

    expect(res.status).toBe(200)
  })

  it("viewer cannot create a role (role:create denied)", async () => {
    const owner = await createTestUser()
    const viewer = await createTestUser()
    const workspace = await createTestWorkspace(owner.id)
    const viewerHeaders = await getAuthHeaders(viewer.id)

    await addWorkspaceMember(workspace.id, viewer.id, workspace.roles.viewer)

    const res = await (await request())
      .post(`/api/workspaces/${workspace.id}/roles`)
      .set(viewerHeaders)
      .send({ name: "hacker-role", description: "Should be denied", permissions: [] })

    expect(res.status).toBe(403)
  })

  it("viewer cannot delete a dataset (dataset:delete denied)", async () => {
    const owner = await createTestUser()
    const viewer = await createTestUser()
    const workspace = await createTestWorkspace(owner.id)
    const ownerHeaders = await getAuthHeaders(owner.id)
    const viewerHeaders = await getAuthHeaders(viewer.id)

    await addWorkspaceMember(workspace.id, viewer.id, workspace.roles.viewer)

    // Owner creates a dataset first
    const createRes = await (await request())
      .post(`/api/workspaces/${workspace.id}/datasets`)
      .set(ownerHeaders)
      .send({ name: "Test dataset" })

    expect(createRes.status).toBe(201)
    const datasetId = createRes.body.data.id

    // Viewer attempts to delete it
    const deleteRes = await (await request())
      .delete(`/api/workspaces/${workspace.id}/datasets/${datasetId}`)
      .set(viewerHeaders)

    expect(deleteRes.status).toBe(403)
  })

  it("viewer cannot delete a conversation (conversation:delete denied)", async () => {
    const owner = await createTestUser()
    const viewer = await createTestUser()
    const workspace = await createTestWorkspace(owner.id)
    const ownerHeaders = await getAuthHeaders(owner.id)
    const viewerHeaders = await getAuthHeaders(viewer.id)

    await addWorkspaceMember(workspace.id, viewer.id, workspace.roles.viewer)

    const agentsRes = await (await request())
      .get(`/api/workspaces/${workspace.id}/agents`)
      .set(ownerHeaders)
    const agentId = agentsRes.body.data.find((a) => a.is_system).id

    // Owner creates a conversation
    const createRes = await (await request())
      .post(`/api/workspaces/${workspace.id}/conversations`)
      .set(ownerHeaders)
      .send({ agent_id: agentId })

    expect(createRes.status).toBe(201)
    const conversationId = createRes.body.data.id

    // Viewer attempts to delete it
    const deleteRes = await (await request())
      .delete(`/api/workspaces/${workspace.id}/conversations/${conversationId}`)
      .set(viewerHeaders)

    expect(deleteRes.status).toBe(403)
  })
})

// ---------------------------------------------------------------------------
// requirePermission middleware: 403 without the required permission
// ---------------------------------------------------------------------------

describe("requirePermission middleware enforcement", () => {
  it("member without workspace:delete permission gets 403 on delete workspace", async () => {
    const owner = await createTestUser()
    const editor = await createTestUser()
    const workspace = await createTestWorkspace(owner.id)
    const editorHeaders = await getAuthHeaders(editor.id)

    // Editor role does not have workspace:delete
    await addWorkspaceMember(workspace.id, editor.id, workspace.roles.editor)

    const res = await (await request()).delete(`/api/workspaces/${workspace.id}`).set(editorHeaders)

    expect(res.status).toBe(403)
  })

  it("viewer without role:create permission gets 403 when creating a role", async () => {
    const owner = await createTestUser()
    const viewer = await createTestUser()
    const workspace = await createTestWorkspace(owner.id)
    const viewerHeaders = await getAuthHeaders(viewer.id)

    await addWorkspaceMember(workspace.id, viewer.id, workspace.roles.viewer)

    const res = await (await request())
      .post(`/api/workspaces/${workspace.id}/roles`)
      .set(viewerHeaders)
      .send({ name: "new-role", description: "Denied", permissions: [] })

    expect(res.status).toBe(403)
  })
})

// ---------------------------------------------------------------------------
// Workspace isolation: member of workspace A cannot access workspace B
// ---------------------------------------------------------------------------

describe("Workspace isolation", () => {
  it("member of workspace A gets 403 when accessing workspace B", async () => {
    const ownerA = await createTestUser()
    const ownerB = await createTestUser()
    const memberA = await createTestUser()

    const workspaceA = await createTestWorkspace(ownerA.id)
    const workspaceB = await createTestWorkspace(ownerB.id)

    // memberA is a viewer in workspace A only
    await addWorkspaceMember(workspaceA.id, memberA.id, workspaceA.roles.viewer)

    const memberAHeaders = await getAuthHeaders(memberA.id)

    // Attempt to access workspace B — resolveWorkspace should return 403
    const res = await (await request()).get(`/api/workspaces/${workspaceB.id}`).set(memberAHeaders)

    expect(res.status).toBe(403)
  })

  it("member of workspace A with identical role cannot read workspace B's roles", async () => {
    const ownerA = await createTestUser()
    const ownerB = await createTestUser()
    const memberA = await createTestUser()

    const workspaceA = await createTestWorkspace(ownerA.id)
    const workspaceB = await createTestWorkspace(ownerB.id)

    // memberA is a full owner in workspace A — still cannot access workspace B
    await addWorkspaceMember(workspaceA.id, memberA.id, workspaceA.roles.owner)

    const memberAHeaders = await getAuthHeaders(memberA.id)

    const res = await (await request())
      .get(`/api/workspaces/${workspaceB.id}/roles`)
      .set(memberAHeaders)

    expect(res.status).toBe(403)
  })
})
