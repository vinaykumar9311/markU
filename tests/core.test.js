const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const {
  generateShopQrToken,
  validateShopQrToken,
  signOwnerToken,
  verifyOwnerToken,
  signCustomerOtpToken,
  verifyCustomerOtpToken,
  hashPassword,
  verifyPassword
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
