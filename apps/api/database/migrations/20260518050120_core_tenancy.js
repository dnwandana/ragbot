export async function up(knex) {
  await knex.raw(`
    CREATE TABLE workspaces (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      settings JSONB NOT NULL DEFAULT '{}',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      deleted_at TIMESTAMPTZ
    )
  `)
  await knex.raw(`
    CREATE UNIQUE INDEX idx_workspaces_name_active
      ON workspaces (name) WHERE deleted_at IS NULL
  `)

  await knex.raw(`
    CREATE TABLE users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      full_name TEXT NOT NULL,
      email_verified BOOLEAN NOT NULL DEFAULT FALSE,
      failed_login_attempts INTEGER NOT NULL DEFAULT 0,
      locked_until TIMESTAMPTZ,
      last_login_at TIMESTAMPTZ,
      settings JSONB NOT NULL DEFAULT '{}',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      deleted_at TIMESTAMPTZ,
      CONSTRAINT users_email_lowercase CHECK (email = lower(email))
    )
  `)
  await knex.raw(`
    CREATE UNIQUE INDEX idx_users_email_active
      ON users (email) WHERE deleted_at IS NULL
  `)

  await knex.raw(`
    CREATE TABLE email_tokens (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL,
      type TEXT NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      used_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      CONSTRAINT email_tokens_type CHECK (
        type IN ('verify_email', 'reset_password', 'workspace_invitation')
      )
    )
  `)
  await knex.raw(`CREATE UNIQUE INDEX idx_email_tokens_hash ON email_tokens (token_hash)`)
  await knex.raw(`CREATE INDEX idx_email_tokens_user ON email_tokens (user_id)`)
  await knex.raw(`CREATE INDEX idx_email_tokens_type_expires ON email_tokens (type, expires_at)`)

  await knex.raw(`
    CREATE TABLE refresh_tokens (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL UNIQUE,
      expires_at TIMESTAMPTZ NOT NULL,
      revoked_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `)
  await knex.raw(`CREATE INDEX idx_refresh_tokens_user ON refresh_tokens (user_id)`)
}

export async function down(knex) {
  await knex.raw('DROP TABLE IF EXISTS refresh_tokens CASCADE')
  await knex.raw('DROP TABLE IF EXISTS email_tokens CASCADE')
  await knex.raw('DROP TABLE IF EXISTS users CASCADE')
  await knex.raw('DROP TABLE IF EXISTS workspaces CASCADE')
}
