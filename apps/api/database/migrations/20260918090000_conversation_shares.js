// ALTER TYPE ... ADD VALUE cannot run inside a transaction block.
export const config = { transaction: false }

export async function up(knex) {
  await knex.raw(`
    CREATE TABLE conversation_shares (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      conversation_id UUID NOT NULL,
      workspace_id UUID NOT NULL,
      snapshot JSONB NOT NULL,
      created_by UUID REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      CONSTRAINT conversation_shares_conversation UNIQUE (conversation_id),
      CONSTRAINT conversation_shares_conversation_fk
        FOREIGN KEY (conversation_id, workspace_id)
        REFERENCES conversations (id, workspace_id) ON DELETE CASCADE
    )
  `)
  await knex.raw(`CREATE INDEX idx_conversation_shares_workspace ON conversation_shares (workspace_id)`)
  await knex.raw(`
    CREATE TRIGGER set_updated_at_conversation_shares
      BEFORE UPDATE ON conversation_shares
      FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at()
  `)

  await knex.raw(`
    INSERT INTO permissions (id, name, description, resource, action, created_at)
    VALUES (gen_random_uuid(), 'conversation:share', 'Can share conversation', 'conversation', 'share', now())
    ON CONFLICT (resource, action) DO NOTHING
  `)
  await knex.raw(`
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT r.id, p.id
    FROM roles r
    CROSS JOIN permissions p
    WHERE r.is_system = true
      AND r.name IN ('owner', 'admin', 'editor')
      AND p.name = 'conversation:share'
    ON CONFLICT DO NOTHING
  `)

  await knex.raw(`ALTER TYPE audit_entity_type ADD VALUE IF NOT EXISTS 'conversation_share'`)
  await knex.raw(`ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'shared'`)
  await knex.raw(`ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'unshared'`)
}

export async function down(knex) {
  // Postgres cannot remove an enum value. The enum additions stay.
  await knex.raw("DROP TABLE IF EXISTS conversation_shares CASCADE")
  await knex.raw(`DELETE FROM permissions WHERE name = 'conversation:share'`)
}
