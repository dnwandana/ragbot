import { vi } from "vitest"
import db from "../../src/config/database.js"
import {
  request,
  createTestUser,
  getAuthHeaders,
  createTestWorkspace,
  addWorkspaceMember,
  cleanAllTables,
  seedPermissions,
} from "../helpers.js"

vi.mock("../../src/services/email.js", () => ({
  sendVerificationEmail: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
  sendInvitationEmail: vi.fn(),
}))

import * as emailService from "../../src/services/email.js"

beforeAll(async () => {
  await seedPermissions()
})

beforeEach(async () => {
  await cleanAllTables()
  vi.clearAllMocks()
})

describe("POST /api/workspaces/:id/members/invite", () => {
  it("invites an unregistered email and returns 201 with status invited", async () => {
    const owner = await createTestUser()
    const { id: workspaceId, roles } = await createTestWorkspace(owner.id)

    const res = await (await request())
      .post(`/api/workspaces/${workspaceId}/members/invite`)
      .set(await getAuthHeaders(owner.id))
      .send({ email: "newuser@example.com", role_id: roles.viewer })

    expect(res.status).toBe(201)
    expect(res.body.data.email).toBe("newuser@example.com")
    expect(res.body.data.status).toBe("invited")
  })
})

describe("GET /api/workspaces/:id/members", () => {
  it("includes pending (invited) members with null user fields after LEFT JOIN fix", async () => {
    const owner = await createTestUser()
    const { id: workspaceId, roles } = await createTestWorkspace(owner.id)

    // Invite an unregistered email — no user row exists, so user_id on the member row is null
    const inviteRes = await (await request())
      .post(`/api/workspaces/${workspaceId}/members/invite`)
      .set(await getAuthHeaders(owner.id))
      .send({ email: "pending@example.com", role_id: roles.viewer })
    expect(inviteRes.status).toBe(201)

    const res = await (await request())
      .get(`/api/workspaces/${workspaceId}/members`)
      .set(await getAuthHeaders(owner.id))

    expect(res.status).toBe(200)
    const pending = res.body.data.find((m) => m.status === "invited")
    expect(pending).toBeDefined()
    expect(pending.user_id).toBeNull()
    expect(pending.email).toBeNull() // users.email via LEFT JOIN — null because no user row exists for this invite
  })
})

describe("PUT /api/workspaces/:id/members/:memberId/role", () => {
  it("changes role and writes a role_changed audit log atomically", async () => {
    const owner = await createTestUser()
    const { id: workspaceId, roles } = await createTestWorkspace(owner.id)
    const member = await createTestUser()

    await addWorkspaceMember(workspaceId, member.id, roles.viewer)
    const membership = await db("workspace_members")
      .where({ workspace_id: workspaceId, user_id: member.id })
      .whereNull("deleted_at")
      .first()

    const res = await (await request())
      .put(`/api/workspaces/${workspaceId}/members/${membership.id}/role`)
      .set(await getAuthHeaders(owner.id))
      .send({ role_id: roles.admin })

    expect(res.status).toBe(200)
    expect(res.body.data.role_id).toBe(roles.admin)

    // Verify audit log was written in the same transaction
    const auditRow = await db("audit_logs")
      .where({
        workspace_id: workspaceId,
        action: "role_changed",
        entity_type: "workspace_member",
        entity_id: membership.id,
      })
      .first()
    expect(auditRow).toBeDefined()
  })
})

describe("DELETE /api/workspaces/:id/members/:memberId", () => {
  it("soft-deletes the member and excludes them from subsequent list responses", async () => {
    const owner = await createTestUser()
    const { id: workspaceId, roles } = await createTestWorkspace(owner.id)
    const member = await createTestUser()

    await addWorkspaceMember(workspaceId, member.id, roles.viewer)
    const membership = await db("workspace_members")
      .where({ workspace_id: workspaceId, user_id: member.id })
      .whereNull("deleted_at")
      .first()

    const delRes = await (await request())
      .delete(`/api/workspaces/${workspaceId}/members/${membership.id}`)
      .set(await getAuthHeaders(owner.id))

    expect(delRes.status).toBe(200)
    const row = await db("workspace_members").where({ id: membership.id }).first()
    expect(row.deleted_at).not.toBeNull()

    const listRes = await (await request())
      .get(`/api/workspaces/${workspaceId}/members`)
      .set(await getAuthHeaders(owner.id))

    const removed = listRes.body.data.find((m) => m.id === membership.id)
    expect(removed).toBeUndefined()
  })
})

describe("POST /api/invitations/accept", () => {
  it("activates the invitation when accepted by the intended user", async () => {
    const owner = await createTestUser()
    const invitee = await createTestUser()
    const { id: workspaceId, roles } = await createTestWorkspace(owner.id)

    // Invite the registered user — the member row gets user_id = invitee.id
    const inviteRes = await (await request())
      .post(`/api/workspaces/${workspaceId}/members/invite`)
      .set(await getAuthHeaders(owner.id))
      .send({ email: invitee.email, role_id: roles.viewer })
    expect(inviteRes.status).toBe(201)

    // Extract compound token from the mocked email call
    const acceptUrl = emailService.sendInvitationEmail.mock.calls[0][0].acceptUrl
    const token = new URL(acceptUrl).searchParams.get("token")

    const res = await (await request())
      .post("/api/invitations/accept")
      .set(await getAuthHeaders(invitee.id))
      .send({ token })

    expect(res.status).toBe(200)

    const updatedMembership = await db("workspace_members")
      .where({ workspace_id: workspaceId, user_id: invitee.id })
      .first()
    expect(updatedMembership.status).toBe("active")
  })

  it("returns 403 when a different user tries to accept an invitation addressed to someone else", async () => {
    const owner = await createTestUser()
    const invitee = await createTestUser()
    const intruder = await createTestUser()
    const { id: workspaceId, roles } = await createTestWorkspace(owner.id)

    // Invite the registered user
    const inviteRes = await (await request())
      .post(`/api/workspaces/${workspaceId}/members/invite`)
      .set(await getAuthHeaders(owner.id))
      .send({ email: invitee.email, role_id: roles.viewer })
    expect(inviteRes.status).toBe(201)

    const acceptUrl = emailService.sendInvitationEmail.mock.calls[0][0].acceptUrl
    const token = new URL(acceptUrl).searchParams.get("token")

    // Intruder tries to accept an invitation addressed to invitee
    const res = await (await request())
      .post("/api/invitations/accept")
      .set(await getAuthHeaders(intruder.id))
      .send({ token })

    expect(res.status).toBe(403)
  })
})
