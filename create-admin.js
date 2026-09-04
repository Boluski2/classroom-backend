#!/usr/bin/env node
import 'dotenv/config';
import crypto from 'crypto';
import { hashPassword } from 'better-auth/crypto';
import { Client } from 'pg';

const email = process.argv[2] || 'babatundebolu@gail.com';
const password = process.argv[3];
const name = process.argv[4] || 'Administrator';

if (!password) {
  console.error('Usage: node create-admin.js <email> <password> [name]');
  process.exit(1);
}

if (!process.env.DATABASE_URL) {
  console.error('Please set DATABASE_URL in your environment or .env file');
  process.exit(1);
}

if (!process.env.BETTER_AUTH_SECRET) {
  console.error('Please set BETTER_AUTH_SECRET in your environment or .env file');
  process.exit(1);
}

const client = new Client({ connectionString: process.env.DATABASE_URL });

(async () => {
  try {
    await client.connect();

    const res = await client.query('SELECT id FROM "user" WHERE email = $1', [email]);
    if (res.rows.length > 0) {
      const userId = res.rows[0].id;
      const accountId = crypto.randomUUID();
      const hashed = await hashPassword(password);

      await client.query('BEGIN');
      await client.query(
        'UPDATE "user" SET role = $1, updated_at = now() WHERE id = $2',
        ['admin', userId]
      );

      const account = await client.query(
        'SELECT id FROM "account" WHERE user_id = $1 LIMIT 1',
        [userId]
      );

      if (account.rows.length > 0) {
        await client.query(
          `UPDATE "account"
           SET account_id = $1, provider_id = $2, password = $3, updated_at = now()
           WHERE id = $4`,
          [userId, 'credential', hashed, account.rows[0].id]
        );
      } else {
        await client.query(
          `INSERT INTO "account" (id, user_id, account_id, provider_id, password, created_at, updated_at)
           VALUES ($1,$2,$3,$4,$5, now(), now())`,
          [accountId, userId, userId, 'credential', hashed]
        );
      }

      await client.query('COMMIT');
      console.log('Repaired admin:', email);
      process.exit(0);
    }

    const userId = crypto.randomUUID();
    const accountId = crypto.randomUUID();
    const hashed = await hashPassword(password);

    await client.query('BEGIN');

    await client.query(
      `INSERT INTO "user" (id, name, email, email_verified, role, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5, now(), now())`,
      [userId, name, email, true, 'admin']
    );

    await client.query(
      `INSERT INTO "account" (id, user_id, account_id, provider_id, password, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5, now(), now())`,
      [accountId, userId, userId, 'credential', hashed]
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
