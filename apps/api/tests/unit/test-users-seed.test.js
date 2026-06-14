import { vi } from "vitest"
import { seed } from "../../database/seeds/02_test_users.js"

/** Minimal chainable knex stub: knex('users').insert([...]).onConflict('id').ignore() */
const makeKnex = () => {
  const ignore = vi.fn().mockResolvedValue(undefined)
  const onConflict = vi.fn(() => ({ ignore }))
  const insert = vi.fn(() => ({ onConflict }))
  const knex = vi.fn(() => ({ insert }))
  knex._insert = insert
  return knex
}

const ENV = process.env.NODE_ENV

afterEach(() => {
  process.env.NODE_ENV = ENV
})

describe("02_test_users seed", () => {
  it("does not insert users when NODE_ENV is production", async () => {
    process.env.NODE_ENV = "production"
    const knex = makeKnex()
    await seed(knex)
    expect(knex._insert).not.toHaveBeenCalled()
  })

  it("inserts users in non-production", async () => {
    process.env.NODE_ENV = "development"
    const knex = makeKnex()
    await seed(knex)
    expect(knex._insert).toHaveBeenCalledTimes(1)
  })
})
