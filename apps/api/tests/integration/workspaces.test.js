import { vi } from "vitest"
import {
  request,
  createTestUser,
  getAuthHeaders,
  cleanAllTables,
  seedPermissions,
} from "../helpers.js"

// Mock email service to prevent Brevo SDK from initialising during import.
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

describe("POST /api/workspaces", () => {
  it("creates workspace and returns 201", async () => {
    const user = await createTestUser()
    const res = await (
      await request()
    )
      .post("/api/workspaces")
      .set(await getAuthHeaders(user.id))
      .send({ name: "My Workspace" })

    expect(res.status).toBe(201)
    expect(res.body.data.name).toBe("My Workspace")
  })
})

describe("GET /api/workspaces", () => {
  it("returns workspaces user belongs to", async () => {
    const user = await createTestUser()
    await (
      await request()
    )
      .post("/api/workspaces")
      .set(await getAuthHeaders(user.id))
      .send({ name: "WS 1" })

    const res = await (await request()).get("/api/workspaces").set(await getAuthHeaders(user.id))

    expect(res.status).toBe(200)
    expect(res.body.data).toHaveLength(1)
    expect(res.body.data[0].name).toBe("WS 1")
  })
})

describe("GET /api/workspaces/:id", () => {
  it("returns 403 if not a member", async () => {
    const owner = await createTestUser()
    const other = await createTestUser()

    const createRes = await (
      await request()
    )
      .post("/api/workspaces")
      .set(await getAuthHeaders(owner.id))
      .send({ name: "Private WS" })
    const wsId = createRes.body.data.id

    const res = await (await request())
      .get(`/api/workspaces/${wsId}`)
      .set(await getAuthHeaders(other.id))

    expect(res.status).toBe(403)
  })
})

describe("DELETE /api/workspaces/:id", () => {
  it("soft-deletes the workspace", async () => {
    const user = await createTestUser()
    const createRes = await (
      await request()
    )
      .post("/api/workspaces")
      .set(await getAuthHeaders(user.id))
      .send({ name: "Delete Me" })
    const wsId = createRes.body.data.id

    const delRes = await (await request())
      .delete(`/api/workspaces/${wsId}`)
      .set(await getAuthHeaders(user.id))

    expect(delRes.status).toBe(200)

    const getRes = await (await request())
      .get(`/api/workspaces/${wsId}`)
      .set(await getAuthHeaders(user.id))
    expect(getRes.status).toBe(404)
  })
})
