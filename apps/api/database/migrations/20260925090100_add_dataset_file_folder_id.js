const NIL = "'00000000-0000-0000-0000-000000000000'::uuid"

export async function up(knex) {
  await knex.raw(`ALTER TABLE dataset_files ADD COLUMN folder_id UUID`)
  await knex.raw(`
    ALTER TABLE dataset_files ADD CONSTRAINT dataset_files_folder_fk
      FOREIGN KEY (folder_id, dataset_id) REFERENCES dataset_folders (id, dataset_id)
  `)
  await knex.raw(`
    CREATE INDEX dataset_files_folder_name
      ON dataset_files (dataset_id, COALESCE(folder_id, ${NIL}), lower(filename), id)
      WHERE deleted_at IS NULL
  `)
  await knex.raw(`
    CREATE INDEX dataset_files_filename_trgm ON dataset_files USING gin (filename gin_trgm_ops)
      WHERE deleted_at IS NULL
  `)
}

export async function down(knex) {
  await knex.raw(`DROP INDEX IF EXISTS dataset_files_filename_trgm`)
  await knex.raw(`DROP INDEX IF EXISTS dataset_files_folder_name`)
  await knex.raw(`ALTER TABLE dataset_files DROP CONSTRAINT IF EXISTS dataset_files_folder_fk`)
  await knex.raw(`ALTER TABLE dataset_files DROP COLUMN IF EXISTS folder_id`)
}
