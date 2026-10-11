const fetch = require('node-fetch');
const path = require('path');
const { spawn } = require('child_process');

const PORT = process.env.PORT || 4001;
const BASE = `http://127.0.0.1:${PORT}`;

function fail(msg, code = 1) {
  console.error('❌ ' + msg);
  process.exit(code);
}

async function isHealthy() {
  try {
    const res = await fetch(`${BASE}/api/health`);
    return res.ok;
  } catch (e) {
    return false;
  }
}

async function ensureBackendServer() {
  if (await isHealthy()) return null;

  const serverPath = path.join(__dirname, 'dist', 'index.js');
  const proc = spawn(process.execPath, [serverPath], {
    cwd: __dirname,
    env: { ...process.env, PORT: String(PORT) },
    stdio: 'ignore',
  });

  for (let i = 0; i < 40; i++) {
    await new Promise((r) => setTimeout(r, 250));
    if (await isHealthy()) break;
  }

  return proc;
}

async function request(method, path, body, token) {
  const headers = {};
  if (body) headers['Content-Type'] = 'application/json';
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(BASE + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const json = await res.json().catch(() => ({}));
  return { res, json };
}

async function register(label) {
  const email = `${label}+${Date.now()}@example.com`;
  const password = 'TestPass123!';
  const r = await request('POST', '/api/auth/register', { email, password, displayName: label });
  if (!r.res.ok || !r.json.token) {
    console.error('Register failed with status:', r.res.status, r.json);
    fail('Register failed for ' + label, 10);
  }
  return { token: r.json.token, user: r.json.user };
}

async function run() {
  console.log('--- Testing Phase 5: Commercial Platform & Business Monetization ---');
  const serverProc = await ensureBackendServer();

  try {
    const merchant = await register('merchant-kofi');
    const regularUser = await register('consumer-zara');

    // 1. Create Business Profile for Kofi
    console.log('1. Registering business profile for Merchant Kofi');
    const bizRes = await request('POST', '/api/creator/business-profile', {
      businessName: 'Kofi Clean Energy Ltd',
      category: 'Renewable Energy',
      description: 'Solar panel distribution and installation across West Africa.',
      location: 'Accra',
      country: 'GH',
      website: 'https://kofisolar.afriqora.local',
    }, merchant.token);
    if (!bizRes.res.ok || !bizRes.json.businessProfile) fail('Failed to create business profile', 1);
    const businessId = bizRes.json.businessProfile.id;

    // 2. Submit Business Verification Request
    console.log('2. Submitting business verification documents');
    const verRes = await request('POST', '/api/commercial/verify', {
      registrationNumber: 'GH-BN-2026-9921',
      taxId: 'TIN-908231',
      documentUrl: 'https://docs.afriqora.local/verifications/kofi-cert.pdf',
    }, merchant.token);
    if (!verRes.res.ok || !verRes.json.success) fail('Failed to submit verification', 2);

    // 3. Admin checks pending queue
    console.log('3. Admin checks pending moderation queue');
    const pendingRes = await request('GET', '/api/admin/moderation/pending', null, merchant.token);
    if (!pendingRes.res.ok || !Array.isArray(pendingRes.json.pendingVerifications)) fail('Failed to fetch pending queue', 3);
    const verificationItem = pendingRes.json.pendingVerifications.find((v) => v.businessId === businessId);
    if (!verificationItem) fail('Expected pending verification in admin queue', 4);

    // 4. Admin approves business verification
    console.log('4. Admin approves business verification');
    const appVerRes = await request('POST', `/api/admin/moderation/verification/${verificationItem.id}`, {
      action: 'approve',
      adminNotes: 'Registered business documents verified.',
    }, merchant.token);
    if (!appVerRes.res.ok || !appVerRes.json.success) fail('Failed to approve verification', 5);

    // 5. Merchant creates a configurable Ad Campaign
    console.log('5. Merchant creates configurable Ad Campaign ($75.00 budget)');
    const campRes = await request('POST', '/api/commercial/campaigns', {
      title: 'Solar Independence Campaign 2026',
      placement: 'all',
      targetCategory: 'Renewable Energy',
      dailyBudget: 15.0,
      totalBudget: 75.0,
      headline: 'Power Your Business With 24/7 Clean Solar Energy',
      description: 'Special 15% discount for verified African commercial storefronts.',
      ctaText: 'Get Solar Quote',
      ctaUrl: 'https://kofisolar.afriqora.local/quote',
      mediaUrl: 'https://images.unsplash.com/photo-1509391365360-2e959784a276?w=800',
    }, merchant.token);
    if (!campRes.res.ok || !campRes.json.campaign) fail('Failed to create campaign', 6);
    const campaignId = campRes.json.campaign.id;
    if (campRes.json.campaign.status !== 'pending_approval') fail('New campaign must require approval', 7);

    // 6. Admin approves ad campaign
    console.log('6. Admin approves ad campaign creative');
    const appCampRes = await request('POST', `/api/admin/moderation/campaign/${campaignId}`, {
      action: 'approve',
    }, merchant.token);
    if (!appCampRes.res.ok || !appCampRes.json.success) fail('Failed to approve ad campaign', 8);

    // 7. Regular consumer fetches home feed (Verify sponsored post injection)
    console.log('7. Regular consumer views feed — checking subtle sponsored card injection');
    // First create 3 organic posts to ensure feed has depth
    for (let i = 1; i <= 3; i++) {
      await request('POST', '/api/feed', {
        title: `Community Market Discussion #${i}`,
        text: 'Sharing trade tips and local business opportunities across Africa.',
        category: 'Trade',
      }, regularUser.token);
    }

    const feedRes = await request('GET', '/api/feed/home', null, regularUser.token);
    if (!feedRes.res.ok || !Array.isArray(feedRes.json.posts)) fail('Failed to fetch home feed', 9);
    const sponsoredPost = feedRes.json.posts.find((p) => p.isSponsored === true);
    if (!sponsoredPost) fail('Expected non-intrusive sponsored card in feed', 10);
    console.log(`   ✓ Found sponsored post: "${sponsoredPost.title}" (CTA: ${sponsoredPost.ctaText})`);

    // 8. Regular consumer searches for "Solar" (Verify verified & promoted discovery ranking)
    console.log('8. Consumer searches for "Solar" in directory');
    const searchRes = await request('GET', '/api/search?q=solar&types=businesses', null, regularUser.token);
    if (!searchRes.res.ok || !Array.isArray(searchRes.json.items)) fail('Failed search query', 11);
    const promotedBiz = searchRes.json.items.find((i) => i.id === businessId);
    if (!promotedBiz || !promotedBiz.isVerified || !promotedBiz.isSponsored) {
      fail('Expected Kofi Solar to be marked as verified and sponsored in search', 12);
    }
    console.log('   ✓ Verified business & sponsored badge rendered in search');

    // 9. Record valid ad click with anti-fraud nonce
    console.log('9. Recording verified ad click event');
    const clickNonce = 'clk-' + Date.now();
    const clickRes = await request('POST', '/api/commercial/ads/click', {
      campaignId,
      nonce: clickNonce,
    }, regularUser.token);
    if (!clickRes.res.ok || !clickRes.json.success) fail('Failed to record ad click', 13);

    // 10. Anti-fraud check: Prevent duplicate click replay
    console.log('10. Testing click replay protection');
    const replayClickRes = await request('POST', '/api/commercial/ads/click', {
      campaignId,
      nonce: clickNonce,
    }, regularUser.token);
    if (replayClickRes.res.status !== 409) fail('Expected 409 Conflict for duplicate click replay', 14);
    console.log('   ✓ Replay click rejected successfully');

    // 11. Merchant checks privacy-preserving aggregate analytics
    console.log('11. Merchant views privacy-preserving analytics');
    const analyticsRes = await request('GET', '/api/commercial/analytics', null, merchant.token);
    if (!analyticsRes.res.ok || !analyticsRes.json.metrics) fail('Failed to get analytics', 15);
    const metrics = analyticsRes.json.metrics;
    if (metrics.totalClicks < 1 || metrics.totalImpressions < 1) fail('Metrics counts failed to record', 16);
    console.log(`   ✓ Analytics summary: ${metrics.totalImpressions} impressions, ${metrics.totalClicks} clicks, $${metrics.totalSpent} spent`);

    // 12. Merchant deposits budget top-up with idempotent reference
    console.log('12. Merchant deposits ad budget top-up');
    const depositRef = 'DEP-MOCK-' + Date.now();
    const depositRes = await request('POST', '/api/commercial/billing/deposit', {
      campaignId,
      amount: 50.0,
      paymentMethod: 'mpesa_mock',
      reference: depositRef,
    }, merchant.token);
    if (!depositRes.res.ok || !depositRes.json.success) fail('Failed to deposit budget', 17);

    // Duplicate billing protection test
    const dupDepositRes = await request('POST', '/api/commercial/billing/deposit', {
      campaignId,
      amount: 50.0,
      paymentMethod: 'mpesa_mock',
      reference: depositRef,
    }, merchant.token);
    if (dupDepositRes.res.status !== 409) fail('Expected 409 Conflict on duplicate payment reference', 18);
    console.log('   ✓ Duplicate deposit correctly blocked');

    console.log('✨ All Phase 5 Commercial & Business Monetization tests PASSED cleanly!');
  } finally {
    if (serverProc && !serverProc.killed) {
      try { serverProc.kill(); } catch (e) {}
    }
  }

  process.exit(0);
}

run().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(99);
});
