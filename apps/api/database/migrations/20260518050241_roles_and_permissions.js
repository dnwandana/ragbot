export async function up(knex) {
  await knex.raw(`
    CREATE TABLE permissions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      resource VARCHAR(50) NOT NULL,
      action VARCHAR(50) NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      CONSTRAINT permissions_resource_action UNIQUE (resource, action)
    )
  `)

  await knex.raw(`
    CREATE TABLE roles (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      name VARCHAR(50) NOT NULL,
      description TEXT,
      is_system BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      CONSTRAINT roles_workspace_name UNIQUE (workspace_id, name),
      CONSTRAINT roles_id_workspace UNIQUE (id, workspace_id)
    )
  `)
  await knex.raw(`CREATE INDEX idx_roles_workspace ON roles (workspace_id)`)

  await knex.raw(`
    CREATE TABLE role_permissions (
      role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
      permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
      PRIMARY KEY (role_id, permission_id)
    )
  `)
  await knex.raw(`CREATE INDEX idx_role_permissions_permission ON role_permissions (permission_id)`)

  await knex.raw(`
    CREATE TABLE workspace_members (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      role_id UUID NOT NULL,
      status membership_status NOT NULL DEFAULT 'invited',
      invited_by UUID REFERENCES users(id) ON DELETE SET NULL,
      joined_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      deleted_at TIMESTAMPTZ,
      CONSTRAINT workspace_members_role_fk FOREIGN KEY (role_id, workspace_id)
        REFERENCES roles (id, workspace_id) ON DELETE RESTRICT
    )
  `)
  await knex.raw(`
    CREATE UNIQUE INDEX idx_workspace_members_workspace_user
      ON workspace_members (workspace_id, user_id)
      WHERE deleted_at IS NULL AND user_id IS NOT NULL
  `)
  await knex.raw(`CREATE INDEX idx_workspace_members_user ON workspace_members (user_id)`)
  await knex.raw(`CREATE INDEX idx_workspace_members_role ON workspace_members (role_id)`)
  await knex.raw(`CREATE INDEX idx_workspace_members_workspace ON workspace_members (workspace_id)`)
}

export async function down(knex) {
  await knex.raw('DROP TABLE IF EXISTS workspace_members CASCADE')
  await knex.raw('DROP TABLE IF EXISTS role_permissions CASCADE')
  await knex.raw('DROP TABLE IF EXISTS roles CASCADE')
  await knex.raw('DROP TABLE IF EXISTS permissions CASCADE')
}
