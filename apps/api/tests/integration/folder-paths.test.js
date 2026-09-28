import { vi, beforeAll, beforeEach, describe, it, expect } from "vitest"
import db from "../../src/config/database.js"
import {
  request,
  createTestUser,
  createTestWorkspace,
  getAuthHeaders,
  cleanAllTables,
  seedPermissions,
} from "../helpers.js"
import * as folderModel from "../../src/models/dataset-folders.js"
import { buildTrie } from "../../src/services/folder-paths.js"

vi.mock("../../src/services/email.js", () => ({
  sendVerificationEmail: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
  sendInvitationEmail: vi.fn(),
}))

let user, ws, dsId
const base = () => `/api/workspaces/${ws.id}/datasets/${dsId}/folders`
const mk = (name, parentId = null) =>
  folderModel.create({ datasetId: dsId, workspaceId: ws.id, parentId, name })

beforeAll(async () => {
  await seedPermissions()
})
beforeEach(async () => {
  await cleanAllTables()
  user = await createTestUser()
  ws = await createTestWorkspace(user.id)
  dsId = crypto.randomUUID()
  await db("datasets").insert({
    id: dsId,
    workspace_id: ws.id,
    name: "Handbook",
    created_at: new Date(),
    updated_at: new Date(),
  })
})

describe("buildTrie", () => {
  it("merges segments that differ only in case, and the first spelling wins", () => {
    const roots = buildTrie(["Photos/2024", "photos/2025", "Docs"])
    expect(roots.map((n) => n.name)).toEqual(["Photos", "Docs"])
    expect([...roots[0].children.values()].map((n) => n.name)).toEqual(["2024", "2025"])
    expect(() => buildTrie(["a//b"])).toThrow()
    expect(() => buildTrie(["a/../b"])).toThrow()
  })
})

const ensure = async (body) =>
  (await request())
    .post(`${base()}/ensure-paths`)
    .set(await getAuthHeaders(user.id))
    .send(body)
const names = (parentId) =>
  db("dataset_folders")
    .where({ dataset_id: dsId, parent_id: parentId })
    .whereNull("deleted_at")
    .orderBy("name")
    .pluck("name")

describe("POST /folders/ensure-paths", () => {
  it("creates the missing folders and maps every path to its folder", async () => {
    const existing = await mk("photos")
    const res = await ensure({ parent_id: null, paths: ["Photos/2024", "Photos/2024/Jan", "Docs"] })
    expect(res.status).toBe(200)
    const map = res.body.data.paths
    expect(Object.keys(map).toSorted()).toEqual(["Docs", "Photos/2024", "Photos/2024/Jan"])
    expect(await names(null)).toEqual(["Docs", "photos"])
    const y2024 = await db("dataset_folders").where({ id: map["Photos/2024"] }).first()
    expect(y2024.parent_id).toBe(existing.id)
    const jan = await db("dataset_folders").where({ id: map["Photos/2024/Jan"] }).first()
    expect(jan.parent_id).toBe(y2024.id)
    const created = await db("audit_logs").where({
      entity_type: "dataset_folder",
      action: "created",
    })
    expect(created).toHaveLength(3)
  })

  it("creates nothing on a second identical call", async () => {
    const body = { parent_id: null, paths: ["A/B/C"] }
    const first = await ensure(body)
    const second = await ensure(body)
    expect(second.body.data.paths).toEqual(first.body.data.paths)
    expect(await db("dataset_folders").count("* as n").first()).toEqual({ n: "3" })
  })

  it("creates under a parent folder and checks the depth", async () => {
    let parent = null
    for (let i = 0; i < 18; i++) parent = await mk(`L${i}`, parent?.id ?? null)
    expect((await ensure({ parent_id: parent.id, paths: ["x/y"] })).status).toBe(200)
    expect((await ensure({ parent_id: parent.id, paths: ["x/y/z"] })).status).toBe(422)
    expect((await ensure({ parent_id: crypto.randomUUID(), paths: ["x"] })).status).toBe(404)
  })

  it("rejects more than 1000 paths and bad segments", async () => {
    const many = Array.from({ length: 1001 }, (_, i) => `p${i}`)
    expect((await ensure({ parent_id: null, paths: many })).status).toBe(400)
    expect((await ensure({ parent_id: null, paths: ["ok/.."] })).status).toBe(400)
    expect((await ensure({ parent_id: null, paths: [] })).status).toBe(400)
  })
})
