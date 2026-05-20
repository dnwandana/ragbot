import crypto from "node:crypto"
import { vi } from "vitest"
import {
  request,
  createTestUser,
  createTestWorkspace,
  getAuthHeaders,
  cleanAllTables,
  seedPermissions,
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

describe("POST /api/workspaces/:id/conversations", () => {
  it("creates conversation with valid agent_id", async () => {
    const user = await createTestUser()
    const ws = await createTestWorkspace(user.id)

    const agentsRes = await (await request())
      .get(`/api/workspaces/${ws.id}/agents`)
      .set(await getAuthHeaders(user.id))
    const agentId = agentsRes.body.data.find((a) => a.is_system).id

    const res = await (
      await request()
    )
      .post(`/api/workspaces/${ws.id}/conversations`)
      .set(await getAuthHeaders(user.id))
      .send({ agent_id: agentId, title: "Test Chat" })

    expect(res.status).toBe(201)
    expect(res.body.data.agent_id).toBe(agentId)
    expect(res.body.data.title).toBe("Test Chat")
    expect(res.body.data.dataset_ids).toEqual([])
  })

  it("creates conversation with dataset_ids", async () => {
    const user = await createTestUser()
    const ws = await createTestWorkspace(user.id)

    const agentsRes = await (await request())
      .get(`/api/workspaces/${ws.id}/agents`)
      .set(await getAuthHeaders(user.id))
    const agentId = agentsRes.body.data.find((a) => a.is_system).id

    const dsRes = await (
      await request()
    )
      .post(`/api/workspaces/${ws.id}/datasets`)
      .set(await getAuthHeaders(user.id))
      .send({ name: "Test DS" })
    const datasetId = dsRes.body.data.id

    const res = await (
      await request()
    )
      .post(`/api/workspaces/${ws.id}/conversations`)
      .set(await getAuthHeaders(user.id))
      .send({ agent_id: agentId, dataset_ids: [datasetId] })

    expect(res.status).toBe(201)
    expect(res.body.data.dataset_ids).toContain(datasetId)
  })

  it("returns 400 for invalid agent_id", async () => {
    const user = await createTestUser()
    const ws = await createTestWorkspace(user.id)

    const res = await (
      await request()
    )
      .post(`/api/workspaces/${ws.id}/conversations`)
      .set(await getAuthHeaders(user.id))
      .send({ agent_id: crypto.randomUUID() })

    expect(res.status).toBe(400)
  })
})

describe("GET /api/workspaces/:id/conversations", () => {
  it("returns only current user conversations", async () => {
    const owner = await createTestUser()
    const other = await createTestUser()
    const ws = await createTestWorkspace(owner.id)

    const agentsRes = await (await request())
      .get(`/api/workspaces/${ws.id}/agents`)
      .set(await getAuthHeaders(owner.id))
    const agentId = agentsRes.body.data.find((a) => a.is_system).id

    await (
      await request()
    )
      .post(`/api/workspaces/${ws.id}/conversations`)
      .set(await getAuthHeaders(owner.id))
      .send({ agent_id: agentId })

    await addWorkspaceMember(ws.id, other.id, ws.roles.viewer)
    const res = await (await request())
      .get(`/api/workspaces/${ws.id}/conversations`)
      .set(await getAuthHeaders(other.id))

    expect(res.status).toBe(200)
    expect(res.body.data).toHaveLength(0)
  })
})

describe("GET /api/workspaces/:id/conversations/:conversation_id", () => {
  it("returns conversation with messages array", async () => {
    const user = await createTestUser()
    const ws = await createTestWorkspace(user.id)

    const agentsRes = await (await request())
      .get(`/api/workspaces/${ws.id}/agents`)
      .set(await getAuthHeaders(user.id))
    const agentId = agentsRes.body.data.find((a) => a.is_system).id

    const createRes = await (
      await request()
    )
      .post(`/api/workspaces/${ws.id}/conversations`)
      .set(await getAuthHeaders(user.id))
      .send({ agent_id: agentId, title: "My Chat" })
    const convId = createRes.body.data.id

    const res = await (await request())
      .get(`/api/workspaces/${ws.id}/conversations/${convId}`)
      .set(await getAuthHeaders(user.id))

    expect(res.status).toBe(200)
    expect(res.body.data.messages).toEqual([])
    expect(res.body.data.citations).toEqual([])
  })
})

describe("PATCH /api/workspaces/:id/conversations/:conversation_id", () => {
  it("updates conversation title", async () => {
    const user = await createTestUser()
    const ws = await createTestWorkspace(user.id)

    const agentsRes = await (await request())
      .get(`/api/workspaces/${ws.id}/agents`)
      .set(await getAuthHeaders(user.id))
    const agentId = agentsRes.body.data.find((a) => a.is_system).id

    const createRes = await (
      await request()
    )
      .post(`/api/workspaces/${ws.id}/conversations`)
      .set(await getAuthHeaders(user.id))
      .send({ agent_id: agentId })
    const convId = createRes.body.data.id

    const res = await (
      await request()
    )
      .patch(`/api/workspaces/${ws.id}/conversations/${convId}`)
      .set(await getAuthHeaders(user.id))
      .send({ title: "Updated Title" })

    expect(res.status).toBe(200)
    expect(res.body.data.title).toBe("Updated Title")
  })
})

describe("DELETE /api/workspaces/:id/conversations/:conversation_id", () => {
  it("soft-deletes conversation", async () => {
    const user = await createTestUser()
    const ws = await createTestWorkspace(user.id)

    const agentsRes = await (await request())
      .get(`/api/workspaces/${ws.id}/agents`)
      .set(await getAuthHeaders(user.id))
    const agentId = agentsRes.body.data.find((a) => a.is_system).id

    const createRes = await (
      await request()
    )
      .post(`/api/workspaces/${ws.id}/conversations`)
      .set(await getAuthHeaders(user.id))
      .send({ agent_id: agentId })
    const convId = createRes.body.data.id

    const delRes = await (await request())
      .delete(`/api/workspaces/${ws.id}/conversations/${convId}`)
      .set(await getAuthHeaders(user.id))
    expect(delRes.status).toBe(200)

    const getRes = await (await request())
      .get(`/api/workspaces/${ws.id}/conversations/${convId}`)
      .set(await getAuthHeaders(user.id))
    expect(getRes.status).toBe(404)
  })
})

describe("POST /api/workspaces/:id/datasets/:dataset_id/conversations (shortcut)", () => {
  it("creates conversation pre-linked to dataset", async () => {
    const user = await createTestUser()
    const ws = await createTestWorkspace(user.id)

    const dsRes = await (
      await request()
    )
      .post(`/api/workspaces/${ws.id}/datasets`)
      .set(await getAuthHeaders(user.id))
      .send({ name: "Linked DS" })
    const datasetId = dsRes.body.data.id

    const res = await (await request())
      .post(`/api/workspaces/${ws.id}/datasets/${datasetId}/conversations`)
      .set(await getAuthHeaders(user.id))

    expect(res.status).toBe(201)
    expect(res.body.data.dataset_ids).toContain(datasetId)
  })
})

describe("cross-user authorization", () => {
  it("returns 404 when another workspace member accesses a conversation", async () => {
    const owner = await createTestUser()
    const other = await createTestUser()
    const ws = await createTestWorkspace(owner.id)

    const agentId = (
      await (await request())
        .get(`/api/workspaces/${ws.id}/agents`)
        .set(await getAuthHeaders(owner.id))
    ).body.data.find((a) => a.is_system).id

    const convId = (
      await (
        await request()
      )
        .post(`/api/workspaces/${ws.id}/conversations`)
        .set(await getAuthHeaders(owner.id))
        .send({ agent_id: agentId })
    ).body.data.id

    // Admin has conversation:read, conversation:update, conversation:delete — so
    // the permission middleware passes and the 404 comes from the controller's
    // user_id scope check, not from a missing permission.
    await addWorkspaceMember(ws.id, other.id, ws.roles.admin)
    const headers = await getAuthHeaders(other.id)

    const [getRes, patchRes, delRes] = await Promise.all([
      (await request()).get(`/api/workspaces/${ws.id}/conversations/${convId}`).set(headers),
      (await request())
        .patch(`/api/workspaces/${ws.id}/conversations/${convId}`)
        .set(headers)
        .send({ title: "X" }),
      (await request()).delete(`/api/workspaces/${ws.id}/conversations/${convId}`).set(headers),
    ])

    expect(getRes.status).toBe(404)
    expect(patchRes.status).toBe(404)
    expect(delRes.status).toBe(404)
  })
})
