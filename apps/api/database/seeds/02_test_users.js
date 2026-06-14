import { hashPassword } from '../../src/utils/argon2.js'

export async function seed(knex) {
  if (process.env.NODE_ENV === 'production') {
    console.info('Skipping 02_test_users seed in production')
    return
  }

  const password = await hashPassword('Password123!')

  await knex('users')
    .insert([
      {
        id: '00000000-0000-0000-0000-000000000001',
        email: 'alice@example.com',
        password_hash: password,
        full_name: 'Alice Owner',
        email_verified: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: '00000000-0000-0000-0000-000000000002',
        email: 'bob@example.com',
        password_hash: password,
        full_name: 'Bob Member',
        email_verified: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
    ])
    .onConflict('id')
    .ignore()
}
