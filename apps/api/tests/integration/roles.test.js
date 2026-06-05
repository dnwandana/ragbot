import db from "../../src/config/database.js"
import {
  request,
  createTestUser,
  createTestWorkspace,
  addWorkspaceMember,
  getAuthHeaders,
  cleanAllTables,
  seedPermissions,
} from "../helpers.js"

beforeAll(async () => {
  await seedPermissions()
})
beforeEach(async () => {
  await cleanAllTables()
})

/** Create a custom role via the API and return its id. */
async function createCustomRole(workspaceId, headers, name) {
  const perm = await db("permissions").where({ name: "dataset:read" }).first()
  const res = await (
    await request()
  )
    .post(`/api/workspaces/${workspaceId}/roles`)
    .set(headers)
    .send({ name, permission_ids: [perm.id] })
  return res.body.data.id
}

/** Create a custom role with the given permission names and return its id. */
async function createRoleWithPermissions(workspaceId, headers, name, permissionNames) {
  const perms = await db("permissions").whereIn("name", permissionNames).select("id")
  const res = await (
    await request()
  )
    .post(`/api/workspaces/${workspaceId}/roles`)
    .set(headers)
    .send({ name, permission_ids: perms.map((p) => p.id) })
  return res.body.data.id
}

describe("GET /api/workspaces/:id/roles", () => {
  it("includes member_count for each role", async () => {
    const user = await createTestUser()
    const ws = await createTestWorkspace(user.id) // creator added as owner

    const res = await (await request())
      .get(`/api/workspaces/${ws.id}/roles`)
      .set(await getAuthHeaders(user.id))

    expect(res.status).toBe(200)
    const owner = res.body.data.find((r) => r.name === "owner")
    const viewer = res.body.data.find((r) => r.name === "viewer")
    expect(owner.member_count).toBe(1)
    expect(viewer.member_count).toBe(0)
  })

  it("excludes invited (non-active) members from member_count", async () => {
    const user = await createTestUser()
    const ws = await createTestWorkspace(user.id)
    const headers = await getAuthHeaders(user.id)
    const roleId = await createCustomRole(ws.id, headers, "Reviewer")

    // An invited member references the role but is not active.
    const invited = await createTestUser()
    await db("workspace_members").insert({
      id: crypto.randomUUID(),
      workspace_id: ws.id,
      user_id: invited.id,
      role_id: roleId,
      status: "invited",
      created_at: new Date(),
      updated_at: new Date(),
    })

    const res = await (await request()).get(`/api/workspaces/${ws.id}/roles`).set(headers)
    const reviewer = res.body.data.find((r) => r.id === roleId)
    expect(reviewer.member_count).toBe(0)

    // The invited row still holds the FK, so deletion remains FK-safe (reassign required).
    const del = await (await request())
      .delete(`/api/workspaces/${ws.id}/roles/${roleId}`)
      .set(headers)
    expect(del.status).toBe(400)
    expect(del.body.message).toMatch(/reassign/i)
  })
})

