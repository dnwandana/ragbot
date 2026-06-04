import knex from "knex"
import config from "../knexfile.js"
import { seed as seedPermissions } from "../database/seeds/01_permissions.js"

export async function setup() {
  const db = knex({
    ...config,
    // The shared test DB's `knex_migrations` table records migration entries that were later
    // folded into the base migration files and removed from disk. By default `migrate.latest()`
    // validates the recorded list against the files on disk and aborts on that drift. This
    // flag tells Knex to tolerate the missing files so migrations can still run. Test-only and
    // non-destructive — it changes nothing in the database, only relaxes the list validation.
    migrations: { ...config.migrations, disableMigrationsListValidation: true },
  })
  await db.migrate.latest()
  await seedPermissions(db)
  await db.destroy()
}
