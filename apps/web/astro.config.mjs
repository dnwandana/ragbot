import { defineConfig } from "astro/config"
import sitemap from "@astrojs/sitemap"
import { loadEnv } from "vite"
import { validateEnv } from "./src/utils/validate-env.js"

// loadEnv merges .env files AND matching process.env (so Docker build args are picked up).
// `astro dev` often runs with NODE_ENV unset; default to "development" in that case so the
// dev server reads .env.development, while builds default to "production".
const mode = process.env.NODE_ENV || (process.argv.includes("dev") ? "development" : "production")
const env = validateEnv(loadEnv(mode, process.cwd(), "PUBLIC_"))

export default defineConfig({
  output: "static",
  site: env.PUBLIC_SITE_URL,
  integrations: [sitemap()],
})
