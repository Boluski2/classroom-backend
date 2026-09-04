import 'dotenv/config';

(async () => {
  try {
    const res = await global.fetch('http://localhost:8000/api/auth/sign-in/email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Origin': 'http://localhost:5173' },
      body: JSON.stringify({ email: 'babatundebolu@gail.com', password: 'Bolu1234' }),
    });

    const text = await res.text();
    console.log('status', res.status);
    console.log('body', text);
  } catch (err) {
    console.error('fetch error', err);
  }
})();
