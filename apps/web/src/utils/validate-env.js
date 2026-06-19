import joi from "joi"

const envSchema = joi
  .object({
    PUBLIC_SITE_URL: joi.string().uri().required(),
    PUBLIC_APP_URL: joi.string().uri().required(),
    PUBLIC_DOCS_URL: joi.string().uri().required(),
  })
  .unknown(true)

/**
 * Validate the PUBLIC_* build-time env. Mirrors apps/api/src/utils/validate-env.js:
 * reports every error at once and exits the process on failure (Astro config has no
 * recoverable error path).
 * @param {Record<string, string>} env - PUBLIC_-prefixed vars from Vite's loadEnv
 * @returns {{ PUBLIC_SITE_URL: string, PUBLIC_APP_URL: string, PUBLIC_DOCS_URL: string }}
 */
export function validateEnv(env) {
  const { error, value } = envSchema.validate(env, { abortEarly: false })
  if (error) {
    const messages = error.details.map((d) => d.message).join("\n")
    console.error(`Environment validation failed:\n${messages}`)
    process.exit(1)
  }
  return value
}
