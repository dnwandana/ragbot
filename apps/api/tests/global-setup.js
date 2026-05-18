import knex from "knex"
import config from "../knexfile.js"
import { seed as seedPermissions } from "../database/seeds/01_permissions.js"

export async function setup() {
  const db = knex(config)
  await db.migrate.latest()
  await seedPermissions(db)
  await db.destroy()
}
