const fetch = require('node-fetch');

const BASE = 'http://127.0.0.1:4001';

function fail(msg, code = 1) {
  console.error(msg);
  process.exit(code);
}

async function request(method, path, body, token) {
  const headers = {};
  if (body) headers['Content-Type'] = 'application/json';
  if (token) headers['Authorization'] = `Bearer ${token}`;
  
  const res = await fetch(BASE + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });
  
  const json = await res.json().catch(() => ({}));
  return { res, json };
}

async function run() {
  console.log('Testing Authentication & Authorization Module (Test 11)');
  
  const uniqueEmail = `test11+${Date.now()}@example.com`;
  const password = 'SecurePassword123!';
  const displayName = 'Test User 11';
  
  console.log('Registering a new user');
  const regReq1 = await request('POST', '/api/auth/register', { email: uniqueEmail, password, displayName });
  if (!regReq1.res.ok || !regReq1.json.token || !regReq1.json.user.afriqoraId) {
    fail('Initial registration failed', 11);
  }
  
  console.log('Verifying duplicate email rejection');
  const regReq2 = await request('POST', '/api/auth/register', { email: uniqueEmail, password, displayName });
  if (regReq2.res.status !== 400 || regReq2.json.error !== 'Email already exists') {
    fail('Expected 400 for duplicate email', 12);
  }

  console.log('Verifying missing payload validation');
  const missingReq = await request('POST', '/api/auth/register', { email: `other+${Date.now()}@example.com`, password });
  if (missingReq.res.status !== 400) {
    fail('Expected 400 for missing displayName', 13);
  }

  console.log('Testing user login (Valid credentials)');
  const loginReq1 = await request('POST', '/api/auth/login', { email: uniqueEmail, password });
  if (!loginReq1.res.ok || !loginReq1.json.token || loginReq1.json.user.email !== uniqueEmail) {
    fail('Login failed with valid credentials', 14);
  }

  console.log('Verifying invalid credentials rejection (Wrong password)');
  const loginReq2 = await request('POST', '/api/auth/login', { email: uniqueEmail, password: 'WrongPassword' });
  if (loginReq2.res.status !== 400 || loginReq2.json.error !== 'Invalid credentials') {
    fail('Expected 400 for invalid password', 15);
  }

  console.log('Verifying invalid credentials rejection (Non-existent email)');
  const loginReq3 = await request('POST', '/api/auth/login', { email: `missing+${Date.now()}@example.com`, password });
  if (loginReq3.res.status !== 400 || loginReq3.json.error !== 'Invalid credentials') {
    fail('Expected 400 for non-existent email', 16);
  }

  console.log('Test 11 Passed! Authentication & Authorization verified.');
  process.exit(0);
}

run().catch(err => {
  console.error('Test 11 error', err);
  process.exit(99);
});
