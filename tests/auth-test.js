const fetch = require('node-fetch');

const BASE = process.env.BASE || 'http://localhost:4000';

function extractCookie(setCookieHeader) {
  if (!setCookieHeader) return null;
  // take first cookie pair before semicolon
  return setCookieHeader.split(';')[0];
}

async function run() {
  try {
    console.log('Auth test: using server at', BASE);
    const email = `test+${Date.now()}@example.com`;
    const password = 'TestPass123!';
    // Register
    console.log('Registering', email);
    const reg = await fetch(BASE + '/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password, displayName: 'Test User' }) });
    const regJ = await reg.json().catch(()=>({ error: 'invalid-json' }));
    if (!reg.ok || !regJ.ok) { console.error('Register failed', regJ); process.exit(2); }
    const setCookie = reg.headers.get('set-cookie');
    const cookie = extractCookie(setCookie);
    if (!cookie) { console.error('No session cookie returned on register'); process.exit(3); }
    console.log('Registered; session cookie obtained');

    // Check /auth/me
    const me = await fetch(BASE + '/auth/me', { headers: { Cookie: cookie } });
    const meJ = await me.json();
    if (!meJ || !meJ.user || String(meJ.user.email).toLowerCase() !== String(email).toLowerCase()) { console.error('Auth/me after register failed', meJ); process.exit(4); }
    console.log('/auth/me OK after register');

    // Logout
    console.log('Logging out');
    await fetch(BASE + '/auth/logout', { method: 'POST', headers: { Cookie: cookie } });
    const meAfter = await fetch(BASE + '/auth/me', { headers: { Cookie: cookie } });
    const meAfterJ = await meAfter.json();
    if (meAfterJ && meAfterJ.user) { console.error('User still logged in after logout', meAfterJ); process.exit(5); }
    console.log('Logout confirmed');

    // Login
    console.log('Logging back in');
    const login = await fetch(BASE + '/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
    const loginJ = await login.json().catch(()=>({ error:'invalid-json' }));
    if (!login.ok || !loginJ.ok) { console.error('Login failed', loginJ); process.exit(6); }
    const loginCookie = extractCookie(login.headers.get('set-cookie'));
    if (!loginCookie) { console.error('No session cookie returned on login'); process.exit(7); }
    const me2 = await fetch(BASE + '/auth/me', { headers: { Cookie: loginCookie } });
    const me2J = await me2.json();
    if (!me2J || !me2J.user || String(me2J.user.email).toLowerCase() !== String(email).toLowerCase()) { console.error('Auth/me after login failed', me2J); process.exit(8); }
    console.log('Login and session verified');

    console.log('All auth tests passed');
    process.exit(0);
  } catch (e) {
    console.error('Auth test error', e);
    process.exit(10);
  }
}

run();