describe("DELETE /api/workspaces/:id/roles/:role_id", () => {
  it("deletes a custom role that has no members", async () => {
    const user = await createTestUser()
    const ws = await createTestWorkspace(user.id)
    const headers = await getAuthHeaders(user.id)
    const roleId = await createCustomRole(ws.id, headers, "Temp")

    const res = await (await request())
      .delete(`/api/workspaces/${ws.id}/roles/${roleId}`)
      .set(headers)

    expect(res.status).toBe(200)
    expect(await db("roles").where({ id: roleId }).first()).toBeUndefined()
  })

  it("returns 400 when the role has members and no reassign target", async () => {
    const user = await createTestUser()
    const ws = await createTestWorkspace(user.id)
    const headers = await getAuthHeaders(user.id)
    const roleId = await createCustomRole(ws.id, headers, "Reviewer")
    const member = await createTestUser()
    await addWorkspaceMember(ws.id, member.id, roleId)

    const res = await (await request())
      .delete(`/api/workspaces/${ws.id}/roles/${roleId}`)
      .set(headers)

    expect(res.status).toBe(400)
    expect(res.body.message).toMatch(/reassign/i)
    expect(await db("roles").where({ id: roleId }).first()).toBeDefined()
  })

  it("reassigns members then deletes when a target is provided", async () => {
    const user = await createTestUser()
    const ws = await createTestWorkspace(user.id)
    const headers = await getAuthHeaders(user.id)
    const roleId = await createCustomRole(ws.id, headers, "Reviewer")
    const member = await createTestUser()
    await addWorkspaceMember(ws.id, member.id, roleId)

    const res = await (await request())
      .delete(`/api/workspaces/${ws.id}/roles/${roleId}`)
      .set(headers)
      .send({ reassign_to_role_id: ws.roles.viewer })

    expect(res.status).toBe(200)
    expect(await db("roles").where({ id: roleId }).first()).toBeUndefined()
    const moved = await db("workspace_members").where({ user_id: member.id }).first()
    expect(moved.role_id).toBe(ws.roles.viewer)
  })

  it("returns 400 for an unknown reassign target", async () => {
    const user = await createTestUser()
    const ws = await createTestWorkspace(user.id)
    const headers = await getAuthHeaders(user.id)
    const roleId = await createCustomRole(ws.id, headers, "Reviewer")
    const member = await createTestUser()
    await addWorkspaceMember(ws.id, member.id, roleId)

    const res = await (await request())
      .delete(`/api/workspaces/${ws.id}/roles/${roleId}`)
      .set(headers)
      .send({ reassign_to_role_id: crypto.randomUUID() })

    expect(res.status).toBe(400)
  })

  it("stays FK-safe when the role's only member was removed (soft-deleted)", async () => {
    const user = await createTestUser()
    const ws = await createTestWorkspace(user.id)
    const headers = await getAuthHeaders(user.id)
    const roleId = await createCustomRole(ws.id, headers, "Reviewer")
    const member = await createTestUser()
    await addWorkspaceMember(ws.id, member.id, roleId)
    // Removing a member soft-deletes the row but keeps its role_id, so it still references the role.
    await db("workspace_members")
      .where({ user_id: member.id, workspace_id: ws.id })
      .update({ deleted_at: new Date() })

    // Without a reassign target the tombstoned row still blocks the delete → 400, role survives.
    const noTarget = await (await request())
      .delete(`/api/workspaces/${ws.id}/roles/${roleId}`)
      .set(headers)
    expect(noTarget.status).toBe(400)
    expect(noTarget.body.message).toMatch(/reassign/i)
    expect(await db("roles").where({ id: roleId }).first()).toBeDefined()

    // With a target the soft-deleted member is repointed and the role deletes cleanly.
    const withTarget = await (await request())
      .delete(`/api/workspaces/${ws.id}/roles/${roleId}`)
      .set(headers)
      .send({ reassign_to_role_id: ws.roles.viewer })
    expect(withTarget.status).toBe(200)
    expect(await db("roles").where({ id: roleId }).first()).toBeUndefined()

    const moved = await db("workspace_members").where({ user_id: member.id }).first()
    expect(moved.role_id).toBe(ws.roles.viewer)
    expect(moved.deleted_at).not.toBeNull()
  })

  it("returns 400 when reassigning members to the owner role", async () => {
    const user = await createTestUser()
    const ws = await createTestWorkspace(user.id)
    const headers = await getAuthHeaders(user.id)
    const roleId = await createCustomRole(ws.id, headers, "Reviewer")
    const member = await createTestUser()
    await addWorkspaceMember(ws.id, member.id, roleId)

    const res = await (await request())
      .delete(`/api/workspaces/${ws.id}/roles/${roleId}`)
      .set(headers)
      .send({ reassign_to_role_id: ws.roles.owner })

    expect(res.status).toBe(400)
    expect(res.body.message).toMatch(/owner/i)
    expect(await db("roles").where({ id: roleId }).first()).toBeDefined()
    const stillOnRole = await db("workspace_members").where({ user_id: member.id }).first()
    expect(stillOnRole.role_id).toBe(roleId)
  })

  it("returns 403 when the actor lacks member:manage_role", async () => {
    const owner = await createTestUser()
    const ws = await createTestWorkspace(owner.id)
    const ownerHeaders = await getAuthHeaders(owner.id)

    // The role to delete, with a member on it.
    const roleId = await createCustomRole(ws.id, ownerHeaders, "Reviewer")
    const member = await createTestUser()
    await addWorkspaceMember(ws.id, member.id, roleId)

    // The actor can delete roles but cannot manage members.
    const deleterRoleId = await createRoleWithPermissions(ws.id, ownerHeaders, "Deleter", [
      "role:delete",
    ])
    const actor = await createTestUser()
    await addWorkspaceMember(ws.id, actor.id, deleterRoleId)
    const actorHeaders = await getAuthHeaders(actor.id)

    const res = await (await request())
      .delete(`/api/workspaces/${ws.id}/roles/${roleId}`)
      .set(actorHeaders)
      .send({ reassign_to_role_id: ws.roles.viewer })

    expect(res.status).toBe(403)
    expect(res.body.message).toMatch(/member:manage_role|permission/i)
    expect(await db("roles").where({ id: roleId }).first()).toBeDefined()
  })

  it("returns 400 when the reassign target is the role being deleted", async () => {
    const user = await createTestUser()
    const ws = await createTestWorkspace(user.id)
    const headers = await getAuthHeaders(user.id)
    const roleId = await createCustomRole(ws.id, headers, "Reviewer")
    const member = await createTestUser()
    await addWorkspaceMember(ws.id, member.id, roleId)

    const res = await (await request())
      .delete(`/api/workspaces/${ws.id}/roles/${roleId}`)
      .set(headers)
      .send({ reassign_to_role_id: roleId })

    expect(res.status).toBe(400)
    expect(res.body.message).toMatch(/being deleted/i)
  })

  it("returns 400 when trying to delete a system role", async () => {
    const user = await createTestUser()
    const ws = await createTestWorkspace(user.id)

    const res = await (await request())
      .delete(`/api/workspaces/${ws.id}/roles/${ws.roles.viewer}`)
      .set(await getAuthHeaders(user.id))

    expect(res.status).toBe(400)
  })
})

