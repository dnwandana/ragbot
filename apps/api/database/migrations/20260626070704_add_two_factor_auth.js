/**
 * Adds per-user TOTP 2FA columns to `users` and a `mfa_backup_codes` table.
 *
 * @param {import('knex').Knex} knex
 * @returns {Promise<void>}
 */
export async function up(knex) {
  await knex.raw(`
    ALTER TABLE users
      ADD COLUMN totp_secret TEXT,
      ADD COLUMN totp_enabled BOOLEAN NOT NULL DEFAULT FALSE,
      ADD COLUMN totp_enabled_at TIMESTAMPTZ
  `)

  await knex.raw(`
    CREATE TABLE mfa_backup_codes (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      code_hash TEXT NOT NULL,
      used_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `)

  await knex.raw(`
    CREATE INDEX idx_mfa_backup_codes_user_active
      ON mfa_backup_codes (user_id) WHERE used_at IS NULL
  `)
}

/**
 * @param {import('knex').Knex} knex
 * @returns {Promise<void>}
 */
export async function down(knex) {
  await knex.raw(`DROP TABLE IF EXISTS mfa_backup_codes`)
  await knex.raw(`
    ALTER TABLE users
      DROP COLUMN IF EXISTS totp_secret,
      DROP COLUMN IF EXISTS totp_enabled,
      DROP COLUMN IF EXISTS totp_enabled_at
  `)
}
