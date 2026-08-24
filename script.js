// ─────────────────────────────────────────────────────────────────────────────
// AFRIQORA Capacitor Native Bridge
// Detects whether the app is running inside a Capacitor (Android/iOS) container
// and enables native capabilities: push notifications, session Bearer tokens.
// This block must execute before any API calls.
// ─────────────────────────────────────────────────────────────────────────────
(function initCapacitorBridge() {
  // Determine if running in a native Capacitor container
  const isNative = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
  window.__afriqoraNative = isNative;

  if (!isNative) return;

  // On native platforms, register for push notifications after the device is ready.
  // Capacitor plugins are loaded async; wait for 'deviceready' equivalent via DOMContentLoaded.
  document.addEventListener('DOMContentLoaded', async () => {
    try {
      const { PushNotifications } = window.Capacitor.Plugins;
      if (!PushNotifications) return;

      // Request permission
      const permResult = await PushNotifications.requestPermissions();
      if (permResult.receive !== 'granted') return;

      // Register with FCM / APNs
      await PushNotifications.register();

      // Receive the device token
      PushNotifications.addListener('registration', async (token) => {
        const platform = window.Capacitor.getPlatform(); // 'android' | 'ios'
        try {
          await fetch(apiUrl('/notifications/push/register-token'), {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...afriqoraBearerHeader()
            },
            body: JSON.stringify({ token: token.value, platform })
          });
        } catch (e) { /* silent – push is best-effort */ }
      });

      // Foreground push handler – show a brief banner
      PushNotifications.addListener('pushNotificationReceived', (notification) => {
        const banner = document.createElement('div');
        banner.style.cssText = 'position:fixed;top:env(safe-area-inset-top,12px);left:50%;transform:translateX(-50%);background:#1a2b4a;color:#fff;padding:0.6rem 1rem;border-radius:8px;box-shadow:0 4px 16px rgba(0,0,0,0.4);z-index:2147483647;font-size:0.875rem;max-width:90vw;text-align:center;';
        banner.textContent = `${notification.title || 'AFRIQORA'}: ${notification.body || ''}`;
        document.body.appendChild(banner);
        setTimeout(() => { try { document.body.removeChild(banner); } catch(e) {} }, 4000);
      });

    } catch (e) { /* push not available in this environment */ }
  });
})();

// Returns the Authorization Bearer header if a session token is stored (native only)
function afriqoraBearerHeader() {
  try {
    const sid = localStorage.getItem('afriqoraSessionId');
    if (sid) return { 'Authorization': `Bearer ${sid}` };
  } catch (e) {}
  return {};
}

// -----------------------------------------------------------------------------
// MULTILINGUAL I18N SYSTEM
// -----------------------------------------------------------------------------
const I18N = {
  en: {
    'home.find_service': 'Find a Service',
    'home.explore_nearby': 'Explore Nearby',
    'search.placeholder': 'Search anything...',
    'nav.home': 'Home',
    'nav.search': 'Search',
    'nav.activity': 'Activity',
    'nav.notifications': 'Notifications',
    'nav.messages': 'Messages',
    'nav.profile': 'Profile',
    'nav.settings': 'Settings',
    'auth.login': 'Log In',
    'auth.signup': 'Sign Up',
    'auth.logout': 'Logout',
    'profile.edit': 'Edit Profile',
    'profile.dashboard': 'Business Dashboard',
    'feed.placeholder': 'What are you thinking?',
    'btn.post': 'Post',
    'wizard.step1': 'What is the name of your business?',
    'wizard.step2': 'What do you do?',
    'wizard.step3': 'Where are you located?',
    'wizard.step4': 'Contact & Details',
    'btn.save': 'Save & Publish',
    'btn.next': 'Next',
    'btn.back': 'Back',
    'lang.en': 'English',
    'lang.fr': 'French',
    'lang.sw': 'Swahili'
  },
  fr: {
    'home.find_service': 'Trouver un service',
    'home.explore_nearby': 'Explorer à proximité',
    'search.placeholder': 'Rechercher quelque chose...',
    'nav.home': 'Accueil',
    'nav.search': 'Recherche',
    'nav.activity': 'Activité',
    'nav.notifications': 'Notifications',
    'nav.messages': 'Messages',
    'nav.profile': 'Profil',
    'nav.settings': 'Paramètres',
    'auth.login': 'Connexion',
    'auth.signup': "S'inscrire",
    'auth.logout': 'Déconnexion',
    'profile.edit': 'Modifier le profil',
    'profile.dashboard': "Tableau de bord de l'entreprise",
    'feed.placeholder': 'À quoi pensez-vous?',
    'btn.post': 'Publier',
    'wizard.step1': 'Quel est le nom de votre entreprise?',
    'wizard.step2': 'Que faites-vous?',
    'wizard.step3': 'Où êtes-vous situé?',
    'wizard.step4': 'Contact & Détails',
    'btn.save': 'Enregistrer',
    'btn.next': 'Suivant',
    'btn.back': 'Retour',
    'lang.en': 'Anglais',
    'lang.fr': 'Français',
    'lang.sw': 'Swahili'
  },
  sw: {
    'home.find_service': 'Tafuta Huduma',
    'home.explore_nearby': 'Gundua Karibu',
    'search.placeholder': 'Tafuta chochote...',
    'nav.home': 'Nyumbani',
    'nav.search': 'Tafuta',
    'nav.activity': 'Shughuli',
    'nav.notifications': 'Arifa',
    'nav.messages': 'Jumbe',
    'nav.profile': 'Profaili',
    'nav.settings': 'Mipangilio',
    'auth.login': 'Ingia',
    'auth.signup': 'Jisajili',
    'auth.logout': 'Toka',
    'profile.edit': 'Hariri Profaili',
    'profile.dashboard': 'Dashibodi ya Biashara',
    'feed.placeholder': 'Unafikiria nini?',
    'btn.post': 'Chapisha',
    'wizard.step1': 'Jina la biashara yako ni nani?',
    'wizard.step2': 'Unafanya nini?',
    'wizard.step3': 'Upo wapi?',
    'wizard.step4': 'Mawasiliano na Maelezo',
    'btn.save': 'Hifadhi',
    'btn.next': 'Mbele',
    'btn.back': 'Nyuma',
    'lang.en': 'Kiingereza',
    'lang.fr': 'Kifaransa',
    'lang.sw': 'Kiswahili'
  }
};

let currentLang = 'en';
try {
  const localSettings = JSON.parse(localStorage.getItem('afriqoraAppSettings') || '{}');
  if (localSettings && localSettings.languageRegion && localSettings.languageRegion.language) {
    currentLang = localSettings.languageRegion.language;
  }
} catch (e) {}

function t(key) {
  return I18N[currentLang] && I18N[currentLang][key] ? I18N[currentLang][key] : (I18N['en'][key] || key);
}

function applyLanguageChange(newLang) {
  if (newLang) currentLang = newLang;
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (key) {
      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
        el.placeholder = t(key);
      } else {
        el.textContent = t(key);
      }
    }
  });
}

const toggle = document.querySelector('.nav-toggle');
const nav = document.querySelector('.site-nav');
const year = document.getElementById('year');
const form = document.getElementById('enquiry-form');

if (year) {
  year.textContent = new Date().getFullYear();
}

if (toggle && nav) {
  toggle.addEventListener('click', () => {
    const isOpen = nav.classList.toggle('open');
    toggle.setAttribute('aria-expanded', String(isOpen));
  });

  nav.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      nav.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
    });
  });
}

if (form) {
  form.addEventListener('submit', (event) => {
    event.preventDefault();

    const data = new FormData(form);
    const name = data.get('name')?.toString() || 'there';
    const email = data.get('email')?.toString() || '';
    const service = data.get('service')?.toString() || 'Website strategy';
    const message = data.get('message')?.toString() || '';

    const subject = encodeURIComponent(`AFRIQORA enquiry from ${name}`);
    const body = encodeURIComponent(
      `Name: ${name}\nEmail: ${email}\nService: ${service}\n\nMessage:\n${message}`
    );
    window.location = `https://wa.me/27781261611?text=${body}`;

    form.reset();
  });
}
// AFRIQORA service search
console.log("AFRIQORA service search is ready");

const serviceLocation = document.getElementById("service-location");
const findServicesButton = document.querySelector("#find-services-btn");
const selectedService = document.getElementById("service-select");

const hotelDestination = document.getElementById("hotel-destination");
const searchHotelsButton = document.getElementById("search-hotels-btn");
const hotelSearchResult = document.getElementById("hotel-search-result");

if (findServicesButton) {
    findServicesButton.addEventListener("click", () => {
        const location = serviceLocation.value.trim();
        const service = selectedService.value;

        if (!location || service === "Choose a service") {
            alert("Please choose a service and enter your location.");
            return;
        }
const message = "Hello AFRIQORA, I need " + service + " in " + location;
window.location.href = "https://wa.me/27605634196?text=" + encodeURIComponent(message);
});

}

if (searchHotelsButton) {
  searchHotelsButton.addEventListener("click", () => {
    const destination = hotelDestination?.value.trim() || "";

    if (!destination) {
      hotelSearchResult.textContent = "Please enter a hotel destination.";
      return;
    }

    hotelSearchResult.textContent = `Showing hotels in ${destination}. Please review the results below or update your destination.`;
  });
}

const businessNameInput = document.getElementById("business-name");
const businessOwnerInput = document.getElementById("business-owner");
const businessPhoneInput = document.getElementById("business-phone");
const businessLocationInput = document.getElementById("business-location");
const businessCategoryInput = document.getElementById("business-category");
const businessDescriptionInput = document.getElementById("business-description");
const businessWebsiteInput = document.getElementById("business-website");
const businessLogoInput = document.getElementById("business-logo");
const businessPhotosInput = document.getElementById("business-photos");
const businessServicesInput = document.getElementById("business-services");
const businessVideosInput = document.getElementById("business-videos");
const businessRegistrationMessage = document.getElementById("business-registration-message");
const businessSearchInput = document.getElementById("business-search-input");
const businessSearchButton = document.getElementById("business-search-btn");
const unifiedSearchInput = document.getElementById("unified-search-input");
const unifiedSearchButton = document.getElementById("unified-search-btn");
const unifiedSearchResults = document.getElementById("unified-search-results");
const businessListingsContainer = document.getElementById("business-listings-container");
const registerBusinessButton = document.getElementById("register-business-btn");
const BUSINESS_STORAGE_KEY = "afriqoraBusinessListings";
const POSTS_STORAGE_KEY = "afriqoraPosts";
const MARKETPLACE_STORAGE_KEY = "afriqoraMarketplaceListings";
const MONETIZATION_STORAGE_KEY = "afriqoraMonetization";
const MONETIZATION_SERVER_URL = (typeof window !== 'undefined' && window.MONETIZATION_SERVER_URL) ? window.MONETIZATION_SERVER_URL : 'http://localhost:4000';
let authUserCache = null;

function apiBaseUrl() {
  return (MONETIZATION_SERVER_URL || '').replace(/\/$/, '');
}

function apiUrl(path) {
  return apiBaseUrl() + path;
}

async function apiRequest(path, options = {}) {
  // On native Capacitor apps, cookies are blocked in WebViews.
  // Instead we send the session as an Authorization: Bearer header stored in localStorage.
  const nativeHeaders = window.__afriqoraNative ? afriqoraBearerHeader() : {};
  const headers = Object.assign({ 'Content-Type': 'application/json' }, nativeHeaders, options.headers || {});
  // credentials:'include' is kept for web browser compatibility (cookie auth).
  return fetch(apiUrl(path), Object.assign({}, options, { headers, credentials: 'include' }));
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatIsoDate(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString();
}

async function fetchCurrentUser(force = false) {
  if (!force && authUserCache) return authUserCache;
  try {
    const res = await apiRequest('/auth/me', { method: 'GET' });
    const data = await res.json().catch(() => ({ user: null }));
    authUserCache = data && data.user ? data.user : null;
    return authUserCache;
  } catch (e) {
    authUserCache = null;
    return null;
  }
}
// payout eligibility threshold (valid views)
const PAYOUT_VIEWS_THRESHOLD = 100;
// African countries (code, name, dial code, currency)
const AFRICAN_COUNTRIES = [
  { code: 'DZ', name: 'Algeria', dial: '+213', currency: 'DZD' },
  { code: 'AO', name: 'Angola', dial: '+244', currency: 'AOA' },
  { code: 'BJ', name: 'Benin', dial: '+229', currency: 'XOF' },
  { code: 'BW', name: 'Botswana', dial: '+267', currency: 'BWP' },
  { code: 'BF', name: 'Burkina Faso', dial: '+226', currency: 'XOF' },
  { code: 'BI', name: 'Burundi', dial: '+257', currency: 'BIF' },
  { code: 'CV', name: 'Cabo Verde', dial: '+238', currency: 'CVE' },
  { code: 'CM', name: 'Cameroon', dial: '+237', currency: 'XAF' },
  { code: 'CF', name: 'Central African Republic', dial: '+236', currency: 'XAF' },
  { code: 'TD', name: 'Chad', dial: '+235', currency: 'XAF' },
  { code: 'KM', name: 'Comoros', dial: '+269', currency: 'KMF' },
  { code: 'CG', name: 'Congo (Republic)', dial: '+242', currency: 'XAF' },
  { code: 'CD', name: 'Congo (DRC)', dial: '+243', currency: 'CDF' },
  { code: 'CI', name: 'Côte d\'Ivoire', dial: '+225', currency: 'XOF' },
  { code: 'DJ', name: 'Djibouti', dial: '+253', currency: 'DJF' },
  { code: 'EG', name: 'Egypt', dial: '+20', currency: 'EGP' },
  { code: 'GQ', name: 'Equatorial Guinea', dial: '+240', currency: 'XAF' },
  { code: 'ER', name: 'Eritrea', dial: '+291', currency: 'ERN' },
  { code: 'SZ', name: 'Eswatini', dial: '+268', currency: 'SZL' },
  { code: 'ET', name: 'Ethiopia', dial: '+251', currency: 'ETB' },
  { code: 'GA', name: 'Gabon', dial: '+241', currency: 'XAF' },
  { code: 'GM', name: 'Gambia', dial: '+220', currency: 'GMD' },
  { code: 'GH', name: 'Ghana', dial: '+233', currency: 'GHS' },
  { code: 'GN', name: 'Guinea', dial: '+224', currency: 'GNF' },
  { code: 'GW', name: 'Guinea-Bissau', dial: '+245', currency: 'XOF' },
  { code: 'KE', name: 'Kenya', dial: '+254', currency: 'KES' },
  { code: 'LS', name: 'Lesotho', dial: '+266', currency: 'LSL' },
  { code: 'LR', name: 'Liberia', dial: '+231', currency: 'LRD' },
  { code: 'LY', name: 'Libya', dial: '+218', currency: 'LYD' },
  { code: 'MG', name: 'Madagascar', dial: '+261', currency: 'MGA' },
  { code: 'MW', name: 'Malawi', dial: '+265', currency: 'MWK' },
  { code: 'ML', name: 'Mali', dial: '+223', currency: 'XOF' },
  { code: 'MR', name: 'Mauritania', dial: '+222', currency: 'MRU' },
  { code: 'MU', name: 'Mauritius', dial: '+230', currency: 'MUR' },
  { code: 'MA', name: 'Morocco', dial: '+212', currency: 'MAD' },
  { code: 'MZ', name: 'Mozambique', dial: '+258', currency: 'MZN' },
  { code: 'NA', name: 'Namibia', dial: '+264', currency: 'NAD' },
  { code: 'NE', name: 'Niger', dial: '+227', currency: 'XOF' },
  { code: 'NG', name: 'Nigeria', dial: '+234', currency: 'NGN' },
  { code: 'RW', name: 'Rwanda', dial: '+250', currency: 'RWF' },
  { code: 'ST', name: 'Sao Tome and Principe', dial: '+239', currency: 'STN' },
  { code: 'SN', name: 'Senegal', dial: '+221', currency: 'XOF' },
  { code: 'SC', name: 'Seychelles', dial: '+248', currency: 'SCR' },
  { code: 'SL', name: 'Sierra Leone', dial: '+232', currency: 'SLL' },
  { code: 'SO', name: 'Somalia', dial: '+252', currency: 'SOS' },
  { code: 'ZA', name: 'South Africa', dial: '+27', currency: 'ZAR' },
  { code: 'SS', name: 'South Sudan', dial: '+211', currency: 'SSP' },
  { code: 'SD', name: 'Sudan', dial: '+249', currency: 'SDG' },
  { code: 'TZ', name: 'Tanzania', dial: '+255', currency: 'TZS' },
  { code: 'TG', name: 'Togo', dial: '+228', currency: 'XOF' },
  { code: 'TN', name: 'Tunisia', dial: '+216', currency: 'TND' },
  { code: 'UG', name: 'Uganda', dial: '+256', currency: 'UGX' },
  { code: 'ZM', name: 'Zambia', dial: '+260', currency: 'ZMW' },
  { code: 'ZW', name: 'Zimbabwe', dial: '+263', currency: 'ZWL' },
  { code: 'CV', name: 'Cabo Verde', dial: '+238', currency: 'CVE' },
  { code: 'BI', name: 'Burundi', dial: '+257', currency: 'BIF' },
  { code: 'KM', name: 'Comoros', dial: '+269', currency: 'KMF' },
  { code: 'TD', name: 'Chad', dial: '+235', currency: 'XAF' },
  { code: 'GQ', name: 'Equatorial Guinea', dial: '+240', currency: 'XAF' },
  { code: 'GA', name: 'Gabon', dial: '+241', currency: 'XAF' },
  { code: 'CG', name: 'Congo (Republic)', dial: '+242', currency: 'XAF' }
];

function populateCountrySelect(selectEl, defaultCode) {
  if (!selectEl) return;
  selectEl.innerHTML = '';
  const empty = document.createElement('option'); empty.value = ''; empty.textContent = 'Choose country'; selectEl.appendChild(empty);
  AFRICAN_COUNTRIES.forEach(c => {
    const o = document.createElement('option'); o.value = c.code; o.textContent = `${c.name} (${c.code})`; o.dataset.dial = c.dial; o.dataset.currency = c.currency; selectEl.appendChild(o);
  });
  if (defaultCode) selectEl.value = defaultCode;
}

function populateCurrencySelect(selectEl, defaultCur) {
  if (!selectEl) return;
  selectEl.innerHTML = '';
  // gather unique currencies from list
  const uniq = [...new Set(AFRICAN_COUNTRIES.map(c=>c.currency))];
  uniq.forEach(cur => { const o = document.createElement('option'); o.value = cur; o.textContent = cur; selectEl.appendChild(o); });
  if (defaultCur) selectEl.value = defaultCur;
}

function getCountryByCode(code) {
  return AFRICAN_COUNTRIES.find(c => String(c.code).toUpperCase() === String(code).toUpperCase());
}

function normalizePhoneInternational(phone, countryCode) {
  if (!phone) return '';
  let digits = (phone||'').toString().replace(/[^0-9+]/g, '');
  // if already starts with + and digits, return as-is (normalize + then digits)
  if (digits.startsWith('+')) {
    return '+' + digits.replace(/^\+/, '');
  }
  const country = getCountryByCode(countryCode || '');
  const dial = country ? country.dial.replace(/^\+/, '') : '';
  // strip leading zeros
  digits = digits.replace(/^0+/, '');
  if (dial) return '+' + dial + digits;
  return digits;
}

// attempt to detect user's country from browser locale (e.g., en-ZA) and return ISO code if in AFRICAN_COUNTRIES
function detectUserCountry() {
  try {
    const langs = (navigator.languages && navigator.languages.length) ? navigator.languages : [navigator.language];
    for (const l of langs) {
      if (!l) continue;
      const parts = l.split('-');
      if (parts.length > 1) {
        const cc = parts[1].toUpperCase();
        if (AFRICAN_COUNTRIES.find(c => c.code === cc)) return cc;
      }
    }
    // try Intl
    const resolved = (Intl && Intl.DateTimeFormat) ? Intl.DateTimeFormat().resolvedOptions().locale : null;
    if (resolved) {
      const parts = resolved.split('-');
      if (parts.length > 1) {
        const cc = parts[1].toUpperCase();
        if (AFRICAN_COUNTRIES.find(c => c.code === cc)) return cc;
      }
    }
  } catch (e) {}
  return '';
}

// Format international phone for display: find country dial and group digits for readability
function formatInternationalPhone(phone) {
  if (!phone) return '';
  let s = (phone||'').toString().trim();
  if (!s) return '';
  // ensure starting +
  if (!s.startsWith('+')) s = '+' + s.replace(/^\+/, '');
  // strip non-digits except plus
  const stripped = '+' + s.replace(/[^0-9]/g, '').replace(/^\+/, '');
  // find longest matching dial code from AFRICAN_COUNTRIES
  const digits = stripped.replace(/^\+/, '');
  let matched = null;
  for (const c of AFRICAN_COUNTRIES) {
    const code = c.dial.replace(/^\+/, '');
    if (digits.startsWith(code)) {
      if (!matched || code.length > matched.dial.replace(/^\+/, '').length) matched = c;
    }
  }
  if (!matched) {
    // fallback: split into groups of 3 after +
    const rest = digits;
    const parts = [];
    for (let i = 0; i < rest.length; i += 3) parts.push(rest.slice(i, i + 3));
    return '+' + parts.join(' ');
  }
  const countryCodeDigits = matched.dial.replace(/^\+/, '');
  const rest = digits.slice(countryCodeDigits.length);
  // group rest into 3/3/4 pattern if long, else groups of 3
  let parts = [];
  if (rest.length > 7) {
    parts = [rest.slice(0, 3), rest.slice(3, 6), rest.slice(6)];
  } else {
    for (let i = 0; i < rest.length; i += 3) parts.push(rest.slice(i, i + 3));
  }
  return `+${countryCodeDigits} ${parts.join(' ').trim()}`;
}

function formatCurrencyAmount(amount, currency) {
  if (typeof amount !== 'number') amount = Number(amount) || 0;
  const cur = String(currency || '').toUpperCase() || 'USD';
  // simple formatting: show currency code then amount with two decimals
  return `${cur} ${amount.toFixed(2)}`;
}
const DEFAULT_LOGO_PLACEHOLDER = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='128' height='128'%3E%3Crect width='100%25' height='100%25' fill='%23e2e8f0'/%3E%3Ctext x='50%25' y='50%25' font-size='16' fill='%23475569' text-anchor='middle' dominant-baseline='middle'%3ELogo%3C/text%3E%3C/svg%3E";

// Monetization: initialize default structure if not present
function getMonetization() {
  try {
    const raw = localStorage.getItem(MONETIZATION_STORAGE_KEY);
    if (!raw) {
        const defaultState = {
          settings: { creatorPct: 70, platformPct: 30, viewValue: 0.01, payoutThreshold: PAYOUT_VIEWS_THRESHOLD },
        videos: {},
        creators: {},
        platform: { totalEarnings: 0 }
      };
      localStorage.setItem(MONETIZATION_STORAGE_KEY, JSON.stringify(defaultState));
      return defaultState;
    }
    return JSON.parse(raw);
  } catch (e) { return { settings:{creatorPct:70,platformPct:30,viewValue:0.01}, videos:{}, creators:{}, platform:{totalEarnings:0} }; }
}

function saveMonetization(state) { localStorage.setItem(MONETIZATION_STORAGE_KEY, JSON.stringify(state)); }

function ensureCreatorEntry(state, creatorId) {
  if (!state.creators[creatorId]) {
    state.creators[creatorId] = { totalViews: 0, earnings: 0, availableBalance: 0, withdrawals: [] };
  }
}

// Prevent duplicate/fraudulent views: we record viewerId per video, only count once per 24h by default
function recordView(videoId, creatorId, viewerId) {
  if (!videoId || !creatorId) return false;
  const state = getMonetization();
  state.videos = state.videos || {};
  const now = Date.now();
  const windowMs = 24 * 60 * 60 * 1000; // 24 hours
  if (!state.videos[videoId]) state.videos[videoId] = { views: 0, uniqueViewers: {} };
  // if viewer seen within window, ignore
  const lastSeen = state.videos[videoId].uniqueViewers[viewerId];
  if (lastSeen && (now - lastSeen) < windowMs) return false;
  // count view
  state.videos[videoId].views = (state.videos[videoId].views||0) + 1;
  state.videos[videoId].uniqueViewers[viewerId] = now;
  // payout calculation
  const gross = Number(state.settings.viewValue || 0) || 0;
  const creatorPct = Number(state.settings.creatorPct||70)/100;
  const platformPct = Number(state.settings.platformPct||30)/100;
  const creatorShare = +(gross * creatorPct).toFixed(6);
  const platformShare = +(gross * platformPct).toFixed(6);
  ensureCreatorEntry(state, creatorId);
  state.creators[creatorId].totalViews = (state.creators[creatorId].totalViews||0) + 1;
  state.creators[creatorId].earnings = +(state.creators[creatorId].earnings + creatorShare).toFixed(6);
  state.creators[creatorId].availableBalance = +( (state.creators[creatorId].availableBalance||0) + creatorShare ).toFixed(6);
  state.platform.totalEarnings = +( (state.platform.totalEarnings||0) + platformShare ).toFixed(6);
  saveMonetization(state);
  return true;
}

async function sendViewToServer(videoId, creatorId, viewerId) {
  try {
    if (!MONETIZATION_SERVER_URL) return null;
    const base = (MONETIZATION_SERVER_URL||'').replace(/\/$/, '');
    // attempt to fetch a short-lived token first
    try {
      const turl = base + '/monetization/token?videoId=' + encodeURIComponent(String(videoId||'')) + '&viewerId=' + encodeURIComponent(String(viewerId||''));
      const tres = await fetch(turl, { method: 'GET' });
      if (!tres.ok) return null;
      const tdata = await tres.json();
      const token = tdata && tdata.token ? tdata.token : null;
      const url = base + '/monetization/view';
      const payload = { videoId: String(videoId||''), creatorId: String(creatorId||''), viewerId: String(viewerId||''), token };
      const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!res.ok) return null;
      return await res.json();
    } catch (e) { return null; }
  } catch (e) { return null; }
}

function getCreatorStats(creatorId) {
  const state = getMonetization();
  const creator = state.creators[creatorId] || { totalViews:0, earnings:0, availableBalance:0, withdrawals:[] };
  // collect videos belonging to creator from posts and marketplace
  const posts = getSavedPosts().filter(p=>String(p.creatorId)===String(creatorId) && p.video).map(p=>({ id: String(p.id), title: p.title, video: p.video, views: state.videos[String(p.id)]?.views||0 }));
  const mitems = getSavedMarketplaceListings().filter(i=>String(i.sellerId)===String(creatorId) && i.video).map(i=>({ id: String(i.id), title: i.name, video: i.video, views: state.videos[String(i.id)]?.views||0 }));
  return { creator, posts, marketplace: mitems, settings: state.settings, platform: state.platform };
}

function requestWithdrawal(creatorId, amount) {
  const state = getMonetization();
  ensureCreatorEntry(state, creatorId);
  const creatorViews = Number(state.creators[creatorId].totalViews||0);
  const threshold = Number((state.settings && state.settings.payoutThreshold) || PAYOUT_VIEWS_THRESHOLD);
  if (creatorViews < threshold) return { success:false, message:`Withdrawal eligibility requires ${threshold} valid views. You have ${creatorViews}.` };
  const avail = Number(state.creators[creatorId].availableBalance||0);
  amount = Number(amount)||0;
  if (amount <= 0 || amount > avail) return { success:false, message:'Invalid amount' };
  state.creators[creatorId].availableBalance = +(avail - amount).toFixed(6);
  const w = { id: 'w-'+Date.now(), amount: amount, requestedAt: new Date().toISOString(), status: 'pending' };
  state.creators[creatorId].withdrawals = state.creators[creatorId].withdrawals || [];
  state.creators[creatorId].withdrawals.unshift(w);
  saveMonetization(state);
  return { success:true, withdrawal: w };
}

// admin helpers
function updateMonetizationSettings({creatorPct, platformPct, viewValue}) {
  const state = getMonetization();
  if (typeof creatorPct === 'number') state.settings.creatorPct = creatorPct;
  if (typeof platformPct === 'number') state.settings.platformPct = platformPct;
  if (typeof viewValue === 'number') state.settings.viewValue = viewValue;
  saveMonetization(state);
}

function updateMonetizationSettings({creatorPct, platformPct, viewValue, payoutThreshold}) {
  const state = getMonetization();
  if (typeof creatorPct === 'number') state.settings.creatorPct = creatorPct;
  if (typeof platformPct === 'number') state.settings.platformPct = platformPct;
  if (typeof viewValue === 'number') state.settings.viewValue = viewValue;
  if (typeof payoutThreshold === 'number') state.settings.payoutThreshold = payoutThreshold;
  saveMonetization(state);
}

function getSavedBusinessListings() {
  try {
    const saved = localStorage.getItem(BUSINESS_STORAGE_KEY);
      return saved ? JSON.parse(saved) : []; // Ensure we return an empty array if parsing fails
  } catch {
    return [];
  }
}

function getSavedPosts() {
  try {
    const saved = localStorage.getItem(POSTS_STORAGE_KEY);
      return saved ? JSON.parse(saved) : []; // Ensure we return an empty array if parsing fails
  } catch {
    return [];
  }
}

function getSavedMarketplaceListings() {
  try {
    const raw = localStorage.getItem(MARKETPLACE_STORAGE_KEY);
      return raw ? JSON.parse(raw) : []; // Ensure we return an empty array if parsing fails
  } catch {
    return [];
  }
}

function saveMarketplaceListings(listings) {
  localStorage.setItem(MARKETPLACE_STORAGE_KEY, JSON.stringify(listings));
} // Save marketplace listings to local storage

function savePosts(posts) {
  localStorage.setItem(POSTS_STORAGE_KEY, JSON.stringify(posts));
} // Save posts to local storage

function readFilesAsDataUrls(files) {
  if (!files || !files.length) return Promise.resolve([]);
  const readers = Array.from(files).map((file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result?.toString() || null);
      reader.onerror = () => reject(new Error('read-error'));
      reader.readAsDataURL(file);
    });
  });
  return Promise.all(readers);
}

function getVideoDuration(file) {
  return new Promise((resolve, reject) => {
    if (!file) return resolve(0);
    try {
      const url = URL.createObjectURL(file);
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.src = url;
      const clean = () => { try { URL.revokeObjectURL(url); } catch(e){} };
      video.addEventListener('loadedmetadata', () => {
        const duration = video.duration || 0;
        clean();
        resolve(duration);
      });
      video.addEventListener('error', () => { clean(); resolve(0); });
    } catch (e) { resolve(0); }
  });
}

// VideoLoadManager: ensures only one video is downloaded/initialized at a time
const VideoLoadManager = (function(){
  const queue = [];
  let running = 0;
  const maxConcurrent = 1;
  const preloaded = new Set();

  function process() {
    if (running >= maxConcurrent) return;
    const task = queue.shift();
    if (!task) return;
    running++;
    task().finally(()=>{ running--; process(); });
  }

  // preload: attempt to load metadata into a hidden video element to speed first play
  function preload(src) {
    if (!src || preloaded.has(src)) return Promise.resolve();
    return new Promise((resolve)=>{
      queue.push(()=>{
        return new Promise((res) => {
          try {
            const v = document.createElement('video');
            v.preload = 'metadata'; v.muted = true; v.playsInline = true; v.style.display='none';
            const clean = ()=>{ try{ v.pause(); v.removeAttribute('src'); v.remove(); }catch(e){} };
            v.addEventListener('loadedmetadata', ()=>{ preloaded.add(src); clean(); res(); resolve(); });
            v.addEventListener('error', ()=>{ clean(); res(); resolve(); });
            document.body.appendChild(v);
            v.src = src;
          } catch (e) { resolve(); res(); }
        });
      });
      process();
    });
  }

  // load into a given video element and return when metadata loaded
  function loadIntoElement(el, src) {
    if (!el) return Promise.resolve();
    return new Promise((resolve)=>{
      queue.push(()=>{
        return new Promise((res)=>{
          try {
            el.preload = 'metadata';
            const onLoad = ()=>{ el.removeEventListener('loadedmetadata', onLoad); resolve(); res(); };
            const onError = ()=>{ el.removeEventListener('error', onError); resolve(); res(); };
            el.addEventListener('loadedmetadata', onLoad);
            el.addEventListener('error', onError);
            el.src = src;
          } catch(e){ resolve(); res(); }
        });
      });
      process();
    });
  }

  return { preload, loadIntoElement, _preloaded: preloaded };
})();

// load external script helper
function loadScript(url) {
  return new Promise((resolve, reject) => {
    if (!url) return resolve();
    const existing = document.querySelector('script[data-src="' + url + '"]');
    if (existing) return existing.onload ? resolve() : resolve();
    const s = document.createElement('script'); s.src = url; s.async = true; s.setAttribute('data-src', url);
    s.onload = () => resolve(); s.onerror = (e) => reject(e);
    document.head.appendChild(s);
  });
}

// IntersectionObserver to preload the first visible video's metadata only
const videoPreviewObserver = (function(){
  let observer = null;
  function init() {
    if (observer) return;
    observer = new IntersectionObserver((entries)=>{
      // find intersecting entries, sort by top position
      const visible = entries.filter(e=>e.isIntersecting).sort((a,b)=>a.boundingClientRect.top - b.boundingClientRect.top);
      if (!visible.length) return;
      // pick the topmost visible and preload its src
      const top = visible[0];
      // prefer small preview if available
      const preview = top.target.getAttribute('data-video-preview') || top.target.dataset.videoPreview;
      const srcAttr = top.target.getAttribute('data-video-src') || top.target.dataset.videoSrc;
      const src = preview || srcAttr;
      // only attempt to preload if this looks like a video (mp4/webm/m3u8 or data:video)
      const looksLikeVideo = s => s && (s.startsWith('data:video') || /\.(mp4|webm|m3u8)(\?|$)/i.test(s));
      if (preview && looksLikeVideo(preview)) VideoLoadManager.preload(preview);
      else if (!preview && looksLikeVideo(srcAttr)) VideoLoadManager.preload(srcAttr);
    }, { root: null, rootMargin: '0px', threshold: 0.25 });
  }
  function observe(el) { if (!el) return; init(); observer.observe(el); }
  return { observe };
})();

// Posts: create, render, search
function populateCreatorSelect() {
  const sel = document.getElementById('post-creator-select');
  if (!sel) return;
  const listings = getSavedBusinessListings();
  // clear but keep default
  sel.innerHTML = '<option value="">Select a business</option>';
  listings.forEach(l => {
    const opt = document.createElement('option');
    opt.value = String(l.id);
    opt.textContent = l.name;
    sel.appendChild(opt);
  });
}

function searchPosts(posts, normalizedQuery) {
  if (!normalizedQuery) return posts;
  return posts.filter(p => {
    return [p.title, p.description, (p.tags||[]).join(' '), (p.creatorName||'')]
      .map(v => (v||'').toString())
      .join(' ')
      .toLowerCase()
      .includes(normalizedQuery);
  });
}

function searchMarketplace(listings, normalizedQuery) {
  if (!normalizedQuery) return listings;
  return listings.filter(item => {
    return [item.name, item.category, item.location, item.description, item.sellerName]
      .map(v=> (v||'').toString())
      .join(' ')
      .toLowerCase()
      .includes(normalizedQuery);
  });
}

function renderMarketplaceListings(listings = null, container = null) {
  const all = listings !== null ? listings : getSavedMarketplaceListings();
  const out = container || document.getElementById('marketplace-listings-container');
  if (!out) return;
  out.innerHTML = '';
  if (!all || !all.length) { out.innerHTML = '<p>No marketplace listings yet.</p>'; return; }
  all.forEach(item => {
    const card = document.createElement('div');
    card.className = 'marketplace-card';
    // attach lazy data attribute for observer
    if (item.video) card.setAttribute('data-video-src', item.video);
    if (item.preview) card.setAttribute('data-video-preview', item.preview);
    if (item.stream) card.setAttribute('data-video-stream', item.stream);
        const photosHtml = (item.photos||[]).slice(0,3).map(p=>`<img src="${p}" style="width:120px;height:80px;object-fit:cover;border-radius:6px;margin-right:0.5rem;">`).join('');
        const currency = item.sellerCurrency || (item.sellerCountry ? (getCountryByCode(item.sellerCountry)||{}).currency : null) || 'USD';
        const priceLabel = item.free ? '<strong>Free</strong>' : `<strong>${formatCurrencyAmount(Number(item.price||0), currency)}</strong>`;
    card.innerHTML = `
      <div style="display:flex;gap:1rem;align-items:flex-start;margin-bottom:0.5rem;border-bottom:1px solid rgba(255,255,255,0.12);padding-bottom:0.5rem;">
        <div style="flex:1;">
          <h4>${item.name}</h4>
          <p>${item.description}</p>
              <p>${priceLabel} • <em>${item.category||''}</em> • ${item.location||''}</p>
              <p><strong>Seller:</strong> ${item.sellerName || ''} • <strong>Phone:</strong> ${formatInternationalPhone(item.phone || '')} ${ item.website ? ' • <a href="'+item.website+'" target="_blank">Website</a>' : '' }</p>
          ${ item.sellerClientId ? `<p style="margin:0.25rem 0 0 0;"><span style="background:#22c55e;color:#012;padding:0.15rem 0.4rem;border-radius:6px;font-size:0.75rem;font-weight:600;display:inline-block;">In‑app calls available</span></p>` : '' }
          <div style="margin-top:0.5rem;">${photosHtml}</div>
        </div>
        <div style="display:flex;flex-direction:column;gap:0.5rem;align-items:flex-end;">
            ${ item.video ? `<button class="marketplace-view-btn" data-id="${item.id}">View</button>` : '' }
            <button class="marketplace-contact-btn" data-phone="${item.phone||''}" data-name="${encodeURIComponent(item.name||'')}">Contact Seller</button>
            <button class="marketplace-call-btn" data-seller-id="${item.sellerId||''}" data-client-id="${item.sellerClientId||''}" data-id="${item.id}">Voice Call</button>
            <button class="marketplace-video-call-btn" data-seller-id="${item.sellerId||''}" data-client-id="${item.sellerClientId||''}" data-id="${item.id}">Video Call</button>
          <button class="marketplace-edit-btn" data-id="${item.id}">Edit</button>
          <button class="marketplace-delete-btn" data-id="${item.id}">Delete</button>
        </div>
      </div>
    `;
    out.appendChild(card);
    // observe for preloading the first visible marketplace video
    videoPreviewObserver.observe(card);

    card.querySelectorAll('.marketplace-contact-btn').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        // show in-app call options (Voice or Video) instead of opening WhatsApp
        const itemName = decodeURIComponent(btn.dataset.name||'');
        // find the corresponding item by id if available
        const listing = item;
        showBuyerCallOptions(listing);
      });
    });

    card.querySelectorAll('.marketplace-edit-btn').forEach(btn=>{
      btn.addEventListener('click', ()=>{ openMarketplaceEditor(Number(btn.dataset.id)); });
    });
    card.querySelectorAll('.marketplace-delete-btn').forEach(btn=>{
      btn.addEventListener('click', ()=>{ deleteMarketplaceListing(Number(btn.dataset.id)); });
    });
    card.querySelectorAll('.marketplace-view-btn').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        const id = String(btn.dataset.id);
        const listing = item;
        if (!listing || !listing.video) return;
        openMediaViewer(listing.video, { videoId: id, creatorId: String(listing.sellerId||''), source: 'marketplace', title: listing.name, poster: (listing.photos && listing.photos[0]) || '', preview: listing.preview||'', stream: listing.stream||listing.video });
      });
    });
    // observe for preloading the first visible marketplace video
    videoPreviewObserver.observe(card);
  });
}

