export async function up(knex) {
  await knex.raw(
    `CREATE INDEX IF NOT EXISTS idx_email_tokens_expires_at ON email_tokens (expires_at)`,
  )
  await knex.raw(
    `CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at ON refresh_tokens (expires_at)`,
  )
}

export async function down(knex) {
  await knex.raw(`DROP INDEX IF EXISTS idx_email_tokens_expires_at`)
  await knex.raw(`DROP INDEX IF EXISTS idx_refresh_tokens_expires_at`)
}
