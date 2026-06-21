import crypto from "node:crypto"
import db from "../src/config/database.js"
import { createTestUser, cleanAllTables } from "./helpers.js"
import * as model from "../src/models/refresh-tokens.js"

describe("refresh-tokens model — sessions", () => {
  let userId

  beforeEach(async () => {
    await cleanAllTables()
    const user = await createTestUser()
    userId = user.id
  })

  afterAll(async () => {
    await cleanAllTables()
  })

  const future = () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

  it("create persists session metadata", async () => {
    const [row] = await model.create({
      user_id: userId,
      token_hash: crypto.randomUUID(),
      expires_at: future(),
      user_agent: "UA/1.0",
      ip_address: "203.0.113.9",
      location: "Berlin, DE",
    })
    const stored = await db("refresh_tokens").where({ id: row.id }).first()
    expect(stored.user_agent).toBe("UA/1.0")
    expect(stored.ip_address).toBe("203.0.113.9")
    expect(stored.location).toBe("Berlin, DE")
    expect(stored.last_used_at).not.toBeNull()
  })

  it("rotate swaps the hash in place and bumps last_used_at", async () => {
    const [row] = await model.create({
      user_id: userId,
      token_hash: "old-hash",
      expires_at: future(),
    })
    await model.rotate({ id: row.id, token_hash: "new-hash", expires_at: future() })
    const stored = await db("refresh_tokens").where({ id: row.id }).first()
    expect(stored.token_hash).toBe("new-hash")
    expect(stored.id).toBe(row.id)
  })

  it("findManyActiveByUserId returns only non-revoked, non-expired rows", async () => {
    const [active] = await model.create({ user_id: userId, token_hash: "a", expires_at: future() })
    const [revoked] = await model.create({ user_id: userId, token_hash: "b", expires_at: future() })
    await model.revokeById(revoked.id)
    const rows = await model.findManyActiveByUserId(userId)
    const ids = rows.map((r) => r.id)
    expect(ids).toContain(active.id)
    expect(ids).not.toContain(revoked.id)
  })

  it("findActiveByIdForUser scopes to the owner", async () => {
    const other = await createTestUser({ email: `o-${crypto.randomUUID()}@x.com` })
    const [row] = await model.create({ user_id: userId, token_hash: "c", expires_at: future() })
    expect(await model.findActiveByIdForUser({ id: row.id, user_id: userId })).toBeTruthy()
    expect(await model.findActiveByIdForUser({ id: row.id, user_id: other.id })).toBeFalsy()
  })

  it("revokeAllForUserExcept keeps the excepted session active", async () => {
    const [keep] = await model.create({ user_id: userId, token_hash: "k", expires_at: future() })
    const [drop] = await model.create({ user_id: userId, token_hash: "d", expires_at: future() })
    await model.revokeAllForUserExcept(userId, keep.id)
    const ids = await model.findActiveIdsByUserId(userId)
    expect(ids).toContain(keep.id)
    expect(ids).not.toContain(drop.id)
  })
})