function showBuyerCallOptions(listing) {
  const root = document.getElementById('call-modal-root'); if (!root) return;
  root.innerHTML = '';
  const overlay = document.createElement('div'); overlay.style.position='fixed'; overlay.style.inset='0'; overlay.style.background='rgba(0,0,0,0.4)'; overlay.style.display='flex'; overlay.style.alignItems='center'; overlay.style.justifyContent='center'; overlay.style.zIndex='99999';
  const panel = document.createElement('div'); panel.style.background='rgba(13,26,46,0.98)'; panel.style.color='#fff'; panel.style.padding='1rem'; panel.style.borderRadius='8px'; panel.style.width='min(420px,95%)';
  panel.innerHTML = `<h3>Contact Seller</h3><p><strong>${listing.name}</strong></p>`;
  const info = document.createElement('p'); info.textContent = listing.sellerName ? `Seller: ${listing.sellerName}` : '';
  panel.appendChild(info);
  const btnVoice = document.createElement('button'); btnVoice.textContent = 'Voice Call';
  const btnVideo = document.createElement('button'); btnVideo.textContent = 'Video Call'; btnVideo.style.marginLeft='0.5rem';
  const close = document.createElement('button'); close.textContent='Close'; close.style.marginLeft='0.5rem';
  panel.appendChild(btnVoice); panel.appendChild(btnVideo); panel.appendChild(close);
  overlay.appendChild(panel); root.appendChild(overlay);

  btnVoice.addEventListener('click', ()=>{
    // prefer sellerClientId (direct client id), fallback to sellerId mapping
    if (listing.sellerClientId) {
      startCall(String(listing.sellerClientId), 'audio');
      root.innerHTML = '';
    } else if (listing.sellerId) {
      startCall(String(listing.sellerId), 'audio');
      root.innerHTML = '';
    } else {
      alert('Seller is not registered for in-app calls. Please ask them to register or use the phone number provided.');
    }
  });
  btnVideo.addEventListener('click', ()=>{
    if (listing.sellerClientId) {
      startCall(String(listing.sellerClientId), 'video');
      root.innerHTML = '';
    } else if (listing.sellerId) {
      startCall(String(listing.sellerId), 'video');
      root.innerHTML = '';
    } else {
      alert('Seller is not registered for in-app calls. Please ask them to register or use the phone number provided.');
    }
  });
  close.addEventListener('click', ()=>{ root.innerHTML=''; });
}

// Generic media viewer that tracks monetized video views
function openMediaViewer(src, { videoId='', creatorId='', source='', title='', poster='', preview='', stream='' } = {}) {
  const root = document.createElement('div');
  root.style.position='fixed'; root.style.inset='0'; root.style.background='rgba(0,0,0,0.6)'; root.style.display='flex'; root.style.alignItems='center'; root.style.justifyContent='center'; root.style.zIndex='999999';
  const panel = document.createElement('div'); panel.style.background='#0d1a2e'; panel.style.padding='1rem'; panel.style.borderRadius='8px'; panel.style.width='min(960px,95%)'; panel.style.maxHeight='90%'; panel.style.overflow='auto'; panel.style.color='#fff';
  panel.innerHTML = `<h3 style="margin-top:0;margin-bottom:0.5rem;">${title||'Media'}</h3>`;
  // API helpers
  const apiBase = (MONETIZATION_SERVER_URL||'').replace(/\/$/, '');
  async function apiGet(path) {
    try { const res = await fetch(apiBase + path); if (!res.ok) return null; return await res.json(); } catch(e){ return null; }
  }
  async function apiPost(path, body) {
    try { const res = await fetch(apiBase + path, { method:'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(body) }); if (!res.ok) return await res.json().catch(()=>({ error: 'failed' })); return await res.json(); } catch(e){ return { error: 'network' }; }
  }
  async function trackSmartReach(eventType, payload = {}) {
    try {
      await apiRequest('/smart-reach/engagement', {
        method: 'POST',
        body: JSON.stringify(Object.assign({
          contentId: String(videoId || ''),
          eventType,
          source: source || 'media-viewer'
        }, payload || {}))
      });
    } catch (e) {}
  }
  const mediaWrapper = document.createElement('div'); mediaWrapper.style.width='100%'; mediaWrapper.style.background='#000'; mediaWrapper.style.padding='0.25rem';
  if (!src) return;
  if (src.startsWith('data:') || src.match(/^https?:\/\//i)) {
    const videoEl = document.createElement('video');
    videoEl.controls = true; videoEl.autoplay = false; videoEl.style.width='100%'; videoEl.playsInline = true; videoEl.preload='none';
    if (poster) videoEl.poster = poster;
    mediaWrapper.appendChild(videoEl);
    panel.appendChild(mediaWrapper);
    // play overlay
    const playOverlay = document.createElement('div'); playOverlay.style.position='absolute'; playOverlay.style.left='0'; playOverlay.style.top='0'; playOverlay.style.right='0'; playOverlay.style.bottom='0'; playOverlay.style.display='flex'; playOverlay.style.alignItems='center'; playOverlay.style.justifyContent='center'; playOverlay.style.pointerEvents='none';
    const playBtn = document.createElement('button'); playBtn.textContent='Play'; playBtn.style.pointerEvents='auto'; playBtn.style.padding='0.6rem 1rem'; playBtn.style.fontSize='1rem'; playBtn.style.borderRadius='6px';
    playOverlay.appendChild(playBtn); mediaWrapper.style.position='relative'; mediaWrapper.appendChild(playOverlay);

    const closeBtn = document.createElement('button'); closeBtn.textContent='Close'; closeBtn.style.marginTop='0.5rem'; panel.appendChild(closeBtn);
    // interaction controls: Like, Comment, Share, Follow
    const controls = document.createElement('div'); controls.style.display='flex'; controls.style.gap='0.5rem'; controls.style.marginTop='0.5rem';
    const likeBtn = document.createElement('button'); likeBtn.textContent = 'Like';
    const likeCountSpan = document.createElement('span'); likeCountSpan.style.marginLeft='0.25rem';
    likeBtn.appendChild(likeCountSpan);
    const commentToggleBtn = document.createElement('button'); commentToggleBtn.textContent = 'Comments';
    const shareBtn = document.createElement('button'); shareBtn.textContent = 'Share';
    const notInterestedBtn = document.createElement('button'); notInterestedBtn.textContent = 'Not interested';
    const followBtn = document.createElement('button'); followBtn.textContent = 'Follow';
    const followCountSpan = document.createElement('span'); followCountSpan.style.marginLeft='0.25rem'; followBtn.appendChild(followCountSpan);
    controls.appendChild(likeBtn); controls.appendChild(commentToggleBtn); controls.appendChild(shareBtn); controls.appendChild(notInterestedBtn); controls.appendChild(followBtn);
    panel.appendChild(controls);

    // comments area (hidden by default)
    const commentsArea = document.createElement('div'); commentsArea.style.marginTop='0.5rem'; commentsArea.hidden = true; commentsArea.innerHTML = '<div class="comments-list" style="max-height:200px;overflow:auto;margin-bottom:0.5rem;"></div><div style="display:flex;gap:0.5rem;"><input placeholder="Write a comment..." style="flex:1;" class="comment-input"><button class="comment-post">Post</button></div>';
    panel.appendChild(commentsArea);

    // helper to refresh stats and states
    async function refreshInteractionState() {
      try {
        const uid = getClientId();
        // stats
        const stats = await apiGet('/stats/video/' + encodeURIComponent(String(videoId||'')));
        if (stats) {
          likeCountSpan.textContent = ' ' + (stats.likes || 0);
        }
        // like status
        const likeInfo = await apiGet('/interactions/likes?videoId=' + encodeURIComponent(String(videoId||'')) + '&userId=' + encodeURIComponent(uid));
        if (likeInfo) {
          likeBtn.dataset.liked = likeInfo.liked ? '1' : '0';
          likeBtn.textContent = likeInfo.liked ? 'Unlike' : 'Like';
          likeCountSpan.textContent = ' ' + (likeInfo.likesCount||0);
          likeBtn.appendChild(likeCountSpan);
        }
        // follow status
        if (creatorId) {
          const followInfo = await apiGet('/follow/status?creatorId=' + encodeURIComponent(String(creatorId)) + '&userId=' + encodeURIComponent(uid));
          if (followInfo) {
            followBtn.textContent = followInfo.following ? 'Unfollow' : 'Follow';
            followCountSpan.textContent = ' ' + (followInfo.followersCount||0);
            followBtn.appendChild(followCountSpan);
          }
        } else {
          followBtn.style.display = 'none';
        }
        // comments
        const commentsRes = await apiGet('/comments?videoId=' + encodeURIComponent(String(videoId||'')));
        const listEl = commentsArea.querySelector('.comments-list'); listEl.innerHTML = '';
        if (commentsRes && commentsRes.comments && commentsRes.comments.length) {
          commentsRes.comments.forEach(c => {
            const el = document.createElement('div'); el.style.borderBottom='1px solid rgba(255,255,255,0.06)'; el.style.padding='0.25rem 0'; el.textContent = `${c.authorId}: ${c.text}`; listEl.appendChild(el);
          });
        } else {
          listEl.innerHTML = '<p style="opacity:0.8;">No comments yet.</p>';
        }
      } catch (e) {}
    }

    // wire control handlers
    likeBtn.addEventListener('click', async ()=>{
      const uid = getClientId();
      const liked = likeBtn.dataset.liked === '1';
      if (!liked) {
        const r = await apiPost('/interactions/like', { videoId: String(videoId||''), userId: uid });
        if (r && r.ok) { likeBtn.dataset.liked = '1'; likeBtn.textContent = 'Unlike'; likeCountSpan.textContent = ' ' + (r.likesCount||0); likeBtn.appendChild(likeCountSpan); }
      } else {
        const r = await apiPost('/interactions/unlike', { videoId: String(videoId||''), userId: uid });
        if (r && r.ok) { likeBtn.dataset.liked = '0'; likeBtn.textContent = 'Like'; likeCountSpan.textContent = ' ' + (r.likesCount||0); likeBtn.appendChild(likeCountSpan); }
      }
    });

    commentToggleBtn.addEventListener('click', ()=>{ commentsArea.hidden = !commentsArea.hidden; if (!commentsArea.hidden) refreshInteractionState(); });
    commentsArea.querySelector('.comment-post').addEventListener('click', async ()=>{
      const input = commentsArea.querySelector('.comment-input'); const text = (input.value||'').trim(); if (!text) return; const uid = getClientId(); const r = await apiPost('/comments', { videoId: String(videoId||''), authorId: uid, text }); if (r && r.ok) { input.value=''; refreshInteractionState(); }
    });

    shareBtn.addEventListener('click', async ()=>{
      const uid = getClientId();
      const r = await apiPost('/interactions/share', { videoId: String(videoId||''), userId: uid, platform: 'native' });
      if (r && r.ok) { alert('Share recorded'); refreshInteractionState(); }
    });

    notInterestedBtn.addEventListener('click', async ()=>{
      try {
        const res = await apiRequest('/content/not-interested', {
          method: 'POST',
          body: JSON.stringify({ contentId: String(videoId || ''), reason: 'viewer-feedback' })
        });
        if (res.ok) {
          alert('We will reduce similar recommendations.');
          try { videoEl.pause(); } catch (e) {}
          try { document.body.removeChild(root); } catch (e) {}
          return;
        }
      } catch (e) {}
      alert('Sign in to personalize recommendations.');
    });

    followBtn.addEventListener('click', async ()=>{
      const uid = getClientId();
      if (!creatorId) return;
      const following = followBtn.textContent && followBtn.textContent.toLowerCase().includes('unfollow');
      if (!following) {
        const r = await apiPost('/follow', { creatorId: String(creatorId), followerId: uid });
        if (r && r.ok) { followBtn.textContent = 'Unfollow'; followCountSpan.textContent = ' ' + (r.followersCount||''); followBtn.appendChild(followCountSpan); }
      } else {
        const r = await apiPost('/unfollow', { creatorId: String(creatorId), followerId: uid });
        if (r && r.ok) { followBtn.textContent = 'Follow'; }
      }
    });

    // initial load of interaction state
    refreshInteractionState();
    root.appendChild(panel); document.body.appendChild(root);

    // track genuine viewing: require watch threshold (seconds)
    const viewerId = getClientId();
    const threshold = 5; // seconds watched to count as valid view
    let counted = false;
    let trackedImpression = false;
    let lastWatchSentAt = 0;
    const onTime = () => {
      try {
        if (!trackedImpression) {
          trackedImpression = true;
          trackSmartReach('impression');
        }
        if (videoEl.currentTime > 0) {
          const now = Date.now();
          if (!lastWatchSentAt) lastWatchSentAt = now;
          const elapsed = now - lastWatchSentAt;
          if (elapsed >= 7000) {
            trackSmartReach('watch_time', { watchTimeMs: elapsed });
            lastWatchSentAt = now;
          }
        }
        if (counted) return;
        if (videoEl.currentTime >= threshold) {
          counted = true;
          recordView(String(videoId||''), String(creatorId||''), String(viewerId||'anonymous'));
          // also send to server
          sendViewToServer(String(videoId||''), String(creatorId||''), String(viewerId||'anonymous'));
          trackSmartReach('view');
        }
      } catch(e){}
    };
    videoEl.addEventListener('timeupdate', onTime);
    videoEl.addEventListener('ended', ()=>{
      if (!counted && videoEl.duration >= threshold) {
        counted = true;
        recordView(String(videoId||''), String(creatorId||''), String(viewerId||'anonymous'));
        sendViewToServer(String(videoId||''), String(creatorId||''), String(viewerId||'anonymous'));
        trackSmartReach('view');
      }
      trackSmartReach('completion');
    });

    // load on demand: clicking play loads preview first (if provided) then upgrades to stream/adaptive
    playBtn.addEventListener('click', async ()=>{
      playBtn.disabled = true; playBtn.textContent = 'Loading...';
      const previewSrc = preview || src;
      const streamSrc = stream || src;
      const looksLikeHls = s => s && /\.m3u8(\?|$)/i.test(s);

      // If preview is a video (not just an image), load it first
      try {
        if (previewSrc && previewSrc !== streamSrc && (/^(data:video)|\.(mp4|webm|m3u8)(\?|$)/i.test(previewSrc))) {
          await VideoLoadManager.loadIntoElement(videoEl, previewSrc);
          try { await videoEl.play(); } catch(e){}
          // start background upgrade to stream
          setTimeout(async ()=>{
            try {
              if (streamSrc && looksLikeHls(streamSrc)) {
                // load hls.js if necessary
                if (!window.Hls) {
                  try { await loadScript('https://cdn.jsdelivr.net/npm/hls.js@1.4.0/dist/hls.min.js'); } catch(e){}
                }
                if (window.Hls) {
                  const hls = new Hls();
                  hls.attachMedia(videoEl);
                  hls.loadSource(streamSrc);
                  try { hls.on && hls.on(Hls.Events.MANIFEST_PARSED, ()=>{ try{ videoEl.play(); }catch(e){} }); } catch(e){}
                } else {
                  await VideoLoadManager.loadIntoElement(videoEl, streamSrc);
                }
              } else if (streamSrc && streamSrc !== previewSrc) {
                await VideoLoadManager.loadIntoElement(videoEl, streamSrc);
                try { await videoEl.play(); } catch(e){}
              }
            } catch(e){}
          }, 300);
        } else {
          // no preview or preview is same as stream: load stream (adaptive if needed)
          if (streamSrc && looksLikeHls(streamSrc)) {
            if (!window.Hls) {
              try { await loadScript('https://cdn.jsdelivr.net/npm/hls.js@1.4.0/dist/hls.min.js'); } catch(e){}
            }
            if (window.Hls) {
              const hls = new Hls();
              hls.attachMedia(videoEl);
              hls.loadSource(streamSrc);
              try { hls.on && hls.on(Hls.Events.MANIFEST_PARSED, ()=>{ try{ videoEl.play(); }catch(e){} }); } catch(e){}
            } else {
              await VideoLoadManager.loadIntoElement(videoEl, streamSrc);
              try { await videoEl.play(); } catch(e){}
            }
          } else {
            await VideoLoadManager.loadIntoElement(videoEl, streamSrc);
            try { await videoEl.play(); } catch(e){}
          }
        }
      } catch (e) {
        // fallback: load src directly
        try { await VideoLoadManager.loadIntoElement(videoEl, src); await videoEl.play(); } catch(e){}
      }
      playOverlay.remove();
    });

    closeBtn.addEventListener('click', ()=>{
      try {
        if (!counted && videoEl.currentTime > 0 && videoEl.currentTime < threshold) trackSmartReach('skip');
        videoEl.pause();
        videoEl.removeEventListener('timeupdate', onTime);
        document.body.removeChild(root);
      } catch(e) {}
    });
  } else {
    // fallback: show as image or link
    const img = document.createElement('img'); img.src = src; img.style.maxWidth='100%'; mediaWrapper.appendChild(img); panel.appendChild(mediaWrapper); const closeBtn = document.createElement('button'); closeBtn.textContent='Close'; closeBtn.style.marginTop='0.5rem'; panel.appendChild(closeBtn); root.appendChild(panel); document.body.appendChild(root); closeBtn.addEventListener('click', ()=>{ try{ document.body.removeChild(root);}catch(e){} });
  }
}

function deleteMarketplaceListing(id) {
  const items = getSavedMarketplaceListings();
  const idx = items.findIndex(i=>i.id===id);
  if (idx===-1) return;
  items.splice(idx,1);
  saveMarketplaceListings(items);
  renderMarketplaceListings();
}

function openMarketplaceEditor(id) {
  const items = getSavedMarketplaceListings();
  const item = items.find(i=>i.id===id);
  if (!item) return;
  const modal = document.createElement('div'); modal.style.position='fixed'; modal.style.inset='0'; modal.style.background='rgba(0,0,0,0.4)'; modal.style.display='flex'; modal.style.alignItems='center'; modal.style.justifyContent='center'; modal.style.zIndex='9999';
  const panel = document.createElement('div'); panel.style.background='rgba(13,26,46,0.98)'; panel.style.color='#fff'; panel.style.padding='1rem'; panel.style.borderRadius='8px'; panel.style.width='min(720px,95%)'; panel.style.maxHeight='85%'; panel.style.overflow='auto';
  panel.innerHTML = `
    <h3>Edit Listing</h3>
    <label>Item name</label><input class="modal-item-name" value="${item.name}">
    <label>Description</label><textarea class="modal-item-desc">${item.description}</textarea>
    <label>Category</label><input class="modal-item-category" value="${item.category||''}">
    <label>Location</label><input class="modal-item-location" value="${item.location||''}">
    <label>Price</label><input type="number" class="modal-item-price" value="${item.price||0}">
    <label>Seller name</label><input class="modal-item-seller" value="${item.sellerName||''}">
    <label>Phone</label><input class="modal-item-phone" value="${item.phone||''}">
    <label>Website</label><input class="modal-item-website" value="${item.website||''}">
    <label>Photos (add more)</label><input type="file" class="modal-item-photos" accept="image/*" multiple>
    <label>Video (optional)</label><input type="file" class="modal-item-video" accept="video/*">
    <div style="display:flex;gap:0.5rem;margin-top:0.75rem;"><button class="modal-item-save">Save</button><button class="modal-item-cancel">Cancel</button></div>
    <p class="modal-item-msg"></p>
  `;
  modal.appendChild(panel); document.body.appendChild(modal);
  panel.querySelector('.modal-item-cancel').addEventListener('click', ()=>document.body.removeChild(modal));
  panel.querySelector('.modal-item-save').addEventListener('click', async ()=>{
    const updated = {
      name: panel.querySelector('.modal-item-name').value.trim(),
      description: panel.querySelector('.modal-item-desc').value.trim(),
      category: panel.querySelector('.modal-item-category').value.trim(),
      location: panel.querySelector('.modal-item-location').value.trim(),
      price: Number(panel.querySelector('.modal-item-price').value) || 0,
      sellerName: panel.querySelector('.modal-item-seller').value.trim(),
      phone: panel.querySelector('.modal-item-phone').value.trim(),
      website: panel.querySelector('.modal-item-website').value.trim(),
    };
    const photosFiles = panel.querySelector('.modal-item-photos')?.files || null;
    if (photosFiles && photosFiles.length) {
      try { const photosData = await readFilesAsDataUrls(photosFiles); updated.photos = (item.photos||[]).concat(photosData.filter(Boolean)); } catch(e){ panel.querySelector('.modal-item-msg').textContent='Unable to read photos'; return; }
    } else updated.photos = item.photos || [];
    const videoFile = panel.querySelector('.modal-item-video')?.files?.[0];
    if (videoFile) {
      const dur = await getVideoDuration(videoFile);
      if (dur > 120) { panel.querySelector('.modal-item-msg').textContent='Video must be 2 minutes or less.'; return; }
      try { const v = await readFilesAsDataUrls([videoFile]); updated.video = v[0]||item.video; } catch(e){ panel.querySelector('.modal-item-msg').textContent='Unable to read video'; return; }
    } else updated.video = item.video || null;
    const all = getSavedMarketplaceListings();
    const idx = all.findIndex(i=>i.id===id);
    if (idx!==-1) { all[idx] = {...all[idx], ...updated, updatedAt: new Date().toISOString()}; saveMarketplaceListings(all); }
    renderMarketplaceListings();
    document.body.removeChild(modal);
  });
}

function renderPosts(posts, container) {
  const out = container || document.getElementById('post-listings-container');
  if (!out) return;
  out.innerHTML = '';
  if (!posts || !posts.length) {
    out.innerHTML = '<p>No posts yet.</p>';
    return;
  }
  posts.forEach(p => {
    const card = document.createElement('div');
    card.className = 'post-card';
    if (p.video) card.setAttribute('data-video-src', p.video);
    if (p.preview) card.setAttribute('data-video-preview', p.preview);
    if (p.stream) card.setAttribute('data-video-stream', p.stream);
    const thumb = p.thumbnail || '';
    const paidLabel = p.free ? '<strong>Free</strong>' : `<strong>Paid</strong> - $${Number(p.price||0).toFixed(2)}`;
    const creatorName = p.creatorName || '';
    card.innerHTML = `
      <div style="display:flex;gap:1rem;align-items:flex-start;margin-bottom:0.5rem;">
        ${thumb ? `<img src="${thumb}" style="width:120px;height:80px;object-fit:cover;border-radius:6px;">` : ''}
        <div style="flex:1;">
          <h4>${p.title}</h4>
          <p>${p.description}</p>
          <p>${paidLabel} • By <a href="#" class="post-creator-link" data-id="${p.creatorId}">${creatorName}</a></p>
        </div>
        <div style="display:flex;flex-direction:column;gap:0.5rem;">
          ${p.video?'<button class="post-view-btn" data-id="'+p.id+'">View</button>':''}
          <button class="post-edit-btn" data-id="${p.id}">Edit</button>
          <button class="post-delete-btn" data-id="${p.id}">Delete</button>
        </div>
      </div>
    `;
    out.appendChild(card);

    // wire creator link
    card.querySelectorAll('.post-creator-link').forEach(link => {
      link.addEventListener('click', (e) => { e.preventDefault(); const id = link.dataset.id; openProfileEditor(id); });
    });

    // edit/delete
    card.querySelectorAll('.post-edit-btn').forEach(btn => {
      btn.addEventListener('click', () => { openPostEditor(Number(btn.dataset.id)); });
    });
    card.querySelectorAll('.post-delete-btn').forEach(btn => {
      btn.addEventListener('click', () => { deletePost(Number(btn.dataset.id)); });
    });
    card.querySelectorAll('.post-view-btn').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        const id = btn.dataset.id; const post = p; if (!post || !post.video) return; openMediaViewer(post.video, { videoId: String(post.id), creatorId: String(post.creatorId), source: 'post', title: post.title, poster: post.thumbnail || '', preview: post.preview||'', stream: post.stream||post.video });
      });
    });
  });
}

// --- Connect module UI ---
function openConnectDashboard() {
  const services = [
    { key: 'google', name: 'Google' },
    { key: 'microsoft', name: 'Microsoft' },
    { key: 'google-drive', name: 'Google Drive' },
    { key: 'calendar', name: 'Calendar' },
    { key: 'email', name: 'Email' },
    { key: 'cloud-storage', name: 'Cloud Storage' },
    { key: 'business-services', name: 'Business Services' },
  ];
  const uid = getClientId();
  const apiBase = (MONETIZATION_SERVER_URL||'').replace(/\/$/, '') || '';
  async function apiGet(path) { try { const res = await fetch(apiBase + path); return res.ok ? await res.json() : null; } catch(e){ return null; } }
  async function apiPost(path, body) { try { const res = await fetch(apiBase + path, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) }); return await res.json(); } catch(e){ return { error: 'network' }; } }

  const root = document.createElement('div'); root.style.position='fixed'; root.style.inset='0'; root.style.background='rgba(0,0,0,0.6)'; root.style.display='flex'; root.style.alignItems='center'; root.style.justifyContent='center'; root.style.zIndex='999999';
  const panel = document.createElement('div'); panel.className='connect-panel'; panel.style.width='min(960px,95%)'; panel.style.maxHeight='90%'; panel.style.overflow='auto';
  panel.innerHTML = `<h3 style="margin-top:0;margin-bottom:0.5rem;">AFRIQORA Connect</h3><p style="margin:0 0 0.5rem;color:var(--muted);">Connect apps and services to AFRIQORA. We only record connection state; real OAuth flows are integrated later.</p>`;
  const close = document.createElement('button'); close.textContent='Close'; close.style.marginTop='0.5rem';
  const grid = document.createElement('div'); grid.className='connect-grid'; panel.appendChild(grid);
  panel.appendChild(close); root.appendChild(panel); document.body.appendChild(root);

  function renderCards(statuses) {
    grid.innerHTML = '';
    services.forEach(s => {
      const card = document.createElement('div'); card.className='connect-service-card';
      const title = document.createElement('h4'); title.textContent = s.name; card.appendChild(title);
      const desc = document.createElement('div'); desc.className='connect-permissions'; desc.textContent = 'Manage connection and permissions.'; card.appendChild(desc);
      const actions = document.createElement('div'); actions.className='connect-actions';
      const permBtn = document.createElement('button'); permBtn.textContent='Permissions'; permBtn.className='connect-btn not-connected';
      const connBtn = document.createElement('button'); connBtn.className='connect-btn not-connected';
      actions.appendChild(permBtn); actions.appendChild(connBtn);
      card.appendChild(actions);
      const permList = document.createElement('div'); permList.className='connect-permissions-list'; permList.hidden = true; card.appendChild(permList);

      const connected = statuses && statuses[s.key] && statuses[s.key].connected;
      if (connected) { connBtn.textContent = 'Disconnect'; connBtn.classList.add('connected'); } else { connBtn.textContent = 'Connect'; connBtn.classList.add('not-connected'); }

      permBtn.addEventListener('click', async ()=>{
        if (permList.hidden) {
          // fetch permissions from server
          const p = await apiGet('/connect/permissions?service=' + encodeURIComponent(s.key));
          permList.innerHTML = '';
          if (p && p.permissions && p.permissions.length) {
            const ul = document.createElement('ul'); p.permissions.forEach(px=>{ const li = document.createElement('li'); li.textContent = px; ul.appendChild(li); }); permList.appendChild(ul);
          } else { permList.textContent = 'No permissions listed.'; }
          permList.hidden = false;
        } else { permList.hidden = true; }
      });

      connBtn.addEventListener('click', async ()=>{
        if (connBtn.textContent.toLowerCase().includes('connect')) {
          // record connection intent (stub)
          const r = await apiPost('/connect/connect', { service: s.key, userId: uid });
          if (r && r.ok) { connBtn.textContent = 'Disconnect'; connBtn.classList.remove('not-connected'); connBtn.classList.add('connected'); }
        } else {
          const r = await apiPost('/connect/disconnect', { service: s.key, userId: uid });
          if (r && r.ok) { connBtn.textContent = 'Connect'; connBtn.classList.remove('connected'); connBtn.classList.add('not-connected'); }
        }
      });

      grid.appendChild(card);
    });
  }

  async function init() {
    const resp = await apiGet('/connect/services?userId=' + encodeURIComponent(uid));
    const statuses = resp ? resp.services : {};
    renderCards(statuses);
  }
  init();

  close.addEventListener('click', ()=>{ try{ document.body.removeChild(root); }catch(e){} });
}

// wire Connect button
try { const btn = document.getElementById('open-connect-btn'); if (btn) btn.addEventListener('click', ()=>openConnectDashboard()); } catch(e){}

// --- AFRIQORA Settings UI ---
const APP_SETTINGS_STORAGE_KEY = 'afriqoraAppSettingsV1';
let settingsSyncTimer = null;
let settingsSyncInFlight = false;
let settingsLastSyncedKey = '';
const SETTINGS_SECTIONS = [
  { id: 'privacy-security', title: 'Privacy & Security', description: 'Manage account protections and visibility.' },
  { id: 'notifications', title: 'Notifications', description: 'Control alerts for account, creator, and system activity.' },
  { id: 'afriqora-ai', title: 'AFRIQORA AI', description: 'Tune AI suggestions, summaries, and recommendations.' },
  { id: 'voice', title: 'Voice', description: 'Choose voice defaults for calls and voice interactions.' },
  { id: 'search', title: 'Search', description: 'Customize search behavior and ranking preferences.' },
  { id: 'account', title: 'Account', description: 'Review account identity and connected access.' },
  { id: 'appearance', title: 'Appearance', description: 'Set theme and display density preferences.' },
  { id: 'language-region', title: 'Language & Region', description: 'Pick language, timezone, and regional formatting.' },
  { id: 'payments-subscriptions', title: 'Payments & Subscriptions', description: 'Configure billing preferences and invoice options.' },
  { id: 'safety', title: 'Safety', description: 'Set filters, reporting defaults, and protection features.' },
  { id: 'help-support', title: 'Help & Support', description: 'Access support channels and diagnostics.' },
  { id: 'about-afriqora', title: 'About AFRIQORA', description: 'Product version, legal notes, and platform details.' }
];
const SETTINGS_SECTION_ICONS = {
  'privacy-security': 'shield',
  notifications: 'bell',
  'afriqora-ai': 'spark',
  voice: 'mic',
  search: 'search',
  account: 'user',
  appearance: 'palette',
  'language-region': 'globe',
  'payments-subscriptions': 'wallet',
  safety: 'lock',
  'help-support': 'help',
  'about-afriqora': 'info'
};

function ensureSettingsStyles() {
  if (document.getElementById('afriqora-settings-style')) return;
  const style = document.createElement('style');
  style.id = 'afriqora-settings-style';
  style.textContent = `
    .af-settings-overlay {
      position: fixed;
      inset: 0;
      background: radial-gradient(circle at 12% 14%, rgba(52, 211, 153, 0.12), transparent 36%), radial-gradient(circle at 88% 20%, rgba(14, 165, 233, 0.14), transparent 42%), rgba(2, 10, 20, 0.8);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000000;
      padding: 1rem;
    }
    .af-settings-panel {
      width: min(1120px, 100%);
      max-height: 94vh;
      overflow: hidden;
      border-radius: 18px;
      border: 1px solid rgba(255,255,255,0.14);
      background: linear-gradient(158deg, #08172a 0%, #0e2643 48%, #103256 100%);
      color: #f7fbff;
      box-shadow: 0 30px 80px rgba(0, 0, 0, 0.5);
      display: flex;
      flex-direction: column;
      font-family: "Segoe UI Variable", "Segoe UI", sans-serif;
    }
    .af-settings-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1rem 1.1rem;
      border-bottom: 1px solid rgba(255,255,255,0.12);
      background: linear-gradient(120deg, rgba(8, 18, 34, 0.84), rgba(11, 27, 48, 0.52));
      gap: 0.8rem;
    }
    .af-settings-title {
      margin: 0;
      font-size: 1.15rem;
      letter-spacing: 0.02em;
    }
    .af-settings-subtitle {
      margin: 0.15rem 0 0;
      color: rgba(230, 242, 255, 0.74);
      font-size: 0.88rem;
      line-height: 1.35;
    }
    .af-settings-header-left {
      min-width: 0;
    }
    .af-settings-header-right {
      display: flex;
      align-items: center;
      gap: 0.55rem;
      flex-shrink: 0;
    }
    .af-settings-sync-pill {
      border: 1px solid rgba(110, 231, 183, 0.45);
      background: rgba(52, 211, 153, 0.15);
      color: #d8fff0;
      border-radius: 999px;
      padding: 0.22rem 0.58rem;
      font-size: 0.74rem;
      font-weight: 600;
      letter-spacing: 0.03em;
      white-space: nowrap;
    }
    .af-settings-close {
      border: 1px solid rgba(255,255,255,0.22);
      background: rgba(255,255,255,0.1);
      color: #fff;
      border-radius: 10px;
      padding: 0.5rem 0.8rem;
      cursor: pointer;
      font-weight: 600;
    }
    .af-settings-close:hover,
    .af-settings-close:focus-visible {
      background: rgba(255,255,255,0.18);
      outline: none;
    }
    .af-settings-layout {
      display: grid;
      grid-template-columns: minmax(250px, 330px) 1fr;
      min-height: 0;
      flex: 1;
    }
    .af-settings-nav {
      border-right: 1px solid rgba(255,255,255,0.1);
      overflow: auto;
      padding: 0.8rem 0.75rem;
      background: rgba(9, 20, 37, 0.45);
    }
    .af-settings-nav-btn {
      width: 100%;
      text-align: left;
      border: 1px solid rgba(255,255,255,0.09);
      background: rgba(255,255,255,0.03);
      color: #eff7ff;
      border-radius: 14px;
      padding: 0.78rem 0.76rem;
      cursor: pointer;
      margin: 0 0 0.55rem;
      transition: background 0.2s ease, border-color 0.2s ease, transform 0.2s ease;
      display: grid;
      grid-template-columns: auto 1fr;
      gap: 0.65rem;
      align-items: start;
    }
    .af-settings-nav-btn:hover,
    .af-settings-nav-btn:focus-visible {
      border-color: rgba(101, 201, 255, 0.65);
      background: rgba(56, 189, 248, 0.17);
      transform: translateY(-1px);
      outline: none;
    }
    .af-settings-nav-btn.active {
      border-color: rgba(110, 231, 183, 0.9);
      background: linear-gradient(120deg, rgba(52, 211, 153, 0.24), rgba(14, 165, 233, 0.24));
      box-shadow: inset 0 0 0 1px rgba(255,255,255,0.08);
    }
    .af-settings-nav-icon {
      width: 1.7rem;
      height: 1.7rem;
      border-radius: 0.5rem;
      background: rgba(255,255,255,0.11);
      border: 1px solid rgba(255,255,255,0.2);
      display: inline-grid;
      place-items: center;
      margin-top: 0.05rem;
    }
    .af-settings-nav-icon svg {
      width: 0.95rem;
      height: 0.95rem;
      stroke: #dff4ff;
    }
    .af-settings-nav-title {
      display: block;
      font-weight: 700;
      font-size: 0.93rem;
      margin-bottom: 0.14rem;
      letter-spacing: 0.01em;
    }
    .af-settings-nav-desc {
      display: block;
      color: rgba(227, 238, 251, 0.75);
      font-size: 0.78rem;
      line-height: 1.3;
    }
    .af-settings-content {
      overflow: auto;
      padding: 1rem 1.05rem 1.1rem;
      min-height: 0;
    }
    .af-settings-loading {
      border: 1px solid rgba(255,255,255,0.12);
      border-radius: 14px;
      background: rgba(7, 17, 31, 0.52);
      padding: 1rem;
      display: grid;
      gap: 0.55rem;
    }
    .af-settings-loading-line {
      height: 0.85rem;
      border-radius: 999px;
      background: linear-gradient(90deg, rgba(255,255,255,0.08), rgba(255,255,255,0.16), rgba(255,255,255,0.08));
      background-size: 200% 100%;
      animation: afSettingsPulse 1.3s linear infinite;
    }
    .af-settings-loading-line.short { width: 46%; }
    .af-settings-loading-line.mid { width: 65%; }
    @keyframes afSettingsPulse {
      from { background-position: 100% 0; }
      to { background-position: -100% 0; }
    }
    .af-settings-screen {
      border: 1px solid rgba(255,255,255,0.12);
      border-radius: 16px;
      background: linear-gradient(180deg, rgba(7, 17, 31, 0.62), rgba(8, 22, 40, 0.52));
      padding: 1rem 1rem 1.08rem;
    }
    .af-settings-screen-head {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 0.25rem;
    }
    .af-settings-screen-icon {
      width: 1.9rem;
      height: 1.9rem;
      border-radius: 0.56rem;
      display: inline-grid;
      place-items: center;
      border: 1px solid rgba(110, 231, 183, 0.45);
      background: rgba(52, 211, 153, 0.14);
      flex-shrink: 0;
    }
    .af-settings-screen-icon svg {
      width: 1rem;
      height: 1rem;
      stroke: #b8ffe7;
    }
    .af-settings-screen h4 {
      margin: 0 0 0.35rem;
      font-size: 1.12rem;
      letter-spacing: 0.01em;
    }
    .af-settings-screen-intro {
      margin: 0 0 1rem;
      color: rgba(229, 241, 255, 0.78);
      font-size: 0.9rem;
    }
    .af-settings-group {
      border-top: 1px solid rgba(255,255,255,0.11);
      padding-top: 0.9rem;
      margin-top: 0.9rem;
      display: grid;
      gap: 0.72rem;
    }
    .af-setting-row {
      display: grid;
      grid-template-columns: minmax(220px, 1fr) minmax(180px, 280px);
      gap: 0.9rem;
      align-items: center;
    }
    .af-setting-row label {
      font-weight: 600;
      font-size: 0.91rem;
      display: block;
      margin-bottom: 0.18rem;
    }
    .af-setting-help {
      margin: 0;
      color: rgba(219, 235, 255, 0.7);
      font-size: 0.81rem;
      line-height: 1.35;
    }
    .af-settings-input,
    .af-settings-select,
    .af-settings-textarea {
      width: 100%;
      border-radius: 10px;
      border: 1px solid rgba(255,255,255,0.2);
      background: rgba(255,255,255,0.08);
      color: #fff;
      padding: 0.55rem 0.65rem;
      font-size: 0.9rem;
    }
    .af-settings-input::placeholder,
    .af-settings-textarea::placeholder {
      color: rgba(223, 235, 252, 0.56);
    }
    .af-settings-input:focus,
    .af-settings-select:focus,
    .af-settings-textarea:focus {
      outline: none;
      border-color: rgba(56, 189, 248, 0.92);
      box-shadow: 0 0 0 2px rgba(56, 189, 248, 0.2);
    }
    .af-settings-input[type='range'] {
      padding: 0;
    }
    .af-settings-toggle {
      width: 1.05rem;
      height: 1.05rem;
      accent-color: #34d399;
    }
    .af-settings-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.55rem;
      margin-top: 0.5rem;
    }
    .af-settings-btn {
      border: 1px solid rgba(110, 231, 183, 0.65);
      background: linear-gradient(120deg, rgba(52, 211, 153, 0.2), rgba(56, 189, 248, 0.18));
      color: #fff;
      border-radius: 10px;
      padding: 0.49rem 0.76rem;
      cursor: pointer;
      font-weight: 600;
    }
    .af-settings-btn:hover,
    .af-settings-btn:focus-visible {
      outline: none;
      border-color: rgba(125, 240, 195, 0.9);
      background: linear-gradient(120deg, rgba(52, 211, 153, 0.3), rgba(56, 189, 248, 0.24));
    }
    .af-settings-note {
      border-left: 3px solid rgba(56, 189, 248, 0.9);
      background: rgba(56, 189, 248, 0.12);
      padding: 0.6rem 0.7rem;
      border-radius: 8px;
      color: rgba(237, 247, 255, 0.95);
      font-size: 0.84rem;
      margin-top: 0.65rem;
    }
    .af-settings-mobile-back {
      display: none;
      margin-bottom: 0.7rem;
      border: 1px solid rgba(255,255,255,0.2);
      background: rgba(255,255,255,0.08);
      color: #fff;
      border-radius: 10px;
      padding: 0.45rem 0.66rem;
      cursor: pointer;
      font-weight: 600;
    }
    .af-settings-mobile-back:hover,
    .af-settings-mobile-back:focus-visible {
      outline: none;
      background: rgba(255,255,255,0.15);
    }
    .af-settings-footer {
      border-top: 1px solid rgba(255,255,255,0.1);
      padding: 0.6rem 0.95rem;
      font-size: 0.79rem;
      color: rgba(216, 233, 251, 0.76);
      display: flex;
      justify-content: space-between;
      gap: 0.5rem;
      flex-wrap: wrap;
    }
    .af-settings-save-state {
      padding: 0.08rem 0.45rem;
      border-radius: 999px;
      border: 1px solid transparent;
      transition: all 0.2s ease;
    }
    .af-settings-save-state.info {
      color: #dbf2ff;
      border-color: rgba(56, 189, 248, 0.5);
      background: rgba(56, 189, 248, 0.16);
    }
    .af-settings-save-state.success {
      color: #d9ffe8;
      border-color: rgba(52, 211, 153, 0.6);
      background: rgba(52, 211, 153, 0.18);
    }
    .af-settings-save-state.error {
      color: #ffe2e8;
      border-color: rgba(244, 63, 94, 0.55);
      background: rgba(244, 63, 94, 0.18);
    }
    @media (max-width: 900px) {
      .af-settings-layout {
        grid-template-columns: 1fr;
      }
      .af-settings-nav {
        border-right: 0;
        border-bottom: 1px solid rgba(255,255,255,0.1);
      }
      .af-setting-row {
        grid-template-columns: 1fr;
      }
    }
    @media (max-width: 720px) {
      .af-settings-panel {
        border-radius: 12px;
      }
      .af-settings-nav.mobile-hidden {
        display: none;
      }
      .af-settings-content.mobile-hidden {
        display: none;
      }
      .af-settings-mobile-back {
        display: inline-flex;
      }
      .af-settings-content {
        padding: 0.8rem;
      }
      .af-settings-header {
        padding: 0.75rem;
      }
      .af-settings-header-right {
        gap: 0.4rem;
      }
      .af-settings-sync-pill {
        display: none;
      }
    }
    @media (prefers-reduced-motion: reduce) {
      .af-settings-nav-btn,
      .af-settings-save-state,
      .af-settings-btn,
      .af-settings-close {
        transition: none;
      }
      .af-settings-loading-line {
        animation: none;
      }
    }
  `;
  document.head.appendChild(style);
}

