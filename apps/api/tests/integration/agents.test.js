import crypto from "node:crypto"
import { vi } from "vitest"
import {
  request,
  createTestUser,
  createTestWorkspace,
  getAuthHeaders,
  cleanAllTables,
  seedPermissions,
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

describe("GET /api/workspaces/:id/agents", () => {
  it("returns agents list including system agent", async () => {
    const user = await createTestUser()
    const ws = await createTestWorkspace(user.id)

    const res = await (await request())
      .get(`/api/workspaces/${ws.id}/agents`)
      .set(await getAuthHeaders(user.id))

    expect(res.status).toBe(200)
    // createTestWorkspace creates a system agent automatically
    expect(res.body.data.length).toBeGreaterThanOrEqual(1)
    expect(res.body.data.some((a) => a.is_system)).toBe(true)
  })
})

describe("POST /api/workspaces/:id/agents", () => {
  it("creates a custom agent", async () => {
    const user = await createTestUser()
    const ws = await createTestWorkspace(user.id)

    const res = await (
      await request()
    )
      .post(`/api/workspaces/${ws.id}/agents`)
      .set(await getAuthHeaders(user.id))
      .send({
        name: "Legal Expert",
        system_prompt: "You are a legal expert assistant.",
        model_config: {
          model: "openai/gpt-4.1",
          temperature: 0.3,
          max_tokens: 2048,
        },
      })

    expect(res.status).toBe(201)
    expect(res.body.data.name).toBe("Legal Expert")
    expect(res.body.data.is_system).toBe(false)
  })

  it("returns 400 for missing system_prompt", async () => {
    const user = await createTestUser()
    const ws = await createTestWorkspace(user.id)

    const res = await (
      await request()
    )
      .post(`/api/workspaces/${ws.id}/agents`)
      .set(await getAuthHeaders(user.id))
      .send({ name: "Bad Agent", model_config: { model: "openai/gpt-4.1" } })

    expect(res.status).toBe(400)
  })
})

describe("DELETE /api/workspaces/:id/agents/:agent_id", () => {
  it("returns 403 when trying to delete system agent", async () => {
    const user = await createTestUser()
    const ws = await createTestWorkspace(user.id)

    const listRes = await (await request())
      .get(`/api/workspaces/${ws.id}/agents`)
      .set(await getAuthHeaders(user.id))
    const systemAgent = listRes.body.data.find((a) => a.is_system)

    const res = await (await request())
      .delete(`/api/workspaces/${ws.id}/agents/${systemAgent.id}`)
      .set(await getAuthHeaders(user.id))

    expect(res.status).toBe(403)
  })

  it("soft-deletes a custom agent", async () => {
    const user = await createTestUser()
    const ws = await createTestWorkspace(user.id)

    const createRes = await (
      await request()
    )
      .post(`/api/workspaces/${ws.id}/agents`)
      .set(await getAuthHeaders(user.id))
      .send({
        name: "Delete Me",
        system_prompt: "Temp agent",
        model_config: { model: "openai/gpt-4.1" },
      })
    const agentId = createRes.body.data.id

    const delRes = await (await request())
      .delete(`/api/workspaces/${ws.id}/agents/${agentId}`)
      .set(await getAuthHeaders(user.id))
    expect(delRes.status).toBe(200)

    const getRes = await (await request())
      .get(`/api/workspaces/${ws.id}/agents/${agentId}`)
      .set(await getAuthHeaders(user.id))
    expect(getRes.status).toBe(404)
  })
})

describe("PUT /api/workspaces/:id/agents/:agent_id (system agent)", () => {
  it("allows updating system_prompt of system agent", async () => {
    const user = await createTestUser()
    const ws = await createTestWorkspace(user.id)

    const listRes = await (await request())
      .get(`/api/workspaces/${ws.id}/agents`)
      .set(await getAuthHeaders(user.id))
    const systemAgent = listRes.body.data.find((a) => a.is_system)

    const res = await (
      await request()
    )
      .put(`/api/workspaces/${ws.id}/agents/${systemAgent.id}`)
      .set(await getAuthHeaders(user.id))
      .send({ system_prompt: "Updated prompt for testing" })

    expect(res.status).toBe(200)
    expect(res.body.data.system_prompt).toBe("Updated prompt for testing")
  })

  it("returns 403 when trying to rename system agent", async () => {
    const user = await createTestUser()
    const ws = await createTestWorkspace(user.id)

    const listRes = await (await request())
      .get(`/api/workspaces/${ws.id}/agents`)
      .set(await getAuthHeaders(user.id))
    const systemAgent = listRes.body.data.find((a) => a.is_system)

    const res = await (
      await request()
    )
      .put(`/api/workspaces/${ws.id}/agents/${systemAgent.id}`)
      .set(await getAuthHeaders(user.id))
      .send({ name: "New Name", system_prompt: "prompt" })

    expect(res.status).toBe(403)
  })
})

describe("GET /api/workspaces/:id/agents/:agent_id", () => {
  it("returns a single agent", async () => {
    const user = await createTestUser()
    const ws = await createTestWorkspace(user.id)

    const listRes = await (await request())
      .get(`/api/workspaces/${ws.id}/agents`)
      .set(await getAuthHeaders(user.id))
    const agentId = listRes.body.data[0].id

    const res = await (await request())
      .get(`/api/workspaces/${ws.id}/agents/${agentId}`)
      .set(await getAuthHeaders(user.id))

    expect(res.status).toBe(200)
    expect(res.body.data.id).toBe(agentId)
    expect(res.body.data.is_system).toBe(true)
  })

  it("returns 404 for non-existent agent", async () => {
    const user = await createTestUser()
    const ws = await createTestWorkspace(user.id)

    const res = await (await request())
      .get(`/api/workspaces/${ws.id}/agents/${crypto.randomUUID()}`)
      .set(await getAuthHeaders(user.id))

    expect(res.status).toBe(404)
  })
})

describe("PUT /api/workspaces/:id/agents/:agent_id (custom agent)", () => {
  it("updates a custom agent", async () => {
    const user = await createTestUser()
    const ws = await createTestWorkspace(user.id)

    const createRes = await (
      await request()
    )
      .post(`/api/workspaces/${ws.id}/agents`)
      .set(await getAuthHeaders(user.id))
      .send({
        name: "Original",
        system_prompt: "Original prompt",
        model_config: { model: "openai/gpt-4.1" },
      })

    const res = await (
      await request()
    )
      .put(`/api/workspaces/${ws.id}/agents/${createRes.body.data.id}`)
      .set(await getAuthHeaders(user.id))
      .send({ name: "Updated", system_prompt: "New prompt" })

    expect(res.status).toBe(200)
    expect(res.body.data.name).toBe("Updated")
    expect(res.body.data.system_prompt).toBe("New prompt")
  })

  it("returns 400 for empty update body", async () => {
    const user = await createTestUser()
    const ws = await createTestWorkspace(user.id)

    const listRes = await (await request())
      .get(`/api/workspaces/${ws.id}/agents`)
      .set(await getAuthHeaders(user.id))
    const agentId = listRes.body.data[0].id

    const res = await (
      await request()
    )
      .put(`/api/workspaces/${ws.id}/agents/${agentId}`)
      .set(await getAuthHeaders(user.id))
      .send({})

    expect(res.status).toBe(400)
  })
})

describe("POST /api/workspaces/:id/agents (validation)", () => {
  it("returns 400 for empty system_prompt", async () => {
    const user = await createTestUser()
    const ws = await createTestWorkspace(user.id)

    const res = await (
      await request()
    )
      .post(`/api/workspaces/${ws.id}/agents`)
      .set(await getAuthHeaders(user.id))
      .send({
        name: "Bad Prompt",
        system_prompt: "",
        model_config: { model: "openai/gpt-4.1" },
      })

    expect(res.status).toBe(400)
  })
})
