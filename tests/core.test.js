process.env.NODE_ENV = 'test';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const {
  generateShopQrToken,
  validateShopQrToken,
  signOwnerToken,
  verifyOwnerToken,
  signUserAccessToken,
  verifyUserAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  signCustomerSessionToken,
  verifyCustomerSessionToken,
  verifyGoogleToken,
  validateGenuineEmail,
  isValidEmailSyntax,
  signEmailVerifiedToken,
  verifyEmailVerifiedToken,
  getOwnerIdFromReq,
  signCustomerOtpToken,
  verifyCustomerOtpToken,
  hashPassword,
  verifyPassword,
  normalizePhoneNumber,
  matchPhone,
  normalizeWhatsAppNumber,
  buildWhatsAppUrl,
  generateRedeemCode,
  createOrGetPendingRewardClaim,
  loadLocalDb
} = require('../server');

test('Dynamic QR token generation and HMAC anti-counterfeit verification', () => {
  const shopSecret = 'test_shop_secret_abc123';
  const qrData = generateShopQrToken(shopSecret);
  
  assert.ok(qrData.token, 'Token should be generated');
  assert.ok(qrData.expiresAt > Date.now(), 'Token should expire in future');

  // Verify genuine token with correct shop secret
  const check = validateShopQrToken(qrData.token, shopSecret);
  assert.equal(check.valid, true, 'Genuine token should validate successfully');

  // Tampered token must fail
  const tamperedToken = qrData.token.slice(0, -3) + 'xyz';
  const tamperCheck = validateShopQrToken(tamperedToken, shopSecret);
  assert.equal(tamperCheck.valid, false, 'Tampered token must be rejected');

  // Token evaluated against wrong shop secret must fail
  const wrongSecretCheck = validateShopQrToken(qrData.token, 'wrong_secret_456');
  assert.equal(wrongSecretCheck.valid, false, 'Token with wrong shop secret must be rejected');

  // Malformed token must fail
  assert.equal(validateShopQrToken('random_string', shopSecret).valid, false);
});

test('Owner session token HMAC signing and validation', () => {
  const token = signOwnerToken('owner_123', 'owner@example.com', '+919876543210');
  assert.ok(token, 'Owner token should be generated');

  const payload = verifyOwnerToken(token);
  assert.ok(payload, 'Owner token should verify successfully');
  assert.equal(payload.ownerId, 'owner_123');
  assert.equal(payload.email, 'owner@example.com');
  assert.equal(payload.phone, '+919876543210');

  // Tampered owner token must fail
  assert.equal(verifyOwnerToken(token + 'bad'), null);
});

test('Customer OTP verification token lifecycle', () => {
  const phone = '+919999888877';
  const token = signCustomerOtpToken(phone);
  assert.ok(token, 'Customer OTP token should be generated');

  const payload = verifyCustomerOtpToken(token);
  assert.ok(payload, 'Customer OTP token should verify successfully');
  assert.equal(payload.phone, phone);
  assert.equal(payload.verified, true);

  // Tampered OTP token must fail
  assert.equal(verifyCustomerOtpToken('tampered.token'), null);
});

test('Password hashing produces bcrypt hash and verifies correctly', () => {
  const pass1 = 'SecurePass123!';
  const pass2 = 'DifferentPass456!';
  const hash1 = hashPassword(pass1);
  const hash2 = hashPassword(pass2);

  assert.ok(hash1.startsWith('$2'), 'Bcrypt hash should start with $2');
  assert.equal(verifyPassword(pass1, hash1), true, 'Correct password must verify');
  assert.equal(verifyPassword(pass2, hash1), false, 'Wrong password must be rejected');
  assert.notEqual(hash1, pass1, 'Hash must not equal plaintext');
});

