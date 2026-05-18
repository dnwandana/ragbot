export async function up(knex) {
  await knex.raw(`
    CREATE TABLE conversations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE RESTRICT,
      title TEXT,
      last_message_at TIMESTAMPTZ,
      metadata JSONB NOT NULL DEFAULT '{}',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      deleted_at TIMESTAMPTZ,
      CONSTRAINT conversations_id_workspace UNIQUE (id, workspace_id)
    )
  `)
  await knex.raw(`
    CREATE INDEX idx_conversations_workspace ON conversations (workspace_id) WHERE deleted_at IS NULL
  `)
  await knex.raw(`
    CREATE INDEX idx_conversations_user ON conversations (user_id) WHERE deleted_at IS NULL
  `)
  await knex.raw(`
    CREATE INDEX idx_conversations_last_message
      ON conversations (workspace_id, last_message_at DESC) WHERE deleted_at IS NULL
  `)
  await knex.raw(`CREATE INDEX idx_conversations_agent ON conversations (agent_id)`)

  await knex.raw(`
    CREATE TABLE conversation_datasets (
      conversation_id UUID NOT NULL,
      dataset_id UUID NOT NULL,
      workspace_id UUID NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      PRIMARY KEY (conversation_id, dataset_id),
      CONSTRAINT conv_datasets_conv_fk FOREIGN KEY (conversation_id, workspace_id)
        REFERENCES conversations (id, workspace_id) ON DELETE CASCADE,
      CONSTRAINT conv_datasets_dataset_fk FOREIGN KEY (dataset_id, workspace_id)
        REFERENCES datasets (id, workspace_id) ON DELETE CASCADE
    )
  `)
  await knex.raw(`CREATE INDEX idx_conversation_datasets_dataset ON conversation_datasets (dataset_id)`)

  await knex.raw(`
    CREATE TABLE messages (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      conversation_id UUID NOT NULL,
      workspace_id UUID NOT NULL,
      role message_role NOT NULL,
      step_type VARCHAR(20) NOT NULL DEFAULT 'input',
      content TEXT,
      content_json JSONB,
      model TEXT,
      prompt_tokens INTEGER CHECK (prompt_tokens >= 0),
      completion_tokens INTEGER CHECK (completion_tokens >= 0),
      total_tokens INTEGER CHECK (total_tokens >= 0),
      latency_ms INTEGER CHECK (latency_ms >= 0),
      metadata JSONB NOT NULL DEFAULT '{}',
      created_by UUID REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      CONSTRAINT messages_step_type CHECK (
        step_type IN ('input', 'thought', 'observation', 'final_answer')
      ),
      CONSTRAINT messages_workspace_fk FOREIGN KEY (conversation_id, workspace_id)
        REFERENCES conversations (id, workspace_id) ON DELETE CASCADE,
      CONSTRAINT messages_id_workspace UNIQUE (id, workspace_id),
      CONSTRAINT messages_id_conversation UNIQUE (id, conversation_id)
    )
  `)
  await knex.raw(`CREATE INDEX idx_messages_conversation_created ON messages (conversation_id, created_at)`)
  await knex.raw(`CREATE INDEX idx_messages_conversation_step ON messages (conversation_id, step_type)`)
  await knex.raw(`CREATE INDEX idx_messages_workspace ON messages (workspace_id, created_at DESC)`)

  await knex.raw(`
    CREATE TABLE message_citations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      message_id UUID NOT NULL,
      workspace_id UUID NOT NULL,
      chunk_id UUID REFERENCES document_chunks(id) ON DELETE SET NULL,
      citation_number INTEGER NOT NULL CHECK (citation_number > 0),
      relevance_score REAL NOT NULL CHECK (relevance_score BETWEEN 0.0 AND 1.0),
      cited_text TEXT NOT NULL,
      snippet_start_char INTEGER,
      snippet_end_char INTEGER,
      metadata JSONB NOT NULL DEFAULT '{}',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      CONSTRAINT citations_message_fk FOREIGN KEY (message_id, workspace_id)
        REFERENCES messages (id, workspace_id) ON DELETE CASCADE,
      CONSTRAINT citations_message_citation_number UNIQUE (message_id, citation_number),
      CONSTRAINT citations_message_chunk UNIQUE (message_id, chunk_id),
      CONSTRAINT citations_snippet CHECK (
        (snippet_start_char IS NULL AND snippet_end_char IS NULL) OR
        (snippet_start_char IS NOT NULL AND snippet_end_char IS NOT NULL
         AND snippet_end_char > snippet_start_char)
      )
    )
  `)
  await knex.raw(`CREATE INDEX idx_citations_message ON message_citations (message_id, citation_number)`)
  await knex.raw(`CREATE INDEX idx_citations_chunk ON message_citations (chunk_id)`)
  await knex.raw(`
    CREATE UNIQUE INDEX uq_citations_message_null_chunk
      ON message_citations (message_id) WHERE chunk_id IS NULL
  `)
}

export async function down(knex) {
  await knex.raw('DROP TABLE IF EXISTS message_citations CASCADE')
  await knex.raw('DROP TABLE IF EXISTS messages CASCADE')
  await knex.raw('DROP TABLE IF EXISTS conversation_datasets CASCADE')
  await knex.raw('DROP TABLE IF EXISTS conversations CASCADE')
}
