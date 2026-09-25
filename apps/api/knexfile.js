import dotenv from "dotenv"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const envFile = process.env.NODE_ENV === "test" ? ".env.test" : ".env"
dotenv.config({ path: path.resolve(__dirname, envFile) })

const config = {
  client: "pg",
  connection: {
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes("sslmode=require")
      ? { rejectUnauthorized: true }
      : false,
  },
  useNullAsDefault: true,
  migrations: {
    directory: "./database/migrations",
    // The shared test database records migration entries that were later folded
    // into the base files and removed from disk. Knex aborts on that drift, so
    // the test config tolerates it. It relaxes a check only, and writes nothing.
    disableMigrationsListValidation: process.env.NODE_ENV === "test",
  },
  seeds: {
    directory: "./database/seeds",
  },
  pool: {
    min: 2,
    max: 10,
    acquireTimeoutMillis: 30000,
    idleTimeoutMillis: 30000,
  },
  // Database query logging
  log: {
    warn: (message) => {
      if (process.env.NODE_ENV === "development") {
        console.warn(`[Knex Warning] ${message}`)
      }
    },
    error: (message) => {
      console.error(`[Knex Error] ${message}`)
    },
    debug: (message) => {
      if (process.env.NODE_ENV === "development") {
        console.log(`[Knex Debug] ${message}`)
      }
    },
  },
}

export default config
