const TABLES_WITH_UPDATED_AT = [
  'workspaces', 'users', 'roles', 'workspace_members',
  'datasets', 'dataset_files', 'agents', 'conversations', 'conversation_messages',
]

export async function up(knex) {
  await knex.raw(`
    CREATE OR REPLACE FUNCTION trigger_set_updated_at()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = now();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql
  `)

  for (const table of TABLES_WITH_UPDATED_AT) {
    await knex.raw(`
      CREATE TRIGGER set_updated_at_${table}
        BEFORE UPDATE ON ${table}
        FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at()
    `)
  }

  await knex.raw(`
    CREATE OR REPLACE FUNCTION search_chunks(
      query_embedding vector(1536),
      p_dataset_ids UUID[],
      p_match_count INTEGER DEFAULT 10,
      p_similarity_threshold FLOAT DEFAULT 0.0
    )
    RETURNS TABLE (
      chunk_id UUID,
      content TEXT,
      similarity FLOAT,
      dataset_id UUID,
      file_id UUID,
      filename TEXT,
      chunk_index INTEGER
    )
    LANGUAGE sql
    STABLE
    AS $$
      SELECT
        dc.id                                        AS chunk_id,
        dc.content,
        1 - (dc.embedding <=> query_embedding)       AS similarity,
        df.dataset_id,
        df.id                                        AS file_id,
        df.filename,
        dc.chunk_index
      FROM dataset_file_chunks dc
      JOIN dataset_files df ON df.id = dc.dataset_file_id
      WHERE
        df.dataset_id = ANY(p_dataset_ids)
        AND df.deleted_at IS NULL
        AND 1 - (dc.embedding <=> query_embedding) >= p_similarity_threshold
      ORDER BY dc.embedding <=> query_embedding
      LIMIT p_match_count;
    $$
  `)
}

export async function down(knex) {
  await knex.raw('DROP FUNCTION IF EXISTS search_chunks CASCADE')
  for (const table of TABLES_WITH_UPDATED_AT) {
    await knex.raw(`DROP TRIGGER IF EXISTS set_updated_at_${table} ON ${table}`)
  }
  await knex.raw('DROP FUNCTION IF EXISTS trigger_set_updated_at CASCADE')
}