function settingsIconSvg(icon) {
  const map = {
    shield: '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l7 3v6c0 4.5-2.6 7.9-7 9-4.4-1.1-7-4.5-7-9V6l7-3z"/></svg>',
    bell: '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9a6 6 0 1112 0v4l2 3H4l2-3V9"/><path d="M10 19a2 2 0 004 0"/></svg>',
    spark: '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.9 4.1L18 9l-4.1 1.9L12 15l-1.9-4.1L6 9l4.1-1.9L12 3z"/><path d="M5 17l.8 1.6L7.4 19l-1.6.8L5 21l-.8-1.2L2.6 19l1.6-.4L5 17z"/></svg>',
    mic: '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0014 0"/><path d="M12 18v3"/><path d="M9 21h6"/></svg>',
    search: '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>',
    user: '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20a8 8 0 0116 0"/></svg>',
    palette: '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4a8 8 0 100 16h1a3 3 0 000-6h-1a2 2 0 110-4h1"/><circle cx="7.5" cy="10" r="1"/><circle cx="9" cy="7" r="1"/><circle cx="13" cy="7" r="1"/></svg>',
    globe: '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3a15 15 0 010 18"/><path d="M12 3a15 15 0 000 18"/></svg>',
    wallet: '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7h18v12H3z"/><path d="M16 11h5"/><circle cx="16" cy="13" r="1"/><path d="M5 7V5h13"/></svg>',
    lock: '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 118 0v3"/></svg>',
    help: '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M9.2 9a2.8 2.8 0 115 1.4c0 2-2.2 2.2-2.2 4"/><circle cx="12" cy="17" r=".8"/></svg>',
    info: '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 11v5"/><circle cx="12" cy="8" r=".8"/></svg>'
  };
  return map[icon] || map.info;
}

function settingsSectionTitleHtml(section, titleOverride) {
  const iconKey = SETTINGS_SECTION_ICONS[section.id] || 'info';
  const title = titleOverride || section.title;
  return `
    <div class="af-settings-screen-head">
      <span class="af-settings-screen-icon" aria-hidden="true">${settingsIconSvg(iconKey)}</span>
      <h4>${escapeHtml(title)}</h4>
    </div>
  `;
}

function deepMergeSettings(defaults, incoming) {
  const output = Array.isArray(defaults) ? defaults.slice() : Object.assign({}, defaults);
  Object.keys(output).forEach((key) => {
    const dv = output[key];
    const iv = incoming && Object.prototype.hasOwnProperty.call(incoming, key) ? incoming[key] : undefined;
    if (dv && typeof dv === 'object' && !Array.isArray(dv)) {
      output[key] = deepMergeSettings(dv, iv || {});
    } else if (typeof iv !== 'undefined') {
      output[key] = iv;
    }
  });
  return output;
}

function getDefaultAppSettings() {
  return {
    privacy: { twoFactor: false, profileVisibility: 'public', sessionTimeout: '30m', locationSharing: false },
    notifications: { email: true, push: true, creatorActivity: true, securityAlerts: true, digestFrequency: 'daily' },
    ai: { assistantEnabled: true, summaryTone: 'balanced', smartCompose: true, recommendationLevel: 65 },
    voice: { preferredVoice: 'neutral', autoNoiseReduction: true, autoCaption: true, micSensitivity: 55 },
    search: { safeSearch: true, includeMarketplace: true, includeServices: true, resultDensity: 'comfortable', preferredSort: 'relevance' },
    account: { loginAlerts: true, shareUsageInsights: false },
    appearance: { theme: 'system', compactMode: false, reduceMotion: false },
    languageRegion: { language: 'en', country: detectUserCountry() || 'ZA', timezone: 'Africa/Johannesburg', dateFormat: 'dd/mm/yyyy' },
    payments: { defaultCurrency: 'ZAR', autoRenew: true, invoiceEmail: '', planTier: 'starter' },
    safety: { blurSensitiveMedia: true, dmFilterLevel: 'medium', contentReview: true },
    help: { diagnostics: false, contactChannel: 'email' },
    about: { releaseChannel: 'stable', telemetryNoticeSeen: false }
  };
}

function loadAppSettings() {
  const defaults = getDefaultAppSettings();
  try {
    const raw = localStorage.getItem(APP_SETTINGS_STORAGE_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw);
    return deepMergeSettings(defaults, parsed || {});
  } catch (e) {
    return defaults;
  }
}

function saveAppSettings(state) {
  try {
    localStorage.setItem(APP_SETTINGS_STORAGE_KEY, JSON.stringify(state));
  } catch (e) {}
}

function replaceSettingsState(target, nextState) {
  Object.keys(target).forEach((k) => { delete target[k]; });
  Object.keys(nextState || {}).forEach((k) => { target[k] = nextState[k]; });
}

function settingsSyncKey(userId, settingsState) {
  try {
    return String(userId || '') + '|' + JSON.stringify(settingsState || {});
  } catch (e) {
    return String(userId || '') + '|fallback';
  }
}

async function pullSettingsFromServer(user) {
  if (!user || !user.id) return null;
  try {
    const res = await apiRequest('/settings/preferences', { method: 'GET' });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data || !data.ok || !data.settings) return null;
    return deepMergeSettings(getDefaultAppSettings(), data.settings);
  } catch (e) {
    return null;
  }
}

async function pushSettingsToServer(user, settingsState) {
  if (!user || !user.id) return false;
  const syncKey = settingsSyncKey(user.id, settingsState);
  if (settingsLastSyncedKey === syncKey) return true;
  if (settingsSyncInFlight) return false;
  settingsSyncInFlight = true;
  try {
    const res = await apiRequest('/settings/preferences', {
      method: 'PUT',
      body: JSON.stringify({ settings: settingsState })
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data || !data.ok || !data.settings) return false;
    const merged = deepMergeSettings(getDefaultAppSettings(), data.settings);
    saveAppSettings(merged);
    settingsLastSyncedKey = settingsSyncKey(user.id, merged);
    return true;
  } catch (e) {
    return false;
  } finally {
    settingsSyncInFlight = false;
  }
}

function scheduleSettingsSync(user, settingsState, onStatus) {
  if (settingsSyncTimer) clearTimeout(settingsSyncTimer);
  settingsSyncTimer = setTimeout(async () => {
    if (!user || !user.id) {
      if (onStatus) onStatus('Saved locally', 'success');
      return;
    }
    if (onStatus) onStatus('Syncing to account...', 'info');
    const ok = await pushSettingsToServer(user, settingsState);
    if (onStatus) onStatus(ok ? 'Saved to account' : 'Could not sync to account, saved locally', ok ? 'success' : 'error');
  }, 350);
}

function getSettingValue(settings, path) {
  return String(path || '').split('.').reduce((acc, key) => (acc && typeof acc === 'object' ? acc[key] : undefined), settings);
}

function setSettingValue(settings, path, value) {
  const parts = String(path || '').split('.');
  let cursor = settings;
  for (let i = 0; i < parts.length - 1; i++) {
    const k = parts[i];
    if (!cursor[k] || typeof cursor[k] !== 'object') cursor[k] = {};
    cursor = cursor[k];
  }
  cursor[parts[parts.length - 1]] = value;
}

function settingRowHtml({ label, help, controlHtml }) {
  return `
    <div class="af-setting-row">
      <div>
        <label>${escapeHtml(label)}</label>
        <p class="af-setting-help">${escapeHtml(help || '')}</p>
      </div>
      <div>${controlHtml}</div>
    </div>
  `;
}

function openSettingsScreen() {
  ensureSettingsStyles();
  const existing = document.getElementById('afriqora-settings-overlay');
  if (existing && existing.parentNode) existing.parentNode.removeChild(existing);

  let selectedSectionId = SETTINGS_SECTIONS[0].id;
  let mobileDetailMode = false;
  const state = loadAppSettings();
  let currentUser = null;
  let diagnosticsResult = '';

  const overlay = document.createElement('div');
  overlay.id = 'afriqora-settings-overlay';
  overlay.className = 'af-settings-overlay';
  const panel = document.createElement('section');
  panel.className = 'af-settings-panel';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-modal', 'true');
  panel.setAttribute('aria-label', 'AFRIQORA Settings');
  panel.setAttribute('tabindex', '-1');

  panel.innerHTML = `
    <header class="af-settings-header">
      <div class="af-settings-header-left">
        <h3 class="af-settings-title">AFRIQORA Settings</h3>
        <p class="af-settings-subtitle">Control your platform experience, privacy, and account preferences.</p>
      </div>
      <div class="af-settings-header-right">
        <span class="af-settings-sync-pill">Account-aware sync</span>
        <button type="button" class="af-settings-close" aria-label="Close Settings">Close</button>
      </div>
    </header>
    <div class="af-settings-layout">
      <nav class="af-settings-nav" aria-label="Settings sections"></nav>
      <div class="af-settings-content">
        <div class="af-settings-loading" role="status" aria-live="polite">
          <div class="af-settings-loading-line mid"></div>
          <div class="af-settings-loading-line"></div>
          <div class="af-settings-loading-line short"></div>
        </div>
      </div>
    </div>
    <footer class="af-settings-footer">
      <span>AFRIQORA personalization settings are saved on this device.</span>
      <span class="af-settings-save-state" aria-live="polite">Loading settings...</span>
    </footer>
  `;

  overlay.appendChild(panel);
  document.body.appendChild(overlay);

  const closeBtn = panel.querySelector('.af-settings-close');
  const navEl = panel.querySelector('.af-settings-nav');
  const contentEl = panel.querySelector('.af-settings-content');
  const saveStateEl = panel.querySelector('.af-settings-save-state');
  panel.focus();

  function onDocumentKeyDown(e) {
    if (e.key === 'Escape') {
      e.preventDefault();
      closeSettings();
    }
  }

  function closeSettings() {
    document.removeEventListener('keydown', onDocumentKeyDown);
    try { document.body.removeChild(overlay); } catch (e) {}
  }

  function updateSaveState(message, tone = 'success') {
    if (!saveStateEl) return;
    saveStateEl.textContent = message || 'All changes saved';
    saveStateEl.classList.remove('info', 'success', 'error');
    saveStateEl.classList.add(tone);
    saveStateEl.style.opacity = '1';
    if (message && message !== 'All changes saved' && tone !== 'error') {
      setTimeout(() => {
        saveStateEl.textContent = 'All changes saved';
        saveStateEl.classList.remove('info', 'error');
        saveStateEl.classList.add('success');
      }, 1400);
    }
  }

  function applyMobileLayout() {
    const isMobile = window.matchMedia('(max-width: 720px)').matches;
    if (!isMobile) {
      navEl.classList.remove('mobile-hidden');
      contentEl.classList.remove('mobile-hidden');
      return;
    }
    if (mobileDetailMode) {
      navEl.classList.add('mobile-hidden');
      contentEl.classList.remove('mobile-hidden');
    } else {
      navEl.classList.remove('mobile-hidden');
      contentEl.classList.add('mobile-hidden');
    }
  }

  function bindControlEvents(container) {
    container.querySelectorAll('[data-setting-path]').forEach((el) => {
      const path = el.getAttribute('data-setting-path');
      const type = el.getAttribute('data-setting-type') || 'text';
      const eventName = (type === 'toggle' || type === 'range') ? 'input' : 'change';
      el.addEventListener(eventName, () => {
        let value;
        if (type === 'toggle') value = !!el.checked;
        else if (type === 'number') value = Number(el.value) || 0;
        else if (type === 'range') value = Number(el.value) || 0;
        else value = el.value;
        setSettingValue(state, path, value);
        saveAppSettings(state);
        scheduleSettingsSync(currentUser, state, updateSaveState);
        if (path === 'languageRegion.language') {
          applyLanguageChange(value);
        }
        if (type === 'range') {
          const badge = container.querySelector('[data-range-value="' + path + '"]');
          if (badge) badge.textContent = String(value);
        }
        updateSaveState('Saved', 'success');
      });
    });

    container.querySelectorAll('[data-settings-action]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const action = btn.getAttribute('data-settings-action');
        if (action === 'open-account') {
          closeSettings();
          openAccountModal();
          return;
        }
        if (action === 'open-dashboard') {
          closeSettings();
          const me = await fetchCurrentUser(true);
          if (!me) openAccountModal();
          else openCreatorDashboard();
          return;
        }
        if (action === 'run-diagnostics') {
          setSettingValue(state, 'help.diagnostics', true);
          saveAppSettings(state);
          scheduleSettingsSync(currentUser, state, updateSaveState);
          updateSaveState('Running diagnostics...', 'info');
          try {
            const healthRes = await apiRequest('/health', { method: 'GET' });
            const health = await healthRes.json().catch(() => null);
            diagnosticsResult = healthRes.ok
              ? ('API reachable. Server time: ' + new Date(health.now || Date.now()).toLocaleString())
              : 'Diagnostics could not reach API health endpoint.';
            updateSaveState(healthRes.ok ? 'Diagnostics completed' : 'Diagnostics finished with warnings', healthRes.ok ? 'success' : 'error');
          } catch (err) {
            diagnosticsResult = 'Diagnostics failed due to network or server connectivity issues.';
            updateSaveState('Diagnostics failed', 'error');
          }
          renderContent();
          return;
        }
        if (action === 'reset-defaults') {
          const confirmed = confirm('Reset all AFRIQORA settings on this device?');
          if (!confirmed) return;
          const defaults = getDefaultAppSettings();
          replaceSettingsState(state, defaults);
          saveAppSettings(state);
          scheduleSettingsSync(currentUser, state, updateSaveState);
          renderContent();
          updateSaveState('Settings reset', 'success');
        }
      });
    });
  }

  function renderSectionContent(id) {
    const me = currentUser;
    const section = SETTINGS_SECTIONS.find((s) => s.id === id) || SETTINGS_SECTIONS[0];
    if (id === 'privacy-security') {
      return `
        <div class="af-settings-screen">
          ${settingsSectionTitleHtml(section)}
          <p class="af-settings-screen-intro">Protect your account and control how your profile appears across AFRIQORA.</p>
          <div class="af-settings-group">
            ${settingRowHtml({ label: 'Two-factor authentication', help: 'Require an extra verification step at login.', controlHtml: `<input class="af-settings-toggle" type="checkbox" data-setting-path="privacy.twoFactor" data-setting-type="toggle" ${state.privacy.twoFactor ? 'checked' : ''}>` })}
            ${settingRowHtml({ label: 'Profile visibility', help: 'Choose who can see your profile details.', controlHtml: `<select class="af-settings-select" data-setting-path="privacy.profileVisibility"><option value="public" ${state.privacy.profileVisibility === 'public' ? 'selected' : ''}>Public</option><option value="community" ${state.privacy.profileVisibility === 'community' ? 'selected' : ''}>AFRIQORA Community</option><option value="private" ${state.privacy.profileVisibility === 'private' ? 'selected' : ''}>Only me</option></select>` })}
            ${settingRowHtml({ label: 'Session timeout', help: 'Automatic sign-out period for inactive sessions.', controlHtml: `<select class="af-settings-select" data-setting-path="privacy.sessionTimeout"><option value="15m" ${state.privacy.sessionTimeout === '15m' ? 'selected' : ''}>15 minutes</option><option value="30m" ${state.privacy.sessionTimeout === '30m' ? 'selected' : ''}>30 minutes</option><option value="2h" ${state.privacy.sessionTimeout === '2h' ? 'selected' : ''}>2 hours</option><option value="never" ${state.privacy.sessionTimeout === 'never' ? 'selected' : ''}>Never on this device</option></select>` })}
            ${settingRowHtml({ label: 'Location sharing', help: 'Allow location hints for local business and services suggestions.', controlHtml: `<input class="af-settings-toggle" type="checkbox" data-setting-path="privacy.locationSharing" data-setting-type="toggle" ${state.privacy.locationSharing ? 'checked' : ''}>` })}
          </div>
        </div>`;
    }
    if (id === 'notifications') {
      return `
        <div class="af-settings-screen">
          ${settingsSectionTitleHtml(section)}
          <p class="af-settings-screen-intro">Choose when AFRIQORA should notify you across account and creator workflows.</p>
          <div class="af-settings-group">
            ${settingRowHtml({ label: 'Email notifications', help: 'Receive account and platform updates by email.', controlHtml: `<input class="af-settings-toggle" type="checkbox" data-setting-path="notifications.email" data-setting-type="toggle" ${state.notifications.email ? 'checked' : ''}>` })}
            ${settingRowHtml({ label: 'Push notifications', help: 'Show in-browser alerts for live activity.', controlHtml: `<input class="af-settings-toggle" type="checkbox" data-setting-path="notifications.push" data-setting-type="toggle" ${state.notifications.push ? 'checked' : ''}>` })}
            ${settingRowHtml({ label: 'Creator activity alerts', help: 'Get notified for views, likes, and comments on your posts.', controlHtml: `<input class="af-settings-toggle" type="checkbox" data-setting-path="notifications.creatorActivity" data-setting-type="toggle" ${state.notifications.creatorActivity ? 'checked' : ''}>` })}
            ${settingRowHtml({ label: 'Security alerts', help: 'Critical notifications for login changes and suspicious activity.', controlHtml: `<input class="af-settings-toggle" type="checkbox" data-setting-path="notifications.securityAlerts" data-setting-type="toggle" ${state.notifications.securityAlerts ? 'checked' : ''}>` })}
            ${settingRowHtml({ label: 'Digest frequency', help: 'Summary cadence for marketplace and business insights.', controlHtml: `<select class="af-settings-select" data-setting-path="notifications.digestFrequency"><option value="realtime" ${state.notifications.digestFrequency === 'realtime' ? 'selected' : ''}>Realtime</option><option value="daily" ${state.notifications.digestFrequency === 'daily' ? 'selected' : ''}>Daily</option><option value="weekly" ${state.notifications.digestFrequency === 'weekly' ? 'selected' : ''}>Weekly</option></select>` })}
          </div>
        </div>`;
    }
    if (id === 'afriqora-ai') {
      return `
        <div class="af-settings-screen">
          ${settingsSectionTitleHtml(section)}
          <p class="af-settings-screen-intro">Personalize AFRIQORA AI behavior for smarter business and creator support.</p>
          <div class="af-settings-group">
            ${settingRowHtml({ label: 'Enable AFRIQORA AI assistant', help: 'Allow AI suggestions in dashboard and content tools.', controlHtml: `<input class="af-settings-toggle" type="checkbox" data-setting-path="ai.assistantEnabled" data-setting-type="toggle" ${state.ai.assistantEnabled ? 'checked' : ''}>` })}
            ${settingRowHtml({ label: 'Summary tone', help: 'Preferred style for generated summaries and recommendations.', controlHtml: `<select class="af-settings-select" data-setting-path="ai.summaryTone"><option value="brief" ${state.ai.summaryTone === 'brief' ? 'selected' : ''}>Brief</option><option value="balanced" ${state.ai.summaryTone === 'balanced' ? 'selected' : ''}>Balanced</option><option value="detailed" ${state.ai.summaryTone === 'detailed' ? 'selected' : ''}>Detailed</option></select>` })}
            ${settingRowHtml({ label: 'Smart compose', help: 'Assist with post writing and business descriptions.', controlHtml: `<input class="af-settings-toggle" type="checkbox" data-setting-path="ai.smartCompose" data-setting-type="toggle" ${state.ai.smartCompose ? 'checked' : ''}>` })}
            ${settingRowHtml({ label: 'Recommendation intensity', help: 'How proactive AFRIQORA AI should be in recommendations.', controlHtml: `<div><input class="af-settings-input" type="range" min="0" max="100" value="${Number(state.ai.recommendationLevel || 0)}" data-setting-path="ai.recommendationLevel" data-setting-type="range"><p class="af-setting-help">Current level: <strong data-range-value="ai.recommendationLevel">${Number(state.ai.recommendationLevel || 0)}</strong></p></div>` })}
          </div>
        </div>`;
    }
    if (id === 'voice') {
      return `
        <div class="af-settings-screen">
          ${settingsSectionTitleHtml(section)}
          <p class="af-settings-screen-intro">Control voice quality preferences for calling and voice-enabled workflows.</p>
          <div class="af-settings-group">
            ${settingRowHtml({ label: 'Preferred voice profile', help: 'Default voice style for supported interactions.', controlHtml: `<select class="af-settings-select" data-setting-path="voice.preferredVoice"><option value="neutral" ${state.voice.preferredVoice === 'neutral' ? 'selected' : ''}>Neutral</option><option value="warm" ${state.voice.preferredVoice === 'warm' ? 'selected' : ''}>Warm</option><option value="energetic" ${state.voice.preferredVoice === 'energetic' ? 'selected' : ''}>Energetic</option></select>` })}
            ${settingRowHtml({ label: 'Automatic noise reduction', help: 'Reduce background sounds during voice sessions.', controlHtml: `<input class="af-settings-toggle" type="checkbox" data-setting-path="voice.autoNoiseReduction" data-setting-type="toggle" ${state.voice.autoNoiseReduction ? 'checked' : ''}>` })}
            ${settingRowHtml({ label: 'Live captions', help: 'Enable captions for supported voice conversations.', controlHtml: `<input class="af-settings-toggle" type="checkbox" data-setting-path="voice.autoCaption" data-setting-type="toggle" ${state.voice.autoCaption ? 'checked' : ''}>` })}
            ${settingRowHtml({ label: 'Microphone sensitivity', help: 'Tune voice capture sensitivity.', controlHtml: `<div><input class="af-settings-input" type="range" min="0" max="100" value="${Number(state.voice.micSensitivity || 0)}" data-setting-path="voice.micSensitivity" data-setting-type="range"><p class="af-setting-help">Current level: <strong data-range-value="voice.micSensitivity">${Number(state.voice.micSensitivity || 0)}</strong></p></div>` })}
          </div>
        </div>`;
    }
    if (id === 'search') {
      return `
        <div class="af-settings-screen">
          ${settingsSectionTitleHtml(section)}
          <p class="af-settings-screen-intro">Adjust relevance and discoverability for business, services, and marketplace results.</p>
          <div class="af-settings-group">
            ${settingRowHtml({ label: 'Safe Search', help: 'Filter potentially sensitive search results.', controlHtml: `<input class="af-settings-toggle" type="checkbox" data-setting-path="search.safeSearch" data-setting-type="toggle" ${state.search.safeSearch ? 'checked' : ''}>` })}
            ${settingRowHtml({ label: 'Include marketplace', help: 'Include product listings in universal search.', controlHtml: `<input class="af-settings-toggle" type="checkbox" data-setting-path="search.includeMarketplace" data-setting-type="toggle" ${state.search.includeMarketplace ? 'checked' : ''}>` })}
            ${settingRowHtml({ label: 'Include services', help: 'Include service provider matches in universal search.', controlHtml: `<input class="af-settings-toggle" type="checkbox" data-setting-path="search.includeServices" data-setting-type="toggle" ${state.search.includeServices ? 'checked' : ''}>` })}
            ${settingRowHtml({ label: 'Result density', help: 'Set card spacing for search and listing pages.', controlHtml: `<select class="af-settings-select" data-setting-path="search.resultDensity"><option value="compact" ${state.search.resultDensity === 'compact' ? 'selected' : ''}>Compact</option><option value="comfortable" ${state.search.resultDensity === 'comfortable' ? 'selected' : ''}>Comfortable</option><option value="expanded" ${state.search.resultDensity === 'expanded' ? 'selected' : ''}>Expanded</option></select>` })}
            ${settingRowHtml({ label: 'Default sort', help: 'Initial ordering for broad search results.', controlHtml: `<select class="af-settings-select" data-setting-path="search.preferredSort"><option value="relevance" ${state.search.preferredSort === 'relevance' ? 'selected' : ''}>Relevance</option><option value="latest" ${state.search.preferredSort === 'latest' ? 'selected' : ''}>Latest</option><option value="popular" ${state.search.preferredSort === 'popular' ? 'selected' : ''}>Most popular</option></select>` })}
          </div>
        </div>`;
    }
    if (id === 'account') {
      return `
        <div class="af-settings-screen">
          ${settingsSectionTitleHtml(section)}
          <p class="af-settings-screen-intro">Manage identity, sign-in preferences, and account-level actions.</p>
          <div class="af-settings-group">
            <div class="af-setting-row">
              <div>
                <label>Signed in account</label>
                <p class="af-setting-help">Current AFRIQORA identity from your active session.</p>
              </div>
              <div>
                <p style="margin:0 0 0.2rem;"><strong>${escapeHtml((me && me.displayName) || 'Guest')}</strong></p>
                <p style="margin:0 0 0.2rem;" class="af-setting-help">${escapeHtml((me && me.email) || 'Not signed in')}</p>
                <p style="margin:0;" class="af-setting-help">${escapeHtml((me && me.afriqoraId) ? ('AFRIQORA ID: ' + me.afriqoraId) : '')}</p>
              </div>
            </div>
            ${settingRowHtml({ label: 'Login alerts', help: 'Notify me whenever a new sign-in is detected.', controlHtml: `<input class="af-settings-toggle" type="checkbox" data-setting-path="account.loginAlerts" data-setting-type="toggle" ${state.account.loginAlerts ? 'checked' : ''}>` })}
            ${settingRowHtml({ label: 'Share usage insights', help: 'Help improve AFRIQORA features with anonymized activity insights.', controlHtml: `<input class="af-settings-toggle" type="checkbox" data-setting-path="account.shareUsageInsights" data-setting-type="toggle" ${state.account.shareUsageInsights ? 'checked' : ''}>` })}
            <div class="af-settings-actions">
              <button type="button" class="af-settings-btn" data-settings-action="open-account">Open Account Center</button>
              <button type="button" class="af-settings-btn" data-settings-action="open-dashboard">Open Creator Dashboard</button>
            </div>
          </div>
        </div>`;
    }
    if (id === 'appearance') {
      return `
        <div class="af-settings-screen">
          ${settingsSectionTitleHtml(section)}
          <p class="af-settings-screen-intro">Adjust visual style and readability to match your working preference.</p>
          <div class="af-settings-group">
            ${settingRowHtml({ label: 'Theme', help: 'Choose how AFRIQORA appears on this device.', controlHtml: `<select class="af-settings-select" data-setting-path="appearance.theme"><option value="system" ${state.appearance.theme === 'system' ? 'selected' : ''}>Use system</option><option value="dark" ${state.appearance.theme === 'dark' ? 'selected' : ''}>Dark</option><option value="light" ${state.appearance.theme === 'light' ? 'selected' : ''}>Light</option></select>` })}
            ${settingRowHtml({ label: 'Compact mode', help: 'Reduce spacing to show more content per screen.', controlHtml: `<input class="af-settings-toggle" type="checkbox" data-setting-path="appearance.compactMode" data-setting-type="toggle" ${state.appearance.compactMode ? 'checked' : ''}>` })}
            ${settingRowHtml({ label: 'Reduce motion', help: 'Lower animations for comfort and accessibility.', controlHtml: `<input class="af-settings-toggle" type="checkbox" data-setting-path="appearance.reduceMotion" data-setting-type="toggle" ${state.appearance.reduceMotion ? 'checked' : ''}>` })}
          </div>
        </div>`;
    }
    if (id === 'language-region') {
      const countryOptions = AFRICAN_COUNTRIES.map((c) => `<option value="${escapeHtml(c.code)}" ${state.languageRegion.country === c.code ? 'selected' : ''}>${escapeHtml(c.name)} (${escapeHtml(c.code)})</option>`).join('');
      return `
        <div class="af-settings-screen">
          ${settingsSectionTitleHtml(section)}
          <p class="af-settings-screen-intro">Set language, region, timezone, and format defaults used across AFRIQORA.</p>
          <div class="af-settings-group">
            ${settingRowHtml({ label: 'Language', help: 'Primary interface language.', controlHtml: `<select class="af-settings-select" data-setting-path="languageRegion.language"><option value="en" ${state.languageRegion.language === 'en' ? 'selected' : ''}>English</option><option value="fr" ${state.languageRegion.language === 'fr' ? 'selected' : ''}>French</option><option value="sw" ${state.languageRegion.language === 'sw' ? 'selected' : ''}>Swahili</option><option value="pt" ${state.languageRegion.language === 'pt' ? 'selected' : ''}>Portuguese</option></select>` })}
            ${settingRowHtml({ label: 'Region', help: 'Country for localized suggestions and formats.', controlHtml: `<select class="af-settings-select" data-setting-path="languageRegion.country">${countryOptions}</select>` })}
            ${settingRowHtml({ label: 'Timezone', help: 'Timezone used for dashboard and scheduling.', controlHtml: `<select class="af-settings-select" data-setting-path="languageRegion.timezone"><option value="Africa/Johannesburg" ${state.languageRegion.timezone === 'Africa/Johannesburg' ? 'selected' : ''}>Africa/Johannesburg</option><option value="Africa/Lagos" ${state.languageRegion.timezone === 'Africa/Lagos' ? 'selected' : ''}>Africa/Lagos</option><option value="Africa/Nairobi" ${state.languageRegion.timezone === 'Africa/Nairobi' ? 'selected' : ''}>Africa/Nairobi</option><option value="Africa/Cairo" ${state.languageRegion.timezone === 'Africa/Cairo' ? 'selected' : ''}>Africa/Cairo</option></select>` })}
            ${settingRowHtml({ label: 'Date format', help: 'Preferred date presentation format.', controlHtml: `<select class="af-settings-select" data-setting-path="languageRegion.dateFormat"><option value="dd/mm/yyyy" ${state.languageRegion.dateFormat === 'dd/mm/yyyy' ? 'selected' : ''}>DD/MM/YYYY</option><option value="mm/dd/yyyy" ${state.languageRegion.dateFormat === 'mm/dd/yyyy' ? 'selected' : ''}>MM/DD/YYYY</option><option value="yyyy-mm-dd" ${state.languageRegion.dateFormat === 'yyyy-mm-dd' ? 'selected' : ''}>YYYY-MM-DD</option></select>` })}
          </div>
        </div>`;
    }
    if (id === 'payments-subscriptions') {
      const currencies = [...new Set(AFRICAN_COUNTRIES.map((c) => c.currency))].map((cur) => `<option value="${escapeHtml(cur)}" ${state.payments.defaultCurrency === cur ? 'selected' : ''}>${escapeHtml(cur)}</option>`).join('');
      return `
        <div class="af-settings-screen">
          ${settingsSectionTitleHtml(section)}
          <p class="af-settings-screen-intro">Set billing defaults for monetization and platform subscription preferences.</p>
          <div class="af-settings-group">
            ${settingRowHtml({ label: 'Plan tier', help: 'Current AFRIQORA access tier preference.', controlHtml: `<select class="af-settings-select" data-setting-path="payments.planTier"><option value="starter" ${state.payments.planTier === 'starter' ? 'selected' : ''}>Starter</option><option value="pro" ${state.payments.planTier === 'pro' ? 'selected' : ''}>Pro</option><option value="business" ${state.payments.planTier === 'business' ? 'selected' : ''}>Business</option></select>` })}
            ${settingRowHtml({ label: 'Default currency', help: 'Used for displaying payment amounts and balances.', controlHtml: `<select class="af-settings-select" data-setting-path="payments.defaultCurrency">${currencies}</select>` })}
            ${settingRowHtml({ label: 'Auto-renew subscription', help: 'Keep your selected plan active automatically.', controlHtml: `<input class="af-settings-toggle" type="checkbox" data-setting-path="payments.autoRenew" data-setting-type="toggle" ${state.payments.autoRenew ? 'checked' : ''}>` })}
            ${settingRowHtml({ label: 'Invoice email', help: 'Billing notices and payment receipts.', controlHtml: `<input class="af-settings-input" type="email" data-setting-path="payments.invoiceEmail" value="${escapeHtml(state.payments.invoiceEmail || '')}" placeholder="name@company.com">` })}
          </div>
          <p class="af-settings-note">Financial transactions continue to follow existing AFRIQORA backend authorization rules.</p>
        </div>`;
    }
    if (id === 'safety') {
      return `
        <div class="af-settings-screen">
          ${settingsSectionTitleHtml(section)}
          <p class="af-settings-screen-intro">Set content and interaction protections to match your comfort level.</p>
          <div class="af-settings-group">
            ${settingRowHtml({ label: 'Blur sensitive media', help: 'Blur potentially sensitive images and videos by default.', controlHtml: `<input class="af-settings-toggle" type="checkbox" data-setting-path="safety.blurSensitiveMedia" data-setting-type="toggle" ${state.safety.blurSensitiveMedia ? 'checked' : ''}>` })}
            ${settingRowHtml({ label: 'Message filter level', help: 'Moderation strength for direct messages and comments.', controlHtml: `<select class="af-settings-select" data-setting-path="safety.dmFilterLevel"><option value="low" ${state.safety.dmFilterLevel === 'low' ? 'selected' : ''}>Low</option><option value="medium" ${state.safety.dmFilterLevel === 'medium' ? 'selected' : ''}>Medium</option><option value="high" ${state.safety.dmFilterLevel === 'high' ? 'selected' : ''}>High</option></select>` })}
            ${settingRowHtml({ label: 'Creator content review', help: 'Apply extra checks before content is promoted broadly.', controlHtml: `<input class="af-settings-toggle" type="checkbox" data-setting-path="safety.contentReview" data-setting-type="toggle" ${state.safety.contentReview ? 'checked' : ''}>` })}
          </div>
        </div>`;
    }
    if (id === 'help-support') {
      return `
        <div class="af-settings-screen">
          ${settingsSectionTitleHtml(section)}
          <p class="af-settings-screen-intro">Access support channels and run quick diagnostics for troubleshooting.</p>
          <div class="af-settings-group">
            ${settingRowHtml({ label: 'Preferred support channel', help: 'Channel AFRIQORA should prioritize for help responses.', controlHtml: `<select class="af-settings-select" data-setting-path="help.contactChannel"><option value="email" ${state.help.contactChannel === 'email' ? 'selected' : ''}>Email</option><option value="whatsapp" ${state.help.contactChannel === 'whatsapp' ? 'selected' : ''}>WhatsApp</option><option value="inapp" ${state.help.contactChannel === 'inapp' ? 'selected' : ''}>In-app inbox</option></select>` })}
            ${settingRowHtml({ label: 'Share diagnostics', help: 'Include browser diagnostics in support requests.', controlHtml: `<input class="af-settings-toggle" type="checkbox" data-setting-path="help.diagnostics" data-setting-type="toggle" ${state.help.diagnostics ? 'checked' : ''}>` })}
            <div class="af-settings-actions">
              <button type="button" class="af-settings-btn" data-settings-action="run-diagnostics">Run Quick Diagnostics</button>
            </div>
          </div>
            ${diagnosticsResult ? `<p class="af-settings-note" role="status">${escapeHtml(diagnosticsResult)}</p>` : ''}
          <p class="af-settings-note">For urgent account security issues, use Account or Privacy & Security sections first.</p>
        </div>`;
    }
    return `
      <div class="af-settings-screen">
          ${settingsSectionTitleHtml(section, 'About AFRIQORA')}
        <p class="af-settings-screen-intro">Product information, compliance notes, and release behavior.</p>
        <div class="af-settings-group">
          ${settingRowHtml({ label: 'Release channel', help: 'Choose feature rollout preference for this browser.', controlHtml: `<select class="af-settings-select" data-setting-path="about.releaseChannel"><option value="stable" ${state.about.releaseChannel === 'stable' ? 'selected' : ''}>Stable</option><option value="preview" ${state.about.releaseChannel === 'preview' ? 'selected' : ''}>Preview</option></select>` })}
          ${settingRowHtml({ label: 'Telemetry notice acknowledged', help: 'Acknowledge AFRIQORA product analytics policy notice.', controlHtml: `<input class="af-settings-toggle" type="checkbox" data-setting-path="about.telemetryNoticeSeen" data-setting-type="toggle" ${state.about.telemetryNoticeSeen ? 'checked' : ''}>` })}
          <div class="af-setting-row">
            <div>
              <label>Current app identity</label>
              <p class="af-setting-help">The current brand and version context for this project.</p>
            </div>
            <div>
              <p style="margin:0;"><strong>AFRIQORA</strong></p>
              <p class="af-setting-help" style="margin:0.2rem 0 0;">Web App Build: Local Workspace</p>
            </div>
          </div>
          <div class="af-settings-actions">
            <button type="button" class="af-settings-btn" data-settings-action="reset-defaults">Reset Settings to Default</button>
          </div>
        </div>
      </div>`;
  }

  function renderNav() {
    navEl.innerHTML = SETTINGS_SECTIONS.map((section) => `
      <button type="button" class="af-settings-nav-btn ${section.id === selectedSectionId ? 'active' : ''}" data-settings-section="${section.id}">
        <span class="af-settings-nav-icon" aria-hidden="true">${settingsIconSvg(SETTINGS_SECTION_ICONS[section.id] || 'info')}</span>
        <span>
          <span class="af-settings-nav-title">${escapeHtml(section.title)}</span>
          <span class="af-settings-nav-desc">${escapeHtml(section.description)}</span>
        </span>
      </button>
    `).join('');

    navEl.querySelectorAll('[data-settings-section]').forEach((btn) => {
      btn.addEventListener('click', () => {
        selectedSectionId = btn.getAttribute('data-settings-section') || SETTINGS_SECTIONS[0].id;
        mobileDetailMode = true;
        renderNav();
        renderContent();
      });
    });
  }

  function renderContent() {
    const current = SETTINGS_SECTIONS.find((s) => s.id === selectedSectionId) || SETTINGS_SECTIONS[0];
    contentEl.innerHTML = `
      <button type="button" class="af-settings-mobile-back">Back to sections</button>
      ${renderSectionContent(current.id)}
    `;
    contentEl.querySelector('.af-settings-mobile-back').addEventListener('click', () => {
      mobileDetailMode = false;
      applyMobileLayout();
    });
    bindControlEvents(contentEl);
    applyMobileLayout();
  }

  closeBtn.addEventListener('click', closeSettings);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeSettings();
  });
  panel.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      closeSettings();
    }
  });
  document.addEventListener('keydown', onDocumentKeyDown);
  window.addEventListener('resize', applyMobileLayout, { passive: true });
  updateSaveState('Loading settings...', 'info');

  fetchCurrentUser(false).then(async (user) => {
    currentUser = user;
    if (currentUser && currentUser.id) {
      const remote = await pullSettingsFromServer(currentUser);
      if (remote) {
        replaceSettingsState(state, remote);
        saveAppSettings(state);
        settingsLastSyncedKey = settingsSyncKey(currentUser.id, state);
      }
    }
    renderNav();
    renderContent();
    applyMobileLayout();
    updateSaveState(currentUser && currentUser.id ? 'Loaded account settings' : 'Loaded local settings', 'success');
  }).catch(() => {
    currentUser = null;
    renderNav();
    renderContent();
    applyMobileLayout();
    updateSaveState('Loaded local settings', 'success');
  });
}