describe("roles audit logging", () => {
  it("writes a 'created' audit log when a custom role is created", async () => {
    const user = await createTestUser()
    const ws = await createTestWorkspace(user.id)
    const headers = await getAuthHeaders(user.id)
    const perm = await db("permissions").where({ name: "dataset:read" }).first()

    const res = await (
      await request()
    )
      .post(`/api/workspaces/${ws.id}/roles`)
      .set(headers)
      .send({ name: "Reviewer", permission_ids: [perm.id] })

    expect(res.status).toBe(201)
    const roleId = res.body.data.id

    const auditRow = await db("audit_logs")
      .where({ workspace_id: ws.id, action: "created", entity_type: "role", entity_id: roleId })
      .first()
    expect(auditRow).toBeDefined()
    expect(auditRow.user_id).toBe(user.id)
    expect(auditRow.entity_id).toBe(roleId)
    const changes =
      typeof auditRow.changes === "string" ? JSON.parse(auditRow.changes) : auditRow.changes
    expect(changes.name).toBe("Reviewer")
    expect(changes.permission_ids).toEqual([perm.id])
  })

  it("writes an 'updated' audit log when a role is updated", async () => {
    const user = await createTestUser()
    const ws = await createTestWorkspace(user.id)
    const headers = await getAuthHeaders(user.id)
    const roleId = await createCustomRole(ws.id, headers, "Reviewer")

    const res = await (await request())
      .put(`/api/workspaces/${ws.id}/roles/${roleId}`)
      .set(headers)
      .send({ description: "Updated description" })

    expect(res.status).toBe(200)

    const auditRow = await db("audit_logs")
      .where({ workspace_id: ws.id, action: "updated", entity_type: "role", entity_id: roleId })
      .first()
    expect(auditRow).toBeDefined()
    expect(auditRow.user_id).toBe(user.id)
    expect(auditRow.entity_id).toBe(roleId)
  })

  it("writes a 'deleted' audit log when a role with no members is deleted", async () => {
    const user = await createTestUser()
    const ws = await createTestWorkspace(user.id)
    const headers = await getAuthHeaders(user.id)
    const roleId = await createCustomRole(ws.id, headers, "Reviewer")

    const res = await (await request())
      .delete(`/api/workspaces/${ws.id}/roles/${roleId}`)
      .set(headers)
      .send({})

    expect(res.status).toBe(200)

    const auditRow = await db("audit_logs")
      .where({ workspace_id: ws.id, action: "deleted", entity_type: "role", entity_id: roleId })
      .first()
    expect(auditRow).toBeDefined()
    expect(auditRow.user_id).toBe(user.id)
    expect(auditRow.entity_id).toBe(roleId)
  })

  it("writes a 'deleted' audit log with the reassign target when members are reassigned", async () => {
    const user = await createTestUser()
    const ws = await createTestWorkspace(user.id)
    const headers = await getAuthHeaders(user.id)
    const roleId = await createCustomRole(ws.id, headers, "Reviewer")
    const member = await createTestUser()
    await addWorkspaceMember(ws.id, member.id, roleId)

    const res = await (await request())
      .delete(`/api/workspaces/${ws.id}/roles/${roleId}`)
      .set(headers)
      .send({ reassign_to_role_id: ws.roles.viewer })

    expect(res.status).toBe(200)

    const auditRow = await db("audit_logs")
      .where({ workspace_id: ws.id, action: "deleted", entity_type: "role", entity_id: roleId })
      .first()
    expect(auditRow).toBeDefined()
    expect(auditRow.user_id).toBe(user.id)
    expect(auditRow.entity_id).toBe(roleId)

    const changes =
      typeof auditRow.changes === "string" ? JSON.parse(auditRow.changes) : auditRow.changes
    expect(changes.reassigned_to_role_id).toBe(ws.roles.viewer)
  })
})
