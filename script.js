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
const MONETIZATION_SERVER_URL = (typeof MONETIZATION_SERVER_URL !== 'undefined') ? MONETIZATION_SERVER_URL : 'http://localhost:4000';
let authUserCache = null;

function apiBaseUrl() {
  return (MONETIZATION_SERVER_URL || '').replace(/\/$/, '');
}

function apiUrl(path) {
  return apiBaseUrl() + path;
}

async function apiRequest(path, options = {}) {
  const headers = Object.assign({ 'Content-Type': 'application/json' }, options.headers || {});
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
      <div style="display:flex;gap:1rem;align-items:flex-start;margin-bottom:0.5rem;border-bottom:1px solid #eee;padding-bottom:0.5rem;">
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
    const followBtn = document.createElement('button'); followBtn.textContent = 'Follow';
    const followCountSpan = document.createElement('span'); followCountSpan.style.marginLeft='0.25rem'; followBtn.appendChild(followCountSpan);
    controls.appendChild(likeBtn); controls.appendChild(commentToggleBtn); controls.appendChild(shareBtn); controls.appendChild(followBtn);
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
    const onTime = () => {
      try {
        if (counted) return;
        if (videoEl.currentTime >= threshold) {
          counted = true;
          recordView(String(videoId||''), String(creatorId||''), String(viewerId||'anonymous'));
          // also send to server
          sendViewToServer(String(videoId||''), String(creatorId||''), String(viewerId||'anonymous'));
        }
      } catch(e){}
    };
    videoEl.addEventListener('timeupdate', onTime);
    videoEl.addEventListener('ended', ()=>{ if (!counted && videoEl.duration >= threshold) { counted = true; recordView(String(videoId||''), String(creatorId||''), String(viewerId||'anonymous')); sendViewToServer(String(videoId||''), String(creatorId||''), String(viewerId||'anonymous')); } });

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

    closeBtn.addEventListener('click', ()=>{ try{ videoEl.pause(); videoEl.removeEventListener('timeupdate', onTime); document.body.removeChild(root);}catch(e){} });
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
  const panel = document.createElement('div'); panel.style.background='rgba(13,26,46,0.98)'; panel.style.padding='1rem'; panel.style.borderRadius='8px'; panel.style.width='min(720px,95%)'; panel.style.maxHeight='85%'; panel.style.overflow='auto';
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
          <button class="auth-logout">Logout</button>
        </div>
        <p class="auth-msg" style="color:var(--muted);"></p>
      </div>
    `;
    const logoutBtn = content.querySelector('.auth-logout');
    const dashboardBtn = content.querySelector('.auth-open-dashboard');
    logoutBtn.addEventListener('click', async ()=>{
      await apiRequest('/auth/logout', { method:'POST' }).catch(()=>null);
      authUserCache = null;
      await updateAccountUI();
      closeModal();
    });
    dashboardBtn.addEventListener('click', ()=>{
      closeModal();
      openCreatorDashboard();
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
  const panel = document.createElement('div'); panel.style.background='rgba(13,26,46,0.98)'; panel.style.padding='1rem'; panel.style.borderRadius='8px'; panel.style.width='min(720px,95%)'; panel.style.maxHeight='85%'; panel.style.overflow='auto';
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
const SIGNALING_SERVER_URL = (typeof SIGNALING_SERVER_URL !== 'undefined') ? SIGNALING_SERVER_URL : 'ws://localhost:8080';
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
  constructor(url, clientId) {
    this.url = url;
    this.clientId = clientId;
    this.ws = null;
    this.onmessage = null;
    this._connect();
  }
  _connect() {
    try {
      this.ws = new WebSocket(this.url);
      this.ws.addEventListener('open', ()=>{
        this.send({ type: 'register', clientId: this.clientId });
      });
      this.ws.addEventListener('message', (ev)=>{
        try { const msg = JSON.parse(ev.data); if (this.onmessage) this.onmessage(msg); } catch(e){}
      });
      this.ws.addEventListener('close', ()=>{ setTimeout(()=>this._connect(), 2000); });
      this.ws.addEventListener('error', ()=>{});
    } catch (e) {}
  }
  send(obj) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    try { this.ws.send(JSON.stringify(obj)); } catch(e){}
  }
}

const signalingClient = new SignalingClient(SIGNALING_SERVER_URL, getClientId());

// bind this clientId to a business id when owner manages a profile
function bindClientToBusiness(businessId) {
  if (!signalingClient || !businessId) return;
  signalingClient.send({ type: 'bind-business', clientId: getClientId(), businessId: String(businessId) });
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
    signalingClient.send({ type:'call-decline', from:getClientId(), to:fromId });
    root.innerHTML='';
  });

  acceptBtn.addEventListener('click', async ()=>{
    root.innerHTML = '';
    await acceptCall(fromId, kind, offer);
  });
}

async function startCall(targetId, kind='audio') {
  if (!signalingClient || !targetId) { alert('Signaling not available or target not provided'); return; }
  const clientId = getClientId();
  // get local media
  let constraints = { audio: true }; if (kind==='video') constraints.video = true;
  try {
    const localStream = await navigator.mediaDevices.getUserMedia(constraints);
    const pc = new RTCPeerConnection({ iceServers:[{ urls: 'stun:stun.l.google.com:19302' }] });
    pc.onicecandidate = (e)=>{ if (e.candidate) signalingClient.send({ type:'ice', from:clientId, to: targetId, candidate: e.candidate }); };
    const remoteStream = new MediaStream();
    pc.ontrack = (e)=>{ e.streams[0] && e.streams[0].getTracks().forEach(t=>remoteStream.addTrack(t)); };
    localStream.getTracks().forEach(t=>pc.addTrack(t, localStream));
    const offer = await pc.createOffer(); await pc.setLocalDescription(offer);
    // save currentCall
    currentCall = { pc, localStream, remoteStream, targetId, kind, state:'calling' };
    renderActiveCallUI(currentCall, /*isCaller=*/true);
    signalingClient.send({ type:'offer', from:clientId, to: targetId, kind, sdp: offer.sdp });
  } catch (err) {
    alert('Unable to access camera/microphone: ' + (err.message || err));
  }
}

async function acceptCall(fromId, kind='audio', offerSdp) {
  const clientId = getClientId();
  try {
    const constraints = { audio: true }; if (kind==='video') constraints.video = true;
    const localStream = await navigator.mediaDevices.getUserMedia(constraints);
    const pc = new RTCPeerConnection({ iceServers:[{ urls: 'stun:stun.l.google.com:19302' }] });
    pc.onicecandidate = (e)=>{ if (e.candidate) signalingClient.send({ type:'ice', from:clientId, to: fromId, candidate: e.candidate }); };
    const remoteStream = new MediaStream();
    pc.ontrack = (e)=>{ e.streams[0] && e.streams[0].getTracks().forEach(t=>remoteStream.addTrack(t)); };
    localStream.getTracks().forEach(t=>pc.addTrack(t, localStream));
    const desc = { type: 'offer', sdp: offerSdp };
    await pc.setRemoteDescription(desc);
    const answer = await pc.createAnswer(); await pc.setLocalDescription(answer);
    signalingClient.send({ type:'answer', from:clientId, to: fromId, sdp: answer.sdp });
    currentCall = { pc, localStream, remoteStream, targetId: fromId, kind, state:'connected' };
    renderActiveCallUI(currentCall, /*isCaller=*/false);
  } catch (err) {
    alert('Unable to access camera/microphone: ' + (err.message || err));
    signalingClient.send({ type:'call-error', from: clientId, to: fromId, message: String(err) });
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
  panel.innerHTML = `<h3 style="margin-top:0;">AFRIQORA CREATOR DASHBOARD</h3><p style="margin-top:0;color:rgba(255,255,255,0.82);">Manage your creator identity, posts, and business profile.</p>`;

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
    <h4>Business Profile</h4>
    <div style="display:grid;gap:0.5rem;">
      <input id="dash-biz-name" type="text" placeholder="Business name">
      <input id="dash-biz-owner" type="text" placeholder="Owner / profile name">
      <input id="dash-biz-category" type="text" placeholder="Category">
      <input id="dash-biz-location" type="text" placeholder="Location">
      <input id="dash-biz-website" type="text" placeholder="Website">
      <input id="dash-biz-contact" type="text" placeholder="Contact">
      <textarea id="dash-biz-description" placeholder="Description"></textarea>
      <label>Logo upload (optional)</label>
      <input id="dash-biz-logo" type="file" accept="image/*">
      <div style="display:flex;gap:0.5rem;align-items:center;">
        <button id="dash-biz-save" type="button">Save Business Profile</button>
        <span id="dash-biz-msg" aria-live="polite" style="color:#9ad1ff;"></span>
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
        <p style="margin:0.2rem 0;color:rgba(255,255,255,0.8);">${escapeHtml(formatIsoDate(p.createdAt))} | ${escapeHtml(p.status || 'published')} | Views: ${Number((p.engagement && p.engagement.views) || 0)}</p>
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
    stateBox.innerHTML = `
      <p><strong>AFRIQORA ID:</strong> ${escapeHtml((dashboardData.user && dashboardData.user.afriqoraId) || user.afriqoraId || '')}</p>
      <p><strong>Creator/business name:</strong> ${escapeHtml((dashboardData.businessProfile && dashboardData.businessProfile.businessName) || dashboardData.user.displayName || 'Creator')}</p>
      <p><strong>Profile:</strong> ${escapeHtml(dashboardData.user.displayName || '')}</p>
      <p><strong>Views / engagement:</strong> ${Number(creator.totalViews || 0)} total views</p>
      <p><strong>Earnings:</strong> $${Number(creator.earnings || 0).toFixed(6)} | <strong>Available:</strong> $${Number(creator.availableBalance || 0).toFixed(6)}</p>
    `;

    const bp = dashboardData.businessProfile || {};
    panel.querySelector('#dash-biz-name').value = bp.businessName || '';
    panel.querySelector('#dash-biz-owner').value = bp.ownerDisplayName || dashboardData.user.displayName || '';
    panel.querySelector('#dash-biz-category').value = bp.category || '';
    panel.querySelector('#dash-biz-location').value = bp.location || '';
    panel.querySelector('#dash-biz-website').value = bp.website || '';
    panel.querySelector('#dash-biz-contact').value = bp.contact || '';
    panel.querySelector('#dash-biz-description').value = bp.description || '';

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

    if (!title || !content) {
      msg.textContent = 'Title and content are required.';
      return;
    }
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

    const payload = { title, content, category, location, website, contact, image, video, status: 'published' };
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
  });

  panel.querySelector('#dash-post-cancel').addEventListener('click', resetPostForm);

  panel.querySelector('#dash-biz-save').addEventListener('click', async () => {
    const businessName = panel.querySelector('#dash-biz-name').value.trim();
    const ownerDisplayName = panel.querySelector('#dash-biz-owner').value.trim();
    const category = panel.querySelector('#dash-biz-category').value.trim();
    const location = panel.querySelector('#dash-biz-location').value.trim();
    const website = panel.querySelector('#dash-biz-website').value.trim();
    const contact = panel.querySelector('#dash-biz-contact').value.trim();
    const description = panel.querySelector('#dash-biz-description').value.trim();
    const logoFile = panel.querySelector('#dash-biz-logo').files?.[0];
    const msg = panel.querySelector('#dash-biz-msg');
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
    const payload = { businessName, ownerDisplayName, category, location, website, contact, description, logo };
    const res = await apiRequest('/creator/business-profile', { method: 'POST', body: JSON.stringify(payload) });
    const data = await res.json().catch(() => ({ error: 'request failed' }));
    if (!res.ok || !data.ok) {
      msg.textContent = data.error || 'Unable to save business profile.';
      return;
    }
    dashboardData.businessProfile = data.businessProfile;
    upsertBusinessProfileToLocal(data.businessProfile, user);
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
    signalingClient.send({ type:'call-end', from: getClientId(), to: call.targetId });
    endCurrentCall();
  });
}

// Handle signaling messages
signalingClient.onmessage = async (msg) => {
  if (!msg || !msg.type) return;
  const clientId = getClientId();
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
};

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