try {
  const settingsBtn = document.getElementById('open-settings-btn');
  if (settingsBtn) settingsBtn.addEventListener('click', () => openSettingsScreen());
} catch (e) {}

// --- Authentication UI ---
async function openAccountModal() {
  const me = await fetchCurrentUser(true);
  const root = document.createElement('div'); root.style.position='fixed'; root.style.inset='0'; root.style.background='rgba(0,0,0,0.6)'; root.style.display='flex'; root.style.alignItems='center'; root.style.justifyContent='center'; root.style.zIndex='999999';
  const panel = document.createElement('div'); panel.style.background='#0d1a2e'; panel.style.padding='1rem'; panel.style.borderRadius='8px'; panel.style.width='min(560px,95%)'; panel.style.maxHeight='90%'; panel.style.overflow='auto'; panel.style.color='#fff';
  panel.innerHTML = `<h3 style="margin-top:0;margin-bottom:0.5rem;">Account</h3>`;
  const content = document.createElement('div'); panel.appendChild(content);
  const close = document.createElement('button'); close.textContent='Close'; close.style.marginTop='0.5rem'; panel.appendChild(close);
  root.appendChild(panel); document.body.appendChild(root);

  function closeModal() {
    try { document.body.removeChild(root); } catch (e) {}
  }

  function renderSignedIn(user) {
    content.innerHTML = `
      <div style="display:grid;gap:0.5rem;">
        <p><strong>Name:</strong> ${escapeHtml(user.displayName || 'Account')}</p>
        <p><strong>Email:</strong> ${escapeHtml(user.email || '')}</p>
        <p><strong>AFRIQORA ID:</strong> ${escapeHtml(user.afriqoraId || '')}</p>
        <p><strong>Joined:</strong> ${escapeHtml(formatIsoDate(user.createdAt))}</p>
        <div style="display:flex;gap:0.5rem;">
          <button class="auth-open-dashboard">Open Creator Dashboard</button>
          <button class="auth-open-settings">Settings</button>
          <button class="auth-logout">Logout</button>
        </div>
        <p class="auth-msg" style="color:var(--muted);"></p>
      </div>
    `;
    const logoutBtn = content.querySelector('.auth-logout');
    const dashboardBtn = content.querySelector('.auth-open-dashboard');
    const settingsBtn = content.querySelector('.auth-open-settings');
    logoutBtn.addEventListener('click', async ()=>{
      await apiRequest('/auth/logout', { method:'POST' }).catch(()=>null);
      authUserCache = null;
      // Clear native session token on logout
      try { localStorage.removeItem('afriqoraSessionId'); } catch(e) {}
      await updateAccountUI();
      closeModal();
    });
    dashboardBtn.addEventListener('click', ()=>{
      closeModal();
      openCreatorDashboard();
    });
    settingsBtn.addEventListener('click', ()=>{
      closeModal();
      openSettingsScreen();
    });
  }

  function renderAuthForms() {
    content.innerHTML = '';
    const tabs = document.createElement('div'); tabs.style.display='flex'; tabs.style.gap='0.5rem'; tabs.style.marginBottom='0.5rem';
    const loginTab = document.createElement('button'); loginTab.textContent='Login';
    const regTab = document.createElement('button'); regTab.textContent='Register';
    tabs.appendChild(loginTab); tabs.appendChild(regTab);
    content.appendChild(tabs);
    const body = document.createElement('div');
    content.appendChild(body);

    function renderLogin() {
      body.innerHTML = `<div style="display:grid;gap:0.5rem;"><input placeholder="Email" class="auth-email"><input placeholder="Password" type="password" class="auth-password"><div style="display:flex;gap:0.5rem;"><button class="auth-login">Login</button><button class="auth-guest">Continue as Guest</button></div><p class="auth-msg" style="color:var(--muted);"></p></div>`;
      body.querySelector('.auth-login').addEventListener('click', async ()=>{
        const email = body.querySelector('.auth-email').value.trim();
        const password = body.querySelector('.auth-password').value;
        const res = await apiRequest('/auth/login', { method:'POST', body: JSON.stringify({ email, password }) });
        const j = await res.json().catch(()=>({ error:'network' }));
        if (j && j.ok && j.user) {
          authUserCache = j.user;
          // On native apps, persist sessionId for Bearer token auth (no cookies in WebView)
          if (j.sessionId && window.__afriqoraNative) {
            try { localStorage.setItem('afriqoraSessionId', j.sessionId); } catch(e) {}
          }
          await updateAccountUI();
          renderSignedIn(j.user);
        } else {
          body.querySelector('.auth-msg').textContent = j.error || 'Login failed';
        }
      });
      body.querySelector('.auth-guest').addEventListener('click', ()=>{ closeModal(); });
    }

    function renderRegister() {
      body.innerHTML = `<div style="display:grid;gap:0.5rem;"><input placeholder="Display name" class="reg-name"><input placeholder="Email" class="reg-email"><input placeholder="Password" type="password" class="reg-password"><div style="display:flex;gap:0.5rem;"><button class="reg-submit">Register</button></div><p class="reg-msg" style="color:var(--muted);"></p></div>`;
      body.querySelector('.reg-submit').addEventListener('click', async ()=>{
        const displayName = body.querySelector('.reg-name').value.trim();
        const email = body.querySelector('.reg-email').value.trim();
        const password = body.querySelector('.reg-password').value;
        const res = await apiRequest('/auth/register', { method:'POST', body: JSON.stringify({ displayName, email, password }) });
        const j = await res.json().catch(()=>({ error:'network' }));
        if (j && j.ok && j.user) {
          authUserCache = j.user;
          // On native apps, persist sessionId for Bearer token auth (no cookies in WebView)
          if (j.sessionId && window.__afriqoraNative) {
            try { localStorage.setItem('afriqoraSessionId', j.sessionId); } catch(e) {}
          }
          await updateAccountUI();
          renderSignedIn(j.user);
        } else {
          body.querySelector('.reg-msg').textContent = j.error || 'Register failed';
        }
      });
    }

    loginTab.addEventListener('click', renderLogin);
    regTab.addEventListener('click', renderRegister);
    renderLogin();
  }

  if (me) renderSignedIn(me);
  else renderAuthForms();
  close.addEventListener('click', closeModal);
}

async function updateAccountUI() {
  try {
    const j = { user: await fetchCurrentUser(true) };
    const btn = document.getElementById('open-account-btn'); if (!btn) return;
    if (j && j.user) {
      const labelBase = (j.user.displayName && j.user.displayName.length) ? j.user.displayName : 'Account';
      btn.textContent = j.user.afriqoraId ? `${labelBase} (${j.user.afriqoraId})` : labelBase;
      btn.onclick = ()=>openAccountModal();
    } else {
      btn.textContent = 'Account'; btn.onclick = ()=>openAccountModal();
    }
  } catch(e){}
}

// wire account button
try { const acctBtn = document.getElementById('open-account-btn'); if (acctBtn) acctBtn.addEventListener('click', ()=>openAccountModal()); updateAccountUI(); } catch(e){}

function deletePost(id) {
  const posts = getSavedPosts();
  const idx = posts.findIndex(p=>p.id===id);
  if (idx===-1) return;
  posts.splice(idx,1);
  savePosts(posts);
  // refresh listings and unified results
  renderPosts(getSavedPosts());
  performUnifiedSearch();
}

function openPostEditor(postId) {
  const posts = getSavedPosts();
  const post = posts.find(p=>p.id===postId);
  if (!post) return;
  // reuse modal pattern
  const modal = document.createElement('div');
  modal.style.position='fixed'; modal.style.inset='0'; modal.style.background='rgba(0,0,0,0.4)'; modal.style.display='flex'; modal.style.alignItems='center'; modal.style.justifyContent='center'; modal.style.zIndex='9999';
  const panel = document.createElement('div'); panel.style.background='rgba(13,26,46,0.98)'; panel.style.color='#fff'; panel.style.padding='1rem'; panel.style.borderRadius='8px'; panel.style.width='min(720px,95%)'; panel.style.maxHeight='85%'; panel.style.overflow='auto';
  panel.innerHTML = `
    <h3>Edit Post</h3>
    <label>Title</label><input type="text" class="modal-post-title" value="${post.title}">
    <label>Description</label><textarea class="modal-post-desc">${post.description}</textarea>
    <label>Thumbnail</label><input type="file" class="modal-post-thumb" accept="image/*"><div class="modal-thumb-preview">${post.thumbnail?`<img src="${post.thumbnail}" style="width:120px;height:80px;object-fit:cover;border-radius:6px;">`:''}</div>
    <label>Video (optional)</label><input type="file" class="modal-post-video" accept="video/*">
    <label>Free</label><input type="checkbox" class="modal-post-free" ${post.free?'checked':''}>
    <label>Price</label><input type="number" class="modal-post-price" value="${post.price||0}">
    <div style="display:flex;gap:0.5rem;margin-top:0.75rem;"><button class="modal-post-save">Save</button><button class="modal-post-cancel">Cancel</button></div>
    <p class="modal-post-msg"></p>
  `;
  modal.appendChild(panel); document.body.appendChild(modal);
  panel.querySelector('.modal-post-cancel').addEventListener('click', ()=>document.body.removeChild(modal));
  panel.querySelector('.modal-post-save').addEventListener('click', async ()=>{
    const updated = {
      title: panel.querySelector('.modal-post-title').value.trim(),
      description: panel.querySelector('.modal-post-desc').value.trim(),
      free: !!panel.querySelector('.modal-post-free').checked,
      price: Number(panel.querySelector('.modal-post-price').value)||0,
    };
    const thumbFile = panel.querySelector('.modal-post-thumb')?.files?.[0];
    if (thumbFile) {
      try { const data = await readFilesAsDataUrls([thumbFile]); updated.thumbnail = data[0]||post.thumbnail; } catch(e){ panel.querySelector('.modal-post-msg').textContent='Unable to read thumbnail'; return; }
    } else updated.thumbnail = post.thumbnail||null;
    // video handling skipped for large data; store if provided - but enforce duration limit
    const videoFile = panel.querySelector('.modal-post-video')?.files?.[0];
    if (videoFile) {
      const dur = await getVideoDuration(videoFile);
      if (dur > 120) { panel.querySelector('.modal-post-msg').textContent='Video must be 2 minutes or less.'; return; }
      try { const data = await readFilesAsDataUrls([videoFile]); updated.video = data[0]||post.video; } catch(e){ panel.querySelector('.modal-post-msg').textContent='Unable to read video'; return; }
    } else updated.video = post.video||null;
    // save
    const postsAll = getSavedPosts();
    const index = postsAll.findIndex(p=>p.id===postId);
    if (index!==-1) { postsAll[index] = {...postsAll[index], ...updated, updatedAt:new Date().toISOString()}; savePosts(postsAll); }
    renderPosts(getSavedPosts(), document.getElementById('post-listings-container'));
    performUnifiedSearch();
    document.body.removeChild(modal);
  });
}

function saveBusinessListings(listings) {
  localStorage.setItem(BUSINESS_STORAGE_KEY, JSON.stringify(listings));
}

async function getUnifiedSearchData(query = "") {
  // Placeholder for future database or remote search.
  // Currently searches local application data from stored listings and posts.
  const normalizedQuery = query.trim().toLowerCase();
  const businesses = searchBusinesses(getSavedBusinessListings(), normalizedQuery);
  const posts = searchPosts(getSavedPosts(), normalizedQuery);

  return {
    businesses,
    services: [],
    posts,
  };
}

function searchBusinesses(listings, normalizedQuery) {
  if (!normalizedQuery) return listings;
  return listings.filter((listing) => {
    return [
      listing.name,
      listing.category,
      listing.location,
      listing.description,
      listing.owner,
      listing.phone,
      listing.website,
      (listing.services || []).join(' '),
    ]
      .map((value) => (value || "").toString())
      .join(" ")
      .toLowerCase()
      .includes(normalizedQuery);
  });
}

function renderBusinessListings(query = "", listings = null, container = businessListingsContainer) {
  const resultsContainer = container || businessListingsContainer;
  if (!resultsContainer) return;

  const allListings = listings !== null ? listings : getSavedBusinessListings();
  const normalizedQuery = query.trim().toLowerCase();

  const uniqueListings = allListings.reduce((acc, listing) => {
    const key = [
      listing.name,
      listing.owner,
      listing.phone,
      listing.location,
      listing.category,
      listing.description,
      listing.website,
    ]
      .map((value) => (value || "").trim().toLowerCase())
      .join("|");

    if (!acc.seen.has(key)) {
      acc.seen.add(key);
      acc.items.push(listing);
    }

    return acc;
  }, { seen: new Set(), items: [] }).items;

  resultsContainer.innerHTML = "";

  const filteredListings = searchBusinesses(uniqueListings, normalizedQuery);

  if (!uniqueListings.length) {
    if (normalizedQuery) {
      resultsContainer.innerHTML = "<p>No results found.</p>";
    } else {
      resultsContainer.innerHTML = "<p>No business listings yet. Register to add yours.</p>";
    }
    return;
  }

  if (!filteredListings.length) {
    resultsContainer.innerHTML = "<p>No results found.</p>";
    return;
  }

  filteredListings.forEach((listing) => {
    const card = createBusinessCard(listing);
    resultsContainer.appendChild(card);
  });
}

function createBusinessCard(listing) {
  const card = document.createElement("div");
  card.className = "business-listing";
  const logoSrc = listing.logo || DEFAULT_LOGO_PLACEHOLDER;
  const websiteLine = listing.website ? `<p><strong>Website:</strong> ${listing.website}</p>` : "";

  card.innerHTML = `
    <div style="display:flex;align-items:flex-start;gap:1rem;margin-bottom:1rem;">
      <img src="${logoSrc}" alt="Logo for ${listing.name}" style="width:64px;height:64px;object-fit:cover;border-radius:0.75rem;flex-shrink:0;">
      <div style="flex:1;">
        <h3 style="display:flex;align-items:center;gap:0.5rem;">${listing.name} ${listing.ownerClientId ? `<span style="background:#22c55e;color:#012;padding:0.15rem 0.4rem;border-radius:6px;font-size:0.75rem;font-weight:600;">In‑app calls available</span>` : ''}</h3>
        <p><strong>Owner:</strong> ${listing.owner}</p>
        <p><strong>Phone:</strong> ${formatInternationalPhone(listing.phone || '')}</p>
        <p><strong>Location:</strong> ${listing.location}</p>
        <p><strong>Category:</strong> ${listing.category}</p>
        <p><strong>Services:</strong> ${(listing.services||[]).join(', ')}</p>
      </div>
      <div style="display:flex;flex-direction:column;gap:0.5rem;">
        <button type="button" class="business-edit-btn">Edit profile</button>
        <button type="button" class="business-manage-btn">Manage profile</button>
        <button type="button" class="business-call-btn" data-id="${listing.id}" data-client-id="${listing.ownerClientId||''}">Call</button>
        <button type="button" class="business-video-call-btn" data-id="${listing.id}" data-client-id="${listing.ownerClientId||''}">Video Call</button>
      </div>
    </div>
    <div>
      <p>${listing.description}</p>
      ${ listing.photos && listing.photos.length ? `<div style="display:flex;gap:0.5rem;margin-top:0.5rem;">${listing.photos.slice(0,3).map(p=>`<img src="${p}" style="width:80px;height:60px;object-fit:cover;border-radius:6px;">`).join('')}</div>` : '' }
      ${websiteLine}
    </div>
    <div class="business-edit-panel" hidden style="border-top:1px solid rgba(255,255,255,0.12);padding-top:1rem;margin-top:1rem;">
      <h4>Edit business profile</h4>
      <input type="text" class="edit-business-name" placeholder="Business name" value="${listing.name}">
      <input type="text" class="edit-business-owner" placeholder="Owner name" value="${listing.owner}">
      <input type="tel" class="edit-business-phone" placeholder="WhatsApp number" value="${listing.phone}">
      <input type="text" class="edit-business-location" placeholder="City or location" value="${listing.location}">
      <select class="edit-business-category">
        <option value="">Choose a business category</option>
        <option${listing.category === "Mechanic" ? " selected" : ""}>Mechanic</option>
        <option${listing.category === "Car Repair" ? " selected" : ""}>Car Repair</option>
        <option${listing.category === "Restaurant" ? " selected" : ""}>Restaurant</option>
        <option${listing.category === "Plumber" ? " selected" : ""}>Plumber</option>
        <option${listing.category === "Electrician" ? " selected" : ""}>Electrician</option>
        <option${listing.category === "Carpenter" ? " selected" : ""}>Carpenter</option>
        <option${listing.category === "Cleaning Services" ? " selected" : ""}>Cleaning Services</option>
        <option${listing.category === "Construction" ? " selected" : ""}>Construction</option>
        <option${listing.category === "Other Services" ? " selected" : ""}>Other Services</option>
      </select>
      <input type="text" class="edit-business-description" placeholder="Business description" value="${listing.description}">
      <input type="text" class="edit-business-website" placeholder="Website or social profile (optional)" value="${listing.website || ""}">
      <input type="file" class="edit-business-logo" accept="image/png,image/jpeg,image/jpg,image/webp">
      <div style="display:flex;gap:0.75rem;margin-top:0.75rem;">
        <button type="button" class="business-save-btn">Save profile</button>
        <button type="button" class="business-cancel-btn">Cancel</button>
      </div>
      <p class="business-edit-message" aria-live="polite" style="margin-top:0.75rem;"></p>
    </div>
  `;

  const editButton = card.querySelector(".business-edit-btn");
  const editPanel = card.querySelector(".business-edit-panel");
  const saveButton = card.querySelector(".business-save-btn");
  const cancelButton = card.querySelector(".business-cancel-btn");
  const editMessage = card.querySelector(".business-edit-message");

  editButton?.addEventListener("click", () => {
    if (editPanel) {
      editPanel.hidden = !editPanel.hidden;
    }
  });

  const manageBtn = card.querySelector('.business-manage-btn');
  manageBtn?.addEventListener('click', () => {
    openProfileEditor(listing.id);
  });

  cancelButton?.addEventListener("click", () => {
    if (editPanel) {
      editPanel.hidden = true;
    }
    if (editMessage) {
      editMessage.textContent = "";
    }
  });

  saveButton?.addEventListener("click", () => {
    const updatedName = card.querySelector(".edit-business-name")?.value.trim() || "";
    const updatedOwner = card.querySelector(".edit-business-owner")?.value.trim() || "";
    const updatedPhone = card.querySelector(".edit-business-phone")?.value.trim() || "";
    const updatedLocation = card.querySelector(".edit-business-location")?.value.trim() || "";
    const updatedCategory = card.querySelector(".edit-business-category")?.value || "";
    const updatedDescription = card.querySelector(".edit-business-description")?.value.trim() || "";
    const updatedWebsite = card.querySelector(".edit-business-website")?.value.trim() || "";
    const updatedLogoFile = card.querySelector(".edit-business-logo")?.files?.[0];

    const missingFields = [];
    if (!updatedName) missingFields.push("business name");
    if (!updatedOwner) missingFields.push("owner name");
    if (!updatedPhone) missingFields.push("WhatsApp number");
    if (!updatedLocation) missingFields.push("location");
    if (!updatedCategory) missingFields.push("category");
    if (!updatedDescription) missingFields.push("description");

    if (missingFields.length) {
      if (editMessage) {
        editMessage.textContent = `Please provide ${missingFields.join(", ")}.`;
      }
      return;
    }

    function saveUpdatedListing(logoDataUrl) {
      updateBusinessListing(listing.id, {
        name: updatedName,
        owner: updatedOwner,
        phone: updatedPhone,
        location: updatedLocation,
        category: updatedCategory,
        description: updatedDescription,
        website: updatedWebsite,
        logo: logoDataUrl,
      });
      if (editMessage) {
        editMessage.textContent = "Business profile updated successfully.";
      }
      if (editPanel) {
        editPanel.hidden = true;
      }
    }

    if (updatedLogoFile) {
      const allowedMimeTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
      if (!allowedMimeTypes.includes(updatedLogoFile.type)) {
        if (editMessage) {
          editMessage.textContent = "Please choose a JPG, JPEG, PNG, or WebP logo file.";
        }
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        saveUpdatedListing(reader.result?.toString() || null);
      };
      reader.onerror = () => {
        if (editMessage) {
          editMessage.textContent = "Unable to read the logo file. Please try a different image.";
        }
      };
      reader.readAsDataURL(updatedLogoFile);
    } else {
      saveUpdatedListing(listing.logo || null);
    }
  });

  return card;
}

// Manage profile UI: open editor for a specific listing id
const manageProfileButton = document.getElementById("manage-profile-btn");

function openProfileEditor(listingId) {
  const listings = getSavedBusinessListings();
  const listing = listings.find(l => l.id === Number(listingId));
  if (!listing) return;

  // create modal container
  const modal = document.createElement('div');
  modal.style.position = 'fixed';
  modal.style.inset = '0';
  modal.style.background = 'rgba(0,0,0,0.4)';
  modal.style.display = 'flex';
  modal.style.alignItems = 'center';
  modal.style.justifyContent = 'center';
  modal.style.zIndex = '9999';

  const panel = document.createElement('div');
  panel.style.background = 'rgba(13,26,46,0.98)';
  panel.style.color = '#fff';
  panel.style.padding = '1rem';
  panel.style.borderRadius = '8px';
  panel.style.width = 'min(720px, 95%)';
  panel.style.maxHeight = '85%';
  panel.style.overflow = 'auto';
  panel.innerHTML = `
    <h3>Edit Business Profile</h3>
    <label>Logo</label>
    <input type="file" class="modal-business-logo" accept="image/*">
    <div class="modal-logo-preview" style="margin:0.5rem 0;">${listing.logo ? `<img src="${listing.logo}" style="width:96px;height:72px;object-fit:cover;border-radius:6px;">` : ''}</div>
    <label>Business name</label>
    <input type="text" class="modal-business-name" value="${listing.name}">
    <label>Owner name</label>
    <input type="text" class="modal-business-owner" value="${listing.owner}">
    <label>Phone</label>
    <input type="text" class="modal-business-phone" value="${listing.phone}">
    <label>Country</label>
    <select class="modal-business-country"></select>
    <label>Currency</label>
    <select class="modal-business-currency"></select>
    <label>Location</label>
    <input type="text" class="modal-business-location" value="${listing.location}">
    <label>Category</label>
    <input type="text" class="modal-business-category" value="${listing.category}">
    <label>Services (comma separated)</label>
    <input type="text" class="modal-business-services" value="${(listing.services||[]).join(', ')}">
    <label>Description</label>
    <textarea class="modal-business-description">${listing.description}</textarea>
    <label>Website</label>
    <input type="text" class="modal-business-website" value="${listing.website||''}">
    <label>Photos (add more)</label>
    <input type="file" class="modal-business-photos" accept="image/*" multiple>
    <div class="modal-photos-preview" style="display:flex;gap:0.5rem;margin:0.5rem 0;">${(listing.photos||[]).map(p=>`<img src="${p}" style="width:80px;height:60px;object-fit:cover;border-radius:6px;">`).join('')}</div>
    <label>Video URLs (comma separated)</label>
    <input type="text" class="modal-business-videos" value="${(listing.videos||[]).join(', ')}">
    <div style="display:flex;gap:0.5rem;margin-top:0.75rem;">
      <button class="modal-save">Save</button>
      <button class="modal-cancel">Cancel</button>
    </div>
    <p class="modal-message" aria-live="polite"></p>
  `;

  modal.appendChild(panel);
  document.body.appendChild(modal);

  panel.querySelector('.modal-cancel').addEventListener('click', () => {
    document.body.removeChild(modal);
  });

  // logo preview handler
  const logoInputEl = panel.querySelector('.modal-business-logo');
  const logoPreviewEl = panel.querySelector('.modal-logo-preview');
  logoInputEl?.addEventListener('change', async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      const data = await readFilesAsDataUrls([f]);
      if (data && data[0]) {
        logoPreviewEl.innerHTML = `<img src="${data[0]}" style="width:96px;height:72px;object-fit:cover;border-radius:6px;">`;
      }
    } catch (err) {
      // ignore preview errors
    }
  });

  panel.querySelector('.modal-save').addEventListener('click', async () => {
    const updated = {
      name: panel.querySelector('.modal-business-name')?.value.trim() || '',
      owner: panel.querySelector('.modal-business-owner')?.value.trim() || '',
      phone: panel.querySelector('.modal-business-phone')?.value.trim() || '',
      country: panel.querySelector('.modal-business-country')?.value || '',
      currency: panel.querySelector('.modal-business-currency')?.value || '',
      location: panel.querySelector('.modal-business-location')?.value.trim() || '',
      category: panel.querySelector('.modal-business-category')?.value.trim() || '',
      services: (panel.querySelector('.modal-business-services')?.value || '').split(',').map(s=>s.trim()).filter(Boolean),
      description: panel.querySelector('.modal-business-description')?.value.trim() || '',
      website: panel.querySelector('.modal-business-website')?.value.trim() || '',
      videos: (panel.querySelector('.modal-business-videos')?.value || '').split(',').map(s=>s.trim()).filter(Boolean),
    };

    const updatedLogoFile = panel.querySelector('.modal-business-logo')?.files?.[0];
    const newPhotosFiles = panel.querySelector('.modal-business-photos')?.files || null;
    if (updatedLogoFile) {
      try {
        const logoData = await readFilesAsDataUrls([updatedLogoFile]);
        updated.logo = logoData[0] || listing.logo || null;
      } catch (e) {
        panel.querySelector('.modal-message').textContent = 'Unable to read the logo file.';
        return;
      }
    } else {
      updated.logo = listing.logo || null;
    }

    if (newPhotosFiles && newPhotosFiles.length) {
      try {
        const photosData = await readFilesAsDataUrls(newPhotosFiles);
        updated.photos = (listing.photos||[]).concat(photosData.filter(Boolean));
      } catch (e) {
        panel.querySelector('.modal-message').textContent = 'Unable to read one of the photo files.';
        return;
      }
    } else {
      updated.photos = listing.photos || [];
    }

    if (!updated.country) { panel.querySelector('.modal-message').textContent = 'Please select a country.'; return; }
    // normalize phone according to selected country before saving
    try { updated.phone = normalizePhoneInternational(updated.phone, updated.country); } catch(e) {}
    updateBusinessListing(listing.id, updated);
    panel.querySelector('.modal-message').textContent = 'Profile updated.';
    setTimeout(()=>{ document.body.removeChild(modal); }, 800);
  });

  // populate modal country/currency selects
  populateCountrySelect(panel.querySelector('.modal-business-country'), listing.country || '');
  populateCurrencySelect(panel.querySelector('.modal-business-currency'), listing.currency || '');
}

if (manageProfileButton) {
  manageProfileButton.addEventListener('click', () => {
    const id = manageProfileButton.dataset.id;
    if (id) {
      bindClientToBusiness(id);
      openProfileEditor(id);
    }
  });
}

function updateBusinessListing(id, updatedFields) {
  const listings = getSavedBusinessListings();
  const index = listings.findIndex((item) => item.id === id);
  if (index === -1) return;
  listings[index] = { ...listings[index], ...updatedFields };
  saveBusinessListings(listings);
  renderBusinessListings(businessSearchInput?.value || "");
}

if (businessSearchButton) {
  businessSearchButton.addEventListener("click", () => {
    const query = businessSearchInput?.value || "";
    renderBusinessListings(query);
  });
}

if (businessSearchInput) {
  businessSearchInput.addEventListener("keypress", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      const query = businessSearchInput.value || "";
      renderBusinessListings(query);
    }
  });
}

function performUnifiedSearch() {
  if (!unifiedSearchResults) return;

  const query = unifiedSearchInput?.value || "";
  const normalizedQuery = query.trim().toLowerCase();
  const businesses = searchBusinesses(getSavedBusinessListings(), normalizedQuery);
  renderBusinessListings(query, businesses, unifiedSearchResults);
}

if (unifiedSearchButton) {
  unifiedSearchButton.addEventListener("click", () => {
    performUnifiedSearch();
  });
}

if (unifiedSearchInput) {
  unifiedSearchInput.addEventListener("keypress", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      performUnifiedSearch();
    }
  });
}

if (registerBusinessButton) {
  registerBusinessButton.addEventListener("click", () => {
    const name = businessNameInput?.value.trim() || "";
    const owner = businessOwnerInput?.value.trim() || "";
    const phone = businessPhoneInput?.value.trim() || "";
    const country = document.getElementById('business-country')?.value || '';
    const currency = document.getElementById('business-currency')?.value || '';
    const location = businessLocationInput?.value.trim() || "";
    const category = businessCategoryInput?.value || "";
    const description = businessDescriptionInput?.value.trim() || "";
    const website = businessWebsiteInput?.value.trim() || "";
    const logoFile = businessLogoInput?.files?.[0];

    const missingFields = [];
    if (!name) missingFields.push("business name");
    if (!owner) missingFields.push("owner name");
    if (!phone) missingFields.push("WhatsApp number");
    if (!location) missingFields.push("location");
    if (!country) missingFields.push("country");
    if (!category) missingFields.push("category");
    if (!description) missingFields.push("description");

    if (missingFields.length) {
      businessRegistrationMessage.textContent = `Please provide ${missingFields.join(", ")}.`;
      return;
    }

    function completeRegistration(logoDataUrl, photosDataUrls, sessionUser) {
      const listings = getSavedBusinessListings();
      const servicesArr = (businessServicesInput?.value || '').split(',').map(s=>s.trim()).filter(Boolean);
      const videosArr = (businessVideosInput?.value || '').split(',').map(s=>s.trim()).filter(Boolean);
      const newListing = {
        id: Date.now(),
        name,
        owner,
        phone: normalizePhoneInternational(phone, country),
        country,
        currency,
        location,
        category,
        description,
        website,
        services: servicesArr,
        photos: photosDataUrls || [],
        videos: videosArr,
        logo: logoDataUrl,
        ownerClientId: getClientId(),
        ownerUserId: sessionUser && sessionUser.id ? String(sessionUser.id) : null,
        ownerAfriqoraId: sessionUser && sessionUser.afriqoraId ? String(sessionUser.afriqoraId) : null,
        submittedAt: new Date().toISOString(),
      };
      listings.push(newListing);

      saveBusinessListings(listings);
      renderBusinessListings();

      businessRegistrationMessage.textContent = "Business registered successfully.";
      if (manageProfileButton) {
        manageProfileButton.hidden = false;
        manageProfileButton.dataset.id = String(newListing.id);
      }
      // auto-bind this client to the newly created business so owner can receive calls
      try { bindClientToBusiness(newListing.id); } catch(e) {}

      businessNameInput.value = "";
      businessOwnerInput.value = "";
      businessPhoneInput.value = "";
      if (document.getElementById('business-country')) document.getElementById('business-country').value = '';
      if (document.getElementById('business-currency')) document.getElementById('business-currency').value = '';
      businessLocationInput.value = "";
      businessCategoryInput.value = "";
      businessDescriptionInput.value = "";
      businessWebsiteInput.value = "";
      if (businessLogoInput) businessLogoInput.value = "";
      if (businessPhotosInput) businessPhotosInput.value = "";
      if (businessServicesInput) businessServicesInput.value = "";
      if (businessVideosInput) businessVideosInput.value = "";
    }

    (async () => {
      // Read photos and logo, then complete registration
      try {
        const sessionUser = await fetchCurrentUser();
        let logoData = null;
        if (logoFile) {
          const allowedMimeTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
          if (!allowedMimeTypes.includes(logoFile.type)) {
            businessRegistrationMessage.textContent = "Please choose a JPG, JPEG, PNG, or WebP logo file.";
            return;
          }
          const logoArr = await readFilesAsDataUrls([logoFile]);
          logoData = logoArr[0] || null;
        }

        let photosData = [];
        if (businessPhotosInput && businessPhotosInput.files && businessPhotosInput.files.length) {
          photosData = await readFilesAsDataUrls(businessPhotosInput.files);
        }

        completeRegistration(logoData, photosData, sessionUser);
      } catch (e) {
        businessRegistrationMessage.textContent = "Unable to process uploaded files. Please try again.";
      }
    })();
  });
}

  renderBusinessListings();
  // initialize creators select and posts listing
  populateCreatorSelect();
  renderPosts(getSavedPosts(), document.getElementById('post-listings-container'));

  // publish post handler
  const postPublishBtn = document.getElementById('post-publish-btn');
  if (postPublishBtn) {
    postPublishBtn.addEventListener('click', async () => {
      const authUser = await fetchCurrentUser();
      const creatorId = document.getElementById('post-creator-select')?.value;
      const title = document.getElementById('post-title')?.value.trim() || '';
      const desc = document.getElementById('post-description')?.value.trim() || '';
      const thumbFile = document.getElementById('post-thumbnail')?.files?.[0];
      const videoFile = document.getElementById('post-video')?.files?.[0];
      const free = !!document.getElementById('post-free')?.checked;
      const price = Number(document.getElementById('post-price')?.value) || 0;
      const msgEl = document.getElementById('post-message');

      if (!authUser) { if (msgEl) msgEl.textContent = 'Login is required to create posts.'; openAccountModal(); return; }
      if (!creatorId) { if (msgEl) msgEl.textContent = 'Choose a creator business.'; return; }
      if (!title) { if (msgEl) msgEl.textContent = 'Enter a post title.'; return; }

      try {
        // enforce max video duration of 120s
        if (videoFile) {
          const dur = await getVideoDuration(videoFile);
          if (dur > 120) { if (msgEl) msgEl.textContent = 'Video must be 2 minutes or less.'; return; }
        }
        const thumbData = thumbFile ? (await readFilesAsDataUrls([thumbFile]))[0] : null;
        const videoData = videoFile ? (await readFilesAsDataUrls([videoFile]))[0] : null;
        const creator = getSavedBusinessListings().find(b=>String(b.id)===String(creatorId));
        if (creator && !creator.country) { if (msgEl) msgEl.textContent = 'Creator profile must have a country selected before publishing.'; return; }
        const posts = getSavedPosts();
        const newPost = {
          id: Date.now(),
          title,
          description: desc,
          thumbnail: thumbData || null,
          video: videoData || null,
          free,
          price: free ? 0 : price,
          creatorId: Number(creatorId),
          ownerUserId: authUser.id,
          ownerAfriqoraId: authUser.afriqoraId || null,
          creatorName: creator ? creator.name : '',
          createdAt: new Date().toISOString(),
        };
        posts.push(newPost);
        savePosts(posts);
        renderPosts(getSavedPosts(), document.getElementById('post-listings-container'));
        if (msgEl) msgEl.textContent = 'Post published.';
        // clear form
        document.getElementById('post-title').value='';
        document.getElementById('post-description').value='';
        if (document.getElementById('post-thumbnail')) document.getElementById('post-thumbnail').value='';
        if (document.getElementById('post-video')) document.getElementById('post-video').value='';
        document.getElementById('post-free').checked = true;
        document.getElementById('post-price').value = 0;
        performUnifiedSearch();
      } catch (e) {
        if (msgEl) msgEl.textContent = 'Unable to publish post (file read error).';
      }
    });
  }

  // populate price enable/disable
  const postFree = document.getElementById('post-free');
  const postPrice = document.getElementById('post-price');
  if (postFree && postPrice) {
    postFree.addEventListener('change', () => { postPrice.disabled = postFree.checked; });
  }

// Marketplace initialization and handlers
const marketplaceSellerSelect = document.getElementById('marketplace-seller-select');
const marketplaceSellerName = document.getElementById('marketplace-seller-name');
const marketplaceSellerPhone = document.getElementById('marketplace-seller-phone');
const marketplaceSellerWebsite = document.getElementById('marketplace-seller-website');
const marketplaceItemName = document.getElementById('marketplace-item-name');
const marketplaceDescription = document.getElementById('marketplace-description');
const marketplaceCategory = document.getElementById('marketplace-category');
const marketplaceLocation = document.getElementById('marketplace-location');
const marketplacePrice = document.getElementById('marketplace-price');
const marketplacePhotos = document.getElementById('marketplace-photos');
const marketplaceVideo = document.getElementById('marketplace-video');
const marketplaceFree = document.getElementById('marketplace-free');
const marketplacePublishBtn = document.getElementById('marketplace-publish-btn');
const marketplaceMessage = document.getElementById('marketplace-message');
const marketplaceSearchInput = document.getElementById('marketplace-search-input');
const marketplaceSearchBtn = document.getElementById('marketplace-search-btn');

function populateMarketplaceSellerSelect() {
  const sel = marketplaceSellerSelect;
  if (!sel) return;
  sel.innerHTML = '<option value="">Select a registered business (optional)</option>';
  getSavedBusinessListings().forEach(b => {
    const o = document.createElement('option'); o.value = String(b.id); o.textContent = b.name; sel.appendChild(o);
  });
}

