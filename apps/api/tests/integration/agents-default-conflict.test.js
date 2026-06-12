import { vi } from "vitest"
import db from "../../src/config/database.js"
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

// Stub clearDefault so promotions collide with the seeded system-agent default,
// deterministically reproducing the concurrent-promotion race loser.
vi.mock("../../src/models/agents.js", async (importOriginal) => {
  const actual = await importOriginal()
  return { ...actual, clearDefault: vi.fn().mockResolvedValue(0) }
})

const CONFLICT_MESSAGE = "The default agent was changed by someone else. Please try again."

beforeAll(async () => {
  await seedPermissions()
})
beforeEach(async () => {
  await cleanAllTables()
})

describe("default-promotion unique violation (simulated race)", () => {
  it("maps the create-as-default collision to 409 and rolls back", async () => {
    const user = await createTestUser()
    const ws = await createTestWorkspace(user.id)

    const res = await (
      await request()
    )
      .post(`/api/workspaces/${ws.id}/agents`)
      .set(await getAuthHeaders(user.id))
      .send({
        name: "Racer",
        system_prompt: "You race.",
        model_config: { model: "openai/gpt-4.1" },
        is_default: true,
      })

    expect(res.status).toBe(409)
    expect(res.body.message).toBe(CONFLICT_MESSAGE)

    // Transaction rolled back: no agent row, no audit row.
    const agent = await db("agents").where({ workspace_id: ws.id, name: "Racer" }).first()
    expect(agent).toBeUndefined()
    // No created-audit row for the whole workspace: the only agent/created writer
    // is the controller path that just rolled back (the seeded system agent is
    // inserted directly by the test helper, bypassing audit).
    const auditRow = await db("audit_logs")
      .where({ workspace_id: ws.id, entity_type: "agent", action: "created" })
      .first()
    expect(auditRow).toBeUndefined()
  })

  it("maps the PUT promotion collision to 409", async () => {
    const user = await createTestUser()
    const ws = await createTestWorkspace(user.id)

    const createRes = await (
      await request()
    )
      .post(`/api/workspaces/${ws.id}/agents`)
      .set(await getAuthHeaders(user.id))
      .send({
        name: "Challenger",
        system_prompt: "You challenge.",
        model_config: { model: "openai/gpt-4.1" },
      })
    expect(createRes.status).toBe(201)

    const res = await (
      await request()
    )
      .put(`/api/workspaces/${ws.id}/agents/${createRes.body.data.id}`)
      .set(await getAuthHeaders(user.id))
      .send({ is_default: true })

    expect(res.status).toBe(409)
    expect(res.body.message).toBe(CONFLICT_MESSAGE)

    // Transaction rolled back: no set_default audit row, challenger not promoted.
    const auditRow = await db("audit_logs")
      .where({
        workspace_id: ws.id,
        entity_type: "agent",
        action: "set_default",
        entity_id: createRes.body.data.id,
      })
      .first()
    expect(auditRow).toBeUndefined()

    const challenger = await db("agents").where({ id: createRes.body.data.id }).first()
    expect(challenger.is_default).toBe(false)
  })
})
