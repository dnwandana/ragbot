// ALTER TYPE ... ADD VALUE cannot run inside a transaction block.
export const config = { transaction: false }

const NIL = "'00000000-0000-0000-0000-000000000000'::uuid"

export async function up(knex) {
  await knex.raw(`CREATE EXTENSION IF NOT EXISTS pg_trgm`)
  await knex.raw(`
    CREATE TABLE dataset_folders (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      dataset_id UUID NOT NULL,
      workspace_id UUID NOT NULL,
      parent_id UUID,
      name TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      deleted_at TIMESTAMPTZ,
      CONSTRAINT dataset_folders_dataset_fk FOREIGN KEY (dataset_id, workspace_id)
        REFERENCES datasets (id, workspace_id) ON DELETE CASCADE,
      CONSTRAINT dataset_folders_id_dataset UNIQUE (id, dataset_id),
      CONSTRAINT dataset_folders_parent_fk FOREIGN KEY (parent_id, dataset_id)
        REFERENCES dataset_folders (id, dataset_id) ON DELETE CASCADE,
      CONSTRAINT dataset_folders_not_own_parent CHECK (parent_id <> id),
      CONSTRAINT dataset_folders_name_valid CHECK (
        name = btrim(name)
        AND length(name) BETWEEN 1 AND 255
        AND position('/' in name) = 0
        AND name NOT IN ('.', '..')
      )
    )
  `)
  await knex.raw(`
    CREATE UNIQUE INDEX dataset_folders_sibling_name
      ON dataset_folders (dataset_id, COALESCE(parent_id, ${NIL}), lower(name))
      WHERE deleted_at IS NULL
  `)
  await knex.raw(`
    CREATE INDEX dataset_folders_name_trgm ON dataset_folders USING gin (name gin_trgm_ops)
      WHERE deleted_at IS NULL
  `)
  await knex.raw(`
    CREATE TRIGGER set_updated_at_dataset_folders
      BEFORE UPDATE ON dataset_folders
      FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at()
  `)
  await knex.raw(`ALTER TYPE audit_entity_type ADD VALUE IF NOT EXISTS 'dataset_folder'`)
}

export async function down(knex) {
  // Postgres cannot remove an enum value, so 'dataset_folder' stays.
  // pg_trgm stays, because other objects can use it.
  await knex.raw(`DROP TABLE IF EXISTS dataset_folders CASCADE`)
}