if (marketplaceSellerSelect) {
  marketplaceSellerSelect.addEventListener('change', ()=>{
    const id = marketplaceSellerSelect.value;
    if (!id) return;
    const b = getSavedBusinessListings().find(x=>String(x.id)===String(id));
    if (b) {
      if (marketplaceSellerName) marketplaceSellerName.value = b.name || '';
        if (marketplaceSellerPhone) marketplaceSellerPhone.value = b.phone || '';
        if (document.getElementById('marketplace-seller-country')) document.getElementById('marketplace-seller-country').value = b.country || '';
        if (document.getElementById('marketplace-seller-currency')) document.getElementById('marketplace-seller-currency').value = b.currency || '';
      if (marketplaceSellerWebsite) marketplaceSellerWebsite.value = b.website || '';
    }
  });
}

if (marketplacePublishBtn) {
  marketplacePublishBtn.addEventListener('click', async ()=>{
    const sellerId = marketplaceSellerSelect?.value || '';
    const sellerName = (marketplaceSellerName?.value || '').trim();
    const phone = (marketplaceSellerPhone?.value || '').trim();
    const sellerCountry = (document.getElementById('marketplace-seller-country')?.value || '').trim();
    const sellerCurrency = (document.getElementById('marketplace-seller-currency')?.value || '').trim();
    const website = (marketplaceSellerWebsite?.value || '').trim();
    const name = (marketplaceItemName?.value || '').trim();
    const desc = (marketplaceDescription?.value || '').trim();
    const category = (marketplaceCategory?.value || '').trim();
    const location = (marketplaceLocation?.value || '').trim();
    const price = Number(marketplacePrice?.value) || 0;
    const free = !!marketplaceFree?.checked;
    if (!name) { if (marketplaceMessage) marketplaceMessage.textContent = 'Enter an item name.'; return; }
    if (!desc) { if (marketplaceMessage) marketplaceMessage.textContent = 'Enter a description.'; return; }
    if (!sellerName) { if (marketplaceMessage) marketplaceMessage.textContent = 'Enter seller name.'; return; }
    if (!sellerCountry) { if (marketplaceMessage) marketplaceMessage.textContent = 'Please select seller country.'; return; }
    try {
      const photosData = marketplacePhotos && marketplacePhotos.files && marketplacePhotos.files.length ? await readFilesAsDataUrls(marketplacePhotos.files) : [];
      // enforce video duration limit
      let videoData = null;
      if (marketplaceVideo && marketplaceVideo.files && marketplaceVideo.files.length) {
        const vfile = marketplaceVideo.files[0];
        const dur = await getVideoDuration(vfile);
        if (dur > 120) { if (marketplaceMessage) marketplaceMessage.textContent = 'Video must be 2 minutes or less.'; return; }
        videoData = (await readFilesAsDataUrls([vfile]))[0];
      }
      const items = getSavedMarketplaceListings();
      // determine sellerClientId if seller is a registered business
      let sellerClientId = null;
      if (sellerId) {
        const biz = getSavedBusinessListings().find(b => String(b.id) === String(sellerId));
        if (biz) sellerClientId = biz.ownerClientId || null;
      }

      const newItem = {
        id: Date.now(),
        name,
        description: desc,
        category,
        location,
        sellerId: sellerId ? Number(sellerId) : null,
        sellerClientId: sellerClientId,
        sellerName,
        phone: normalizePhoneInternational(phone, sellerCountry),
        sellerCountry: sellerCountry || null,
        sellerCurrency: sellerCurrency || null,
        website,
        photos: photosData || [],
        video: videoData || null,
        free,
        price: free ? 0 : price,
        createdAt: new Date().toISOString(),
      };
      items.push(newItem);
      saveMarketplaceListings(items);
      renderMarketplaceListings(items);
      if (marketplaceMessage) marketplaceMessage.textContent = 'Listing published.';
      // clear form
      if (marketplaceItemName) marketplaceItemName.value='';
      if (marketplaceDescription) marketplaceDescription.value='';
      if (marketplaceCategory) marketplaceCategory.value='';
      if (marketplaceLocation) marketplaceLocation.value='';
      if (marketplacePrice) marketplacePrice.value='0';
      if (marketplacePhotos) marketplacePhotos.value='';
      if (marketplaceVideo) marketplaceVideo.value='';
      if (marketplaceFree) marketplaceFree.checked=false;
    } catch (e) {
      if (marketplaceMessage) marketplaceMessage.textContent = 'Unable to publish listing (file error).';
    }
  });
}

if (marketplaceSearchBtn && marketplaceSearchInput) {
  marketplaceSearchBtn.addEventListener('click', ()=>{
    const q = (marketplaceSearchInput.value||'').trim().toLowerCase();
    const results = searchMarketplace(getSavedMarketplaceListings(), q);
    renderMarketplaceListings(results);
  });
  marketplaceSearchInput.addEventListener('keypress', (e)=>{ if (e.key==='Enter') { e.preventDefault(); marketplaceSearchBtn.click(); } });
}

// ensure seller select is populated on load
populateMarketplaceSellerSelect();
renderMarketplaceListings(getSavedMarketplaceListings());
// populate country and currency selects for business and marketplace forms
const _detectedCountry = detectUserCountry();
populateCountrySelect(document.getElementById('business-country'), _detectedCountry || '');
populateCurrencySelect(document.getElementById('business-currency'), _detectedCountry ? (getCountryByCode(_detectedCountry)||{}).currency : '');
populateCountrySelect(document.getElementById('marketplace-seller-country'), _detectedCountry || '');
populateCurrencySelect(document.getElementById('marketplace-seller-currency'), _detectedCountry ? (getCountryByCode(_detectedCountry)||{}).currency : '');

// -------------------- Calling (WebRTC + Signaling) --------------------
const SIGNALING_SERVER_URL = (typeof window !== 'undefined' && window.SIGNALING_SERVER_URL) ? window.SIGNALING_SERVER_URL : 'ws://localhost:8080';
const SIGNALING_ALWAYS_ON = typeof window !== 'undefined' && (window.AFRIQORA_ENABLE_SIGNALING === true || String(window.AFRIQORA_ENABLE_SIGNALING || '').toLowerCase() === 'true');
const CLIENT_ID_STORAGE_KEY = 'afriqoraClientId';

function getClientId() {
  try {
    let id = localStorage.getItem(CLIENT_ID_STORAGE_KEY);
    if (!id) {
      id = String(Date.now()) + '-' + Math.random().toString(36).slice(2,8);
      localStorage.setItem(CLIENT_ID_STORAGE_KEY, id);
    }
    return id;
  } catch {
    return String(Date.now());
  }
}

class SignalingClient {
  constructor(url, clientId, options = {}) {
    this.url = url;
    this.clientId = clientId;
    this.options = Object.assign({ autoRetry: false, retryDelayMs: 2000 }, options || {});
    this.ws = null;
    this.onmessage = null;
    this._retryTimer = null;
    this._isDisposed = false;
    this._connect();
  }
  _connect() {
    if (this._isDisposed) return;
    try {
      this.ws = new WebSocket(this.url);
      this.ws.addEventListener('open', ()=>{
        this.send({ type: 'register', clientId: this.clientId });
      });
      this.ws.addEventListener('message', (ev)=>{
        try { const msg = JSON.parse(ev.data); if (this.onmessage) this.onmessage(msg); } catch(e){}
      });
      this.ws.addEventListener('close', ()=>{
        if (!this.options.autoRetry || this._isDisposed) return;
        if (this._retryTimer) clearTimeout(this._retryTimer);
        this._retryTimer = setTimeout(()=>this._connect(), Math.max(500, Number(this.options.retryDelayMs || 2000)));
      });
      this.ws.addEventListener('error', ()=>{});
    } catch (e) {}
  }
  async waitForOpen(timeoutMs = 3500) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) return true;
      await new Promise((resolve) => setTimeout(resolve, 80));
    }
    return !!(this.ws && this.ws.readyState === WebSocket.OPEN);
  }
  dispose() {
    this._isDisposed = true;
    if (this._retryTimer) {
      clearTimeout(this._retryTimer);
      this._retryTimer = null;
    }
    try { if (this.ws) this.ws.close(); } catch (e) {}
  }
  send(obj) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    try { this.ws.send(JSON.stringify(obj)); } catch(e){}
  }
}

let signalingClient = null;

function ensureSignalingClient(options = {}) {
  const merged = Object.assign({ autoRetry: false }, options || {});
  if (signalingClient) {
    signalingClient.options = Object.assign({}, signalingClient.options || {}, merged);
    return signalingClient;
  }
  try {
    signalingClient = new SignalingClient(SIGNALING_SERVER_URL, getClientId(), merged);
    signalingClient.onmessage = handleSignalingMessage;
    return signalingClient;
  } catch (e) {
    return null;
  }
}

if (SIGNALING_ALWAYS_ON) {
  ensureSignalingClient({ autoRetry: true });
}

// bind this clientId to a business id when owner manages a profile
function bindClientToBusiness(businessId) {
  if (!businessId || !SIGNALING_ALWAYS_ON) return;
  const client = ensureSignalingClient({ autoRetry: true });
  if (!client) return;
  client.send({ type: 'bind-business', clientId: getClientId(), businessId: String(businessId) });
}

// Call state
let currentCall = null; // { pc, localStream, remoteStream, targetId, kind, state }

function showIncomingCallPopup(fromName, fromId, kind, offer) {
  const root = document.getElementById('call-modal-root');
  if (!root) return;
  root.innerHTML = '';
  const box = document.createElement('div');
  box.style.position='fixed'; box.style.inset='0'; box.style.display='flex'; box.style.alignItems='center'; box.style.justifyContent='center'; box.style.zIndex='99999'; box.style.background='rgba(0,0,0,0.4)';
  const panel = document.createElement('div'); panel.style.background='rgba(13,26,46,0.98)'; panel.style.color='#fff'; panel.style.padding='1rem'; panel.style.borderRadius='8px'; panel.style.width='min(420px,95%)';
  panel.innerHTML = `<h3>Incoming ${kind} call</h3><p><strong>${fromName || 'Unknown'}</strong> is calling you.</p>`;
  const acceptBtn = document.createElement('button'); acceptBtn.textContent='Accept';
  const declineBtn = document.createElement('button'); declineBtn.textContent='Decline';
  declineBtn.style.marginLeft='0.5rem';
  panel.appendChild(acceptBtn); panel.appendChild(declineBtn);
  box.appendChild(panel); root.appendChild(box);

  declineBtn.addEventListener('click', ()=>{
    const client = ensureSignalingClient({ autoRetry: true });
    if (client) client.send({ type:'call-decline', from:getClientId(), to:fromId });
    root.innerHTML='';
  });

  acceptBtn.addEventListener('click', async ()=>{
    root.innerHTML = '';
    await acceptCall(fromId, kind, offer);
  });
}

async function startCall(targetId, kind='audio') {
  if (!targetId) { alert('Signaling not available or target not provided'); return; }
  const client = ensureSignalingClient({ autoRetry: true });
  if (!client) { alert('Signaling is not available in this browser.'); return; }
  const ready = await client.waitForOpen(3500);
  if (!ready) { alert('Signaling service is unavailable. Start signaling-server.js to enable calling.'); return; }
  const clientId = getClientId();
  // get local media
  let constraints = { audio: true }; if (kind==='video') constraints.video = true;
  try {
    const localStream = await navigator.mediaDevices.getUserMedia(constraints);
    const pc = new RTCPeerConnection({ iceServers:[{ urls: 'stun:stun.l.google.com:19302' }] });
    pc.onicecandidate = (e)=>{ if (e.candidate) client.send({ type:'ice', from:clientId, to: targetId, candidate: e.candidate }); };
    const remoteStream = new MediaStream();
    pc.ontrack = (e)=>{ e.streams[0] && e.streams[0].getTracks().forEach(t=>remoteStream.addTrack(t)); };
    localStream.getTracks().forEach(t=>pc.addTrack(t, localStream));
    const offer = await pc.createOffer(); await pc.setLocalDescription(offer);
    // save currentCall
    currentCall = { pc, localStream, remoteStream, targetId, kind, state:'calling' };
    renderActiveCallUI(currentCall, /*isCaller=*/true);
    client.send({ type:'offer', from:clientId, to: targetId, kind, sdp: offer.sdp });
  } catch (err) {
    alert('Unable to access camera/microphone: ' + (err.message || err));
  }
}

async function acceptCall(fromId, kind='audio', offerSdp) {
  const client = ensureSignalingClient({ autoRetry: true });
  if (!client) return;
  const clientId = getClientId();
  try {
    const constraints = { audio: true }; if (kind==='video') constraints.video = true;
    const localStream = await navigator.mediaDevices.getUserMedia(constraints);
    const pc = new RTCPeerConnection({ iceServers:[{ urls: 'stun:stun.l.google.com:19302' }] });
    pc.onicecandidate = (e)=>{ if (e.candidate) client.send({ type:'ice', from:clientId, to: fromId, candidate: e.candidate }); };
    const remoteStream = new MediaStream();
    pc.ontrack = (e)=>{ e.streams[0] && e.streams[0].getTracks().forEach(t=>remoteStream.addTrack(t)); };
    localStream.getTracks().forEach(t=>pc.addTrack(t, localStream));
    const desc = { type: 'offer', sdp: offerSdp };
    await pc.setRemoteDescription(desc);
    const answer = await pc.createAnswer(); await pc.setLocalDescription(answer);
    client.send({ type:'answer', from:clientId, to: fromId, sdp: answer.sdp });
    currentCall = { pc, localStream, remoteStream, targetId: fromId, kind, state:'connected' };
    renderActiveCallUI(currentCall, /*isCaller=*/false);
  } catch (err) {
    alert('Unable to access camera/microphone: ' + (err.message || err));
    client.send({ type:'call-error', from: clientId, to: fromId, message: String(err) });
  }
}

function endCurrentCall() {
  if (!currentCall) return;
  try { currentCall.pc && currentCall.pc.close(); currentCall.localStream && currentCall.localStream.getTracks().forEach(t=>t.stop()); } catch(e){}
  currentCall = null;
  const root = document.getElementById('call-modal-root'); if (root) root.innerHTML = '';
}

// Creator Dashboard UI
function getMyCreatorId(currentUser = null) {
  const user = currentUser || authUserCache;
  if (user && user.afriqoraId) return String(user.afriqoraId);
  const clientId = getClientId();
  const all = getSavedBusinessListings();
  const found = all.find(b=>String(b.ownerClientId)===String(clientId));
  return found ? String(found.id) : null;
}

function syncServerPostsIntoLocalFeed(serverPosts, user) {
  const posts = getSavedPosts();
  const keep = posts.filter(p => !(p && p.source === 'server' && String(p.ownerAfriqoraId || '') === String(user.afriqoraId || '')));
  const mapped = (serverPosts || []).map((p) => ({
    id: p.id,
    title: p.title,
    description: p.content,
    category: p.category || '',
    location: p.location || '',
    website: p.website || '',
    contact: p.contact || '',
    thumbnail: p.image || null,
    video: p.video || null,
    free: true,
    price: 0,
    creatorId: String(p.ownerAfriqoraId || getMyCreatorId(user) || ''),
    creatorName: p.ownerDisplayName || (user && user.displayName) || 'Creator',
    ownerAfriqoraId: p.ownerAfriqoraId || (user && user.afriqoraId) || null,
    ownerUserId: (user && user.id) || null,
    status: p.status || 'published',
    createdAt: p.createdAt,
    updatedAt: p.updatedAt || null,
    source: 'server',
  }));
  savePosts(keep.concat(mapped));
  renderPosts(getSavedPosts(), document.getElementById('post-listings-container'));
  performUnifiedSearch();
}

function upsertBusinessProfileToLocal(profile, user) {
  if (!profile || !user) return;
  const listings = getSavedBusinessListings();
  const idx = listings.findIndex(l => String(l.ownerUserId || '') === String(user.id) || String(l.ownerAfriqoraId || '') === String(user.afriqoraId || ''));
  const mapped = {
    id: idx >= 0 ? listings[idx].id : Date.now(),
    name: profile.businessName || (idx >= 0 ? listings[idx].name : ''),
    owner: profile.ownerDisplayName || user.displayName || '',
    phone: profile.contact || (idx >= 0 ? listings[idx].phone : ''),
    location: profile.location || (idx >= 0 ? listings[idx].location : ''),
    category: profile.category || (idx >= 0 ? listings[idx].category : ''),
    description: profile.description || (idx >= 0 ? listings[idx].description : ''),
    website: profile.website || (idx >= 0 ? listings[idx].website : ''),
    logo: profile.logo || (idx >= 0 ? listings[idx].logo : null),
    ownerClientId: idx >= 0 ? listings[idx].ownerClientId : getClientId(),
    ownerUserId: user.id,
    ownerAfriqoraId: user.afriqoraId,
    submittedAt: idx >= 0 ? listings[idx].submittedAt : new Date().toISOString(),
  };
  if (idx >= 0) listings[idx] = Object.assign({}, listings[idx], mapped);
  else listings.push(mapped);
  saveBusinessListings(listings);
  renderBusinessListings(businessSearchInput?.value || '');
  populateCreatorSelect();
}

function openCreatorPostViewer(post) {
  const root = document.createElement('div');
  root.style.position = 'fixed';
  root.style.inset = '0';
  root.style.background = 'rgba(0,0,0,0.6)';
  root.style.display = 'flex';
  root.style.alignItems = 'center';
  root.style.justifyContent = 'center';
  root.style.zIndex = '999999';
  const panel = document.createElement('div');
  panel.style.background = '#0d1a2e';
  panel.style.color = '#fff';
  panel.style.padding = '1rem';
  panel.style.borderRadius = '8px';
  panel.style.width = 'min(760px,95%)';
  panel.style.maxHeight = '90%';
  panel.style.overflow = 'auto';
  panel.innerHTML = `
    <h3 style="margin:0 0 0.5rem 0;">${escapeHtml(post.title || '')}</h3>
    <p style="white-space:pre-wrap;">${escapeHtml(post.content || '')}</p>
    <p><strong>Category:</strong> ${escapeHtml(post.category || '-')} | <strong>Location:</strong> ${escapeHtml(post.location || '-')}</p>
  `;
  if (post.image) {
    const img = document.createElement('img');
    img.src = post.image;
    img.style.maxWidth = '100%';
    img.style.borderRadius = '6px';
    panel.appendChild(img);
  }
  if (post.video) {
    const vid = document.createElement('video');
    vid.controls = true;
    vid.src = post.video;
    vid.style.marginTop = '0.5rem';
    vid.style.width = '100%';
    panel.appendChild(vid);
  }
  const close = document.createElement('button');
  close.textContent = 'Close';
  close.style.marginTop = '0.75rem';
  close.addEventListener('click', ()=>{ try { document.body.removeChild(root); } catch(e) {} });
  panel.appendChild(close);
  root.appendChild(panel);
  document.body.appendChild(root);
}

async function openCreatorDashboard() {
  const user = await fetchCurrentUser(true);
  if (!user) {
    openAccountModal();
    return;
  }

  const root = document.createElement('div'); root.style.position='fixed'; root.style.inset='0'; root.style.background='rgba(0,0,0,0.6)'; root.style.display='flex'; root.style.alignItems='center'; root.style.justifyContent='center'; root.style.zIndex='999999';
  const panel = document.createElement('div'); panel.style.background='#0d1a2e'; panel.style.color='#fff'; panel.style.padding='1rem'; panel.style.borderRadius='8px'; panel.style.width='min(980px,96%)'; panel.style.maxHeight='92%'; panel.style.overflow='auto';
  panel.innerHTML = `<h3 style="margin-top:0;">AFRIQORA BUSINESS DASHBOARD</h3><p style="margin-top:0;color:rgba(255,255,255,0.82);">Manage your business profile, direct contact info, and posts.</p>`;

  const stateBox = document.createElement('div');
  stateBox.style.padding = '0.75rem';
  stateBox.style.border = '1px solid rgba(255,255,255,0.12)';
  stateBox.style.borderRadius = '8px';
  stateBox.style.marginBottom = '0.75rem';
  panel.appendChild(stateBox);

  const createSection = document.createElement('div');
  createSection.style.borderTop = '1px solid rgba(255,255,255,0.12)';
  createSection.style.paddingTop = '0.75rem';
  createSection.innerHTML = `
    <h4>Create Post</h4>
    <div style="display:grid;gap:0.5rem;">
      <select id="dash-post-business-select" style="display:none;"></select>
      <input id="dash-post-title" type="text" placeholder="Post title">
      <textarea id="dash-post-content" placeholder="Description/content"></textarea>
      <input id="dash-post-category" type="text" placeholder="Business/service category">
      <input id="dash-post-location" type="text" placeholder="Location">
      <input id="dash-post-website" type="text" placeholder="Website (optional)">
      <input id="dash-post-contact" type="text" placeholder="Contact info (optional)">
      <label>Image upload</label>
      <input id="dash-post-image" type="file" accept="image/*">
      <label>Video upload (optional)</label>
      <input id="dash-post-video" type="file" accept="video/*">
      <div style="display:flex;gap:0.5rem;align-items:center;">
        <button id="dash-post-publish" type="button">Publish</button>
        <button id="dash-post-cancel" type="button">Cancel</button>
        <span id="dash-post-msg" aria-live="polite" style="color:#9ad1ff;"></span>
      </div>
    </div>
  `;
  panel.appendChild(createSection);

  const postsSection = document.createElement('div');
  postsSection.style.borderTop = '1px solid rgba(255,255,255,0.12)';
  postsSection.style.paddingTop = '0.75rem';
  postsSection.innerHTML = `<h4>My Posts</h4><div id="dash-my-posts"></div>`;
  panel.appendChild(postsSection);

  const businessSection = document.createElement('div');
  businessSection.style.borderTop = '1px solid rgba(255,255,255,0.12)';
  businessSection.style.paddingTop = '0.75rem';
  businessSection.innerHTML = `
    <div id="biz-list-wrapper">
      <h4>My Businesses</h4>
      <div id="dash-biz-list"></div>
      <button id="dash-biz-add" type="button" style="margin-top:0.5rem;">Add New Business</button>
    </div>
    <div id="biz-wizard-wrapper" style="display:none; margin-top:1rem;">
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <h4>Business Profile Wizard</h4>
        <span id="biz-wizard-step-label" style="font-size:0.85rem; color:#9ad1ff;">Step 1 of 4</span>
      </div>
      
      <div id="biz-step-1" class="biz-wizard-step" style="display:block; margin-top:0.5rem;">
        <p style="font-size:0.85rem; margin-bottom:0.5rem;">${t('wizard.step1')}</p>
        <input id="dash-biz-name" type="text" placeholder="Business Name">
        <input id="dash-biz-owner" type="text" placeholder="Your Name / Title" style="margin-top:0.5rem;">
        <div style="display:flex; gap:0.5rem; margin-top:0.5rem;">
          <button class="biz-cancel" type="button" style="flex:1;">Cancel</button>
          <button class="biz-next" data-next="2" style="flex:1;">${t('btn.next')}</button>
        </div>
      </div>
      
      <div id="biz-step-2" class="biz-wizard-step" style="display:none; margin-top:0.5rem;">
        <p style="font-size:0.85rem; margin-bottom:0.5rem;">${t('wizard.step2')}</p>
        <div id="dash-biz-categories-container" style="background:#fff; border-radius:4px; padding:0.25rem;"></div>
        <div id="dash-biz-services-container" style="background:#fff; border-radius:4px; padding:0.25rem; margin-top:0.5rem;"></div>
        <div id="dash-biz-languages-container" style="background:#fff; border-radius:4px; padding:0.25rem; margin-top:0.5rem;"></div>
        <div style="display:flex; gap:0.5rem; margin-top:0.5rem;">
          <button class="biz-prev" data-prev="1" style="flex:1;">${t('btn.back')}</button>
          <button class="biz-next" data-next="3" style="flex:1;">${t('btn.next')}</button>
        </div>
      </div>
      
      <div id="biz-step-3" class="biz-wizard-step" style="display:none; margin-top:0.5rem;">
        <p style="font-size:0.85rem; margin-bottom:0.5rem;">${t('wizard.step3')}</p>
        <input id="dash-biz-country" type="text" placeholder="Country (e.g. South Africa)">
        <input id="dash-biz-region" type="text" placeholder="Province/Region" style="margin-top:0.5rem;">
        <input id="dash-biz-city" type="text" placeholder="City" style="margin-top:0.5rem;">
        <input id="dash-biz-location" type="text" placeholder="Exact Location / Area" style="margin-top:0.5rem;">
        <div style="display:flex; gap:0.5rem; margin-top:0.5rem;">
          <button class="biz-prev" data-prev="2" style="flex:1;">${t('btn.back')}</button>
          <button class="biz-next" data-next="4" style="flex:1;">${t('btn.next')}</button>
        </div>
      </div>

      <div id="biz-step-4" class="biz-wizard-step" style="display:none; margin-top:0.5rem;">
        <p style="font-size:0.85rem; margin-bottom:0.5rem;">${t('wizard.step4')}</p>
        <input id="dash-biz-website" type="text" placeholder="Website URL">
        <input id="dash-biz-contact" type="text" placeholder="Contact Phone/Email" style="margin-top:0.5rem;">
        <textarea id="dash-biz-description" placeholder="Description" style="margin-top:0.5rem;"></textarea>
        <label style="display:block; margin-top:0.5rem;">Logo upload (optional)</label>
        <input id="dash-biz-logo" type="file" accept="image/*">
        <div style="display:flex; gap:0.5rem; margin-top:0.5rem; align-items:center;">
          <button class="biz-prev" data-prev="3" style="flex:1;">${t('btn.back')}</button>
          <button id="dash-biz-save" type="button" style="flex:2; background:#9ad1ff; color:#000;">${t('btn.save')}</button>
        </div>
        <div id="dash-biz-msg" aria-live="polite" style="color:#9ad1ff; margin-top:0.5rem; text-align:center;"></div>
      </div>
    </div>
  `;
  panel.appendChild(businessSection);

  const accountSection = document.createElement('div');
  accountSection.style.borderTop = '1px solid rgba(255,255,255,0.12)';
  accountSection.style.paddingTop = '0.75rem';
  accountSection.innerHTML = `
    <h4>Account Settings</h4>
    <p><strong>AFRIQORA ID:</strong> ${escapeHtml(getMyCreatorId(user) || '')}</p>
    <p><strong>Email:</strong> ${escapeHtml(user.email || '')}</p>
    <button id="dash-logout" type="button">Logout</button>
  `;
  panel.appendChild(accountSection);

  const close = document.createElement('button'); close.textContent='Close'; close.style.marginTop='0.75rem'; panel.appendChild(close);
  root.appendChild(panel); document.body.appendChild(root);

  let dashboardData = null;
  let editingPostId = null;
  let editingBusinessId = null;
  let selectedCategories = [];
  let selectedServices = [];
  let selectedLanguages = ['en'];
  let myPosts = [];

  function closeDashboard() {
    try { document.body.removeChild(root); } catch (e) {}
  }

  function resetPostForm() {
    editingPostId = null;
    panel.querySelector('#dash-post-title').value = '';
    panel.querySelector('#dash-post-content').value = '';
    panel.querySelector('#dash-post-category').value = '';
    panel.querySelector('#dash-post-location').value = '';
    panel.querySelector('#dash-post-website').value = '';
    panel.querySelector('#dash-post-contact').value = '';
    panel.querySelector('#dash-post-image').value = '';
    panel.querySelector('#dash-post-video').value = '';
    panel.querySelector('#dash-post-publish').textContent = 'Publish';
    panel.querySelector('#dash-post-msg').textContent = '';
  }

  function renderPostsList() {
    const holder = panel.querySelector('#dash-my-posts');
    if (!myPosts.length) {
      holder.innerHTML = '<p>No posts yet.</p>';
      return;
    }
    holder.innerHTML = myPosts.map(p => `
      <div style="border:1px solid rgba(255,255,255,0.12);border-radius:8px;padding:0.6rem;margin-bottom:0.5rem;">
        <p style="margin:0;"><strong>${escapeHtml(p.title || '')}</strong></p>
        <p style="margin:0.25rem 0;">${escapeHtml((p.content || '').slice(0, 180))}</p>
        <p style="margin:0.2rem 0;color:rgba(255,255,255,0.8);">${escapeHtml(formatIsoDate(p.createdAt))} | ${escapeHtml(p.status || 'published')} | ${escapeHtml(p.contentType || (p.video ? 'video' : 'post'))}</p>
        <p style="margin:0.2rem 0;color:rgba(255,255,255,0.82);">Views: ${Number((p.engagement && p.engagement.views) || 0)} · Likes: ${Number((p.engagement && p.engagement.likes) || 0)} · Comments: ${Number((p.engagement && p.engagement.comments) || 0)} · Shares: ${Number((p.engagement && p.engagement.shares) || 0)}</p>
        <p style="margin:0.2rem 0;color:rgba(154,209,255,0.95);">Smart Reach: ${escapeHtml((p.smartReach && p.smartReach.stage) || 'initial')} · Score: ${Number((p.smartReach && p.smartReach.score) || 0).toFixed(3)} · Impressions: ${Number((p.smartReach && p.smartReach.impressions) || 0)}</p>
        <div style="display:flex;gap:0.5rem;">
          <button type="button" data-action="view" data-id="${escapeHtml(p.id)}">View</button>
          <button type="button" data-action="edit" data-id="${escapeHtml(p.id)}">Edit</button>
          <button type="button" data-action="delete" data-id="${escapeHtml(p.id)}">Delete</button>
        </div>
      </div>
    `).join('');

    holder.querySelectorAll('button[data-action="view"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const post = myPosts.find(p => String(p.id) === String(btn.dataset.id));
        if (post) openCreatorPostViewer(post);
      });
    });
    holder.querySelectorAll('button[data-action="edit"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const post = myPosts.find(p => String(p.id) === String(btn.dataset.id));
        if (!post) return;
        editingPostId = post.id;
        panel.querySelector('#dash-post-title').value = post.title || '';
        panel.querySelector('#dash-post-content').value = post.content || '';
        panel.querySelector('#dash-post-category').value = post.category || '';
        panel.querySelector('#dash-post-location').value = post.location || '';
        panel.querySelector('#dash-post-website').value = post.website || '';
        panel.querySelector('#dash-post-contact').value = post.contact || '';
        panel.querySelector('#dash-post-publish').textContent = 'Save Changes';
        panel.querySelector('#dash-post-msg').textContent = 'Editing existing post.';
      });
    });
    holder.querySelectorAll('button[data-action="delete"]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        if (!confirm('Delete this post?')) return;
        const res = await apiRequest('/creator/posts/' + encodeURIComponent(String(id)), { method: 'DELETE' });
        const data = await res.json().catch(() => ({ error: 'request failed' }));
        if (!res.ok || !data.ok) {
          alert(data.error || 'Unable to delete post.');
          return;
        }
        myPosts = myPosts.filter(p => String(p.id) !== String(id));
        renderPostsList();
        syncServerPostsIntoLocalFeed(myPosts, user);
      });
    });
  }

  async function loadDashboard() {
    const res = await apiRequest('/creator/dashboard', { method: 'GET' });
    if (res.status === 401) {
      closeDashboard();
      openAccountModal();
      return;
    }
    dashboardData = await res.json().catch(() => null);
    if (!dashboardData || !dashboardData.ok) {
      stateBox.innerHTML = '<p>Unable to load dashboard right now.</p>';
      return;
    }
    const creator = dashboardData.creator || { totalViews: 0, earnings: 0, availableBalance: 0 };
    const primaryBusiness = (dashboardData.businessProfiles && dashboardData.businessProfiles[0]) || {};
    stateBox.innerHTML = `
      <p><strong>AFRIQORA ID:</strong> ${escapeHtml((dashboardData.user && dashboardData.user.afriqoraId) || user.afriqoraId || '')}</p>
      <p><strong>Creator name:</strong> ${escapeHtml(dashboardData.user.displayName || '')}</p>
      <p><strong>Primary Business:</strong> ${escapeHtml(primaryBusiness.businessName || 'None')}</p>
      <p><strong>Views / engagement:</strong> ${Number(creator.totalViews || 0)} total views</p>
      <p><strong>Earnings:</strong> $${Number(creator.earnings || 0).toFixed(6)} | <strong>Available:</strong> $${Number(creator.availableBalance || 0).toFixed(6)}</p>
    `;

    function renderBusinessList() {
      const listHolder = panel.querySelector('#dash-biz-list');
      const bps = dashboardData.businessProfiles || [];
      if (!bps.length) {
        listHolder.innerHTML = '<p>No businesses registered yet.</p>';
      } else {
        listHolder.innerHTML = bps.map(b => `
          <div style="border:1px solid rgba(255,255,255,0.12); border-radius:8px; padding:0.5rem; margin-bottom:0.5rem;">
            <strong>${escapeHtml(b.businessName)}</strong>
            <p style="margin:0; font-size:0.85rem; color:rgba(255,255,255,0.7);">${escapeHtml(b.category || (Array.isArray(b.categories) ? b.categories.join(', ') : ''))}</p>
            <button class="biz-edit-btn" data-id="${b.id}" style="margin-top:0.25rem;">Edit</button>
          </div>
        `).join('');
        
        listHolder.querySelectorAll('.biz-edit-btn').forEach(btn => {
          btn.addEventListener('click', () => openBusinessWizard(btn.dataset.id));
        });
      }

      // Populate Create Post select
      const postBizSelect = panel.querySelector('#dash-post-business-select');
      if (bps.length > 0) {
        postBizSelect.style.display = 'block';
        postBizSelect.innerHTML = bps.map(b => `<option value="${b.id}">${escapeHtml(b.businessName)}</option>`).join('');
      } else {
        postBizSelect.style.display = 'none';
        postBizSelect.innerHTML = '';
      }
    }
    
    function openBusinessWizard(bizId) {
      editingBusinessId = bizId || null;
      panel.querySelector('#biz-list-wrapper').style.display = 'none';
      panel.querySelector('#biz-wizard-wrapper').style.display = 'block';
      panel.querySelector('#dash-biz-msg').textContent = '';
      
      const bp = (dashboardData.businessProfiles || []).find(b => b.id === bizId) || {};
      panel.querySelector('#dash-biz-name').value = bp.businessName || '';
      panel.querySelector('#dash-biz-owner').value = bp.ownerDisplayName || dashboardData.user.displayName || '';
      
      const locParts = (bp.location || '').split(', ');
      panel.querySelector('#dash-biz-country').value = locParts.length > 3 ? locParts[3] : '';
      panel.querySelector('#dash-biz-region').value = locParts.length > 2 ? locParts[2] : '';
      panel.querySelector('#dash-biz-city').value = locParts.length > 1 ? locParts[1] : '';
      panel.querySelector('#dash-biz-location').value = locParts[0] || '';
      
      panel.querySelector('#dash-biz-website').value = bp.website || '';
      panel.querySelector('#dash-biz-contact').value = bp.contact || '';
      panel.querySelector('#dash-biz-description').value = bp.description || '';
      
      selectedCategories = Array.isArray(bp.categories) ? [...bp.categories] : (bp.category ? [bp.category] : []);
      selectedServices = Array.isArray(bp.services) ? [...bp.services] : [];
      selectedLanguages = Array.isArray(bp.languagesServed) ? [...bp.languagesServed] : ['en'];
      
      panel.querySelectorAll('.biz-wizard-step').forEach(s => s.style.display = 'none');
      panel.querySelector('#biz-step-1').style.display = 'block';
      panel.querySelector('#biz-wizard-step-label').innerText = 'Step 1 of 4';
    }
    
    panel.querySelector('#dash-biz-add').addEventListener('click', () => openBusinessWizard(null));
    panel.querySelector('.biz-cancel').addEventListener('click', () => {
      panel.querySelector('#biz-wizard-wrapper').style.display = 'none';
      panel.querySelector('#biz-list-wrapper').style.display = 'block';
    });

    renderBusinessList();

    // Wizard Nav Logic
    panel.querySelectorAll('.biz-next').forEach(btn => {
      btn.onclick = () => {
        const next = btn.getAttribute('data-next');
        panel.querySelectorAll('.biz-wizard-step').forEach(s => s.style.display = 'none');
        panel.querySelector('#biz-step-' + next).style.display = 'block';
        panel.querySelector('#biz-wizard-step-label').innerText = 'Step ' + next + ' of 4';
      };
    });
    panel.querySelectorAll('.biz-prev').forEach(btn => {
      btn.onclick = () => {
        const prev = btn.getAttribute('data-prev');
        panel.querySelectorAll('.biz-wizard-step').forEach(s => s.style.display = 'none');
        panel.querySelector('#biz-step-' + prev).style.display = 'block';
        panel.querySelector('#biz-wizard-step-label').innerText = 'Step ' + prev + ' of 4';
      };
    });

    // Initialize Tag Inputs
    let selectedCategories = Array.isArray(bp.categories) ? [...bp.categories] : (bp.category ? [bp.category] : []);
    let selectedServices = Array.isArray(bp.services) ? [...bp.services] : [];
    let selectedLanguages = Array.isArray(bp.languagesServed) ? [...bp.languagesServed] : ['en'];
    
    function renderTagInput(containerId, tags, placeholder, suggestions) {
      const container = panel.querySelector('#' + containerId);
      if (!container) return;
      container.innerHTML = '';
      
      const tagsWrapper = document.createElement('div');
      tagsWrapper.style.display = 'flex';
      tagsWrapper.style.flexWrap = 'wrap';
      tagsWrapper.style.gap = '4px';
      tagsWrapper.style.marginBottom = '4px';
      
      const renderTags = () => {
        tagsWrapper.innerHTML = '';
        tags.forEach((tag, idx) => {
          const tagEl = document.createElement('span');
          tagEl.style.background = '#e2e8f0';
          tagEl.style.color = '#000';
          tagEl.style.padding = '2px 8px';
          tagEl.style.borderRadius = '12px';
          tagEl.style.fontSize = '0.85rem';
          tagEl.style.display = 'flex';
          tagEl.style.alignItems = 'center';
          tagEl.style.gap = '4px';
          tagEl.innerHTML = `<span>${escapeHtml(tag)}</span><span style="cursor:pointer;font-weight:bold;">&times;</span>`;
          tagEl.querySelector('span:last-child').onclick = () => {
            tags.splice(idx, 1);
            renderTags();
          };
          tagsWrapper.appendChild(tagEl);
        });
      };
      renderTags();
      container.appendChild(tagsWrapper);
      
      const input = document.createElement('input');
      input.type = 'text';
      input.placeholder = placeholder;
      input.style.border = 'none';
      input.style.outline = 'none';
      input.style.width = '100%';
      input.style.background = 'transparent';
      input.style.color = '#000';
      input.style.padding = '4px';
      
      const datalistId = containerId + '-dl';
      const datalist = document.createElement('datalist');
      datalist.id = datalistId;
      suggestions.forEach(s => {
        const opt = document.createElement('option');
        opt.value = s;
        datalist.appendChild(opt);
      });
      container.appendChild(datalist);
      input.setAttribute('list', datalistId);
      
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          const val = input.value.trim();
          if (val && !tags.includes(val)) {
            tags.push(val);
            input.value = '';
            renderTags();
          }
        }
      });
      container.appendChild(input);
    }
    
    // Fetch metadata
    apiRequest('/api/business/metadata').then(r => r.json()).then(meta => {
      if (meta && meta.ok) {
        renderTagInput('dash-biz-categories-container', selectedCategories, 'Add Category (Press Enter)', meta.categories || []);
        renderTagInput('dash-biz-services-container', selectedServices, 'Add Service Provided (Press Enter)', meta.services || []);
      }
    }).catch(e => {
       renderTagInput('dash-biz-categories-container', selectedCategories, 'Add Category (Press Enter)', []);
       renderTagInput('dash-biz-services-container', selectedServices, 'Add Service Provided (Press Enter)', []);
    });
    
    // Expose for save function
    panel.dataset.selectedCategories = JSON.stringify(selectedCategories);
    panel.dataset.selectedServices = JSON.stringify(selectedServices);
    panel.dataset.selectedLanguages = JSON.stringify(selectedLanguages);
    setInterval(() => {
       panel.dataset.selectedCategories = JSON.stringify(selectedCategories);
       panel.dataset.selectedServices = JSON.stringify(selectedServices);
       panel.dataset.selectedLanguages = JSON.stringify(selectedLanguages);
    }, 500);

    myPosts = dashboardData.posts || [];
    renderPostsList();
    syncServerPostsIntoLocalFeed(myPosts, dashboardData.user || user);
  }

  panel.querySelector('#dash-post-publish').addEventListener('click', async () => {
    const title = panel.querySelector('#dash-post-title').value.trim();
    const content = panel.querySelector('#dash-post-content').value.trim();
    const category = panel.querySelector('#dash-post-category').value.trim();
    const location = panel.querySelector('#dash-post-location').value.trim();
    const website = panel.querySelector('#dash-post-website').value.trim();
    const contact = panel.querySelector('#dash-post-contact').value.trim();
    const imageFile = panel.querySelector('#dash-post-image').files?.[0];
    const videoFile = panel.querySelector('#dash-post-video').files?.[0];
    const msg = panel.querySelector('#dash-post-msg');

    if (!content) {
      msg.textContent = 'Content is required.';
      return;
    }
    const finalTitle = title || (content.substring(0, 100) + (content.length > 100 ? '...' : ''));
    const existing = myPosts.find(p => String(p.id) === String(editingPostId));
    let image = existing ? existing.image : null;
    let video = existing ? existing.video : null;
    try {
      if (imageFile) image = (await readFilesAsDataUrls([imageFile]))[0] || null;
      if (videoFile) {
        const dur = await getVideoDuration(videoFile);
        if (dur > 120) {
          msg.textContent = 'Video must be 2 minutes or less.';
          return;
        }
        video = (await readFilesAsDataUrls([videoFile]))[0] || null;
      }
    } catch (e) {
      msg.textContent = 'Unable to read uploaded files.';
      return;
    }

    const bizSelect = panel.querySelector('#dash-post-business-select');
    const businessId = bizSelect && bizSelect.style.display !== 'none' ? bizSelect.value : null;

    const payload = { title: finalTitle, content, category, location, website, contact, image, video, status: 'published', contentType: 'business_listing', businessId };
    const endpoint = editingPostId ? '/creator/posts/' + encodeURIComponent(String(editingPostId)) : '/creator/posts';
    const method = editingPostId ? 'PUT' : 'POST';
    const res = await apiRequest(endpoint, { method, body: JSON.stringify(payload) });
    const data = await res.json().catch(() => ({ error: 'request failed' }));
    if (!res.ok || !data.ok) {
      msg.textContent = data.error || 'Unable to save post.';
      return;
    }
    msg.textContent = editingPostId ? 'Post updated.' : 'Post published.';
    if (editingPostId) {
      myPosts = myPosts.map(p => String(p.id) === String(editingPostId) ? data.post : p);
    } else {
      myPosts.unshift(data.post);
    }
    renderPostsList();
    syncServerPostsIntoLocalFeed(myPosts, user);
    resetPostForm();
    setTimeout(() => { renderNavHomeView(document.getElementById('af-nav-home-view')); }, 500);
  });

  panel.querySelector('#dash-post-cancel').addEventListener('click', resetPostForm);

  panel.querySelector('#dash-biz-save').addEventListener('click', async () => {
    const businessName = panel.querySelector('#dash-biz-name').value.trim();
    const ownerDisplayName = panel.querySelector('#dash-biz-owner').value.trim();
    
    const country = panel.querySelector('#dash-biz-country').value.trim();
    const region = panel.querySelector('#dash-biz-region').value.trim();
    const city = panel.querySelector('#dash-biz-city').value.trim();
    const loc = panel.querySelector('#dash-biz-location').value.trim();
    const location = [loc, city, region, country].filter(Boolean).join(', ');
    
    const website = panel.querySelector('#dash-biz-website').value.trim();
    const contact = panel.querySelector('#dash-biz-contact').value.trim();
    const description = panel.querySelector('#dash-biz-description').value.trim();
    const logoFile = panel.querySelector('#dash-biz-logo').files?.[0];
    const msg = panel.querySelector('#dash-biz-msg');
    let categories = [];
    let services = [];
    let languagesServed = ['en'];
    try {
      categories = JSON.parse(panel.dataset.selectedCategories || '[]');
      services = JSON.parse(panel.dataset.selectedServices || '[]');
      languagesServed = JSON.parse(panel.dataset.selectedLanguages || '["en"]');
    } catch(e) {}
    
    let logo = dashboardData && dashboardData.businessProfile ? dashboardData.businessProfile.logo : null;
    if (!businessName) {
      msg.textContent = 'Business name is required.';
      return;
    }
    try {
      if (logoFile) logo = (await readFilesAsDataUrls([logoFile]))[0] || null;
    } catch (e) {
      msg.textContent = 'Unable to read logo file.';
      return;
    }
    const payload = { id: editingBusinessId, businessName, ownerDisplayName, categories, services, languagesServed, location, website, contact, description, logo };
    const res = await apiRequest('/creator/business-profile', { method: 'POST', body: JSON.stringify(payload) });
    const data = await res.json().catch(() => ({ error: 'request failed' }));
    if (!res.ok || !data.ok) {
      msg.textContent = data.error || 'Unable to save business profile.';
      return;
    }
    dashboardData.businessProfiles = dashboardData.businessProfiles || [];
    if (editingBusinessId) {
      dashboardData.businessProfiles = dashboardData.businessProfiles.map(b => String(b.id) === String(editingBusinessId) ? data.businessProfile : b);
    } else {
      dashboardData.businessProfiles.push(data.businessProfile);
    }
    upsertBusinessProfileToLocal(data.businessProfile, user);
    panel.querySelector('#biz-wizard-wrapper').style.display = 'none';
    panel.querySelector('#biz-list-wrapper').style.display = 'block';
    
    // Call renderBusinessList which was declared in loadDashboard. Since we can't easily, we just reload dashboard
    loadDashboard();
    msg.textContent = 'Business profile saved.';
  });

  panel.querySelector('#dash-logout').addEventListener('click', async () => {
    await apiRequest('/auth/logout', { method: 'POST' }).catch(() => null);
    authUserCache = null;
    await updateAccountUI();
    closeDashboard();
  });

  close.addEventListener('click', closeDashboard);
  await loadDashboard();
}

