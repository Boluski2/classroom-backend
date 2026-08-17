#!/usr/bin/env node
import 'dotenv/config';
import crypto from 'crypto';
import { Client } from 'pg';

const email = process.argv[2] || 'babatundebolu@gail.com';
const password = process.argv[3] || 'Bolu1234';
const name = process.argv[4] || 'Administrator';

if (!process.env.DATABASE_URL) {
  console.error('Please set DATABASE_URL in your environment or .env file');
  process.exit(1);
}

if (!process.env.BETTER_AUTH_SECRET) {
  console.error('Please set BETTER_AUTH_SECRET in your environment or .env file');
  process.exit(1);
}

function hashPassword(pw) {
  return crypto.createHash('sha256').update(pw + process.env.BETTER_AUTH_SECRET).digest('hex');
}

const client = new Client({ connectionString: process.env.DATABASE_URL });

(async () => {
  try {
    await client.connect();

    const res = await client.query('SELECT id FROM "user" WHERE email = $1', [email]);
    if (res.rows.length > 0) {
      console.log('User with this email already exists:', email);
      process.exit(0);
    }

    const userId = crypto.randomUUID();
    const accountId = crypto.randomUUID();
    const hashed = hashPassword(password);

    await client.query('BEGIN');

    await client.query(
      `INSERT INTO "user" (id, name, email, email_verified, role, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5, now(), now())`,
      [userId, name, email, true, 'admin']
    );

    await client.query(
      `INSERT INTO "account" (id, user_id, account_id, provider_id, password, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5, now(), now())`,
      [accountId, userId, email, 'email', hashed]
    );

    await client.query('COMMIT');
    console.log('Created admin:', email);
    console.log('Password:', password);
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Failed to create admin:', err.message || err);
    process.exit(1);
  } finally {
    await client.end();
  }
})();
