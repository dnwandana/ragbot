import crypto from "node:crypto"
import * as datasetModel from "../../src/models/datasets.js"
import {
  request,
  createTestUser,
  createTestWorkspace,
  getAuthHeaders,
  cleanAllTables,
  seedPermissions,
} from "../helpers.js"

let user
let workspace
let headers
let dataset

beforeAll(async () => {
  await seedPermissions()
})

beforeEach(async () => {
  await cleanAllTables()
  user = await createTestUser()
  workspace = await createTestWorkspace(user.id)
  headers = await getAuthHeaders(user.id)
  ;[dataset] = await datasetModel.create({
    id: crypto.randomUUID(),
    workspace_id: workspace.id,
    name: "DS",
    created_by: user.id,
    created_at: new Date(),
    updated_at: new Date(),
  })
})

const url = () => `/api/workspaces/${workspace.id}/datasets/${dataset.id}/files/youtube`

describe("POST /files/youtube", () => {
  it("creates a processing youtube file row and returns 201", async () => {
    const res = await (await request()).post(url()).set(headers).send({
      url: "https://youtu.be/aircAruvnKk",
    })

    expect(res.status).toBe(201)
    expect(res.body.data.status).toBe("processing")
    const meta = res.body.data.metadata
    expect(meta.source_type).toBe("youtube")
    expect(meta.video_id).toBe("aircAruvnKk")
    expect(meta.canonical_url).toBe("https://www.youtube.com/watch?v=aircAruvnKk")
  })

  it("rejects a non-YouTube URL with 400", async () => {
    const res = await (await request())
      .post(url())
      .set(headers)
      .send({ url: "https://vimeo.com/123" })
    expect(res.status).toBe(400)
  })

  it("rejects a missing url with 400", async () => {
    const res = await (await request()).post(url()).set(headers).send({})
    expect(res.status).toBe(400)
  })

  it("returns 404 for a dataset in another workspace", async () => {
    const otherWs = await createTestWorkspace(user.id)
    const res = await (await request())
      .post(`/api/workspaces/${otherWs.id}/datasets/${dataset.id}/files/youtube`)
      .set(headers)
      .send({ url: "https://youtu.be/aircAruvnKk" })
    expect(res.status).toBe(404)
  })
})
