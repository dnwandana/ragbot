export async function up(knex) {
  await knex.raw('CREATE EXTENSION IF NOT EXISTS pgcrypto')
  await knex.raw('CREATE EXTENSION IF NOT EXISTS vector')

  await knex.raw(`
    CREATE TYPE membership_status AS ENUM ('invited', 'active', 'suspended')
  `)
  await knex.raw(`
    CREATE TYPE file_processing_status AS ENUM (
      'pending', 'queued', 'processing', 'completed', 'failed', 'cancelled'
    )
  `)
  await knex.raw(`
    CREATE TYPE message_role AS ENUM ('system', 'user', 'assistant', 'tool')
  `)
  await knex.raw(`
    CREATE TYPE audit_entity_type AS ENUM (
      'workspace', 'workspace_member', 'role', 'role_permission',
      'dataset', 'dataset_file', 'agent', 'conversation', 'conversation_dataset'
    )
  `)
  await knex.raw(`
    CREATE TYPE audit_action AS ENUM (
      'created', 'updated', 'deleted', 'invited', 'joined', 'suspended',
      'role_changed', 'permission_granted', 'permission_revoked',
      'uploaded', 'reprocessed', 'attached', 'detached', 'set_default'
    )
  `)
}

export async function down(knex) {
  await knex.raw('DROP TYPE IF EXISTS audit_action CASCADE')
  await knex.raw('DROP TYPE IF EXISTS audit_entity_type CASCADE')
  await knex.raw('DROP TYPE IF EXISTS message_role CASCADE')
  await knex.raw('DROP TYPE IF EXISTS file_processing_status CASCADE')
  await knex.raw('DROP TYPE IF EXISTS membership_status CASCADE')
  await knex.raw('DROP EXTENSION IF EXISTS vector CASCADE')
  await knex.raw('DROP EXTENSION IF EXISTS pgcrypto CASCADE')
}
