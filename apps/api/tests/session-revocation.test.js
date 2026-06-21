import { request, getApp, createTestUser, getAuthHeaders, cleanAllTables } from "./helpers.js"
import { isSessionDenied } from "../src/utils/session-denylist.js"

describe("access-token denylist enforcement", () => {
  beforeAll(async () => {
    await getApp()
  })

  beforeEach(async () => {
    await cleanAllTables()
    isSessionDenied.mockResolvedValue(false)
  })

  it("rejects a request whose session is denied", async () => {
    const user = await createTestUser()
    const headers = await getAuthHeaders(user.id)

    isSessionDenied.mockResolvedValueOnce(true)

    const res = await (await request()).get("/api/auth/me").set(headers)
    expect(res.status).toBe(401)
  })

  it("allows a request whose session is not denied", async () => {
    const user = await createTestUser()
    const headers = await getAuthHeaders(user.id)

    const res = await (await request()).get("/api/auth/me").set(headers)
    expect(res.status).toBe(200)
  })
})

describe("logout denylist", () => {
  beforeAll(async () => {
    await getApp()
  })

  beforeEach(async () => {
    await cleanAllTables()
    isSessionDenied.mockResolvedValue(false)
  })

  it("logout denylists the current session", async () => {
    const { denySession } = await import("../src/utils/session-denylist.js")
    const user = await createTestUser()
    const headers = await getAuthHeaders(user.id)

    const res = await (await request()).post("/api/auth/logout").set(headers)
    expect(res.status).toBe(200)
    expect(denySession).toHaveBeenCalled()
  })
})