// wire dashboard button
const dashboardBtn = document.getElementById('open-creator-dashboard-btn'); if (dashboardBtn) dashboardBtn.addEventListener('click', async ()=>{ const me = await fetchCurrentUser(true); if (!me) { openAccountModal(); return; } openCreatorDashboard(); });

function renderActiveCallUI(call, isCaller) {
  const root = document.getElementById('call-modal-root'); if (!root) return;
  root.innerHTML = '';
  const box = document.createElement('div'); box.style.position='fixed'; box.style.inset='0'; box.style.display='flex'; box.style.alignItems='center'; box.style.justifyContent='center'; box.style.zIndex='99999'; box.style.background='rgba(0,0,0,0.4)';
  const panel = document.createElement('div'); panel.style.background='rgba(13,26,46,0.98)'; panel.style.color='#fff'; panel.style.padding='1rem'; panel.style.borderRadius='8px'; panel.style.width='min(880px,98%)'; panel.style.display='flex'; panel.style.gap='1rem';
  // local and remote videos
  const left = document.createElement('div'); left.style.flex='1';
  const right = document.createElement('div'); right.style.flex='1';
  const localEl = document.createElement(call.kind==='video' ? 'video' : 'audio'); localEl.autoplay = true; localEl.muted = true; localEl.playsInline = true; localEl.style.width='100%'; localEl.style.background='#000';
  const remoteEl = document.createElement(call.kind==='video' ? 'video' : 'audio'); remoteEl.autoplay = true; remoteEl.playsInline = true; remoteEl.style.width='100%'; remoteEl.style.background='#000';
  left.appendChild(localEl); right.appendChild(remoteEl);
  panel.appendChild(left); panel.appendChild(right);
  const controls = document.createElement('div'); controls.style.display='flex'; controls.style.flexDirection='column'; controls.style.gap='0.5rem';
  const status = document.createElement('div'); status.textContent = `${isCaller ? 'Calling' : 'Connected'}...`;
  const muteBtn = document.createElement('button'); muteBtn.textContent='Mute';
  const camBtn = document.createElement('button'); camBtn.textContent = call.kind==='video' ? 'Camera Off' : 'Camera N/A';
  const endBtn = document.createElement('button'); endBtn.textContent='End Call'; endBtn.style.background='crimson'; endBtn.style.color='#fff';
  controls.appendChild(status); controls.appendChild(muteBtn); controls.appendChild(camBtn); controls.appendChild(endBtn);
  panel.appendChild(controls);
  box.appendChild(panel); root.appendChild(box);
  // attach streams
  try { if (call.localStream) { localEl.srcObject = call.localStream; localEl.muted = true; } if (call.remoteStream) remoteEl.srcObject = call.remoteStream; } catch(e){}
  muteBtn.addEventListener('click', ()=>{
    if (!call || !call.localStream) return; const audioTracks = call.localStream.getAudioTracks(); audioTracks.forEach(t=>t.enabled = !audioTracks[0].enabled); muteBtn.textContent = audioTracks[0].enabled ? 'Mute' : 'Unmute';
  });
  camBtn.addEventListener('click', ()=>{
    if (!call || !call.localStream) return; const videoTracks = call.localStream.getVideoTracks(); if (!videoTracks.length) return; videoTracks.forEach(t=>t.enabled = !videoTracks[0].enabled); camBtn.textContent = videoTracks[0].enabled ? 'Camera Off' : 'Camera On';
  });
  endBtn.addEventListener('click', ()=>{
    const client = ensureSignalingClient({ autoRetry: true });
    if (client) client.send({ type:'call-end', from: getClientId(), to: call.targetId });
    endCurrentCall();
  });
}

// Handle signaling messages
async function handleSignalingMessage(msg) {
  if (!msg || !msg.type) return;
  switch(msg.type) {
    case 'offer':
      // incoming offer
      showIncomingCallPopup(msg.fromName || 'Caller', msg.from, msg.kind || 'audio', msg.sdp);
      break;
    case 'answer':
      if (currentCall && currentCall.pc) {
        try { await currentCall.pc.setRemoteDescription({ type:'answer', sdp: msg.sdp }); currentCall.state='connected'; }
        catch(e){}
      }
      break;
    case 'ice':
      if (currentCall && currentCall.pc && msg.candidate) {
        try { await currentCall.pc.addIceCandidate(msg.candidate); } catch(e){}
      }
      break;
    case 'call-decline':
      if (currentCall && currentCall.state==='calling') { alert('Call declined'); endCurrentCall(); }
      break;
    case 'call-end':
      endCurrentCall();
      break;
    default:
      break;
  }
}

// wire business and marketplace call buttons after rendering functions
function wireCallButtons() {
  // business cards
  document.querySelectorAll('.business-call-btn').forEach(btn=>{
    btn.removeEventListener?.('click', btn._callHandler);
    const target = btn.dataset.clientId || btn.dataset.id;
    const handler = ()=> startCall(target, 'audio'); btn._callHandler = handler; btn.addEventListener('click', handler);
  });
  document.querySelectorAll('.business-video-call-btn').forEach(btn=>{
    btn.removeEventListener?.('click', btn._callHandler);
    const target = btn.dataset.clientId || btn.dataset.id;
    const handler = ()=> startCall(target, 'video'); btn._callHandler = handler; btn.addEventListener('click', handler);
  });
  // marketplace
  document.querySelectorAll('.marketplace-call-btn').forEach(btn=>{
    btn.removeEventListener?.('click', btn._callHandler);
    const target = btn.dataset.clientId || btn.dataset.id || btn.dataset.sellerId;
    const handler = ()=> startCall(target, 'audio'); btn._callHandler = handler; btn.addEventListener('click', handler);
  });
  document.querySelectorAll('.marketplace-video-call-btn').forEach(btn=>{
    btn.removeEventListener?.('click', btn._callHandler);
    const target = btn.dataset.clientId || btn.dataset.id || btn.dataset.sellerId;
    const handler = ()=> startCall(target, 'video'); btn._callHandler = handler; btn.addEventListener('click', handler);
  });
}

// call wire after initial renders
setTimeout(wireCallButtons, 600);

// -------------------- Primary Navigation System --------------------
const AFRIQORA_MESSAGES_STORAGE_KEY = 'afriqoraMessagesThreadV1';
const AFRIQORA_NAV_ROUTES = [
  { id: 'home', label: 'Home', icon: 'home' },
  { id: 'search', label: 'Search', icon: 'search' },
  { id: 'activity', label: 'Activity', icon: 'activity' },
  { id: 'notifications', label: 'Notifications', icon: 'bell' },
  { id: 'messages', label: 'Messages', icon: 'message' },
  { id: 'profile', label: 'Profile', icon: 'user' },
  { id: 'settings', label: 'Settings', icon: 'settings' }
];
let afNavNotificationPollTimer = null;

function formatBadgeCount(count) {
  const n = Number(count || 0);
  if (n <= 0) return '';
  if (n > 99) return '99+';
  return String(n);
}

function updateNavBadge(routeId, count) {
  document.querySelectorAll('[data-nav-route="' + String(routeId || '') + '"]').forEach((btn) => {
    const badge = btn.querySelector('.af-nav-badge');
    if (!badge) return;
    const n = Number(count || 0);
    if (n > 0) {
      badge.hidden = false;
      badge.textContent = formatBadgeCount(n);
      badge.setAttribute('aria-label', String(n) + ' unread');
    } else {
      badge.hidden = true;
      badge.textContent = '';
      badge.removeAttribute('aria-label');
    }
  });
}

async function fetchNotificationUnreadSummary() {
  const me = await fetchCurrentUser(false);
  if (!me) return { unreadCount: 0, unreadByCategory: {} };
  try {
    const res = await apiRequest('/notifications/unread-count', { method: 'GET' });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data || !data.ok) return { unreadCount: 0, unreadByCategory: {} };
    return {
      unreadCount: Number(data.unreadCount || 0),
      unreadByCategory: data.unreadByCategory && typeof data.unreadByCategory === 'object' ? data.unreadByCategory : {}
    };
  } catch (e) {
    return { unreadCount: 0, unreadByCategory: {} };
  }
}

async function refreshNotificationBadges() {
  const summary = await fetchNotificationUnreadSummary();
  updateNavBadge('notifications', Number(summary.unreadCount || 0));
  const messageUnread = Number((summary.unreadByCategory || {}).messages || 0);
  updateNavBadge('messages', messageUnread);
}

function ensurePrimaryNavStyles() {
  if (document.getElementById('afriqora-primary-nav-style')) return;
  const style = document.createElement('style');
  style.id = 'afriqora-primary-nav-style';
  style.textContent = `
    :root {
      --af-nav-ink: #081e2f;
      --af-nav-ink-soft: #0f2b3f;
      --af-nav-sand: #f3e6c7;
      --af-nav-gold: #e6b85c;
      --af-nav-teal: #15b8a6;
      --af-nav-sky: #3bb7ea;
      --af-nav-fog: rgba(234, 243, 248, 0.88);
      --af-nav-line: rgba(255, 255, 255, 0.14);
    }
    .af-nav-shell {
      display: grid;
      grid-template-columns: 268px 1fr;
      min-height: 100vh;
      background:
        radial-gradient(140% 90% at 105% -10%, rgba(21, 184, 166, 0.18), transparent 55%),
        radial-gradient(110% 80% at -10% 110%, rgba(230, 184, 92, 0.16), transparent 50%),
        linear-gradient(180deg, rgba(8, 24, 38, 0.98), rgba(8, 20, 34, 0.98));
    }
    .af-nav-sidebar {
      position: sticky;
      top: 0;
      height: 100vh;
      padding: 1rem 0.8rem;
      border-right: 1px solid var(--af-nav-line);
      background:
        linear-gradient(145deg, rgba(22, 184, 166, 0.12), transparent 42%),
        repeating-linear-gradient(-32deg, rgba(255, 255, 255, 0.035) 0 6px, transparent 6px 14px),
        linear-gradient(180deg, rgba(7, 22, 36, 0.97), rgba(9, 26, 40, 0.93));
      backdrop-filter: blur(8px);
      overflow: auto;
      z-index: 20;
    }
    .af-nav-brand {
      display: flex;
      align-items: center;
      gap: 0.55rem;
      margin: 0.35rem 0.25rem 0.9rem;
      padding: 0.56rem 0.64rem;
      border-radius: 12px;
      border: 1px solid var(--af-nav-line);
      background: linear-gradient(120deg, rgba(255,255,255,0.065), rgba(255,255,255,0.028));
      color: var(--af-nav-sand);
      font-weight: 700;
      letter-spacing: 0.06em;
    }
    .af-nav-brand-mark {
      width: 1.7rem;
      height: 1.7rem;
      border-radius: 0.65rem 0.22rem 0.65rem 0.22rem;
      display: inline-grid;
      place-items: center;
      background: linear-gradient(130deg, var(--af-nav-gold), var(--af-nav-teal));
      color: #102b3a;
      font-weight: 800;
      flex-shrink: 0;
    }
    .af-nav-signature {
      margin: 0.38rem 0.28rem 0.7rem;
      font-size: 0.74rem;
      color: rgba(232, 245, 252, 0.75);
      letter-spacing: 0.07em;
      text-transform: uppercase;
    }
    .af-nav-menu {
      display: grid;
      gap: 0.45rem;
    }
    .af-nav-btn {
      width: 100%;
      border: 1px solid rgba(255,255,255,0.12);
      background: linear-gradient(102deg, rgba(255,255,255,0.065), rgba(255,255,255,0.025));
      color: #e8f4fb;
      border-radius: 10px 16px 10px 16px;
      padding: 0.56rem 0.64rem;
      display: grid;
      grid-template-columns: auto 1fr;
      align-items: center;
      gap: 0.58rem;
      text-align: left;
      cursor: pointer;
      transition: border-color 0.2s ease, transform 0.2s ease, background 0.2s ease;
      position: relative;
    }
    .af-nav-btn::before {
      content: '';
      position: absolute;
      left: 0.18rem;
      top: 0.32rem;
      bottom: 0.32rem;
      width: 0.2rem;
      border-radius: 999px;
      background: linear-gradient(180deg, rgba(59, 183, 234, 0.8), rgba(230, 184, 92, 0.8));
      opacity: 0;
      transform: scaleY(0.5);
      transform-origin: center;
      transition: transform 0.2s ease, opacity 0.2s ease;
    }
    .af-nav-btn:hover,
    .af-nav-btn:focus-visible {
      outline: none;
      border-color: rgba(59, 183, 234, 0.62);
      transform: translateX(2px);
    }
    .af-nav-btn.active {
      border-color: rgba(230, 184, 92, 0.84);
      background: linear-gradient(114deg, rgba(21, 184, 166, 0.24), rgba(230, 184, 92, 0.2));
      color: #fff8e6;
      box-shadow: inset 0 0 0 1px rgba(255,255,255,0.08);
    }
    .af-nav-btn.active::before {
      opacity: 1;
      transform: scaleY(1);
    }
    .af-nav-label-wrap {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      min-width: 0;
    }
    .af-nav-badge {
      display: inline-grid;
      place-items: center;
      min-width: 1.05rem;
      height: 1.05rem;
      padding: 0 0.26rem;
      border-radius: 999px;
      border: 1px solid rgba(255,255,255,0.2);
      background: linear-gradient(120deg, rgba(244,63,94,0.85), rgba(251,146,60,0.85));
      color: #fff;
      font-size: 0.65rem;
      font-weight: 700;
      line-height: 1;
    }
    .af-nav-badge[hidden] {
      display: none;
    }
    .af-nav-icon {
      width: 1.6rem;
      height: 1.6rem;
      border-radius: 0.55rem;
      border: 1px solid rgba(255,255,255,0.2);
      background: rgba(9, 39, 57, 0.56);
      display: inline-grid;
      place-items: center;
      flex-shrink: 0;
    }
    .af-nav-icon svg {
      width: 0.92rem;
      height: 0.92rem;
      stroke: #f5eacc;
    }
    .af-nav-content {
      min-width: 0;
      padding: 0.5rem 0.6rem 1rem;
    }
    .af-nav-top {
      position: sticky;
      top: 0;
      z-index: 18;
      margin: 0 0 0.75rem;
      padding: 0.65rem 0.8rem;
      border-radius: 12px;
      border: 1px solid rgba(255,255,255,0.14);
      background: linear-gradient(104deg, rgba(7, 24, 38, 0.78), rgba(16, 40, 57, 0.76));
      color: #f8f4de;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.6rem;
      backdrop-filter: blur(6px);
    }
    .af-nav-title {
      margin: 0;
      font-size: 1.02rem;
      letter-spacing: 0.04em;
    }
    .af-nav-subtitle {
      margin: 0.2rem 0 0;
      color: rgba(238, 245, 224, 0.82);
      font-size: 0.82rem;
    }
    .af-nav-route {
      display: none;
    }
    .af-nav-route.active {
      display: block;
    }
    .af-view-card {
      border: 1px solid rgba(255,255,255,0.13);
      border-radius: 14px;
      background:
        linear-gradient(122deg, rgba(255,255,255,0.05), rgba(255,255,255,0.015)),
        rgba(8, 22, 35, 0.62);
      color: #f4fbff;
      padding: 0.9rem;
      margin-bottom: 0.65rem;
    }
    .af-view-card h3 {
      margin: 0 0 0.25rem;
      font-size: 1rem;
    }
    .af-view-hint {
      margin: 0;
      color: rgba(216, 232, 250, 0.75);
      font-size: 0.84rem;
    }
    .af-view-grid {
      display: grid;
      gap: 0.6rem;
      margin-top: 0.65rem;
    }
    .af-view-item {
      border: 1px solid rgba(255,255,255,0.12);
      border-radius: 10px;
      padding: 0.62rem;
      background: rgba(255,255,255,0.04);
    }
    .af-view-item p {
      margin: 0.2rem 0;
      font-size: 0.88rem;
    }
    .af-search-row {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
      margin-top: 0.55rem;
    }
    .af-search-row input {
      flex: 1 1 260px;
      min-width: 0;
      border: 1px solid rgba(255,255,255,0.18);
      border-radius: 10px;
      background: rgba(255,255,255,0.08);
      color: #fff;
      padding: 0.55rem 0.65rem;
    }
    .af-search-row button,
    .af-view-item button,
    .af-messages-form button,
    .af-profile-actions button {
      border: 1px solid rgba(230, 184, 92, 0.58);
      background: linear-gradient(120deg, rgba(21, 184, 166, 0.28), rgba(230, 184, 92, 0.25));
      color: #fff;
      border-radius: 10px;
      padding: 0.48rem 0.72rem;
      cursor: pointer;
      font-weight: 600;
    }
    .af-loading {
      border-radius: 10px;
      border: 1px solid rgba(255,255,255,0.1);
      padding: 0.7rem;
      background: rgba(255,255,255,0.04);
      font-size: 0.86rem;
      color: rgba(219, 234, 251, 0.84);
    }
    .af-nav-mobile {
      display: none;
    }
    .af-messages-thread {
      display: grid;
      gap: 0.45rem;
      margin-top: 0.6rem;
      max-height: 45vh;
      overflow: auto;
      padding-right: 0.15rem;
    }
    .af-message-bubble {
      border-radius: 10px;
      padding: 0.55rem 0.62rem;
      border: 1px solid rgba(255,255,255,0.14);
      background: rgba(255,255,255,0.06);
    }
    .af-message-bubble.self {
      border-color: rgba(52, 211, 153, 0.45);
      background: rgba(52, 211, 153, 0.12);
    }
    .af-message-meta {
      margin: 0.25rem 0 0;
      color: rgba(215, 233, 251, 0.7);
      font-size: 0.76rem;
    }
    .af-messages-form {
      display: flex;
      gap: 0.5rem;
      margin-top: 0.55rem;
      flex-wrap: wrap;
    }
    .af-messages-form input {
      flex: 1 1 260px;
      border: 1px solid rgba(255,255,255,0.18);
      border-radius: 10px;
      background: rgba(255,255,255,0.08);
      color: #fff;
      padding: 0.55rem 0.62rem;
    }
    .af-profile-stats {
      display: grid;
      gap: 0.5rem;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      margin-top: 0.6rem;
    }
    .af-profile-stat {
      border: 1px solid rgba(255,255,255,0.14);
      border-radius: 10px;
      background: rgba(255,255,255,0.05);
      padding: 0.55rem;
    }
    .af-profile-actions {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
      margin-top: 0.65rem;
    }
    .af-note-toolbar {
      margin-top: 0.65rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 0.55rem;
      flex-wrap: wrap;
    }
    .af-note-list {
      margin-top: 0.65rem;
      display: grid;
      gap: 0.52rem;
    }
    .af-note-card {
      border: 1px solid rgba(255,255,255,0.14);
      border-radius: 12px;
      background: rgba(255,255,255,0.045);
      padding: 0.62rem;
      cursor: pointer;
    }
    .af-note-card.unread {
      border-color: rgba(230,184,92,0.72);
      background: linear-gradient(120deg, rgba(230,184,92,0.15), rgba(59,183,234,0.12));
    }
    .af-note-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 0.55rem;
      margin-bottom: 0.3rem;
      font-size: 0.82rem;
      color: rgba(215,233,251,0.84);
    }
    .af-note-type {
      display: inline-flex;
      align-items: center;
      gap: 0.32rem;
      text-transform: capitalize;
    }
    .af-note-title {
      margin: 0;
      font-size: 0.92rem;
      color: #fff;
    }
    .af-note-message {
      margin: 0.22rem 0 0;
      font-size: 0.84rem;
      color: rgba(222,237,248,0.9);
      line-height: 1.4;
    }
    .af-note-meta {
      margin-top: 0.36rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 0.45rem;
      color: rgba(208,228,245,0.77);
      font-size: 0.76rem;
    }
    .af-note-actions {
      display: flex;
      gap: 0.45rem;
      flex-wrap: wrap;
      margin-top: 0.5rem;
    }
    .af-note-actions button {
      border: 1px solid rgba(255,255,255,0.2);
      border-radius: 9px;
      background: rgba(255,255,255,0.08);
      color: #f5fbff;
      padding: 0.35rem 0.6rem;
      font-size: 0.76rem;
      cursor: pointer;
    }
    .af-note-empty,
    .af-note-error {
      margin-top: 0.7rem;
      border: 1px solid rgba(255,255,255,0.13);
      border-radius: 10px;
      padding: 0.68rem;
      background: rgba(255,255,255,0.04);
      color: rgba(220,236,250,0.84);
      font-size: 0.86rem;
    }
    .af-note-error {
      border-color: rgba(248,113,113,0.45);
      color: #ffd9cf;
    }
    @media (max-width: 980px) {
      .af-nav-shell {
        grid-template-columns: 1fr;
      }
      .af-nav-sidebar {
        display: none;
      }
      .af-nav-content {
        padding: 0.45rem 0.45rem 4.8rem;
      }
      .af-nav-mobile {
        position: fixed;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: 30;
        display: grid;
        grid-template-columns: repeat(7, minmax(0, 1fr));
        gap: 0.28rem;
        padding: 0.4rem 0.32rem calc(0.45rem + env(safe-area-inset-bottom));
        border-top: 1px solid rgba(255,255,255,0.15);
        background:
          linear-gradient(0deg, rgba(10, 27, 41, 0.98), rgba(10, 27, 41, 0.98)),
          repeating-linear-gradient(90deg, rgba(255,255,255,0.03) 0 8px, transparent 8px 15px);
        backdrop-filter: blur(8px);
      }
      .af-nav-mobile-btn {
        border: 1px solid rgba(255,255,255,0.14);
        border-radius: 10px;
        background: linear-gradient(104deg, rgba(255,255,255,0.08), rgba(255,255,255,0.035));
        color: #f1f6dd;
        padding: 0.38rem 0.2rem;
        display: grid;
        place-items: center;
        gap: 0.16rem;
        font-size: 0.61rem;
        line-height: 1.2;
        position: relative;
      }
      .af-nav-mobile-btn .af-nav-label-wrap {
        gap: 0.22rem;
      }
      .af-nav-mobile-btn .af-nav-badge {
        min-width: 0.94rem;
        height: 0.94rem;
        font-size: 0.58rem;
      }
      .af-nav-mobile-btn.active {
        border-color: rgba(230, 184, 92, 0.78);
        background: linear-gradient(120deg, rgba(21, 184, 166, 0.28), rgba(230, 184, 92, 0.25));
      }
      .af-nav-mobile-btn svg {
        width: 0.88rem;
        height: 0.88rem;
        stroke: #fff0c7;
      }
    }
  `;
  document.head.appendChild(style);
}

function getPrimaryRouteSubtitle(routeId) {
  const subtitles = {
    home: 'Your AFRIQORA command center',
    search: 'Discover verified opportunities',
    activity: 'Track momentum across your work',
    notifications: 'Signals that need your attention',
    messages: 'Conversations with business context',
    profile: 'Identity, creator metrics, and account',
    settings: 'Control your cross-device preferences'
  };
  return subtitles[routeId] || 'AFRIQORA navigation';
}

function primaryNavIcon(name) {
  const icons = {
    home: '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10.5L12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/></svg>',
    search: '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>',
    activity: '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12h4l2.5-5 4 10 2.5-5H21"/></svg>',
    bell: '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9a6 6 0 1112 0v4l2 3H4l2-3V9"/><path d="M10 19a2 2 0 004 0"/></svg>',
    message: '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5h16v11H8l-4 3V5z"/></svg>',
    user: '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20a8 8 0 0116 0"/></svg>',
    settings: '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 8.5a3.5 3.5 0 100 7 3.5 3.5 0 000-7z"/><path d="M19.4 15a1 1 0 00.2 1.1l.1.1a2 2 0 010 2.8 2 2 0 01-2.8 0l-.1-.1a1 1 0 00-1.1-.2 1 1 0 00-.6.9V20a2 2 0 01-4 0v-.2a1 1 0 00-.6-.9 1 1 0 00-1.1.2l-.1.1a2 2 0 01-2.8 0 2 2 0 010-2.8l.1-.1a1 1 0 00.2-1.1 1 1 0 00-.9-.6H4a2 2 0 010-4h.2a1 1 0 00.9-.6 1 1 0 00-.2-1.1l-.1-.1a2 2 0 010-2.8 2 2 0 012.8 0l.1.1a1 1 0 001.1.2 1 1 0 00.6-.9V4a2 2 0 014 0v.2a1 1 0 00.6.9 1 1 0 001.1-.2l.1-.1a2 2 0 012.8 0 2 2 0 010 2.8l-.1.1a1 1 0 00-.2 1.1 1 1 0 00.9.6H20a2 2 0 010 4h-.2a1 1 0 00-.9.6z"/></svg>'
  };
  return icons[name] || icons.home;
}

