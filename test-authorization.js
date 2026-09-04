const baseUrl = process.env.API_URL || 'http://localhost:8000';

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      ...(options.headers || {}),
    },
  });

  return { status: response.status, body: await response.text(), headers: response.headers };
}

async function createSession(role) {
  const email = `authorization_${role}_${Date.now()}@example.com`;
  const response = await request('/api/auth/sign-up/email', {
    method: 'POST',
    body: JSON.stringify({
      email,
      password: 'TestPass123!',
      name: `Authorization ${role}`,
      role,
    }),
  });

  if (response.status !== 200) {
    throw new Error(`Could not create ${role} session: ${response.status} ${response.body}`);
  }

  const setCookie = response.headers.get('set-cookie');
  if (!setCookie) {
    throw new Error(`No session cookie returned for ${role}`);
  }

  return setCookie.split(';', 1)[0];
}

async function expectStatus(name, actual, expected) {
  if (actual !== expected) {
    throw new Error(`${name}: expected ${expected}, received ${actual}`);
  }
  console.log(`PASS ${name}: ${actual}`);
}

const departmentBody = JSON.stringify({
  code: `AUTH${Date.now()}`,
  name: 'Authorization Test Department',
});

try {
  const studentCookie = await createSession('student');
  const teacherCookie = await createSession('teacher');
  const adminCookie = await createSession('admin');

  const unauthenticatedDepartment = await request('/api/departments', {
    method: 'POST',
    body: departmentBody,
  });
  await expectStatus('unauthenticated department create', unauthenticatedDepartment.status, 401);

  const studentDepartment = await request('/api/departments', {
    method: 'POST',
    headers: { Cookie: studentCookie },
    body: departmentBody,
  });
  await expectStatus('student department create', studentDepartment.status, 403);

  const teacherDepartment = await request('/api/departments', {
    method: 'POST',
    headers: { Cookie: teacherCookie },
    body: departmentBody,
  });
  await expectStatus('teacher department create', teacherDepartment.status, 403);

  const adminDepartment = await request('/api/departments', {
    method: 'POST',
    headers: { Cookie: adminCookie },
    body: departmentBody,
  });
  await expectStatus('admin department create', adminDepartment.status, 201);

  const unauthenticatedUsers = await request('/api/users');
  await expectStatus('unauthenticated user directory', unauthenticatedUsers.status, 401);

  const unauthenticatedRoster = await request('/api/classes/1/users');
  await expectStatus('unauthenticated class roster', unauthenticatedRoster.status, 401);

  console.log('Authorization smoke test passed.');
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
