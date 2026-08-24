const fs = require('fs');
const path = require('path');

function fail(msg, code = 1) {
  console.error(msg);
  process.exit(code);
}

// 1. Mock Browser Environment
global.window = {
  MONETIZATION_SERVER_URL: 'http://localhost:4000',
  Capacitor: undefined
};

global.document = {
  addEventListener: () => {},
  querySelector: () => ({ addEventListener: () => {}, classList: { toggle: () => {}, remove: () => {} }, setAttribute: () => {}, querySelectorAll: () => [] }),
  querySelectorAll: () => [],
  getElementById: () => ({ addEventListener: () => {}, textContent: '', value: '' }),
  createElement: () => ({ style: {}, appendChild: () => {}, setAttribute: () => {}, dataset: {} }),
  head: { appendChild: () => {} },
  body: { appendChild: () => {} }
};

global.navigator = { languages: ['en'] };
global.Intl = { DateTimeFormat: () => ({ resolvedOptions: () => ({ locale: 'en-US' }) }) };
global.IntersectionObserver = class { observe() {} };

const store = {};
global.localStorage = {
  getItem: (k) => store[k] || null,
  setItem: (k, v) => { store[k] = String(v); },
  clear: () => { for (let k in store) delete store[k]; }
};

// Mock fetch for anything else
global.fetch = async () => ({ ok: true, json: async () => ({}) });

// 2. Load and evaluate script.js
try {
  const scriptContent = fs.readFileSync(path.join(__dirname, '../script.js'), 'utf8');
  eval(scriptContent);
} catch (err) {
  console.error('Failed to load script.js in Node environment:', err);
  // Continue anyway to see if the functions are somehow available, though unlikely.
  // Actually, we'll fail if recordView isn't defined.
}

if (typeof recordView !== 'function') {
  fail('recordView function not found. Script loading failed.', 99);
}

// 3. Test execution
console.log('Testing Monetization & Creator Earnings Tracking (Test 14)');

// Ensure clean state
localStorage.clear();

console.log('1. Simulating a Video View');
const viewSuccess = recordView('video-1', 'creator-A', 'viewer-X');
if (!viewSuccess) fail('Expected recordView to return true for first view', 11);

const state = JSON.parse(localStorage.getItem('afriqoraMonetization'));
if (!state || !state.creators['creator-A']) fail('Monetization state not saved properly', 12);
if (state.creators['creator-A'].totalViews !== 1) fail('Expected totalViews to be 1', 13);
if (state.creators['creator-A'].earnings !== 0.007) fail('Expected 70% of 0.01 = 0.007 earnings', 14);

console.log('2. Verifying Anti-Fraud Constraint (24-Hour Window)');
const dupViewSuccess = recordView('video-1', 'creator-A', 'viewer-X');
if (dupViewSuccess) fail('Expected recordView to return false for duplicate view within 24h', 15);

const state2 = JSON.parse(localStorage.getItem('afriqoraMonetization'));
if (state2.creators['creator-A'].totalViews !== 1) fail('Expected totalViews to remain 1', 16);

console.log('3. Verifying Withdrawal Logic & Thresholds');
const earlyWithdrawal = requestWithdrawal('creator-A', 50);
if (earlyWithdrawal.success !== false || !earlyWithdrawal.message.includes('100 valid views')) {
  fail('Expected withdrawal to fail due to view threshold', 17);
}

console.log('4. Simulating Threshold Met');
state2.creators['creator-A'].totalViews = 150;
state2.creators['creator-A'].availableBalance = 100;
localStorage.setItem('afriqoraMonetization', JSON.stringify(state2));

const validWithdrawal = requestWithdrawal('creator-A', 50);
if (validWithdrawal.success !== true || !validWithdrawal.withdrawal) {
  fail('Expected withdrawal to succeed', 18);
}

const state3 = JSON.parse(localStorage.getItem('afriqoraMonetization'));
if (state3.creators['creator-A'].availableBalance !== 50) {
  fail('Expected available balance to be deducted to 50', 19);
}
if (state3.creators['creator-A'].withdrawals.length !== 1) {
  fail('Expected transaction to be recorded in withdrawals array', 20);
}

console.log('Test 14 Passed! Monetization & View Tracking verified.');
process.exit(0);