function getNavRouteFromHash() {
  const raw = String(window.location.hash || '').replace(/^#\/?/, '').trim().toLowerCase();
  if (!raw) return 'home';
  const routeOnly = raw.split('?')[0].trim();
  return AFRIQORA_NAV_ROUTES.some((r) => r.id === routeOnly) ? routeOnly : 'home';
}

function getNavHashParams() {
  const raw = String(window.location.hash || '').replace(/^#\/?/, '').trim();
  const q = raw.includes('?') ? raw.slice(raw.indexOf('?') + 1) : '';
  const params = {};
  if (!q) return params;
  q.split('&').forEach((part) => {
    if (!part) return;
    const idx = part.indexOf('=');
    if (idx === -1) {
      params[decodeURIComponent(part)] = '';
      return;
    }
    const k = decodeURIComponent(part.slice(0, idx));
    const v = decodeURIComponent(part.slice(idx + 1));
    params[k] = v;
  });
  return params;
}

function loadMessageThread() {
  try {
    const raw = localStorage.getItem(AFRIQORA_MESSAGES_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (Array.isArray(parsed)) return parsed;
  } catch (e) {}
  return [{ id: 'seed-1', from: 'support', text: 'Welcome to AFRIQORA Messages. Ask us for help with your account, creator tools, or settings.', createdAt: new Date().toISOString() }];
}

function saveMessageThread(items) {
  try { localStorage.setItem(AFRIQORA_MESSAGES_STORAGE_KEY, JSON.stringify(items || [])); } catch (e) {}
}

const AFRIQORA_HOME_FEED_PAGE_SIZE = 8;

function ensureHomeFeedStyles() {
  if (document.getElementById('afriqora-home-feed-style')) return;
  const style = document.createElement('style');
  style.id = 'afriqora-home-feed-style';
  style.textContent = `
    .af-home-feed-wrap {
      border: 1px solid rgba(255,255,255,0.14);
      border-radius: 16px;
      background: linear-gradient(130deg, rgba(255,255,255,0.07), rgba(255,255,255,0.02));
      padding: 0.75rem;
      margin-bottom: 0.85rem;
    }
    .af-home-feed-head {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 0.65rem;
      margin-bottom: 0.65rem;
    }
    .af-home-feed-head h3 { margin: 0; font-size: 1.02rem; }
    .af-home-feed-head p { margin: 0.2rem 0 0; color: rgba(226,236,247,0.82); font-size: 0.84rem; }
    .af-home-feed-state { color: rgba(226,236,247,0.9); font-size: 0.83rem; }
    .af-home-feed-list { display: grid; gap: 0.7rem; }
    .af-home-card {
      border: 1px solid rgba(255,255,255,0.14);
      border-radius: 14px;
      background: rgba(8, 21, 34, 0.62);
      padding: 0.72rem;
    }
    .af-home-card-top { display: flex; justify-content: space-between; align-items: flex-start; gap: 0.6rem; }
    .af-home-card-author {
      border: 0;
      background: transparent;
      color: #f1f6de;
      text-align: left;
      padding: 0;
      cursor: pointer;
      font-weight: 700;
    }
    .af-home-card-meta { margin: 0.16rem 0 0; color: rgba(214,230,245,0.76); font-size: 0.78rem; }
    .af-home-chip {
      border: 1px solid rgba(255,255,255,0.2);
      border-radius: 999px;
      padding: 0.16rem 0.46rem;
      font-size: 0.7rem;
      color: #fff6db;
      background: rgba(255,255,255,0.07);
      white-space: nowrap;
    }
    .af-home-title { margin: 0.55rem 0 0.35rem; font-size: 1.02rem; color: #fff; }
    .af-home-content { margin: 0; color: rgba(229,239,247,0.92); white-space: pre-wrap; }
    .af-home-media { margin-top: 0.58rem; border-radius: 10px; overflow: hidden; border: 1px solid rgba(255,255,255,0.15); background: #031726; }
    .af-home-media img, .af-home-media video { width: 100%; display: block; max-height: 420px; object-fit: cover; }
    .af-home-media-note { margin: 0; padding: 0.62rem; color: rgba(229,239,247,0.88); font-size: 0.8rem; }
    .af-home-video-controls { display: flex; justify-content: flex-end; padding: 0.45rem; }
    .af-home-video-load {
      border: 1px solid rgba(255,255,255,0.2);
      border-radius: 10px;
      background: linear-gradient(120deg, rgba(19,184,166,0.28), rgba(230,184,92,0.23));
      color: #fff;
      padding: 0.42rem 0.7rem;
      font-weight: 600;
      cursor: pointer;
    }
    .af-home-stats { margin: 0.5rem 0 0; color: rgba(218,233,245,0.8); font-size: 0.78rem; }
    .af-home-actions { display: flex; flex-wrap: wrap; gap: 0.4rem; margin-top: 0.55rem; }
    .af-home-actions button {
      border: 1px solid rgba(255,255,255,0.18);
      border-radius: 10px;
      background: rgba(255,255,255,0.07);
      color: #fff;
      padding: 0.34rem 0.62rem;
      cursor: pointer;
      font-size: 0.8rem;
    }
    .af-home-comments { margin-top: 0.55rem; display: none; }
    .af-home-comments.open { display: block; }
    .af-home-comments-list { max-height: 180px; overflow: auto; border: 1px solid rgba(255,255,255,0.14); border-radius: 10px; padding: 0.4rem; background: rgba(255,255,255,0.03); }
    .af-home-comment-item { margin-bottom: 0.3rem; font-size: 0.82rem; color: rgba(236,245,253,0.95); }
    .af-home-comment-form { display: flex; gap: 0.45rem; margin-top: 0.45rem; }
    .af-home-comment-form input {
      flex: 1;
      border: 1px solid rgba(255,255,255,0.2);
      border-radius: 10px;
      background: rgba(255,255,255,0.08);
      color: #fff;
      padding: 0.42rem 0.58rem;
    }
    .af-home-comment-form button {
      border: 1px solid rgba(230,184,92,0.55);
      border-radius: 10px;
      background: linear-gradient(120deg, rgba(19,184,166,0.28), rgba(230,184,92,0.23));
      color: #fff;
      padding: 0.42rem 0.68rem;
      cursor: pointer;
    }
    .af-home-sentinel { height: 20px; }
    @media (max-width: 980px) {
      .af-home-card { padding: 0.62rem; }
      .af-home-title { font-size: 0.95rem; }
      .af-home-actions button { flex: 1 1 auto; }
    }
  `;
  document.head.appendChild(style);
}

const AFRIQORA_SAFE_IMAGE_PLACEHOLDER = 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675" viewBox="0 0 1200 675"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#113a5b"/><stop offset="100%" stop-color="#1e6951"/></linearGradient></defs><rect width="1200" height="675" fill="url(#g)"/><text x="50%" y="47%" text-anchor="middle" fill="#e8f6ff" font-size="46" font-family="Arial, sans-serif">AFRIQORA Media Placeholder</text><text x="50%" y="56%" text-anchor="middle" fill="#d7ebf8" font-size="24" font-family="Arial, sans-serif">Upload image or video in Creator Dashboard</text></svg>');

function isBlockedPlaceholderMediaUrl(url) {
  const raw = String(url || '').trim();
  if (!raw) return false;
  try {
    const u = new URL(raw, window.location.origin);
    return /(^|\.)example\.com$/i.test(String(u.hostname || ''));
  } catch (e) {
    return /example\.com/i.test(raw);
  }
}

async function fetchMessageThread() {
  const me = await fetchCurrentUser(false);
  if (!me) return loadMessageThread();
  try {
    const res = await apiRequest('/messages/thread', { method: 'GET' });
    const data = await res.json().catch(() => null);
    if (res.ok && data && data.ok && Array.isArray(data.thread)) {
      saveMessageThread(data.thread);
      return data.thread;
    }
  } catch (e) {}
  return loadMessageThread();
}

async function sendMessageThreadMessage(text) {
  const value = String(text || '').trim();
  if (!value) return { ok: false };
  const me = await fetchCurrentUser(false);
  if (!me) {
    const items = loadMessageThread();
    items.push({ id: 'm-' + Date.now(), from: 'self', text: value, createdAt: new Date().toISOString() });
    items.push({ id: 'm-' + (Date.now() + 1), from: 'support', text: 'AFRIQORA Support received your message. We will follow up shortly.', createdAt: new Date().toISOString() });
    saveMessageThread(items);
    return { ok: true, thread: items };
  }
  try {
    const res = await apiRequest('/messages/thread', { method: 'POST', body: JSON.stringify({ text: value }) });
    const data = await res.json().catch(() => null);
    if (res.ok && data && data.ok) {
      const fresh = await fetchMessageThread();
      return { ok: true, thread: fresh };
    }
  } catch (e) {}
  return { ok: false };
}

function homeFeedCardHtml(item) {
  const kind = item.postKind || (item.business ? 'business' : 'creator');
  const chip = (kind === 'business' || item.contentType === 'business_listing') ? 'Business Listing' : (item.contentType === 'video' ? 'Video Post' : (item.contentType === 'image' ? 'Image Post' : 'Social Post'));
  const summary = String(item.content || '').slice(0, 1200);
  const imageIsPlaceholder = isBlockedPlaceholderMediaUrl(item.image);
  const videoIsPlaceholder = isBlockedPlaceholderMediaUrl(item.video);
  const safeImage = imageIsPlaceholder ? AFRIQORA_SAFE_IMAGE_PLACEHOLDER : item.image;
  const safeVideo = videoIsPlaceholder ? '' : item.video;
  const hasImage = !!safeImage;
  const hasVideo = !!safeVideo;
  const videoPoster = hasImage ? ` poster="${escapeHtml(safeImage)}"` : '';
  return `
    <article class="af-home-card" data-home-content-id="${escapeHtml(item.id)}">
      <div class="af-home-card-top">
        <div>
          <button class="af-home-card-author" data-home-author="${escapeHtml(item.ownerAfriqoraId || '')}">${escapeHtml(item.ownerDisplayName || 'AFRIQORA Creator')}</button>
          <p class="af-home-card-meta">${escapeHtml(formatIsoDate(item.publishedAt || item.createdAt))} · ${escapeHtml(item.category || 'General')} · ${escapeHtml(item.location || 'Unknown location')}</p>
        </div>
        <span class="af-home-chip">${escapeHtml(chip)}</span>
      </div>
      <h4 class="af-home-title">${escapeHtml(item.title || 'Untitled')}</h4>
      <p class="af-home-content">${escapeHtml(summary)}</p>
      ${hasImage ? `<div class="af-home-media"><img src="${escapeHtml(safeImage)}" alt="${escapeHtml(item.title || 'Post image')}"></div>` : ''}
      ${hasVideo ? `<div class="af-home-media"><video data-feed-video="1" data-content-id="${escapeHtml(item.id)}" data-src="${escapeHtml(safeVideo)}" preload="none" controls${videoPoster}></video><div class="af-home-video-controls"><button class="af-home-video-load" data-video-load="${escapeHtml(item.id)}">Load Video</button></div></div>` : ''}
      ${(videoIsPlaceholder && !hasVideo) ? '<div class="af-home-media"><p class="af-home-media-note">Video source unavailable in demo mode. Upload a local AFRIQORA video to play this post.</p></div>' : ''}
      ${(item.contentType === 'business_listing' && item.contact) ? `<p class="af-home-contact" style="margin-top:0.5rem;font-weight:500;color:var(--accent);">📞 Contact: ${escapeHtml(item.contact)}</p>` : ''}
      <p class="af-home-stats" data-home-stats="${escapeHtml(item.id)}">Views: ${Number((item.engagement && item.engagement.views) || (item.smartReach && item.smartReach.views) || 0)} · Likes: ${Number((item.engagement && item.engagement.likes) || 0)} · Comments: ${Number((item.engagement && item.engagement.comments) || 0)} · Shares: ${Number((item.engagement && item.engagement.shares) || 0)} · Saves: ${Number((item.engagement && item.engagement.saves) || 0)}</p>
      <div class="af-home-actions">
        <button data-action="like" data-id="${escapeHtml(item.id)}">Like</button>
        <button data-action="comment-toggle" data-id="${escapeHtml(item.id)}">Comments</button>
        <button data-action="share" data-id="${escapeHtml(item.id)}">Share</button>
        <button data-action="save" data-id="${escapeHtml(item.id)}">Save</button>
        <button data-action="report" data-id="${escapeHtml(item.id)}">Report</button>
        <button data-action="not-interested" data-id="${escapeHtml(item.id)}">Not Interested</button>
      </div>
      <div class="af-home-comments" data-home-comments="${escapeHtml(item.id)}">
        <div class="af-home-comments-list" data-home-comments-list="${escapeHtml(item.id)}"></div>
        <form class="af-home-comment-form" data-home-comment-form="${escapeHtml(item.id)}">
          <input type="text" placeholder="Write a comment" aria-label="Comment text">
          <button type="submit">Post</button>
        </form>
      </div>
    </article>
  `;
}

async function renderNavHomeView(container) {
  ensureHomeFeedStyles();
  if (!container) return;

  let mount = container.querySelector('#af-home-feed-root');
  if (!mount) {
    mount = document.createElement('section');
    mount.id = 'af-home-feed-root';
    container.prepend(mount);
  }

  mount.innerHTML = `
    <section class="af-home-feed-wrap">
      <div class="af-home-feed-head">
        <div>
          <h3>AFRIQORA Home Feed</h3>
          <p>Smart Reach powered feed with real engagement and relevance ordering.</p>
        </div>
        <div class="af-home-feed-state" id="af-home-feed-state">Loading...</div>
      </div>
      
      <!-- New Social Post Composer -->
      <div class="af-view-card" style="margin-bottom: 1.5rem; background: var(--bg-card); padding: 1rem; border-radius: 8px;">
        <h4 style="margin-top:0;">Create Post</h4>
        <textarea id="af-feed-post-content" placeholder="What's on your mind?" rows="3" style="width:100%; margin-bottom: 0.5rem;"></textarea>
        <div style="display: flex; gap: 1rem; margin-bottom: 0.5rem;">
          <div style="flex: 1;">
            <label style="display:block; font-size: 0.85rem; color: var(--muted); margin-bottom: 0.25rem;">Attach Photo</label>
            <input type="file" id="af-feed-post-image" accept="image/*" style="width:100%;">
          </div>
          <div style="flex: 1;">
            <label style="display:block; font-size: 0.85rem; color: var(--muted); margin-bottom: 0.25rem;">Attach Video</label>
            <input type="file" id="af-feed-post-video" accept="video/*" style="width:100%;">
          </div>
        </div>
        <button id="af-feed-post-publish" style="width:100%; padding: 0.75rem;">Publish Post</button>
        <div id="af-feed-post-msg" style="color:var(--accent); font-size:0.9rem; margin-top:0.5rem;"></div>
      </div>
      <!-- End Social Post Composer -->

      <div class="af-home-feed-list" id="af-home-feed-list"></div>
      <div class="af-home-sentinel" id="af-home-feed-sentinel" aria-hidden="true"></div>
    </section>
  `;

  const me = await fetchCurrentUser(false);
  const listEl = mount.querySelector('#af-home-feed-list');
  const stateEl = mount.querySelector('#af-home-feed-state');
  const sentinel = mount.querySelector('#af-home-feed-sentinel');

  // Bind Composer Logic
  const pubBtn = mount.querySelector('#af-feed-post-publish');
  if (pubBtn) {
    pubBtn.addEventListener('click', async () => {
      const content = mount.querySelector('#af-feed-post-content').value.trim();
      if (!content) return;
      
      const msg = mount.querySelector('#af-feed-post-msg');
      msg.textContent = 'Publishing...';
      pubBtn.disabled = true;

      try {
        let image = null, video = null;
        const imgFile = mount.querySelector('#af-feed-post-image').files?.[0];
        if (imgFile) {
          const b64 = await readFilesAsDataUrls([imgFile]);
          if (b64 && b64[0]) image = b64[0];
        }
        const vidFile = mount.querySelector('#af-feed-post-video').files?.[0];
        if (vidFile) {
          const b64 = await readFilesAsDataUrls([vidFile]);
          if (b64 && b64[0]) video = b64[0];
        }

        const payload = {
          title: content.substring(0, 100) + (content.length > 100 ? '...' : ''), // Auto-generate title
          content,
          image,
          video,
          status: 'published'
        };

        const res = await apiRequest('/creator/posts', { method: 'POST', body: JSON.stringify(payload) });
        if (res.ok) {
          msg.textContent = 'Post published successfully!';
          mount.querySelector('#af-feed-post-content').value = '';
          mount.querySelector('#af-feed-post-image').value = '';
          mount.querySelector('#af-feed-post-video').value = '';
          setTimeout(() => { msg.textContent = ''; renderNavHomeView(container); }, 1500); // Reload feed
        } else {
          msg.textContent = 'Failed to publish post.';
        }
      } catch (err) {
        msg.textContent = 'Error publishing post.';
      }
      pubBtn.disabled = false;
    });
  }

  if (!me) {
    listEl.innerHTML = '<div class="af-loading">Sign in to load your personalized AFRIQORA Home Feed.</div>';
    stateEl.textContent = 'Authentication required';
    return;
  }

  const feedState = {
    items: [],
    cursor: 0,
    hasMore: true,
    loading: false,
    seenImpression: new Set(),
    seenView: new Set(),
    watchTimers: {}
  };
  const navParams = getNavHashParams();
  const requestedContentId = String(navParams.contentId || '').trim();
  let requestFocusHandled = false;

  async function track(contentId, eventType, payload = {}) {
    try {
      await apiRequest('/smart-reach/engagement', {
        method: 'POST',
        body: JSON.stringify(Object.assign({ contentId: String(contentId), eventType, source: 'home-feed' }, payload || {}))
      });
    } catch (e) {}
  }

  async function refreshLikeSaveState(contentId, card, item) {
    const likeBtn = card.querySelector('[data-action="like"]');
    const saveBtn = card.querySelector('[data-action="save"]');
    try {
      const likeRes = await apiRequest('/interactions/likes?videoId=' + encodeURIComponent(String(contentId)) + '&userId=' + encodeURIComponent(String(me.id || '')), { method: 'GET' });
      const likeData = await likeRes.json().catch(() => null);
      if (likeData && likeBtn) likeBtn.textContent = (likeData.liked ? 'Unlike' : 'Like') + ' (' + Number(likeData.likesCount || 0) + ')';
    } catch (e) {
      if (likeBtn) likeBtn.textContent = 'Like';
    }
    try {
      const saveRes = await apiRequest('/interactions/saves?videoId=' + encodeURIComponent(String(contentId)), { method: 'GET' });
      const saveData = await saveRes.json().catch(() => null);
      if (saveData && saveBtn) saveBtn.textContent = (saveData.saved ? 'Saved' : 'Save') + ' (' + Number(saveData.savesCount || 0) + ')';
    } catch (e) {
      if (saveBtn) saveBtn.textContent = 'Save';
    }
    const stats = card.querySelector('[data-home-stats="' + String(contentId) + '"]');
    if (stats && item) {
      stats.textContent = 'Views: ' + Number((item.engagement && item.engagement.views) || (item.smartReach && item.smartReach.views) || 0)
        + ' · Likes: ' + Number((item.engagement && item.engagement.likes) || 0)
        + ' · Comments: ' + Number((item.engagement && item.engagement.comments) || 0)
        + ' · Shares: ' + Number((item.engagement && item.engagement.shares) || 0)
        + ' · Saves: ' + Number((item.engagement && item.engagement.saves) || 0);
    }
  }

  async function loadComments(contentId, card) {
    const list = card.querySelector('[data-home-comments-list="' + String(contentId) + '"]');
    if (!list) return;
    list.innerHTML = '<div class="af-loading">Loading comments...</div>';
    try {
      const res = await apiRequest('/comments?videoId=' + encodeURIComponent(String(contentId)), { method: 'GET' });
      const data = await res.json().catch(() => null);
      if (!data || !Array.isArray(data.comments)) {
        list.innerHTML = '<div class="af-loading">Unable to load comments.</div>';
        return;
      }
      if (!data.comments.length) {
        list.innerHTML = '<div class="af-loading">No comments yet.</div>';
        return;
      }
      list.innerHTML = data.comments.map((c) => `
        <div class="af-home-comment-item" data-comment-id="${escapeHtml(c.id || '')}">
          <p style="margin:0;"><strong>${escapeHtml(c.authorId || 'User')}:</strong> ${escapeHtml(c.text || '')}</p>
          <button type="button" class="af-search-pill" data-reply-comment="${escapeHtml(c.id || '')}" style="margin-top:0.2rem;">Reply</button>
        </div>
      `).join('');
      list.querySelectorAll('[data-reply-comment]').forEach((btn) => {
        btn.addEventListener('click', async () => {
          const parentCommentId = btn.getAttribute('data-reply-comment');
          const reply = prompt('Reply to comment:', '');
          const text = String(reply || '').trim();
          if (!text) return;
          const res = await apiRequest('/comments', {
            method: 'POST',
            body: JSON.stringify({ videoId: String(contentId), authorId: String(me.id || ''), text, parentCommentId })
          });
          const result = await res.json().catch(() => null);
          if (result && result.ok) {
            item.engagement = item.engagement || {};
            item.engagement.comments = Number(item.engagement.comments || 0) + 1;
            await refreshLikeSaveState(contentId, card, item);
            await loadComments(contentId, card);
            refreshNotificationBadges();
          }
        });
      });
    } catch (e) {
      list.innerHTML = '<div class="af-loading">Could not load comments.</div>';
    }
  }

  function wireCardInteractions(card, item) {
    const contentId = String(item.id);
    const commentsWrap = card.querySelector('[data-home-comments="' + contentId + '"]');
    const commentForm = card.querySelector('[data-home-comment-form="' + contentId + '"]');
    const authorBtn = card.querySelector('[data-home-author]');
    if (authorBtn) {
      authorBtn.addEventListener('click', async () => {
        await track(contentId, 'profile_visit');
        if (item.ownerAfriqoraId) {
          window.location.hash = '#/profile';
        }
      });
    }

    card.querySelectorAll('[data-action]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const action = btn.getAttribute('data-action');
        if (action === 'comment-toggle') {
          commentsWrap.classList.toggle('open');
          if (commentsWrap.classList.contains('open')) loadComments(contentId, card);
          return;
        }
        if (action === 'like') {
          const liking = !btn.textContent.toLowerCase().includes('unlike');
          const endpoint = liking ? '/interactions/like' : '/interactions/unlike';
          const res = await apiRequest(endpoint, { method: 'POST', body: JSON.stringify({ videoId: contentId, userId: me.id }) });
          const data = await res.json().catch(() => null);
          if (data && data.ok) {
            item.engagement = item.engagement || {};
            item.engagement.likes = Number(data.likesCount || item.engagement.likes || 0);
            await refreshLikeSaveState(contentId, card, item);
          }
          return;
        }
        if (action === 'share') {
          await apiRequest('/interactions/share', { method: 'POST', body: JSON.stringify({ videoId: contentId, userId: me.id, platform: 'native' }) });
          if (navigator.clipboard) {
            try { await navigator.clipboard.writeText(window.location.href.split('#')[0] + '#/home'); } catch (e) {}
          }
          item.engagement = item.engagement || {};
          item.engagement.shares = Number(item.engagement.shares || 0) + 1;
          await refreshLikeSaveState(contentId, card, item);
          return;
        }
        if (action === 'save') {
          const saved = btn.textContent.toLowerCase().includes('saved');
          const endpoint = saved ? '/interactions/unsave' : '/interactions/save';
          const res = await apiRequest(endpoint, { method: 'POST', body: JSON.stringify({ videoId: contentId }) });
          const data = await res.json().catch(() => null);
          if (data && data.ok) {
            item.engagement = item.engagement || {};
            item.engagement.saves = Number(data.savesCount || item.engagement.saves || 0);
            await refreshLikeSaveState(contentId, card, item);
          }
          return;
        }
        if (action === 'report') {
          const reason = prompt('Report reason (optional):', 'inappropriate') || 'unspecified';
          await apiRequest('/content/report', { method: 'POST', body: JSON.stringify({ contentId, reason }) });
          btn.textContent = 'Reported';
          btn.disabled = true;
          return;
        }
        if (action === 'not-interested') {
          await apiRequest('/content/not-interested', { method: 'POST', body: JSON.stringify({ contentId, reason: 'viewer-feedback' }) });
          card.remove();
          feedState.items = feedState.items.filter((x) => String(x.id) !== contentId);
          if (!feedState.items.length && !feedState.loading && !feedState.hasMore) {
            listEl.innerHTML = '<div class="af-loading">No content left in your feed after preferences filtering.</div>';
          }
        }
      });
    });

    if (commentForm) {
      commentForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const input = commentForm.querySelector('input');
        const text = String(input.value || '').trim();
        if (!text) return;
        const res = await apiRequest('/comments', { method: 'POST', body: JSON.stringify({ videoId: contentId, authorId: me.id, text }) });
        const data = await res.json().catch(() => null);
        if (data && data.ok) {
          input.value = '';
          item.engagement = item.engagement || {};
          item.engagement.comments = Number(item.engagement.comments || 0) + 1;
          await refreshLikeSaveState(contentId, card, item);
          await loadComments(contentId, card);
        }
      });
    }

    const loadBtn = card.querySelector('[data-video-load="' + contentId + '"]');
    const video = card.querySelector('video[data-feed-video]');
    if (loadBtn && video) {
      loadBtn.addEventListener('click', async () => {
        if (!video.getAttribute('src')) video.setAttribute('src', video.getAttribute('data-src') || '');
        try { await video.play(); } catch (e) {}
        loadBtn.disabled = true;
        loadBtn.textContent = 'Video Ready';
      });
      video.addEventListener('timeupdate', async () => {
        const now = Date.now();
        if (!feedState.watchTimers[contentId]) feedState.watchTimers[contentId] = now;
        const elapsed = now - feedState.watchTimers[contentId];
        if (elapsed >= 7000) {
          feedState.watchTimers[contentId] = now;
          await track(contentId, 'watch_time', { watchTimeMs: elapsed });
        }
        if (!feedState.seenView.has(contentId) && video.currentTime >= 5) {
          feedState.seenView.add(contentId);
          await track(contentId, 'view');
        }
      });
      video.addEventListener('ended', async () => {
        await track(contentId, 'completion');
      });
    }

    refreshLikeSaveState(contentId, card, item);
  }

  const cardObserver = new IntersectionObserver((entries) => {
    entries.forEach(async (entry) => {
      if (!entry.isIntersecting) return;
      const card = entry.target;
      const contentId = card.getAttribute('data-home-content-id');
      if (!contentId || feedState.seenImpression.has(contentId)) return;
      feedState.seenImpression.add(contentId);
      await track(contentId, 'impression');
    });
  }, { threshold: 0.5 });

  function appendItems(items) {
    const frag = document.createDocumentFragment();
    items.forEach((item) => {
      const holder = document.createElement('div');
      holder.innerHTML = homeFeedCardHtml(item);
      const card = holder.firstElementChild;
      if (!card) return;
      frag.appendChild(card);
      wireCardInteractions(card, item);
      cardObserver.observe(card);
    });
    listEl.appendChild(frag);

    if (!requestFocusHandled && requestedContentId) {
      const target = listEl.querySelector('[data-home-content-id="' + CSS.escape(requestedContentId) + '"]');
      if (target) {
        requestFocusHandled = true;
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        target.style.boxShadow = '0 0 0 2px rgba(230,184,92,0.7)';
        setTimeout(() => { target.style.boxShadow = ''; }, 1800);
      }
    }
  }

  async function loadPage() {
    if (feedState.loading || !feedState.hasMore) return;
    feedState.loading = true;
    stateEl.textContent = feedState.items.length ? 'Loading more...' : 'Loading feed...';
    try {
      const q = '/feed/home?limit=' + encodeURIComponent(String(AFRIQORA_HOME_FEED_PAGE_SIZE)) + '&cursor=' + encodeURIComponent(String(feedState.cursor || 0));
      const res = await apiRequest(q, { method: 'GET' });
      if (!res.ok) {
        stateEl.textContent = 'Could not load feed';
        if (!feedState.items.length) listEl.innerHTML = '<div class="af-loading">Unable to load Home Feed right now.</div>';
        feedState.loading = false;
        return;
      }
      const data = await res.json().catch(() => null);
      if (!data || !data.ok || !Array.isArray(data.items)) {
        stateEl.textContent = 'Feed format error';
        if (!feedState.items.length) listEl.innerHTML = '<div class="af-loading">Feed response was invalid.</div>';
        feedState.loading = false;
        return;
      }
      if (!data.items.length && !feedState.items.length) {
        listEl.innerHTML = '<div class="af-loading">Your AFRIQORA Home Feed is empty. Follow creators or publish content to personalize it.</div>';
      } else {
        appendItems(data.items);
      }
      feedState.items = feedState.items.concat(data.items);
      feedState.hasMore = !!data.hasMore;
      feedState.cursor = typeof data.nextCursor === 'number' ? data.nextCursor : (feedState.cursor + data.items.length);
      stateEl.textContent = feedState.hasMore ? 'Scroll for more' : 'Feed up to date';
    } catch (e) {
      stateEl.textContent = 'Feed request failed';
      if (!feedState.items.length) listEl.innerHTML = '<div class="af-loading">Network issue while loading feed.</div>';
    }
    feedState.loading = false;
  }

  const sentinelObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) loadPage();
    });
  }, { rootMargin: '280px 0px' });

  sentinelObserver.observe(sentinel);
  await loadPage();
}

function ensureSearchViewStyles() {
  if (document.getElementById('afriqora-search-style')) return;
  const style = document.createElement('style');
  style.id = 'afriqora-search-style';
  style.textContent = `
    .af-search-shell { border: 1px solid rgba(255,255,255,0.13); border-radius: 16px; background: rgba(9, 24, 37, 0.7); padding: 0.78rem; }
    .af-search-head { display: grid; gap: 0.56rem; }
    .af-search-input-wrap { display: grid; grid-template-columns: 1fr auto; gap: 0.5rem; }
    .af-search-input-wrap input {
      min-width: 0;
      border: 1px solid rgba(255,255,255,0.2);
      border-radius: 11px;
      background: rgba(255,255,255,0.08);
      color: #fff;
      padding: 0.58rem 0.7rem;
    }
    .af-search-input-wrap button {
      border: 1px solid rgba(230, 184, 92, 0.55);
      border-radius: 11px;
      background: linear-gradient(120deg, rgba(21,184,166,0.28), rgba(230,184,92,0.23));
      color: #fff;
      font-weight: 600;
      padding: 0.5rem 0.75rem;
      cursor: pointer;
    }
    .af-search-filter-row { display: flex; flex-wrap: wrap; gap: 0.35rem; }
    .af-search-chip {
      border: 1px solid rgba(255,255,255,0.2);
      border-radius: 999px;
      padding: 0.24rem 0.58rem;
      font-size: 0.74rem;
      background: rgba(255,255,255,0.06);
      color: #e9f4ff;
      cursor: pointer;
      user-select: none;
    }
    .af-search-chip.active {
      border-color: rgba(230,184,92,0.72);
      background: linear-gradient(120deg, rgba(21,184,166,0.24), rgba(230,184,92,0.21));
      color: #fff8e8;
    }
    .af-search-suggest-box,
    .af-search-recent-box,
    .af-search-results {
      margin-top: 0.66rem;
      border: 1px solid rgba(255,255,255,0.12);
      border-radius: 12px;
      background: rgba(255,255,255,0.03);
      padding: 0.56rem;
    }
    .af-search-suggest-list,
    .af-search-recent-list { display: flex; flex-wrap: wrap; gap: 0.38rem; }
    .af-search-pill {
      border: 1px solid rgba(255,255,255,0.2);
      border-radius: 999px;
      background: rgba(255,255,255,0.06);
      color: #e9f4ff;
      font-size: 0.74rem;
      padding: 0.2rem 0.52rem;
      cursor: pointer;
    }
    .af-search-results-head { display: flex; justify-content: space-between; gap: 0.45rem; align-items: center; margin-bottom: 0.4rem; }
    .af-search-results-meta { font-size: 0.78rem; color: rgba(218,233,245,0.82); }
    .af-search-group { margin-top: 0.52rem; }
    .af-search-group h4 { margin: 0 0 0.36rem; font-size: 0.84rem; color: #f3e6c7; letter-spacing: 0.02em; }
    .af-search-item {
      border: 1px solid rgba(255,255,255,0.12);
      border-radius: 11px;
      background: rgba(255,255,255,0.04);
      padding: 0.52rem;
      margin-bottom: 0.44rem;
      cursor: pointer;
    }
    .af-search-item p { margin: 0.2rem 0; font-size: 0.83rem; }
    .af-search-item-title { font-weight: 700; color: #fff; }
    .af-search-item-meta { color: rgba(212,231,246,0.77); }
    .af-search-actions { display: flex; justify-content: flex-end; margin-top: 0.5rem; }
    .af-search-actions button {
      border: 1px solid rgba(230,184,92,0.55);
      border-radius: 10px;
      background: linear-gradient(120deg, rgba(21,184,166,0.28), rgba(230,184,92,0.23));
      color: #fff;
      cursor: pointer;
      padding: 0.44rem 0.68rem;
      font-weight: 600;
    }
    .af-search-error { color: #ffd3c7; }
    .af-search-empty { color: rgba(223,238,250,0.84); }
    @media (max-width: 740px) {
      .af-search-shell { padding: 0.62rem; }
      .af-search-input-wrap { grid-template-columns: 1fr; }
    }
  `;
  document.head.appendChild(style);
}

async function renderNavSearchView(container) {
  ensureSearchViewStyles();
  const SEARCH_RECENT_KEY = 'afriqoraSearchRecentV1';
  const SEARCH_TYPES = [
    { key: 'people', label: 'People' },
    { key: 'businesses', label: 'Businesses' },
    { key: 'services', label: 'Services' },
    { key: 'posts', label: 'Posts' },
    { key: 'videos', label: 'Videos' },
    { key: 'content', label: 'Content' },
    { key: 'categories', label: 'Categories' }
  ];

  container.innerHTML = `
    <section class="af-search-shell">
      <div class="af-search-head">
        <h3 style="margin:0;">AFRIQORA Search</h3>
        <p class="af-view-hint" style="margin:0;">Search people, businesses, services, posts, videos, and categories with location-aware relevance.</p>
        <div class="af-search-input-wrap">
          <input type="text" id="af-nav-search-input" placeholder="Search e.g. electrician Edenvale" aria-label="AFRIQORA search query" autocomplete="off">
          <button type="button" id="af-nav-search-btn">Search</button>
        </div>
        <div class="af-search-filter-row" id="af-search-filters"></div>
      </div>
      <div class="af-search-suggest-box" id="af-search-suggest-box" hidden>
        <p class="af-search-results-meta" style="margin:0 0 0.35rem;">Suggestions</p>
        <div class="af-search-suggest-list" id="af-search-suggest-list"></div>
      </div>
      <div class="af-search-recent-box" id="af-search-recent-box">
        <div class="af-search-results-head">
          <p class="af-search-results-meta" style="margin:0;">Recent searches</p>
          <button type="button" id="af-search-clear-recent" class="af-search-pill">Clear</button>
        </div>
        <div class="af-search-recent-list" id="af-search-recent-list"></div>
      </div>
      <div class="af-search-results" id="af-search-results">
        <div class="af-search-empty">Start typing to search AFRIQORA.</div>
      </div>
    </section>
  `;

  const input = container.querySelector('#af-nav-search-input');
  const btn = container.querySelector('#af-nav-search-btn');
  const filtersEl = container.querySelector('#af-search-filters');
  const suggestBox = container.querySelector('#af-search-suggest-box');
  const suggestList = container.querySelector('#af-search-suggest-list');
  const recentBox = container.querySelector('#af-search-recent-box');
  const recentList = container.querySelector('#af-search-recent-list');
  const clearRecentBtn = container.querySelector('#af-search-clear-recent');
  const resultsEl = container.querySelector('#af-search-results');

  const me = await fetchCurrentUser(false);
  const settings = loadAppSettings();
  const state = {
    q: '',
    cursor: 0,
    hasMore: false,
    loading: false,
    items: [],
    groups: {},
    activeTypes: new Set(SEARCH_TYPES.map((x) => x.key)),
    debounceTimer: null
  };

  if (settings && settings.search && settings.search.includeServices === false) state.activeTypes.delete('services');

  function recentStorageKey() {
    return SEARCH_RECENT_KEY + ':' + String((me && me.id) || 'guest');
  }

  function loadRecent() {
    try {
      const raw = localStorage.getItem(recentStorageKey());
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed.filter(Boolean).slice(0, 12) : [];
    } catch (e) {
      return [];
    }
  }

  function saveRecent(items) {
    try { localStorage.setItem(recentStorageKey(), JSON.stringify((items || []).slice(0, 12))); } catch (e) {}
  }

  function pushRecent(q) {
    const value = String(q || '').trim();
    if (!value) return;
    const list = loadRecent().filter((x) => String(x).toLowerCase() !== value.toLowerCase());
    list.unshift(value);
    saveRecent(list);
    renderRecent();
  }

  function renderRecent() {
    const list = loadRecent();
    if (!list.length) {
      recentList.innerHTML = '<span class="af-search-empty">No recent searches yet.</span>';
      clearRecentBtn.hidden = true;
      return;
    }
    clearRecentBtn.hidden = false;
    recentList.innerHTML = list.map((q) => `<button type="button" class="af-search-pill" data-recent-q="${escapeHtml(q)}">${escapeHtml(q)}</button>`).join('');
    recentList.querySelectorAll('[data-recent-q]').forEach((el) => {
      el.addEventListener('click', () => {
        input.value = el.getAttribute('data-recent-q') || '';
        triggerSearch(false, true);
      });
    });
  }

  function renderFilters() {
    filtersEl.innerHTML = SEARCH_TYPES.map((t) => `<button type="button" class="af-search-chip ${state.activeTypes.has(t.key) ? 'active' : ''}" data-type="${t.key}">${escapeHtml(t.label)}</button>`).join('');
    filtersEl.querySelectorAll('[data-type]').forEach((btnEl) => {
      btnEl.addEventListener('click', () => {
        const key = btnEl.getAttribute('data-type');
        if (!key) return;
        if (state.activeTypes.has(key)) state.activeTypes.delete(key);
        else state.activeTypes.add(key);
        if (!state.activeTypes.size) state.activeTypes = new Set(['people']);
        renderFilters();
        triggerSearch(false, true);
      });
    });
  }

  function groupLabel(type) {
    const found = SEARCH_TYPES.find((x) => x.key === type);
    return found ? found.label : type;
  }

  function groupedItems(items) {
    const out = {};
    (items || []).forEach((item) => {
      const k = item.type || 'other';
      out[k] = out[k] || [];
      out[k].push(item);
    });
    return out;
  }

  function openResult(item) {
    if (!item) return;
    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.inset = '0';
    overlay.style.background = 'rgba(0,0,0,0.6)';
    overlay.style.zIndex = '999999';
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    const panel = document.createElement('div');
    panel.style.width = 'min(760px,95%)';
    panel.style.maxHeight = '90%';
    panel.style.overflow = 'auto';
    panel.style.borderRadius = '12px';
    panel.style.border = '1px solid rgba(255,255,255,0.14)';
    panel.style.background = 'rgba(10, 26, 40, 0.98)';
    panel.style.color = '#fff';
    panel.style.padding = '0.9rem';
    const media = item.preview || {};
    panel.innerHTML = `
      <h3 style="margin:0 0 0.35rem;">${escapeHtml(item.title || 'Result')}</h3>
      <p style="margin:0.15rem 0;color:rgba(222,238,248,0.86);">${escapeHtml(groupLabel(item.type))}${item.subtitle ? ' • ' + escapeHtml(item.subtitle) : ''}</p>
      <p style="margin:0.35rem 0;color:rgba(222,238,248,0.82);">Category: ${escapeHtml(item.category || 'n/a')} • Location: ${escapeHtml(item.location || 'n/a')}</p>
      ${media.excerpt ? `<p style="white-space:pre-wrap;">${escapeHtml(media.excerpt)}</p>` : ''}
      ${media.image ? `<img src="${escapeHtml(media.image)}" alt="Search result image" style="max-width:100%;border-radius:10px;border:1px solid rgba(255,255,255,0.15);">` : ''}
      ${media.video ? `<video src="${escapeHtml(media.video)}" controls preload="none" style="margin-top:0.45rem;width:100%;border-radius:10px;border:1px solid rgba(255,255,255,0.15);"></video>` : ''}
      <div style="display:flex;gap:0.45rem;justify-content:flex-end;margin-top:0.7rem;">
        ${item.type === 'people' ? '<button type="button" class="af-search-pill" data-send-connection="1">Connect</button>' : ''}
        ${(item.type === 'businesses' || item.type === 'services') ? '<button type="button" class="af-search-pill" data-send-enquiry="1">Send enquiry</button>' : ''}
        <button type="button" class="af-search-pill" data-open-route="1">Open</button>
        <button type="button" class="af-search-pill" data-close="1">Close</button>
      </div>
    `;
    overlay.appendChild(panel);
    document.body.appendChild(overlay);

    panel.querySelector('[data-close="1"]').addEventListener('click', () => {
      try { document.body.removeChild(overlay); } catch (e) {}
    });
    panel.querySelector('[data-open-route="1"]').addEventListener('click', async () => {
      try { document.body.removeChild(overlay); } catch (e) {}
      
      if (item.type === 'people' || item.type === 'businesses') {
         // For businesses, use ownerAfriqoraId or ownerUserId. For people, use subtitle or id.
         const targetId = item.type === 'businesses' ? (item.ownerAfriqoraId || item.ownerUserId || item.id) : ((item.subtitle && item.subtitle.includes('@') ? item.subtitle.replace('@', '') : item.subtitle) || item.id);
         switchTab('profile');
         renderNavProfileView(document.getElementById('af-tab-profile'), targetId);
      } else {
         window.location.hash = '#/home';
      }
    });
    const enquiryBtn = panel.querySelector('[data-send-enquiry="1"]');
    if (enquiryBtn) {
      enquiryBtn.addEventListener('click', async () => {
        if (!me) {
          alert('Sign in to send a business enquiry.');
          return;
        }
        if (!item.businessId) {
          alert('Business enquiry is not available for this item.');
          return;
        }
        const text = prompt('Describe your enquiry:', 'I would like to learn more about your service.');
        const message = String(text || '').trim();
        if (!message) return;
        try {
          const res = await apiRequest('/business/enquiries', {
            method: 'POST',
            body: JSON.stringify({ businessId: String(item.businessId), message, contactMode: 'search' })
          });
          const data = await res.json().catch(() => null);
          if (res.ok && data && data.ok) alert('Enquiry sent successfully.');
          else alert('Unable to send enquiry right now.');
        } catch (e) {
          alert('Network issue while sending enquiry.');
        }
      });
    }

    const connectBtn = panel.querySelector('[data-send-connection="1"]');
    if (connectBtn) {
      connectBtn.addEventListener('click', async () => {
        if (!me) {
          alert('Sign in to send a connection request.');
          return;
        }
        try {
          const res = await apiRequest('/connections/request', {
            method: 'POST',
            body: JSON.stringify({ targetUserId: String(item.id || '') })
          });
          const data = await res.json().catch(() => null);
          if (res.ok && data && data.ok) alert('Connection request sent.');
          else alert((data && data.error) ? data.error : 'Unable to send connection request.');
        } catch (e) {
          alert('Network issue while sending connection request.');
        }
      });
    }
  }

  function renderResults() {
    if (state.loading && !state.items.length) {
      resultsEl.innerHTML = '<div class="af-loading">Searching AFRIQORA...</div>';
      return;
    }
    if (!state.items.length) {
      let fallbackHtml = '<div class="af-search-empty">No direct results found.</div>';
      if (state.suggestions && state.suggestions.length) {
        fallbackHtml += '<div class="af-search-suggestions" style="margin-top:20px; padding: 10px; background: var(--bg-alt); border-radius: 8px;">';
        fallbackHtml += '<p style="margin: 0 0 10px 0; font-weight: 500;">Try these alternatives:</p>';
        state.suggestions.forEach(s => {
          fallbackHtml += `<div class="af-search-suggest-item" style="cursor:pointer; padding: 8px; border-bottom: 1px solid var(--border);" onclick="document.getElementById('af-search-input').value = '${escapeHtml(s)}'; document.getElementById('af-search-btn').click();">${escapeHtml(s)}</div>`;
        });
        fallbackHtml += '</div>';
      }
      if (state.relatedCategories && state.relatedCategories.length) {
        fallbackHtml += '<div class="af-search-categories" style="margin-top:20px; padding: 10px;">';
        fallbackHtml += '<p style="margin: 0 0 10px 0; font-weight: 500;">Related Categories:</p>';
        state.relatedCategories.forEach(c => {
          fallbackHtml += `<span style="display: inline-block; padding: 6px 12px; margin: 4px; background: var(--bg); border: 1px solid var(--border); border-radius: 16px; cursor: pointer;" onclick="document.getElementById('af-search-input').value = '${escapeHtml(c)}'; document.getElementById('af-search-btn').click();">${escapeHtml(c)}</span>`;
        });
        fallbackHtml += '</div>';
      }
      resultsEl.innerHTML = fallbackHtml;
      return;
    }
    const grouped = groupedItems(state.items);
    const order = SEARCH_TYPES.map((x) => x.key);
    const groupsHtml = order
      .filter((type) => grouped[type] && grouped[type].length)
      .map((type) => {
        const cards = grouped[type].map((item) => `
          <article class="af-search-item" data-result-id="${escapeHtml(item.id)}" data-result-type="${escapeHtml(item.type)}">
            <p class="af-search-item-title">${escapeHtml(item.title || 'Untitled')}</p>
            <p class="af-search-item-meta">${escapeHtml(item.subtitle || '')}</p>
            <p class="af-search-item-meta">Category: ${escapeHtml(item.category || 'n/a')} • Location: ${escapeHtml(item.location || 'n/a')} • Score: ${Number(item.score || 0).toFixed(3)}</p>
          </article>
        `).join('');
        return `<section class="af-search-group"><h4>${escapeHtml(groupLabel(type))} (${grouped[type].length})</h4>${cards}</section>`;
      }).join('');

    const activeSummary = Array.from(state.activeTypes).map(groupLabel).join(', ');
    const total = Object.values(state.groups || {}).reduce((acc, n) => acc + Number(n || 0), 0);
    resultsEl.innerHTML = `
      <div class="af-search-results-head">
        <p class="af-search-results-meta" style="margin:0;">${total} result(s) • Filters: ${escapeHtml(activeSummary || 'none')}</p>
        <p class="af-search-results-meta" style="margin:0;">${state.hasMore ? 'More available' : 'End of results'}</p>
      </div>
      ${groupsHtml}
      <div class="af-search-actions">
        ${state.hasMore ? '<button type="button" id="af-search-load-more">Load more</button>' : ''}
      </div>
    `;

    resultsEl.querySelectorAll('[data-result-id][data-result-type]').forEach((node) => {
      node.addEventListener('click', () => {
        const id = node.getAttribute('data-result-id');
        const type = node.getAttribute('data-result-type');
        const item = state.items.find((x) => String(x.id) === String(id) && String(x.type) === String(type));
        openResult(item);
      });
    });

    const moreBtn = resultsEl.querySelector('#af-search-load-more');
    if (moreBtn) {
      moreBtn.addEventListener('click', () => triggerSearch(true, true));
    }
  }

  async function fetchSuggestions() {
    const q = String(input.value || '').trim();
    if (q.length < 2) {
      suggestBox.hidden = true;
      suggestList.innerHTML = '';
      return;
    }
    try {
      const res = await apiRequest('/search/suggestions?q=' + encodeURIComponent(q) + '&limit=8', { method: 'GET' });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data || !data.ok || !Array.isArray(data.suggestions) || !data.suggestions.length) {
        suggestBox.hidden = true;
        suggestList.innerHTML = '';
        return;
      }
      suggestList.innerHTML = data.suggestions.map((s) => {
        const label = s.kind === 'query' ? s.text : ((s.type ? (s.type + ': ') : '') + s.text + (s.subtitle ? (' • ' + s.subtitle) : ''));
        return `<button type="button" class="af-search-pill" data-suggest="${escapeHtml(s.text || '')}">${escapeHtml(label)}</button>`;
      }).join('');
      suggestBox.hidden = false;
      suggestList.querySelectorAll('[data-suggest]').forEach((el) => {
        el.addEventListener('click', () => {
          input.value = el.getAttribute('data-suggest') || '';
          suggestBox.hidden = true;
          triggerSearch(false, true);
        });
      });
    } catch (e) {
      suggestBox.hidden = true;
    }
  }

  async function triggerSearch(append = false, saveRecentHistory = true) {
    const q = String(input.value || '').trim();
    if (!q) {
      state.items = [];
      state.groups = {};
      state.cursor = 0;
      state.hasMore = false;
      resultsEl.innerHTML = '<div class="af-loading af-search-error">Enter a search term to begin.</div>';
      recentBox.hidden = false;
      return;
    }

    if (!append) {
      state.cursor = 0;
      state.items = [];
      state.hasMore = false;
      state.groups = {};
    }

    state.loading = true;
    renderResults();
    const types = Array.from(state.activeTypes).join(',');
    let locParam = '';
    if (q.toLowerCase().includes('near me')) {
      try {
        const pos = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 3000 });
        });
        locParam = `&lat=${pos.coords.latitude}&lng=${pos.coords.longitude}`;
      } catch(e) {
        // Geolocation failed or denied
      }
    }
    
    const url = '/search?q=' + encodeURIComponent(q)
      + '&types=' + encodeURIComponent(types)
      + '&limit=12'
      + '&cursor=' + encodeURIComponent(String(state.cursor || 0))
      + locParam;
    try {
      const res = await apiRequest(url, { method: 'GET' });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data || !data.ok || !Array.isArray(data.items)) {
        const msg = data && data.error ? data.error : 'Search request failed';
        resultsEl.innerHTML = '<div class="af-loading af-search-error">' + escapeHtml(msg) + '</div>';
        state.loading = false;
        return;
      }
      state.groups = data.groups || {};
      state.hasMore = !!data.hasMore;
      state.cursor = typeof data.nextCursor === 'number' ? data.nextCursor : 0;
      state.items = append ? state.items.concat(data.items) : data.items.slice();
      state.relatedCategories = data.relatedCategories || [];
      state.suggestions = data.suggestions || [];
      state.loading = false;
      renderResults();
      if (!append && saveRecentHistory) pushRecent(q);
      recentBox.hidden = false;
    } catch (e) {
      state.loading = false;
      resultsEl.innerHTML = '<div class="af-loading af-search-error">Network issue while searching.</div>';
    }
  }

  function debouncedSuggestAndSearch() {
    if (state.debounceTimer) clearTimeout(state.debounceTimer);
    state.debounceTimer = setTimeout(async () => {
      await fetchSuggestions();
    }, 280);
  }

  clearRecentBtn.addEventListener('click', () => {
    saveRecent([]);
    renderRecent();
  });
  btn.addEventListener('click', () => triggerSearch(false, true));
  input.addEventListener('input', debouncedSuggestAndSearch);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      triggerSearch(false, true);
    }
  });

  renderFilters();
  renderRecent();
  renderResults();
}

