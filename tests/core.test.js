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
  signCustomerOtpToken,
  verifyCustomerOtpToken,
  hashPassword,
  verifyPassword,
  normalizePhoneNumber,
  matchPhone
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
