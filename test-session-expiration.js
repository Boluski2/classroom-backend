import 'dotenv/config';
import { Client } from 'pg';

const baseUrl = process.env.API_URL || 'http://localhost:8000';
const origin = process.env.FRONTEND_URL || 'http://localhost:5173';
const email = `session_expiry_${Date.now()}@example.com`;

const signup = await fetch(`${baseUrl}/api/auth/sign-up/email`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Origin: origin,
  },
  body: JSON.stringify({
    email,
    password: 'TestPass123!',
    name: 'Session Expiry Check',
    role: 'student',
  }),
});

if (signup.status !== 200) {
  throw new Error(`Signup failed: ${signup.status} ${await signup.text()}`);
}

const setCookie = signup.headers.get('set-cookie');
if (!setCookie) {
  throw new Error('Signup did not return a session cookie');
}

const cookie = setCookie.split(';', 1)[0];
const client = new Client({ connectionString: process.env.DATABASE_URL });

try {
  await client.connect();
  const user = await client.query('SELECT id FROM "user" WHERE email = $1', [email]);

  if (user.rows.length !== 1) {
    throw new Error('Temporary user was not found in the database');
  }

  await client.query(
    "UPDATE session SET expires_at = NOW() - INTERVAL '1 minute' WHERE user_id = $1",
    [user.rows[0].id]
  );
} finally {
  await client.end();
}

const protectedResponse = await fetch(`${baseUrl}/api/users`, {
  headers: {
    Cookie: cookie,
    Origin: origin,
  },
});

if (protectedResponse.status !== 401) {
  throw new Error(
    `Expired session was accepted: ${protectedResponse.status} ${await protectedResponse.text()}`
  );
}

console.log('PASS expired session is rejected with 401');