async function renderNavActivityView(container) {
  container.innerHTML = '<div class="af-view-card"><h3>Recent Activity</h3><p class="af-view-hint">Loading recent updates from your AFRIQORA content.</p><div class="af-loading" aria-live="polite">Loading activity feed...</div></div>';

  const me = await fetchCurrentUser(false);
  if (me) {
    try {
      const res = await apiRequest('/feed/home?limit=12', { method: 'GET' });
      const data = await res.json().catch(() => null);
      if (res.ok && data && data.ok && Array.isArray(data.items) && data.items.length) {
        const listHtml = data.items.map((item) => {
          const authorRef = item.ownerUsername || item.ownerAfriqoraId;
          return `
          <article class="af-view-item" data-post-id="${escapeHtml(item.id)}">
            <p class="af-author-link" data-username="${escapeHtml(authorRef)}" style="color:var(--accent);font-size:0.85rem;margin-bottom:0.25rem;cursor:pointer;font-weight:600;">@${escapeHtml(authorRef)} &bull; ${escapeHtml(item.ownerDisplayName || 'Creator')}</p>
            <p><strong>${escapeHtml(item.title || 'Post')}</strong></p>
            <p style="white-space:pre-wrap;">${escapeHtml(item.content || '')}</p>
            ${item.image ? `<img src="${escapeHtml(item.image)}" style="max-width:100%;border-radius:6px;margin-top:0.5rem;" alt="Post image">` : ''}
            ${item.video ? `<video src="${escapeHtml(item.video)}" controls style="max-width:100%;border-radius:6px;margin-top:0.5rem;"></video>` : ''}
            <p class="af-message-meta" style="margin-top:0.5rem;">${escapeHtml(formatIsoDate(item.publishedAt || item.createdAt))}</p>
            <div style="display:flex;gap:0.5rem;margin-top:0.5rem;padding-top:0.5rem;border-top:1px solid rgba(255,255,255,0.1);">
              <button class="af-action-like" data-id="${escapeHtml(item.id)}" style="background:transparent;color:var(--text);border:1px solid rgba(255,255,255,0.2);padding:0.4rem 0.8rem;border-radius:4px;cursor:pointer;">Like</button>
              <button class="af-action-comment" data-id="${escapeHtml(item.id)}" style="background:transparent;color:var(--text);border:1px solid rgba(255,255,255,0.2);padding:0.4rem 0.8rem;border-radius:4px;cursor:pointer;">Comment</button>
              <button class="af-action-share" data-id="${escapeHtml(item.id)}" style="background:transparent;color:var(--text);border:1px solid rgba(255,255,255,0.2);padding:0.4rem 0.8rem;border-radius:4px;cursor:pointer;">Share</button>
            </div>
          </article>
        `}).join('');
        container.innerHTML = `<div class="af-view-card"><h3>Smart Reach Home Feed</h3><p class="af-view-hint">Personalized feed ordered by relevance and genuine engagement.</p><div class="af-view-grid" style="margin-top:0.65rem;">${listHtml}</div></div>`;
        
        container.querySelectorAll('.af-author-link').forEach(link => {
          link.addEventListener('click', () => {
             const uname = link.getAttribute('data-username');
             if (uname) {
                switchTab('profile');
                renderNavProfileView(document.getElementById('af-tab-profile'), uname);
             }
          });
        });
        
        container.querySelectorAll('.af-action-like').forEach(btn => {
          btn.addEventListener('click', async () => {
             const res = await apiRequest('/interactions/like', { method:'POST', body: JSON.stringify({ videoId: btn.dataset.id, userId: me.id }) });
             if (res.ok) { btn.textContent = 'Liked'; btn.style.color = 'var(--accent)'; btn.style.borderColor = 'var(--accent)'; }
          });
        });
        container.querySelectorAll('.af-action-comment').forEach(btn => {
          btn.addEventListener('click', async () => {
             const txt = prompt('Enter your comment:');
             if (!txt) return;
             const res = await apiRequest('/comments', { method:'POST', body: JSON.stringify({ videoId: btn.dataset.id, authorId: me.id, text: txt }) });
             if (res.ok) { alert('Comment posted!'); btn.style.color = 'var(--accent)'; btn.style.borderColor = 'var(--accent)'; }
          });
        });
        container.querySelectorAll('.af-action-share').forEach(btn => {
          btn.addEventListener('click', async () => {
             const res = await apiRequest('/interactions/share', { method:'POST', body: JSON.stringify({ videoId: btn.dataset.id, userId: me.id, platform:'copy' }) });
             if (res.ok) { alert('Link copied to clipboard!'); btn.textContent = 'Shared'; btn.style.color = 'var(--accent)'; btn.style.borderColor = 'var(--accent)'; }
          });
        });
        return;
      }
    } catch (e) {}
  }

  const feed = [];
  getSavedPosts().forEach((p) => feed.push({ when: p.updatedAt || p.createdAt, title: p.title || 'Post', text: 'Creator post published or updated' }));
  getSavedMarketplaceListings().forEach((m) => feed.push({ when: m.createdAt, title: m.name || 'Listing', text: 'Marketplace listing published' }));
  getSavedBusinessListings().forEach((b) => feed.push({ when: b.submittedAt, title: b.name || 'Business', text: 'Business profile registered or updated' }));
  feed.sort((a, b) => new Date(b.when || 0).getTime() - new Date(a.when || 0).getTime());
  const listHtml = feed.length
    ? feed.slice(0, 35).map((x) => `<article class="af-view-item"><p><strong>${escapeHtml(x.title)}</strong></p><p>${escapeHtml(x.text)}</p><p class="af-message-meta">${escapeHtml(formatIsoDate(x.when))}</p></article>`).join('')
    : '<div class="af-loading">No activity yet. Publish a post or create a listing to populate this feed.</div>';
  container.innerHTML = `<div class="af-view-card"><h3>Recent Activity</h3><p class="af-view-hint">Real activity from business listings, creator posts and marketplace updates.</p><div class="af-view-grid" style="margin-top:0.65rem;">${listHtml}</div></div>`;
}

async function renderNavNotificationsView(container) {
  container.innerHTML = '<div class="af-view-card"><h3>Notifications</h3><div class="af-loading" aria-live="polite">Loading notifications...</div></div>';
  const me = await fetchCurrentUser(false);
  if (!me) {
    container.innerHTML = '<div class="af-view-card"><h3>Notifications</h3><p class="af-view-hint">Sign in to view your notifications.</p></div>';
    return;
  }

  const state = { items: [], cursor: 0, hasMore: true, loading: false, unreadCount: 0 };

  function iconForCategory(category) {
    const map = {
      social: 'activity',
      connections: 'user',
      messages: 'message',
      business: 'home',
      recommendation: 'search',
      system: 'settings'
    };
    return primaryNavIcon(map[String(category || '').toLowerCase()] || 'bell');
  }

  function render() {
    const itemsHtml = state.items.map((n) => {
      const actorLabel = n.actorDisplayName ? ('Actor: ' + String(n.actorDisplayName)) : (n.actorUserId ? ('Actor: ' + String(n.actorUserId)) : 'AFRIQORA');
      return `
        <article class="af-note-card ${n.read ? '' : 'unread'}" data-note-id="${escapeHtml(n.id)}" data-note-route="${escapeHtml(n.route || '#/notifications')}">
          <div class="af-note-top">
            <span class="af-note-type"><span aria-hidden="true">${iconForCategory(n.category)}</span><span>${escapeHtml(n.category || n.type || 'update')}</span></span>
            <span>${escapeHtml(formatIsoDate(n.createdAt))}</span>
          </div>
          <p class="af-note-title">${escapeHtml(n.title || 'AFRIQORA update')}</p>
          <p class="af-note-message">${escapeHtml(n.message || '')}</p>
          <div class="af-note-meta">
            <span>${escapeHtml(actorLabel)}</span>
            <span>${n.read ? 'Read' : 'Unread'}</span>
          </div>
          <div class="af-note-actions">
            ${n.read ? '' : '<button type="button" data-note-read="' + escapeHtml(n.id) + '">Mark read</button>'}
            <button type="button" data-note-open="${escapeHtml(n.id)}">Open</button>
          </div>
        </article>
      `;
    }).join('');

    container.innerHTML = `
      <div class="af-view-card">
        <h3>Notifications</h3>
        <p class="af-view-hint">Real AFRIQORA events across social, messages, connections, business and system activity.</p>
        <div class="af-note-toolbar">
          <span class="af-message-meta">Unread: ${Number(state.unreadCount || 0)}</span>
          <button type="button" id="af-notes-mark-all">Mark all as read</button>
        </div>
        <div class="af-note-list">${itemsHtml || '<div class="af-note-empty">You are all caught up.</div>'}</div>
        ${state.hasMore ? '<div class="af-note-actions"><button type="button" id="af-notes-more">Load more</button></div>' : ''}
      </div>
    `;

    const allBtn = container.querySelector('#af-notes-mark-all');
    if (allBtn) {
      allBtn.addEventListener('click', async () => {
        await apiRequest('/notifications/read-all', { method: 'POST', body: JSON.stringify({}) });
        state.items = state.items.map((x) => Object.assign({}, x, { read: true }));
        state.unreadCount = 0;
        render();
        refreshNotificationBadges();
      });
    }

    container.querySelectorAll('[data-note-read]').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-note-read');
        if (!id) return;
        const res = await apiRequest('/notifications/' + encodeURIComponent(id) + '/read', { method: 'POST', body: JSON.stringify({}) });
        if (res.ok) {
          state.items = state.items.map((x) => (String(x.id) === String(id) ? Object.assign({}, x, { read: true }) : x));
          state.unreadCount = Math.max(0, Number(state.unreadCount || 0) - 1);
          render();
          refreshNotificationBadges();
        }
      });
    });

    container.querySelectorAll('[data-note-open]').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-note-open');
        const note = state.items.find((x) => String(x.id) === String(id));
        if (!note) return;
        if (!note.read) {
          await apiRequest('/notifications/' + encodeURIComponent(id) + '/read', { method: 'POST', body: JSON.stringify({}) });
        }
        refreshNotificationBadges();
        window.location.hash = note.route || '#/notifications';
      });
    });

    container.querySelectorAll('[data-note-id][data-note-route]').forEach((card) => {
      card.addEventListener('click', () => {
        const route = card.getAttribute('data-note-route') || '#/notifications';
        window.location.hash = route;
      });
    });

    const moreBtn = container.querySelector('#af-notes-more');
    if (moreBtn) moreBtn.addEventListener('click', () => loadPage(true));
  }

  async function loadPage(append) {
    if (state.loading) return;
    state.loading = true;
    try {
      const cursor = append ? state.cursor : 0;
      const res = await apiRequest('/notifications?limit=16&cursor=' + encodeURIComponent(String(cursor || 0)), { method: 'GET' });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data || !data.ok || !Array.isArray(data.items)) {
        container.innerHTML = '<div class="af-view-card"><h3>Notifications</h3><div class="af-note-error">Could not load notifications.</div></div>';
        state.loading = false;
        return;
      }
      state.items = append ? state.items.concat(data.items) : data.items.slice();
      state.cursor = typeof data.nextCursor === 'number' ? data.nextCursor : 0;
      state.hasMore = !!data.hasMore;
      state.unreadCount = Number(data.unreadCount || 0);
      render();
      refreshNotificationBadges();
    } catch (e) {
      container.innerHTML = '<div class="af-view-card"><h3>Notifications</h3><div class="af-note-error">Network issue while loading notifications.</div></div>';
    }
    state.loading = false;
  }

  await loadPage(false);
}

async function renderNavMessagesView(container) {
  container.innerHTML = '<div class="af-view-card"><h3>Messages</h3><div class="af-loading" aria-live="polite">Loading conversation...</div></div>';
  const me = await fetchCurrentUser(false);
  const thread = await fetchMessageThread();
  container.innerHTML = `
    <div class="af-view-card">
      <h3>Messages</h3>
      <p class="af-view-hint">Conversation updates sync to your AFRIQORA account where available.</p>
      <div id="af-messages-thread" class="af-messages-thread"></div>
      <form id="af-messages-form" class="af-messages-form">
        <input id="af-messages-input" type="text" placeholder="Write a message" aria-label="Message text" required>
        <button type="submit">Send</button>
      </form>
    </div>
  `;
  const threadEl = container.querySelector('#af-messages-thread');
  const form = container.querySelector('#af-messages-form');
  const input = container.querySelector('#af-messages-input');
  let threadState = Array.isArray(thread) ? thread.slice() : [];

  if (me) {
    try {
      await apiRequest('/notifications/read-all', { method: 'POST', body: JSON.stringify({ category: 'messages' }) });
      refreshNotificationBadges();
    } catch (e) {}
  }

  function drawThread() {
    threadEl.innerHTML = threadState.map((m) => `
      <article class="af-message-bubble ${m.from === 'self' ? 'self' : ''}">
        <p style="margin:0;">${escapeHtml(m.text || '')}</p>
        <p class="af-message-meta">${m.from === 'self' ? escapeHtml((me && me.displayName) || 'You') : 'AFRIQORA Support'} · ${escapeHtml(formatIsoDate(m.createdAt))}</p>
      </article>
    `).join('');
    threadEl.scrollTop = threadEl.scrollHeight;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = String(input.value || '').trim();
    if (!text) return;
    const sent = await sendMessageThreadMessage(text);
    if (sent && sent.ok && Array.isArray(sent.thread)) {
      threadState = sent.thread.slice();
    }
    input.value = '';
    drawThread();
    if (me) {
      try {
        await apiRequest('/notifications/read-all', { method: 'POST', body: JSON.stringify({ category: 'messages' }) });
      } catch (e) {}
    }
    refreshNotificationBadges();
  });

  drawThread();
}

async function openProfileEditor() {
  const me = await fetchCurrentUser(true);
  if (!me) return;
  const root = document.createElement('div');
  root.style.position = 'fixed'; root.style.inset = '0'; root.style.background = 'rgba(0,0,0,0.6)'; root.style.display = 'flex'; root.style.alignItems = 'center'; root.style.justifyContent = 'center'; root.style.zIndex = '999999';
  const panel = document.createElement('div');
  panel.style.background = '#0d1a2e'; panel.style.padding = '1rem'; panel.style.borderRadius = '8px'; panel.style.width = 'min(560px,95%)'; panel.style.maxHeight = '90%'; panel.style.overflow = 'auto'; panel.style.color = '#fff';
  
  panel.innerHTML = `
    <h3 style="margin-top:0;">Edit Profile</h3>
    <div style="display:grid;gap:0.75rem;margin-bottom:1rem;">
      <div><label>Display Name</label><input type="text" id="prof-name" value="${escapeHtml(me.displayName||'')}"></div>
      <div><label>Username</label><input type="text" id="prof-username" value="${escapeHtml(me.username||'')}"></div>
      <div><label>Bio / About Me</label><textarea id="prof-bio" rows="3">${escapeHtml(me.bio||'')}</textarea></div>
      <div><label>Location</label><input type="text" id="prof-location" value="${escapeHtml(me.location||'')}"></div>
      <div><label>Website / Link</label><input type="url" id="prof-website" value="${escapeHtml(me.website||'')}"></div>
      <div><label>Profile Photo</label><input type="file" id="prof-photo" accept="image/*"></div>
    </div>
    <div style="display:flex;gap:0.5rem;"><button id="prof-save">Save Profile</button><button id="prof-cancel">Cancel</button></div>
    <p id="prof-msg" style="color:var(--muted);margin-top:0.5rem;"></p>
  `;
  root.appendChild(panel); document.body.appendChild(root);

  panel.querySelector('#prof-cancel').addEventListener('click', () => {
    try { document.body.removeChild(root); } catch(e){}
  });

  panel.querySelector('#prof-save').addEventListener('click', async () => {
    const btn = panel.querySelector('#prof-save');
    const msg = panel.querySelector('#prof-msg');
    btn.disabled = true; msg.textContent = 'Saving...';
    try {
      const payload = {
        displayName: panel.querySelector('#prof-name').value.trim(),
        username: panel.querySelector('#prof-username').value.trim(),
        bio: panel.querySelector('#prof-bio').value.trim(),
        location: panel.querySelector('#prof-location').value.trim(),
        website: panel.querySelector('#prof-website').value.trim()
      };
      const fileInput = panel.querySelector('#prof-photo');
      if (fileInput.files && fileInput.files[0]) {
        try {
          const b64 = await readFilesAsDataUrls([fileInput.files[0]]);
          if (b64 && b64[0]) payload.profilePhoto = b64[0];
        } catch(e) { msg.textContent = 'Error reading photo'; btn.disabled = false; return; }
      }
      const res = await apiRequest('/api/profile/me', { method: 'PUT', body: JSON.stringify(payload) });
      const data = await res.json().catch(()=>null);
      if (res.ok && data && data.ok) {
        authUserCache = data.user;
        try { document.body.removeChild(root); } catch(e){}
        const pCont = document.getElementById('view-content');
        if(pCont && window.currentNavView==='profile') renderNavProfileView(pCont);
      } else {
        msg.textContent = data ? data.error || 'Failed to save' : 'Network error';
        btn.disabled = false;
      }
    } catch(e) {
      msg.textContent = 'Error saving profile';
      btn.disabled = false;
    }
  });
}

async function renderNavProfileView(container, targetUsername = null) {
  container.innerHTML = '<div class="af-view-card"><h3>Profile</h3><div class="af-loading" aria-live="polite">Loading profile...</div></div>';
  
  if (targetUsername) {
    const res = await apiRequest(`/api/users/${encodeURIComponent(targetUsername)}`, { method: 'GET' });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data || !data.user) {
       container.innerHTML = '<div class="af-view-card"><h3>Profile Not Found</h3><p class="af-view-hint">The user you are looking for does not exist.</p></div>';
       return;
    }
    const profileUser = data.user;
    const businessName = data.business ? data.business.businessName : null;
    const hasBusiness = !!businessName;
    const bPhone = data.business ? data.business.contactPhone : null;
    const bWhatsApp = data.business ? data.business.contactWhatsApp : null;
    const bEmail = data.business ? data.business.contactEmail : null;
    
    const followers = data.stats ? data.stats.followers : 0;
    const followingCount = data.stats ? data.stats.following : 0;
    
    const postsRes = await apiRequest(`/api/users/${encodeURIComponent(targetUsername)}/posts`, { method: 'GET' });
    const postsData = postsRes ? await postsRes.json().catch(() => null) : null;
    const myPosts = (postsData && Array.isArray(postsData.posts)) ? postsData.posts : [];
    
    let isFollowing = false;
    if (authUserCache) {
      const fRes = await apiRequest(`/follow/status?creatorId=${encodeURIComponent(profileUser.id)}&userId=${encodeURIComponent(authUserCache.id)}`, { method: 'GET' }).catch(() => null);
      const fData = fRes ? await fRes.json().catch(() => null) : null;
      isFollowing = fData ? fData.following : false;
    }
    
    const postsHtml = myPosts.length ? myPosts.map(post => `
      <article class="af-view-item" style="margin-top:1rem;border-top:1px solid rgba(255,255,255,0.1);padding-top:1rem;">
        <p><strong>${escapeHtml(post.title || 'Post')}</strong></p>
        <p style="white-space:pre-wrap;">${escapeHtml(post.content || '')}</p>
        ${post.image ? `<img src="${escapeHtml(post.image)}" style="max-width:100%;border-radius:6px;margin-top:0.5rem;">` : ''}
        ${post.video ? `<video src="${escapeHtml(post.video)}" controls style="max-width:100%;border-radius:6px;margin-top:0.5rem;"></video>` : ''}
        <p class="af-message-meta" style="margin-top:0.5rem;">${escapeHtml(formatIsoDate(post.createdAt))}</p>
      </article>
    `).join('') : '<p class="af-view-hint" style="margin-top:1rem;">No posts yet.</p>';
    
    container.innerHTML = `
      <div class="af-view-card">
        <div style="display:flex;align-items:flex-start;gap:1.5rem;margin-bottom:1.5rem;">
          ${profileUser.profilePhoto ? `<img src="${escapeHtml(profileUser.profilePhoto)}" style="width:100px;height:100px;border-radius:50%;object-fit:cover;border:3px solid var(--accent);">` : `<div style="width:100px;height:100px;border-radius:50%;background:rgba(255,255,255,0.1);display:flex;align-items:center;justify-content:center;border:3px solid var(--accent);">No Photo</div>`}
          <div style="flex:1;">
             <h2 style="margin:0 0 0.25rem 0;">${escapeHtml(profileUser.displayName || 'Anonymous')}</h2>
             <p style="margin:0 0 0.75rem 0;color:var(--muted);">@${escapeHtml(profileUser.username || profileUser.id.substring(0,8))}</p>
             ${profileUser.bio ? `<p style="margin:0 0 0.75rem 0;white-space:pre-wrap;line-height:1.4;">${escapeHtml(profileUser.bio)}</p>` : ''}
             
             <div style="display:flex;flex-wrap:wrap;gap:1rem;font-size:0.9rem;color:var(--muted);margin-bottom:1rem;">
               ${profileUser.location ? `<div>📍 ${escapeHtml(profileUser.location)}</div>` : ''}
               ${profileUser.website ? `<div>🔗 <a href="${escapeHtml(profileUser.website)}" target="_blank" style="color:var(--accent);text-decoration:none;">Website</a></div>` : ''}
               ${hasBusiness ? `<div>💼 <span style="color:var(--accent);">Business: ${escapeHtml(businessName)}</span></div>` : ''}
               ${bPhone ? `<div>📞 ${escapeHtml(bPhone)}</div>` : ''}
               ${bWhatsApp ? `<div>💬 WhatsApp: ${escapeHtml(bWhatsApp)}</div>` : ''}
               ${bEmail ? `<div>✉️ ${escapeHtml(bEmail)}</div>` : ''}
             </div>
             
             <div style="display:flex;gap:1.5rem;margin-bottom:1.5rem;font-size:0.95rem;">
                <div><strong style="color:var(--text);">${followers}</strong> <span style="color:var(--muted);">Followers</span></div>
                <div><strong style="color:var(--text);">${followingCount}</strong> <span style="color:var(--muted);">Following</span></div>
             </div>
             
             <div style="display:flex;gap:0.5rem;flex-wrap:wrap;">
               ${authUserCache && authUserCache.id !== profileUser.id ? `<button type="button" class="af-action-follow" data-id="${escapeHtml(profileUser.id)}" data-following="${isFollowing}" style="background:${isFollowing ? 'transparent' : 'var(--accent)'};color:${isFollowing ? 'var(--text)' : '#000'};border:1px solid ${isFollowing ? 'var(--border)' : 'transparent'};padding:0.5rem 1.5rem;border-radius:20px;font-weight:600;cursor:pointer;">${isFollowing ? 'Following' : 'Follow'}</button>` : ''}
             </div>
          </div>
        </div>
      </div>
      
      <div class="af-view-card" style="margin-top:1rem;">
        <h3>Timeline</h3>
        <div id="af-profile-posts">
          ${postsHtml}
        </div>
      </div>
    `;
    
    const fbtn = container.querySelector('.af-action-follow');
    if (fbtn) {
       fbtn.addEventListener('click', async (e) => {
          const btn = e.target;
          const cid = btn.getAttribute('data-id');
          const isF = btn.getAttribute('data-following') === 'true';
          const endpoint = isF ? '/unfollow' : '/follow';
          btn.disabled = true;
          const payload = isF ? { creatorId: cid, followerId: authUserCache.id } : { creatorId: cid };
          const rr = await apiRequest(endpoint, { method: 'POST', body: JSON.stringify(payload) });
          if (rr.ok) {
             renderNavProfileView(container, targetUsername);
          } else {
             btn.disabled = false;
          }
       });
    }
    return;
  }

  const me = await fetchCurrentUser(true);
  if (!me) {
    container.innerHTML = `
      <div class="af-view-card">
        <h3>Profile</h3>
        <p class="af-view-hint">Sign in to view your profile.</p>
        <div class="af-profile-actions">
          <button type="button" id="af-open-account-btn">Open Account</button>
        </div>
      </div>
    `;
    container.querySelector('#af-open-account-btn').addEventListener('click', () => openAccountModal());
    return;
  }
  
  const dashboard = await apiRequest('/creator/dashboard', { method: 'GET' }).then((r) => r.json()).catch(() => null);
  const hasBusiness = dashboard && dashboard.profile;
  const businessName = hasBusiness ? dashboard.profile.businessName : null;
  const followersCount = dashboard && dashboard.stats ? dashboard.stats.followersCount : 0;
  // Let's manually fetch our stats via the public route to get accurate following count too
  let followingCount = 0;
  if (me.username) {
     const stRes = await apiRequest(`/api/users/${encodeURIComponent(me.username)}`, { method: 'GET' }).catch(() => null);
     const stData = stRes ? await stRes.json().catch(() => null) : null;
     if (stData && stData.stats) followingCount = stData.stats.following;
  }
  
  const postsRes = await apiRequest('/creator/posts/mine', { method: 'GET' }).catch(() => null);
  const postsData = postsRes ? await postsRes.json().catch(() => null) : null;
  const myPosts = (postsData && Array.isArray(postsData.posts)) ? postsData.posts : [];
  
  const postsHtml = myPosts.length ? myPosts.map(post => `
    <article class="af-view-item" style="margin-top:1rem;border-top:1px solid rgba(255,255,255,0.1);padding-top:1rem;">
      <p><strong>${escapeHtml(post.title || 'Post')}</strong></p>
      <p style="white-space:pre-wrap;">${escapeHtml(post.content || '')}</p>
      ${post.image ? `<img src="${escapeHtml(post.image)}" style="max-width:100%;border-radius:6px;margin-top:0.5rem;">` : ''}
      ${post.video ? `<video src="${escapeHtml(post.video)}" controls style="max-width:100%;border-radius:6px;margin-top:0.5rem;"></video>` : ''}
      <p class="af-message-meta" style="margin-top:0.5rem;">${escapeHtml(formatIsoDate(post.createdAt))}</p>
    </article>
  `).join('') : '<p class="af-view-hint" style="margin-top:1rem;">No posts yet.</p>';
  
  container.innerHTML = `
    <div class="af-view-card">
      <div style="display:flex;align-items:flex-start;gap:1.5rem;margin-bottom:1.5rem;">
        ${me.profilePhoto ? `<img src="${escapeHtml(me.profilePhoto)}" style="width:100px;height:100px;border-radius:50%;object-fit:cover;border:3px solid var(--accent);">` : `<div style="width:100px;height:100px;border-radius:50%;background:rgba(255,255,255,0.1);display:flex;align-items:center;justify-content:center;border:3px solid var(--accent);">No Photo</div>`}
        <div style="flex:1;">
           <h2 style="margin:0 0 0.25rem 0;">${escapeHtml(me.displayName || 'Anonymous')}</h2>
           <p style="margin:0 0 0.75rem 0;color:var(--muted);">@${escapeHtml(me.username || me.id.substring(0,8))}</p>
           ${me.bio ? `<p style="margin:0 0 0.75rem 0;white-space:pre-wrap;line-height:1.4;">${escapeHtml(me.bio)}</p>` : ''}
           
           <div style="display:flex;flex-wrap:wrap;gap:1rem;font-size:0.9rem;color:var(--muted);margin-bottom:1rem;">
             ${me.location ? `<div>📍 ${escapeHtml(me.location)}</div>` : ''}
             ${me.website ? `<div>🔗 <a href="${escapeHtml(me.website)}" target="_blank" style="color:var(--accent);text-decoration:none;">Website</a></div>` : ''}
             ${hasBusiness ? `<div>💼 <span style="color:var(--accent);">Business: ${escapeHtml(businessName)}</span></div>` : ''}
           </div>
           
           <div style="display:flex;gap:1.5rem;margin-bottom:1.5rem;font-size:0.95rem;">
              <div><strong style="color:var(--text);">${followersCount}</strong> <span style="color:var(--muted);">Followers</span></div>
              <div><strong style="color:var(--text);">${followingCount}</strong> <span style="color:var(--muted);">Following</span></div>
           </div>
           
           <div style="display:flex;gap:0.5rem;flex-wrap:wrap;">
             <button type="button" id="af-profile-edit" style="background:var(--accent);color:#000;border:none;padding:0.5rem 1rem;border-radius:20px;font-weight:600;cursor:pointer;">Edit Profile</button>
             <button type="button" id="af-profile-dashboard" style="background:transparent;color:var(--text);border:1px solid var(--border);padding:0.5rem 1rem;border-radius:20px;cursor:pointer;">Business Dashboard</button>
             <button type="button" id="af-profile-account" style="background:transparent;color:var(--text);border:1px solid var(--border);padding:0.5rem 1rem;border-radius:20px;cursor:pointer;">Account Settings</button>
           </div>
        </div>
      </div>
    </div>
    
    <div class="af-view-card" style="margin-top:1rem;">
      <h3>Timeline</h3>
      <div id="af-profile-posts">
        ${postsHtml}
      </div>
    </div>
  `;
  container.querySelector('#af-profile-edit').addEventListener('click', () => openProfileEditor());
  container.querySelector('#af-profile-account').addEventListener('click', () => openAccountModal());
  container.querySelector('#af-profile-dashboard').addEventListener('click', () => openCreatorDashboard());
}

function renderNavSettingsView(container) {
  container.innerHTML = `
    <div class="af-view-card">
      <h3>Settings</h3>
      <p class="af-view-hint">Open AFRIQORA Settings to manage account-level preferences with backend persistence.</p>
      <div class="af-profile-actions">
        <button type="button" id="af-open-settings-view-btn">Open Settings</button>
      </div>
    </div>
  `;
  container.querySelector('#af-open-settings-view-btn').addEventListener('click', () => openSettingsScreen());
  openSettingsScreen();
}

function buildPrimaryNavShell() {
  if (document.getElementById('afriqora-primary-shell')) return null;
  const scriptEl = document.currentScript;
  if (!scriptEl || !scriptEl.parentNode) return null;

  const homeView = document.createElement('div');
  homeView.id = 'af-nav-home-view';
  homeView.className = 'af-nav-route';

  let cursor = document.body.firstChild;
  const toMove = [];
  while (cursor && cursor !== scriptEl) {
    const next = cursor.nextSibling;
    if (cursor.nodeType === 1 || (cursor.nodeType === 3 && String(cursor.textContent || '').trim())) {
      toMove.push(cursor);
    }
    cursor = next;
  }
  toMove.forEach((n) => homeView.appendChild(n));

  const shell = document.createElement('div');
  shell.id = 'afriqora-primary-shell';
  shell.className = 'af-nav-shell';
  shell.innerHTML = `
    <aside class="af-nav-sidebar">
      <div class="af-nav-brand"><span class="af-nav-brand-mark">A</span><span>AFRIQORA</span></div>
      <p class="af-nav-signature">Flowline Navigation</p>
      <nav class="af-nav-menu" aria-label="Primary navigation"></nav>
    </aside>
    <main class="af-nav-content">
      <header class="af-nav-top">
        <div>
          <h2 class="af-nav-title">AFRIQORA</h2>
          <p class="af-nav-subtitle" id="af-nav-route-subtitle">Home</p>
        </div>
      </header>
      <section id="af-nav-stage"></section>
    </main>
    <nav class="af-nav-mobile" aria-label="Mobile navigation"></nav>
  `;
  document.body.insertBefore(shell, scriptEl);

  const stage = shell.querySelector('#af-nav-stage');
  stage.appendChild(homeView);

  ['search', 'activity', 'notifications', 'messages', 'profile', 'settings'].forEach((id) => {
    const view = document.createElement('div');
    view.id = 'af-nav-' + id + '-view';
    view.className = 'af-nav-route';
    stage.appendChild(view);
  });

  return shell;
}

function initializePrimaryNavigation() {
  ensurePrimaryNavStyles();
  const shell = buildPrimaryNavShell();
  if (!shell) return;

  const navMenu = shell.querySelector('.af-nav-menu');
  const mobileNav = shell.querySelector('.af-nav-mobile');
  const subtitle = shell.querySelector('#af-nav-route-subtitle');
  const stage = shell.querySelector('#af-nav-stage');

  function navButtonHtml(route, mobile) {
    const withBadge = route.id === 'notifications' || route.id === 'messages';
    const labelHtml = `<span class="af-nav-label-wrap"><span>${escapeHtml(route.label)}</span>${withBadge ? '<span class="af-nav-badge" hidden></span>' : ''}</span>`;
    if (mobile) {
      return `<button type="button" class="af-nav-mobile-btn" data-nav-route="${route.id}"><span aria-hidden="true">${primaryNavIcon(route.icon)}</span>${labelHtml}</button>`;
    }
    return `<button type="button" class="af-nav-btn" data-nav-route="${route.id}"><span class="af-nav-icon" aria-hidden="true">${primaryNavIcon(route.icon)}</span>${labelHtml}</button>`;
  }

  navMenu.innerHTML = AFRIQORA_NAV_ROUTES.map((r) => navButtonHtml(r, false)).join('');
  mobileNav.innerHTML = AFRIQORA_NAV_ROUTES.map((r) => navButtonHtml(r, true)).join('');

  function setActiveButtons(routeId) {
    shell.querySelectorAll('[data-nav-route]').forEach((btn) => {
      const active = btn.getAttribute('data-nav-route') === routeId;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-current', active ? 'page' : 'false');
    });
  }

  function showRoute(routeId) {
    const current = AFRIQORA_NAV_ROUTES.find((r) => r.id === routeId) || AFRIQORA_NAV_ROUTES[0];
    subtitle.textContent = getPrimaryRouteSubtitle(current.id);
    setActiveButtons(current.id);
    stage.querySelectorAll('.af-nav-route').forEach((el) => {
      el.classList.toggle('active', el.id === 'af-nav-' + current.id + '-view' || (current.id === 'home' && el.id === 'af-nav-home-view'));
    });

    if (current.id === 'home') renderNavHomeView(document.getElementById('af-nav-home-view'));
    if (current.id === 'search') renderNavSearchView(document.getElementById('af-nav-search-view'));
    if (current.id === 'activity') renderNavActivityView(document.getElementById('af-nav-activity-view'));
    if (current.id === 'notifications') renderNavNotificationsView(document.getElementById('af-nav-notifications-view'));
    if (current.id === 'messages') renderNavMessagesView(document.getElementById('af-nav-messages-view'));
    if (current.id === 'profile') renderNavProfileView(document.getElementById('af-nav-profile-view'));
    if (current.id === 'settings') renderNavSettingsView(document.getElementById('af-nav-settings-view'));
  }

  function navigate(routeId, replaceState = false) {
    const target = AFRIQORA_NAV_ROUTES.some((r) => r.id === routeId) ? routeId : 'home';
    const nextHash = '#/' + target;
    if (replaceState) {
      if (window.location.hash !== nextHash) window.history.replaceState(null, '', nextHash);
      showRoute(target);
      return;
    }
    if (window.location.hash === nextHash) {
      showRoute(target);
      return;
    }
    window.location.hash = nextHash;
  }

  shell.querySelectorAll('[data-nav-route]').forEach((btn) => {
    btn.addEventListener('click', () => navigate(btn.getAttribute('data-nav-route') || 'home'));
  });

  window.addEventListener('hashchange', () => showRoute(getNavRouteFromHash()));
  navigate(getNavRouteFromHash(), true);
  refreshNotificationBadges();
  if (afNavNotificationPollTimer) clearInterval(afNavNotificationPollTimer);
  afNavNotificationPollTimer = setInterval(() => {
    refreshNotificationBadges();
  }, 12000);
}

initializePrimaryNavigation();
applyLanguageChange();
