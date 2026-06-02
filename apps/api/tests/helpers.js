import supertest from "supertest"
import db from "../src/config/database.js"
import { generateAccessToken, generateRefreshToken } from "../src/utils/jwt.js"
import { hashPassword } from "../src/utils/argon2.js"
import { hashToken } from "../src/models/refresh-tokens.js"

let _app

export async function getApp() {
  if (!_app) {
    const { default: app } = await import("../src/app.js")
    _app = app
  }
  return _app
}

export async function request() {
  return supertest(await getApp())
}

export async function createTestUser(overrides = {}) {
  const id = crypto.randomUUID()
  const email = overrides.email ?? `user-${id.slice(0, 8)}@example.com`
  const plainPassword = overrides.password ?? "Password123!"
  const password_hash = await hashPassword(plainPassword)

  await db("users").insert({
    id,
    email,
    password_hash,
    full_name: overrides.full_name ?? "Test User",
    email_verified: overrides.email_verified ?? true,
    created_at: new Date(),
    updated_at: new Date(),
  })

  return { id, email, full_name: overrides.full_name ?? "Test User", plainPassword }
}

export async function getAuthHeaders(userId) {
  const accessToken = generateAccessToken(userId)
  const refreshToken = generateRefreshToken(userId)
  const tokenHash = hashToken(refreshToken)

  await db("refresh_tokens").insert({
    id: crypto.randomUUID(),
    user_id: userId,
    token_hash: tokenHash,
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    created_at: new Date(),
    updated_at: new Date(),
  })

  return { Cookie: `access_token=${accessToken}; refresh_token=${refreshToken}` }
}

export async function seedPermissions() {
  const { seed } = await import("../database/seeds/01_permissions.js")
  await seed(db)
}

export async function createTestWorkspace(userId, overrides = {}) {
  // Requires permissions already seeded
  const workspaceId = crypto.randomUUID()

  const roleIds = {}

  await db.transaction(async (trx) => {
    await trx("workspaces").insert({
      id: workspaceId,
      name: overrides.name ?? `Workspace ${workspaceId.slice(0, 8)}`,
      settings: JSON.stringify({}),
      created_at: new Date(),
      updated_at: new Date(),
    })

    // Create 4 system roles
    const roleNames = ["owner", "admin", "editor", "viewer"]
    for (const name of roleNames) {
      const roleId = crypto.randomUUID()
      roleIds[name] = roleId
      await trx("roles").insert({
        id: roleId,
        workspace_id: workspaceId,
        name,
        description: `System ${name} role`,
        is_system: true,
        created_at: new Date(),
        updated_at: new Date(),
      })
    }

    // Assign all permissions to owner
    const allPerms = await trx("permissions").select("id", "name")
    const ownerPerms = allPerms
    const adminPerms = allPerms.filter((p) => !["workspace:delete", "role:delete"].includes(p.name))
    const editorPerms = allPerms.filter((p) =>
      [
        "workspace:read",
        "role:read",
        "member:read",
        "dataset:create",
        "dataset:read",
        "dataset:update",
        "file:read",
        "file:upload",
        "file:update",
        "file:reprocess",
        "agent:create",
        "agent:read",
        "agent:update",
        "conversation:create",
        "conversation:read",
        "conversation:update",
        "conversation:chat",
        "audit:read",
      ].includes(p.name),
    )
    const viewerPerms = allPerms.filter((p) =>
      [
        "workspace:read",
        "role:read",
        "member:read",
        "dataset:read",
        "file:read",
        "agent:read",
        "conversation:read",
      ].includes(p.name),
    )

    const permMap = {
      owner: ownerPerms,
      admin: adminPerms,
      editor: editorPerms,
      viewer: viewerPerms,
    }
    for (const [role, perms] of Object.entries(permMap)) {
      if (perms.length > 0) {
        await trx("role_permissions").insert(
          perms.map((p) => ({ role_id: roleIds[role], permission_id: p.id })),
        )
      }
    }

    // Add creator as owner
    await trx("workspace_members").insert({
      id: crypto.randomUUID(),
      workspace_id: workspaceId,
      user_id: userId,
      role_id: roleIds.owner,
      status: "active",
      joined_at: new Date(),
      created_at: new Date(),
      updated_at: new Date(),
    })

    // Create system agent
    await trx("agents").insert({
      id: crypto.randomUUID(),
      workspace_id: workspaceId,
      name: "Default Assistant",
      description: "Default workspace AI assistant",
      system_prompt:
        "You are a helpful AI assistant. Use the provided context to answer questions accurately.",
      model_config: JSON.stringify({
        model: process.env.DEFAULT_CHAT_MODEL || "openai/gpt-4.1",
        temperature: 0.7,
        top_p: 1,
        max_tokens: 4096,
      }),
      is_system: true,
      is_default: true,
      created_at: new Date(),
      updated_at: new Date(),
    })
  })

  return { id: workspaceId, roles: roleIds }
}

export async function addWorkspaceMember(workspaceId, userId, roleId) {
  await db("workspace_members").insert({
    id: crypto.randomUUID(),
    workspace_id: workspaceId,
    user_id: userId,
    role_id: roleId,
    status: "active",
    joined_at: new Date(),
    created_at: new Date(),
    updated_at: new Date(),
  })
}

export async function cleanAllTables() {
  await db.raw(`
    TRUNCATE TABLE
      audit_logs,
      message_citations,
      messages,
      conversation_datasets,
      conversations,
      agents,
      document_chunks,
      dataset_files,
      datasets,
      workspace_members,
      role_permissions,
      roles,
      email_tokens,
      refresh_tokens,
      users,
      workspaces
    RESTART IDENTITY CASCADE
  `)
}
