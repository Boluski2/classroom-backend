const baseUrl = process.env.API_URL || 'http://localhost:8000';
const origin = process.env.FRONTEND_URL || 'http://localhost:5173';

async function jsonRequest(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      ...(options.headers || {}),
    },
  });

  return { status: response.status, body: await response.text(), headers: response.headers };
}

const adminEmail = `step06_admin_${Date.now()}@example.com`;
const teacherEmail = `step06_teacher_${Date.now()}@example.com`;
const password = 'AdminCreated123!';

const adminSignup = await jsonRequest('/api/auth/sign-up/email', {
  method: 'POST',
  body: JSON.stringify({
    email: adminEmail,
    password,
    name: 'Workflow Admin',
    role: 'admin',
  }),
});

if (adminSignup.status !== 200) {
  throw new Error(`Admin setup failed: ${adminSignup.status} ${adminSignup.body}`);
}

const adminCookie = (adminSignup.headers.get('set-cookie') || '').split(';', 1)[0];
const teacher = await jsonRequest('/api/users', {
  method: 'POST',
  headers: { Cookie: adminCookie },
  body: JSON.stringify({
    name: 'Admin Created Teacher',
    email: teacherEmail,
    role: 'teacher',
    password,
    emailVerified: true,
  }),
});

if (teacher.status !== 201) {
  throw new Error(`Admin user creation failed: ${teacher.status} ${teacher.body}`);
}

const login = await jsonRequest('/api/auth/sign-in/email', {
  method: 'POST',
  body: JSON.stringify({ email: teacherEmail, password }),
});

if (login.status !== 200) {
  throw new Error(`Created teacher could not sign in: ${login.status} ${login.body}`);
}

console.log('PASS admin-created teacher can sign in');
