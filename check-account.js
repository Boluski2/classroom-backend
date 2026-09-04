import 'dotenv/config';
import { Client } from 'pg';

const email = process.argv[2] || 'babatundebolu@gail.com';
const client = new Client({ connectionString: process.env.DATABASE_URL });

(async () => {
  try {
    await client.connect();
    const u = await client.query('SELECT * FROM "user" WHERE email = $1', [email]);
    console.log('user rows:', u.rows);
    const a = await client.query('SELECT * FROM "account" WHERE user_id = $1', [u.rows[0]?.id]);
    console.log('account rows:', a.rows);
  } catch (err) {
    console.error('error', err);
  } finally {
    await client.end();
  }
})();
