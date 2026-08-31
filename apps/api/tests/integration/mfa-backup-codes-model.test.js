import { describe, it, expect, afterEach, afterAll } from "vitest"
import db from "../../src/config/database.js"
import * as backupCodes from "../../src/models/mfa-backup-codes.js"
import { createTestUser, cleanAllTables } from "../helpers.js"

afterEach(cleanAllTables)
afterAll(() => db.destroy())

describe("mfa-backup-codes model", () => {
  it("generates 10 formatted codes", () => {
    const codes = backupCodes.generateCodes()
    expect(codes).toHaveLength(10)
    expect(codes[0]).toMatch(/^[0-9a-f]{4}-[0-9a-f]{4}$/)
  })

  it("replaceForUser stores hashed codes and countActive reports 10", async () => {
    const user = await createTestUser()
    const codes = backupCodes.generateCodes()
    await backupCodes.replaceForUser(user.id, codes)

    expect(await backupCodes.countActive(user.id)).toBe(10)
    const rows = await db("mfa_backup_codes").where({ user_id: user.id })
    expect(rows[0].code_hash).not.toBe(codes[0]) // hashed, not plaintext
  })

  it("consume accepts a valid code once, then rejects reuse", async () => {
    const user = await createTestUser()
    const codes = backupCodes.generateCodes()
    await backupCodes.replaceForUser(user.id, codes)

    expect(await backupCodes.consume(user.id, codes[0])).toBe(true)
    expect(await backupCodes.consume(user.id, codes[0])).toBe(false)
    expect(await backupCodes.countActive(user.id)).toBe(9)
  })

  it("consume rejects an unknown code", async () => {
    const user = await createTestUser()
    await backupCodes.replaceForUser(user.id, backupCodes.generateCodes())
    expect(await backupCodes.consume(user.id, "ffff-ffff")).toBe(false)
  })

  it("replaceForUser clears previous codes", async () => {
    const user = await createTestUser()
    await backupCodes.replaceForUser(user.id, backupCodes.generateCodes())
    await backupCodes.replaceForUser(user.id, backupCodes.generateCodes())
    expect(await backupCodes.countActive(user.id)).toBe(10)
  })
})
