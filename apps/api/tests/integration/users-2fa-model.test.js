import { describe, it, expect, afterEach, afterAll } from "vitest"
import db from "../../src/config/database.js"
import * as userModel from "../../src/models/users.js"
import { createTestUser, cleanAllTables } from "../helpers.js"

afterEach(cleanAllTables)
afterAll(() => db.destroy())

describe("users model — 2FA", () => {
  it("findOneWith2fa returns totp columns", async () => {
    const user = await createTestUser()
    await userModel.update({ id: user.id }, { totp_secret: "cipher", totp_enabled: true })

    const found = await userModel.findOneWith2fa({ id: user.id })
    expect(found.totp_secret).toBe("cipher")
    expect(found.totp_enabled).toBe(true)
  })

  it("excludes soft-deleted users", async () => {
    const user = await createTestUser()
    await userModel.softDelete(user.id)
    expect(await userModel.findOneWith2fa({ id: user.id })).toBeUndefined()
  })
})