test('PWA manifest.json is present and meets all installability criteria', () => {
  const manifestPath = path.join(__dirname, '..', 'public', 'manifest.json');
  assert.equal(fs.existsSync(manifestPath), true, 'manifest.json must exist');

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  assert.ok(manifest.name, 'manifest must have name');
  assert.ok(manifest.short_name, 'manifest must have short_name');
  assert.equal(manifest.display, 'standalone', 'display must be standalone');
  assert.ok(manifest.start_url, 'manifest must have start_url');
  assert.ok(Array.isArray(manifest.icons) && manifest.icons.length >= 2, 'manifest must have at least 2 icons');

  // Verify icon files physically exist on disk
  manifest.icons.forEach(icon => {
    const iconPath = path.join(__dirname, '..', 'public', icon.src.replace(/^\//, ''));
    assert.equal(fs.existsSync(iconPath), true, `Icon file ${icon.src} must physically exist`);
  });
});

test('Service Worker sw.js is present and defines offline caching and network fetch', () => {
  const swPath = path.join(__dirname, '..', 'public', 'sw.js');
  assert.equal(fs.existsSync(swPath), true, 'sw.js must exist in public directory');

  const swContent = fs.readFileSync(swPath, 'utf8');
  assert.ok(swContent.includes('install'), 'sw.js must have install event listener');
  assert.ok(swContent.includes('fetch'), 'sw.js must have fetch event listener');
  assert.ok(swContent.includes('CACHE_NAME'), 'sw.js must define cache name');
});

test('loadLocalDb provides resilient in-memory store structure', () => {
  const { loadLocalDb } = require('../server');
  const db = loadLocalDb();
  assert.ok(db, 'db object must exist');
  assert.ok(typeof db.shops === 'object', 'shops map must exist');
  assert.ok(typeof db.owners === 'object', 'owners map must exist');
  assert.ok(typeof db.customerCards === 'object', 'customerCards map must exist');
});

test('resolveShopBySlug resolves shops strictly and returns null for unknown slugs', async () => {
  const { resolveShopBySlug, loadLocalDb } = require('../server');
  const db = loadLocalDb();
  db.shops['fixture-shop'] = { name: 'Fixture Shop', slug: 'fixture-shop' };

  const found = await resolveShopBySlug('fixture-shop');
  assert.ok(found, 'Fixture shop should be found');
  assert.equal(found.slug, 'fixture-shop');

  const unknown = await resolveShopBySlug('non-existent-shop-slug-999');
  assert.equal(unknown, null, 'Unknown shop slug must strictly return null');

  delete db.shops['fixture-shop'];
});

test('normalizePhoneNumber formats 10, 11, and 12-digit numbers with +91 country code', () => {
  assert.equal(normalizePhoneNumber('9876543210'), '+919876543210');
  assert.equal(normalizePhoneNumber('09876543210'), '+919876543210');
  assert.equal(normalizePhoneNumber('+919876543210'), '+919876543210');
  assert.equal(normalizePhoneNumber('919876543210'), '+919876543210');
  assert.equal(normalizePhoneNumber(''), '');
});

test('matchPhone accurately matches phone numbers across international and local formatting', () => {
  assert.equal(matchPhone('9876543210', '+919876543210'), true);
  assert.equal(matchPhone('+91 98765 43210', '9876543210'), true);
  assert.equal(matchPhone('09876543210', '+919876543210'), true);
  assert.equal(matchPhone('9876543210', '9876543299'), false);
  assert.equal(matchPhone('', '9876543210'), false);
  assert.equal(matchPhone(null, '9876543210'), false);
});

test('Short-lived 15-minute Access JWT lifecycle and HMAC verification', () => {
  const token = signUserAccessToken({ userId: 'u_123', email: 'owner@example.com', role: 'owner', shopId: 's_456' });
  assert.ok(token, 'Access JWT must be generated');
  assert.equal(token.split('.').length, 3, 'JWT must have header.payload.signature structure');

  const payload = verifyUserAccessToken(token);
  assert.ok(payload, 'Access JWT must verify successfully');
  assert.equal(payload.userId, 'u_123');
  assert.equal(payload.email, 'owner@example.com');
  assert.equal(payload.role, 'owner');
  assert.equal(payload.shopId, 's_456');

  // Tampered token must fail
  assert.equal(verifyUserAccessToken(token + 'tampered'), null);
});

test('Long-lived Refresh Token lifecycle and validation', () => {
  const { token, tokenId } = signRefreshToken('u_123', 'owner', 'fp_hash_789', 30);
  assert.ok(token, 'Refresh token must be generated');
  assert.ok(tokenId, 'Token ID must be present');

  const payload = verifyRefreshToken(token);
  assert.ok(payload, 'Refresh token must verify successfully');
  assert.equal(payload.userId, 'u_123');
  assert.equal(payload.role, 'owner');
  assert.equal(payload.deviceFingerprint, 'fp_hash_789');

  // Tampered token must fail
  assert.equal(verifyRefreshToken(token + 'bad'), null);
});

test('Zero-App-Install 365-day Customer Session Cookie token lifecycle', () => {
  const customerToken = signCustomerSessionToken('cust_101', 'customer@gmail.com', 'shop_777', 'device_fp_abc');
  assert.ok(customerToken, 'Customer 365-day session token must be generated');

  const payload = verifyCustomerSessionToken(customerToken);
  assert.ok(payload, 'Customer token must verify successfully');
  assert.equal(payload.customerId, 'cust_101');
  assert.equal(payload.email, 'customer@gmail.com');
  assert.equal(payload.shopId, 'shop_777');
  assert.equal(payload.deviceFingerprint, 'device_fp_abc');

  // Token expires in future (~365 days)
  assert.ok(payload.exp > Date.now() + 300 * 86400 * 1000);

  // Tampered token must fail
  assert.equal(verifyCustomerSessionToken('bad.token'), null);
});

test('Google token verification handles structured payload parsing', async () => {
  const fakePayload = Buffer.from(JSON.stringify({
    sub: 'google_sub_99999',
    email: 'testuser@gmail.com',
    name: 'Test Google User',
    picture: 'https://lh3.googleusercontent.com/photo.jpg',
    email_verified: true
  })).toString('base64url');
  const dummyJwt = `header.${fakePayload}.sig`;

  const result = await verifyGoogleToken(dummyJwt);
  assert.equal(result.success, true);
  assert.equal(result.email, 'testuser@gmail.com');
  assert.equal(result.name, 'Test Google User');
  assert.equal(result.googleId, 'google_sub_99999');

  const invalid = await verifyGoogleToken('malformed_string');
  assert.equal(invalid.success, false);
});

test('Production HTTP endpoints enforce JSON 404, safe JSON parsing, and never leak service role keys', async () => {
  const { app } = require('../server');
  const srv = await new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  const baseUrl = `http://127.0.0.1:${srv.address().port}`;
  try {
    const authRes = await fetch(`${baseUrl}/api/config/auth`);
    assert.equal(authRes.status, 200);
    const authJson = await authRes.json();
    assert.ok(authJson.url);
    assert.ok(authJson.anonKey);
    assert.notEqual(authJson.anonKey, process.env.SUPABASE_SERVICE_ROLE_KEY || 'never_match');

    const notFoundRes = await fetch(`${baseUrl}/api/does-not-exist-xyz`);
    assert.equal(notFoundRes.status, 404);
    const notFoundJson = await notFoundRes.json();
    assert.equal(notFoundJson.success, false);

    const badJsonRes = await fetch(`${baseUrl}/api/owner/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{bad_json'
    });
    assert.equal(badJsonRes.status, 400);
    const badJson = await badJsonRes.json();
    assert.equal(badJson.success, false);
  } finally {
    await new Promise((resolve) => srv.close(resolve));
  }
});

test('getOwnerIdFromReq enforces owner role and rejects customer tokens', async () => {
  const customerAccess = signUserAccessToken({ userId: 'cust_123', email: 'c@gmail.com', role: 'customer' });
  const customerRefresh = signRefreshToken('cust_123', 'customer', null, 7).token;
  const ownerAccess = signUserAccessToken({ userId: 'owner_123', email: 'o@gmail.com', role: 'owner' });

  const custHeaderReq = { headers: { authorization: `Bearer ${customerAccess}` }, cookies: {} };
  assert.equal(await getOwnerIdFromReq(custHeaderReq), null);

  const custCookieReq = { headers: {}, cookies: { marku_access: customerAccess, marku_refresh: customerRefresh } };
  assert.equal(await getOwnerIdFromReq(custCookieReq), null);

  const ownerHeaderReq = { headers: { authorization: `Bearer ${ownerAccess}` }, cookies: {} };
  assert.equal(await getOwnerIdFromReq(ownerHeaderReq), 'owner_123');

  const ownerCookieReq = { headers: {}, cookies: { owner_session: ownerAccess } };
  assert.equal(await getOwnerIdFromReq(ownerCookieReq), 'owner_123');
});

test('GET /api/owner/dashboard rejects customer JWT with 401', async () => {
  const { app } = require('../server');
  const customerAccess = signUserAccessToken({ userId: 'cust_999', email: 'cust@gmail.com', role: 'customer' });
  const srv = await new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  const baseUrl = `http://127.0.0.1:${srv.address().port}`;
  try {
    const res = await fetch(`${baseUrl}/api/owner/dashboard`, {
      headers: { Authorization: `Bearer ${customerAccess}` }
    });
    assert.equal(res.status, 401);
  } finally {
    await new Promise((resolve) => srv.close(resolve));
  }
});

test('verifyGoogleToken rejects missing email or unverified email payloads', async () => {
  const noEmailPayload = Buffer.from(JSON.stringify({ sub: 'g_1', email_verified: true })).toString('base64url');
  const noEmailRes = await verifyGoogleToken(`h.${noEmailPayload}.s`);
  assert.equal(noEmailRes.success, false);

  const unverifiedPayload = Buffer.from(JSON.stringify({
    sub: 'g_2',
    email: 'unverified@gmail.com',
    email_verified: false
  })).toString('base64url');
  const unverifiedRes = await verifyGoogleToken(`h.${unverifiedPayload}.s`);
  assert.equal(unverifiedRes.success, false);
});

test('validateGenuineEmail rejects malformed, disposable, and non-existent domains', async () => {
  assert.equal(isValidEmailSyntax('not-an-email'), false);
  assert.equal(isValidEmailSyntax('bad..dot@gmail.com'), false);
  assert.equal(isValidEmailSyntax('valid.owner@gmail.com'), true);

  const disposable = await validateGenuineEmail('tempuser@mailinator.com');
  assert.equal(disposable.valid, false);

  const placeholder = await validateGenuineEmail('someone@example.com');
  assert.equal(placeholder.valid, false);

  const fakeDomain = await validateGenuineEmail('nobody@nonexistent-domain-xyz-99999.com');
  assert.equal(fakeDomain.valid, false);
});

test('POST /api/owner/register and /api/owner/login reject fake or non-existent emails', async () => {
  const { app } = require('../server');
  const srv = await new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  const baseUrl = `http://127.0.0.1:${srv.address().port}`;
  try {
    const regDisposable = await fetch(`${baseUrl}/api/owner/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        shopName: 'Fake Cafe',
        slug: 'fake-cafe-' + Date.now(),
        email: 'bot@mailinator.com',
        password: 'password123'
      })
    });
    assert.equal(regDisposable.status, 400);
    const regDispJson = await regDisposable.json();
    assert.equal(regDispJson.success, false);

    const regNonExistent = await fetch(`${baseUrl}/api/owner/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        shopName: 'Ghost Cafe',
        slug: 'ghost-cafe-' + Date.now(),
        email: 'ghost@nonexistent-domain-xyz-99999.com',
        password: 'password123'
      })
    });
    assert.equal(regNonExistent.status, 400);
    const regGhostJson = await regNonExistent.json();
    assert.equal(regGhostJson.success, false);
    assert.equal(regGhostJson.token, undefined);

    const loginNonExistent = await fetch(`${baseUrl}/api/owner/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'never-registered-99999@gmail.com',
        password: 'password123'
      })
    });
    assert.equal(loginNonExistent.status, 401);

    const token = signEmailVerifiedToken('verified@gmail.com');
    assert.ok(verifyEmailVerifiedToken(token, 'verified@gmail.com'));
    assert.equal(verifyEmailVerifiedToken(token, 'other@gmail.com'), null);

    const badOtpRes = await fetch(`${baseUrl}/api/owner/verify-email-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'verified@gmail.com', otp: '123' })
    });
    assert.equal(badOtpRes.status, 400);

    const unverifiedGmailReg = await fetch(`${baseUrl}/api/owner/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        shopName: 'Unverified Gmail Shop',
        slug: 'unverified-gmail-' + Date.now(),
        email: 'aivinay164123068@gmail.com',
        password: 'password123'
      })
    });
    const unverifiedJson = await unverifiedGmailReg.json();
    assert.equal(unverifiedJson.token, undefined);
    assert.ok([202, 400, 429].includes(unverifiedGmailReg.status));
  } finally {
    await new Promise((resolve) => srv.close(resolve));
  }
});

test('WhatsApp normalization and safe URL builder', () => {
  assert.equal(normalizeWhatsAppNumber('+91 98765 43210'), '919876543210');
  assert.equal(normalizeWhatsAppNumber('9876543210'), '919876543210');
  assert.equal(normalizeWhatsAppNumber(''), '');
  assert.equal(normalizeWhatsAppNumber('12345'), null);

  const url = buildWhatsAppUrl('+919876543210', 'Hi Shop, I started my card!');
  assert.equal(url, 'https://wa.me/919876543210?text=Hi%20Shop%2C%20I%20started%20my%20card!');
  assert.equal(buildWhatsAppUrl('invalid', 'Hello'), '');
});

test('6-digit reward code generation and single-use owner verification flow', async () => {
  const code = generateRedeemCode();
  assert.match(code, /^\d{6}$/, 'Redeem code must be exactly 6 digits');

  const { app } = require('../server');
  const db = loadLocalDb();
  const ownerId = 'owner_wa_test_' + Date.now();
  const shopSlug = 'wa-redeem-test-' + Date.now();
  const custEmail = 'rewardcust@gmail.com';

  db.owners['owner_wa@gmail.com'] = { id: ownerId, email: 'owner_wa@gmail.com', shopSlug };
  db.shops[shopSlug] = {
    id: 'shop_wa_' + Date.now(),
    ownerId,
    name: 'Test Mocha',
    slug: shopSlug,
    stampsTarget: 2,
    rewardDescription: '1 Free Coffee',
    cooldownHours: 0,
    whatsappNumber: '919876543210',
    secretKey: 'test_secret'
  };
  db.customerCards[`${shopSlug}_${custEmail}`] = {
    id: 'card_wa_1',
    shopSlug,
    shopId: db.shops[shopSlug].id,
    email: custEmail,
    phone: custEmail,
    name: 'Test Customer',
    stamps: 2,
    completedCards: 0,
    completed_cards: 0
  };

  const claim = await createOrGetPendingRewardClaim({
    shop: db.shops[shopSlug],
    cardId: 'card_wa_1',
    customerIdentifier: custEmail,
    customerName: 'Test Customer'
  });
  assert.match(claim.code, /^\d{6}$/);

  const srv = await new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  const baseUrl = `http://127.0.0.1:${srv.address().port}`;

  try {
    // Public shop info exposes whatsappNumber
    const infoRes = await fetch(`${baseUrl}/api/shop/${shopSlug}/info`);
    const infoJson = await infoRes.json();
    assert.equal(infoRes.status, 200);
    assert.equal(infoJson.shop.whatsappNumber, '919876543210');

    // Customer JWT cannot verify owner reward code
    const custToken = signUserAccessToken({ userId: 'cust_1', email: custEmail, role: 'customer' });
    const unauthRes = await fetch(`${baseUrl}/api/owner/redeem/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${custToken}` },
      body: JSON.stringify({ code: claim.code, shopSlug })
    });
    assert.equal(unauthRes.status, 401);

    // Wrong 6-digit code fails
    const ownerToken = signUserAccessToken({ userId: ownerId, email: 'owner_wa@gmail.com', role: 'owner' });
    const wrongCode = claim.code === '123456' ? '654321' : '123456';
    const wrongRes = await fetch(`${baseUrl}/api/owner/redeem/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerToken}` },
      body: JSON.stringify({ code: wrongCode, shopSlug })
    });
    assert.equal(wrongRes.status, 400);

    // Valid 6-digit code succeeds once, resets stamps to 0, increments completedCards
    const okRes = await fetch(`${baseUrl}/api/owner/redeem/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerToken}` },
      body: JSON.stringify({ code: claim.code, shopSlug })
    });
    const okJson = await okRes.json();
    assert.equal(okRes.status, 200);
    assert.equal(okJson.success, true);
    assert.equal(db.customerCards[`${shopSlug}_${custEmail}`].stamps, 0);
    assert.equal(db.customerCards[`${shopSlug}_${custEmail}`].completedCards, 1);

    // Replay of the same 6-digit code is rejected
    const replayRes = await fetch(`${baseUrl}/api/owner/redeem/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerToken}` },
      body: JSON.stringify({ code: claim.code, shopSlug })
    });
    assert.equal(replayRes.status, 400);
  } finally {
    delete db.shops[shopSlug];
    delete db.owners['owner_wa@gmail.com'];
    delete db.customerCards[`${shopSlug}_${custEmail}`];
    await new Promise((resolve) => srv.close(resolve));
  }
});

