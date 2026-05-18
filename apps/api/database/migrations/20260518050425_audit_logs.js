export async function up(knex) {
  await knex.raw(`
    CREATE TABLE audit_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
      entity_type audit_entity_type NOT NULL,
      entity_id UUID NOT NULL,
      action audit_action NOT NULL,
      changes JSONB,
      context JSONB NOT NULL DEFAULT '{}',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `)
  await knex.raw(`CREATE INDEX idx_audit_workspace_created ON audit_logs (workspace_id, created_at DESC)`)
  await knex.raw(`
    CREATE INDEX idx_audit_workspace_entity_type
      ON audit_logs (workspace_id, entity_type, created_at DESC)
  `)
  await knex.raw(`
    CREATE INDEX idx_audit_workspace_user ON audit_logs (workspace_id, user_id, created_at DESC)
  `)
  await knex.raw(`CREATE INDEX idx_audit_entity ON audit_logs (entity_type, entity_id, created_at DESC)`)
  await knex.raw(`CREATE INDEX idx_audit_user_created ON audit_logs (user_id, created_at DESC)`)
}

export async function down(knex) {
  await knex.raw('DROP TABLE IF EXISTS audit_logs CASCADE')
}
