const fs = require('fs');
const path = require('path');

function fail(msg, code = 1) {
  console.error(msg);
  process.exit(code);
}

const elements = {};
function createInput(id) {
  const el = { value: '', textContent: '', focus: () => {}, querySelector: () => createGeneric('q'), querySelectorAll: () => [], addEventListener: () => {} };
  elements[id] = el;
  return el;
}
function createButton(id) {
  const el = { addEventListener: (evt, cb) => { el['on'+evt] = cb; }, textContent: '', querySelector: () => createGeneric('q'), querySelectorAll: () => [] };
  elements[id] = el;
  return el;
}
function createGeneric(id) {
  const el = { style: {}, textContent: '', innerHTML: '', appendChild: () => {}, addEventListener: () => {}, classList: { add:()=>{}, remove:()=>{}, toggle:()=>{} }, setAttribute: () => {}, dataset: {}, removeChild: () => {}, querySelector: () => createGeneric('q'), querySelectorAll: () => [] };
  elements[id] = el;
  return el;
}

global.document = {
  getElementById: (id) => {
    if (!id) return createGeneric('empty');
    if (id.includes('input') || id.includes('name') || id.includes('owner') || id.includes('phone') || id.includes('location') || id.includes('category') || id.includes('description') || id.includes('website')) return elements[id] || createInput(id);
    if (id.includes('btn')) return elements[id] || createButton(id);
    return elements[id] || createGeneric(id);
  },
  createElement: (tag) => createGeneric(tag),
  querySelector: () => createGeneric('q'),
  querySelectorAll: () => [],
  addEventListener: () => {},
  head: createGeneric('head'),
  body: createGeneric('body')
};

global.window = { MONETIZATION_SERVER_URL: '', Capacitor: undefined, location: { href: '' } };
global.navigator = { languages: ['en'] };
global.Intl = { DateTimeFormat: () => ({ resolvedOptions: () => ({ locale: 'en-US' }) }) };
global.IntersectionObserver = class { observe() {} };
global.alert = (msg) => { global.lastAlert = msg; };
const store = {};
global.localStorage = {
  getItem: (k) => store[k] || null,
  setItem: (k, v) => { store[k] = String(v); },
  removeItem: (k) => { delete store[k]; },
  clear: () => { for (let k in store) delete store[k]; }
};
global.fetch = async () => ({ ok: true, json: async () => ({}) });

const code = fs.readFileSync(path.join(__dirname, '../script.js'), 'utf16le');
let utf8Code = code;
if (code.charCodeAt(0) !== 65533 && !code.includes('const businessNameInput')) {
    utf8Code = fs.readFileSync(path.join(__dirname, '../script.js'), 'utf8');
}
try { eval(utf8Code); } catch(e) { console.error('EVAL ERROR:', e); }

(async () => {
console.log('Testing Business Registration Module (Test 16)');
console.log('Step 1: Initialize Environment (Safe Mode)');
localStorage.removeItem('afriqoraBusinessListings');

console.log('Step 3: Validate Form Constraints (Negative Test)');
const btn = document.getElementById('register-business-btn');
const nameInput = document.getElementById('business-name');
const ownerInput = document.getElementById('business-owner');
const phoneInput = document.getElementById('business-phone');
const locInput = document.getElementById('business-location');
const catInput = document.getElementById('business-category');
const descInput = document.getElementById('business-description');
const countryInput = document.getElementById('business-country');
const msgBox = document.getElementById('business-registration-message');

nameInput.value = '';
if (btn.onclick) btn.onclick();

await new Promise(r => setTimeout(r, 100));

const emptyStore = localStorage.getItem('afriqoraBusinessListings');
if (emptyStore && JSON.parse(emptyStore).length > 0) {
  fail('Form allowed empty submission', 11);
}

console.log('Step 4: Submit a Valid Business Profile (Positive Test)');
nameInput.value = 'Test Business 16';
ownerInput.value = 'Jane Doe';
phoneInput.value = '+27820000000';
locInput.value = 'Johannesburg';
countryInput.value = 'ZA';
catInput.value = 'Consulting';
descInput.value = 'A premium business consulting firm.';

console.log('btn.onclick is:', typeof btn.onclick);
if (btn.onclick) btn.onclick();

await new Promise(r => setTimeout(r, 500));
console.log('msgBox:', msgBox.textContent);

console.log('Step 5: Verify Data Persistence in Local Storage');
const saved = localStorage.getItem('afriqoraBusinessListings');
if (!saved) fail('afriqoraBusinessListings not found in local storage', 12);

const arr = JSON.parse(saved);
if (!Array.isArray(arr) || arr.length !== 1) fail('Expected array of length 1', 13);
const b = arr[0];
if (b.name !== 'Test Business 16' || b.location !== 'Johannesburg' || b.category !== 'Consulting') {
  fail('Saved data does not match input', 14);
}
if (!b.id) fail('Saved data missing auto-generated ID', 15);

console.log('Test 16 Passed! Business Registration verified.');
process.exit(0);
})();
