/**
 * Adds session-metadata columns to refresh_tokens so each row can act as a
 * listable, revocable session (device, IP, last-active, resolved location).
 */
export async function up(knex) {
  await knex.raw(`
    ALTER TABLE refresh_tokens
      ADD COLUMN user_agent TEXT,
      ADD COLUMN ip_address TEXT,
      ADD COLUMN last_used_at TIMESTAMPTZ,
      ADD COLUMN location TEXT
  `)
}

export async function down(knex) {
  await knex.raw(`
    ALTER TABLE refresh_tokens
      DROP COLUMN user_agent,
      DROP COLUMN ip_address,
      DROP COLUMN last_used_at,
      DROP COLUMN location
  `)
}
