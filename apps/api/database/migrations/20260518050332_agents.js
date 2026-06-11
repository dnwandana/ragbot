export async function up(knex) {
  await knex.raw(`
    CREATE TABLE agents (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      description TEXT,
      system_prompt TEXT NOT NULL DEFAULT '',
      model_config JSONB NOT NULL DEFAULT '{"model":"openai/gpt-5.4-mini","temperature":0.7,"top_p":1,"max_tokens":4096}',
      is_system BOOLEAN NOT NULL DEFAULT FALSE,
      is_default BOOLEAN NOT NULL DEFAULT FALSE,
      created_by UUID REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      deleted_at TIMESTAMPTZ,
      CONSTRAINT agents_id_workspace UNIQUE (id, workspace_id)
    )
  `)
  await knex.raw(`CREATE INDEX idx_agents_workspace ON agents (workspace_id) WHERE deleted_at IS NULL`)
  await knex.raw(`CREATE INDEX idx_agents_workspace_all ON agents (workspace_id)`)
  await knex.raw(`
    CREATE UNIQUE INDEX idx_agents_workspace_system
      ON agents (workspace_id) WHERE is_system = TRUE AND deleted_at IS NULL
  `)
  await knex.raw(`
    CREATE UNIQUE INDEX idx_agents_workspace_default
      ON agents (workspace_id) WHERE is_default = TRUE AND deleted_at IS NULL
  `)
}

export async function down(knex) {
  await knex.raw('DROP TABLE IF EXISTS agents CASCADE')
}
