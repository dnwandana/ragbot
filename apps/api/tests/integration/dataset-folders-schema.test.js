import { beforeAll, beforeEach, describe, it, expect } from "vitest"
import db from "../../src/config/database.js"
import { createTestUser, createTestWorkspace, cleanAllTables, seedPermissions } from "../helpers.js"

let ws, dsId

const insertDataset = async () => {
  const id = crypto.randomUUID()
  await db("datasets").insert({
    id,
    workspace_id: ws.id,
    name: "DS",
    created_at: new Date(),
    updated_at: new Date(),
  })
  return id
}
const insertFolder = (fields) =>
  db("dataset_folders")
    .insert({ dataset_id: dsId, workspace_id: ws.id, parent_id: null, ...fields })
    .returning(["id"])
    .then(([row]) => row.id)

beforeAll(async () => {
  await seedPermissions()
})
beforeEach(async () => {
  await cleanAllTables()
  const user = await createTestUser()
  ws = await createTestWorkspace(user.id)
  dsId = await insertDataset()
})

describe("dataset_folders schema", () => {
  it("rejects a sibling name that differs only in case", async () => {
    await insertFolder({ name: "Reports" })
    await expect(insertFolder({ name: "reports" })).rejects.toMatchObject({
      code: "23505",
      constraint: "dataset_folders_sibling_name",
    })
  })

  it("allows the same name in a different parent and after a soft delete", async () => {
    const a = await insertFolder({ name: "A" })
    await insertFolder({ name: "Reports", parent_id: a })
    const root = await insertFolder({ name: "Reports" })
    await db("dataset_folders").where({ id: root }).update({ deleted_at: new Date() })
    await expect(insertFolder({ name: "REPORTS" })).resolves.toBeTruthy()
  })

  it("rejects invalid names", async () => {
    for (const name of ["", " a", "a/b", ".", ".."]) {
      await expect(insertFolder({ name })).rejects.toMatchObject({ code: "23514" })
    }
  })

  it("rejects a parent from a different dataset", async () => {
    const parent = await insertFolder({ name: "P" })
    dsId = await insertDataset()
    await expect(insertFolder({ name: "C", parent_id: parent })).rejects.toMatchObject({
      code: "23503",
    })
  })

  it("accepts the dataset_folder audit entity type", async () => {
    const { rows } = await db.raw(`SELECT 'dataset_folder'::audit_entity_type AS t`)
    expect(rows[0].t).toBe("dataset_folder")
  })

  it("rejects a file in a folder of a different dataset", async () => {
    const folder = await insertFolder({ name: "P" })
    const otherDs = await insertDataset()
    const insert = db("dataset_files").insert({
      id: crypto.randomUUID(),
      dataset_id: otherDs,
      workspace_id: ws.id,
      folder_id: folder,
      filename: "a.md",
      mime_type: "text/markdown",
      file_size_bytes: 1,
      status: "completed",
    })
    await expect(insert).rejects.toMatchObject({ code: "23503" })
  })
})
