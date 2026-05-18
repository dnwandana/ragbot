export async function up(knex) {
  await knex.raw(`
    CREATE TABLE datasets (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      description TEXT,
      embedding_model TEXT NOT NULL DEFAULT 'text-embedding-3-small',
      chunk_size INTEGER NOT NULL DEFAULT 1024,
      chunk_overlap INTEGER NOT NULL DEFAULT 128,
      settings JSONB NOT NULL DEFAULT '{}',
      created_by UUID REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      deleted_at TIMESTAMPTZ,
      CONSTRAINT datasets_id_workspace UNIQUE (id, workspace_id)
    )
  `)
  await knex.raw(`
    CREATE INDEX idx_datasets_workspace ON datasets (workspace_id) WHERE deleted_at IS NULL
  `)

  await knex.raw(`
    CREATE TABLE dataset_files (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      dataset_id UUID NOT NULL,
      workspace_id UUID NOT NULL,
      filename TEXT NOT NULL,
      mime_type VARCHAR(255),
      file_size_bytes BIGINT CHECK (file_size_bytes >= 0),
      storage_provider TEXT NOT NULL DEFAULT 's3',
      storage_path TEXT,
      status file_processing_status NOT NULL DEFAULT 'pending',
      error_message TEXT,
      chunk_count INTEGER NOT NULL DEFAULT 0,
      processing_started_at TIMESTAMPTZ,
      processing_completed_at TIMESTAMPTZ,
      uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
      metadata JSONB NOT NULL DEFAULT '{}',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      deleted_at TIMESTAMPTZ,
      CONSTRAINT dataset_files_dataset_fk FOREIGN KEY (dataset_id, workspace_id)
        REFERENCES datasets (id, workspace_id) ON DELETE CASCADE,
      CONSTRAINT dataset_files_id_dataset UNIQUE (id, dataset_id),
      CONSTRAINT dataset_files_id_workspace UNIQUE (id, workspace_id)
    )
  `)
  await knex.raw(`
    CREATE INDEX idx_dataset_files_dataset_filename
      ON dataset_files (dataset_id, filename) WHERE deleted_at IS NULL
  `)
  await knex.raw(`
    CREATE INDEX idx_dataset_files_dataset ON dataset_files (dataset_id) WHERE deleted_at IS NULL
  `)
  await knex.raw(`
    CREATE INDEX idx_dataset_files_status ON dataset_files (status) WHERE deleted_at IS NULL
  `)
  await knex.raw(`
    CREATE INDEX idx_dataset_files_workspace_status
      ON dataset_files (workspace_id, status) WHERE deleted_at IS NULL
  `)
  await knex.raw(`CREATE INDEX idx_dataset_files_dataset_id ON dataset_files (dataset_id)`)

  await knex.raw(`
    CREATE TABLE document_chunks (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      dataset_file_id UUID NOT NULL REFERENCES dataset_files(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      chunk_index INTEGER NOT NULL,
      embedding vector(1536),
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      CONSTRAINT document_chunks_file_index UNIQUE (dataset_file_id, chunk_index)
    )
  `)
  await knex.raw(`
    CREATE INDEX idx_chunks_embedding
      ON document_chunks USING hnsw (embedding vector_cosine_ops)
      WITH (m = 16, ef_construction = 200)
  `)
  await knex.raw(`CREATE INDEX idx_chunks_file_order ON document_chunks (dataset_file_id, chunk_index)`)
}

export async function down(knex) {
  await knex.raw('DROP TABLE IF EXISTS document_chunks CASCADE')
  await knex.raw('DROP TABLE IF EXISTS dataset_files CASCADE')
  await knex.raw('DROP TABLE IF EXISTS datasets CASCADE')
}
