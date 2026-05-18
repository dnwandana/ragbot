const PERMISSIONS = [
  { resource: 'workspace', action: 'create' },
  { resource: 'workspace', action: 'read' },
  { resource: 'workspace', action: 'update' },
  { resource: 'workspace', action: 'delete' },
  { resource: 'role', action: 'create' },
  { resource: 'role', action: 'read' },
  { resource: 'role', action: 'update' },
  { resource: 'role', action: 'delete' },
  { resource: 'member', action: 'read' },
  { resource: 'member', action: 'invite' },
  { resource: 'member', action: 'remove' },
  { resource: 'member', action: 'manage_role' },
  { resource: 'audit', action: 'read' },
  { resource: 'dataset', action: 'create' },
  { resource: 'dataset', action: 'read' },
  { resource: 'dataset', action: 'update' },
  { resource: 'dataset', action: 'delete' },
  { resource: 'file', action: 'read' },
  { resource: 'file', action: 'upload' },
  { resource: 'file', action: 'update' },
  { resource: 'file', action: 'delete' },
  { resource: 'file', action: 'reprocess' },
  { resource: 'agent', action: 'create' },
  { resource: 'agent', action: 'read' },
  { resource: 'agent', action: 'update' },
  { resource: 'agent', action: 'delete' },
  { resource: 'conversation', action: 'create' },
  { resource: 'conversation', action: 'read' },
  { resource: 'conversation', action: 'update' },
  { resource: 'conversation', action: 'delete' },
  { resource: 'conversation', action: 'chat' },
]

export async function seed(knex) {
  for (const { resource, action } of PERMISSIONS) {
    await knex('permissions')
      .insert({
        id: knex.raw('gen_random_uuid()'),
        name: `${resource}:${action}`,
        description: `Can ${action} ${resource}`,
        resource,
        action,
        created_at: new Date(),
      })
      .onConflict(['resource', 'action'])
      .ignore()
  }
}
