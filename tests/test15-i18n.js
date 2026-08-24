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

// We need an element registry to test applyLanguageChange
const elements = [];

function createMockElement(tagName) {
  const el = {
    tagName: tagName.toUpperCase(),
    attributes: {},
    dataset: {},
    textContent: '',
    placeholder: '',
    getAttribute(name) { return this.attributes[name] || null; },
    setAttribute(name, value) { this.attributes[name] = value; },
    addEventListener: () => {},
    classList: { toggle: () => {}, remove: () => {} },
    appendChild: () => {}
  };
  elements.push(el);
  return el;
}

global.document = {
  addEventListener: () => {},
  querySelector: () => createMockElement('div'),
  querySelectorAll: (selector) => {
    if (selector === '[data-i18n]') {
      return elements.filter(el => el.attributes['data-i18n']);
    }
    return [];
  },
  getElementById: () => createMockElement('div'),
  createElement: (tag) => createMockElement(tag),
  head: { appendChild: () => {} },
  body: { appendChild: () => {} }
};

global.navigator = { languages: ['en'] };
global.Intl = { DateTimeFormat: () => ({ resolvedOptions: () => ({ locale: 'en-US' }) }) };
global.IntersectionObserver = class { observe() {} };

global.localStorage = {
  getItem: () => null,
  setItem: () => {},
  clear: () => {}
};

// 2. Load script.js
try {
  const scriptContent = fs.readFileSync(path.join(__dirname, '../script.js'), 'utf8');
  eval(scriptContent);
} catch (err) {
  // Ignored if it hits a minor DOM exception, as long as functions are hoisted
}

if (typeof applyLanguageChange !== 'function' || typeof t !== 'function') {
  fail('i18n functions not found. Script loading failed.', 99);
}

// 3. Setup Test DOM Elements
const homeLink = createMockElement('a');
homeLink.setAttribute('data-i18n', 'nav.home');

const searchInput = createMockElement('input');
searchInput.setAttribute('data-i18n', 'search.placeholder');

console.log('Testing Frontend Multilingual i18n & Localization System (Test 15)');

console.log('1. Verifying Default Language (en)');
applyLanguageChange('en');
if (homeLink.textContent !== 'Home') fail(`Expected Home, got ${homeLink.textContent}`, 11);
if (searchInput.placeholder !== 'Search anything...') fail(`Expected Search anything..., got ${searchInput.placeholder}`, 12);

console.log('2. Triggering Language Change (fr)');
applyLanguageChange('fr');
if (homeLink.textContent !== 'Accueil') fail(`Expected Accueil, got ${homeLink.textContent}`, 13);
if (searchInput.placeholder !== 'Rechercher quelque chose...') fail(`Expected Rechercher quelque chose..., got ${searchInput.placeholder}`, 14);

console.log('3. Triggering Language Change (sw)');
applyLanguageChange('sw');
if (homeLink.textContent !== 'Nyumbani') fail(`Expected Nyumbani, got ${homeLink.textContent}`, 15);
if (searchInput.placeholder !== 'Tafuta chochote...') fail(`Expected Tafuta chochote..., got ${searchInput.placeholder}`, 16);

console.log('4. Verifying Fallback Behavior');
const missing = t('missing.key.123');
if (missing !== 'missing.key.123') fail(`Expected raw key fallback, got ${missing}`, 17);

console.log('Test 15 Passed! i18n & Localization verified.');
process.exit(0);