test('Single Google account cannot register multiple shops or create-shop duplicates', async () => {
  const { execFileSync } = require('child_process');
  const script = `
    const assert = require('node:assert/strict');
    const { app, loadLocalDb } = require('./server');
    (async () => {
      const email = 'single_google_' + Date.now() + '@gmail.com';
      const sub = 'sub_' + Date.now();
      const slug1 = 'first-shop-' + Date.now();
      const slug2 = 'second-shop-' + Date.now();
      const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
      const payload = Buffer.from(JSON.stringify({ sub, email, email_verified: true, name: 'Single Owner' })).toString('base64url');
      const fakeGoogleJwt = header + '.' + payload + '.sig';

      const srv = await new Promise((resolve) => {
        const s = app.listen(0, '127.0.0.1', () => resolve(s));
      });
      const baseUrl = 'http://127.0.0.1:' + srv.address().port;
      const db = loadLocalDb();

      try {
        const firstRes = await fetch(baseUrl + '/api/auth/google/owner', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ credential: fakeGoogleJwt, shopName: 'First Shop', slug: slug1, mode: 'register' })
        });
        const firstJson = await firstRes.json();
        assert.equal(firstRes.status, 200);
        assert.equal(firstJson.success, true);

        const dupRes = await fetch(baseUrl + '/api/auth/google/owner', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ credential: fakeGoogleJwt, shopName: 'Second Shop', slug: slug2, mode: 'register' })
        });
        const dupJson = await dupRes.json();
        assert.equal(dupRes.status, 409);
        assert.equal(dupJson.code, 'GOOGLE_ACCOUNT_ALREADY_REGISTERED');

        const createRes = await fetch(baseUrl + '/api/owner/create-shop', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + firstJson.token },
          body: JSON.stringify({ name: 'Second Shop', slug: slug2 })
        });
        assert.equal(createRes.status, 409);

        const loginRes = await fetch(baseUrl + '/api/auth/google/owner', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ credential: fakeGoogleJwt })
        });
        const loginJson = await loginRes.json();
        assert.equal(loginRes.status, 200);
        assert.equal(loginJson.isNew, false);
        assert.equal(loginJson.shop.slug, slug1);

        // 5. Customer auth with both supabaseToken and QR token uses supabaseToken for auth
        const custJwtPayload = Buffer.from(JSON.stringify({ sub: 'cust_' + Date.now(), email: 'cust_' + email, email_verified: true, name: 'Cust' })).toString('base64url');
        const custGoogleJwt = header + '.' + custJwtPayload + '.sig';
        const custRes = await fetch(baseUrl + '/api/auth/google/customer', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ supabaseToken: custGoogleJwt, token: 'qr_token_not_jwt', shopSlug: slug1 })
        });
        const custJson = await custRes.json();
        assert.equal(custRes.status, 200);
        assert.equal(custJson.success, true);

        // 6. Security checks: Apple spoofing, unauthenticated claim-stamp, unauthenticated pass lookup, unverified paid plan
        const appleSpoofRes = await fetch(baseUrl + '/api/auth/google/customer', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ provider: 'apple', email: 'victim@gmail.com', shopSlug: slug1 })
        });
        assert.equal(appleSpoofRes.status, 401);

        const rawClaimRes = await fetch(baseUrl + '/api/claim-stamp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ shopSlug: slug1, phone: '+919999999999', token: 'fake_qr' })
        });
        assert.equal(rawClaimRes.status, 401);

        const unauthCardRes = await fetch(baseUrl + '/api/customer/' + slug1 + '/' + encodeURIComponent('cust_' + email));
        assert.equal(unauthCardRes.status, 401);

        const paidPlanRes = await fetch(baseUrl + '/api/owner/subscription/select', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + firstJson.token },
          body: JSON.stringify({ plan: 'yearly', paymentReference: 'fake_ref' })
        });
        assert.equal(paidPlanRes.status, 402);
      } finally {
        delete db.shops[slug1];
        delete db.shops[slug2];
        delete db.owners[email];
        delete db.users[email];
        await new Promise((resolve) => srv.close(resolve));
      }
    })().catch((err) => { console.error(err); process.exit(1); });
  `;
  execFileSync(process.execPath, ['-e', script], {
    cwd: path.join(__dirname, '..'),
    env: { ...process.env, NODE_ENV: 'test', DISABLE_SUPABASE_FOR_TEST: '1' },
    stdio: 'pipe'
  });
});
