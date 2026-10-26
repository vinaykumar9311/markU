require('dotenv').config();
const express = require('express');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const QRCode = require('qrcode');
const os = require('os');
const { createClient } = require('@supabase/supabase-js');
const { initializeApp, cert } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 3000;
const QR_LIFETIME_MS = (parseInt(process.env.QR_LIFETIME_MINUTES, 10) || 5) * 60 * 1000;
const IS_PROD = process.env.NODE_ENV === 'production';
if (IS_PROD && (!process.env.APP_SECRET || process.env.APP_SECRET.length < 32)) {
  console.error('[FATAL] APP_SECRET must be set to a random string of at least 32 characters in production.');
  process.exit(1);
}
const GLOBAL_SECRET = process.env.APP_SECRET || 'loyalty_master_secret_' + crypto.randomBytes(16).toString('hex');

// Constant-time string comparison that is safe for unequal lengths
function safeEqual(a, b) {
  const ba = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

// Discover Wi-Fi / LAN IP
function getLanIp() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    if (name.toLowerCase().includes('wi-fi') || name.toLowerCase().includes('wireless')) {
      for (const iface of interfaces[name]) {
        if (iface.family === 'IPv4' && !iface.internal) return iface.address;
      }
    }
  }
  for (const name of Object.keys(interfaces)) {
    if (name.toLowerCase().includes('virtual') || name.toLowerCase().includes('vethernet') || name.toLowerCase().includes('vbox') || name.toLowerCase().includes('wsl')) continue;
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal && !iface.address.startsWith('169.254')) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}
const LAN_IP = getLanIp();

// --------------------------------------------------------------------
// 1. SUPABASE CLIENT INITIALIZATION
// --------------------------------------------------------------------
let supabase = null;
if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
  try {
    supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false }
    });
    console.log('[Supabase] Multi-tenant client connected.');
  } catch (err) {
    console.error('[Supabase] Init error:', err.message);
  }
} else {
  console.log('[Supabase] Notice: Credentials not found in .env. Running in local multi-tenant test mode.');
}

// Local persistent store fallback (with safe in-memory cache)
const LOCAL_DB_FILE = path.join(__dirname, 'database.json');
let memoryDb = null;

function loadLocalDb() {
  if (memoryDb) return memoryDb;
  try {
    if (!fs.existsSync(LOCAL_DB_FILE)) {
      const init = { shops: {}, owners: {}, customerCards: {}, usedTokens: {}, history: [] };
      try {
        fs.writeFileSync(LOCAL_DB_FILE, JSON.stringify(init, null, 2));
      } catch (writeErr) {
        // Ephemeral or permission-restricted environment (Render/Docker)
      }
      memoryDb = init;
      return memoryDb;
    }
    const data = JSON.parse(fs.readFileSync(LOCAL_DB_FILE, 'utf8'));
    if (!data.shops) data.shops = {};
    if (!data.owners) data.owners = {};
    if (!data.customerCards) data.customerCards = {};
    if (!data.usedTokens) data.usedTokens = {};
    if (!data.history) data.history = [];
    memoryDb = data;
    return memoryDb;
  } catch (err) {
    if (!memoryDb) {
      memoryDb = { shops: {}, owners: {}, customerCards: {}, usedTokens: {}, history: [] };
    }
    return memoryDb;
  }
}

function saveLocalDb(data) {
  memoryDb = data;
  try {
    fs.writeFileSync(LOCAL_DB_FILE, JSON.stringify(data, null, 2));
  } catch (err) {
    // In-memory state remains intact even if container disk is read-only
  }
}

// --------------------------------------------------------------------
// 2. FIREBASE AUTHENTICATION (CUSTOMER SMS OTP)
// --------------------------------------------------------------------
let firebaseInitialized = false;
let firebaseAuth = null;
const firebaseKeyPath = path.resolve(process.env.FIREBASE_SERVICE_ACCOUNT_PATH || './serviceAccountKey.json');

try {
  let serviceAccount = null;
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    try {
      const decoded = process.env.FIREBASE_SERVICE_ACCOUNT_JSON.startsWith('{')
        ? process.env.FIREBASE_SERVICE_ACCOUNT_JSON
        : Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_JSON, 'base64').toString('utf8');
      serviceAccount = JSON.parse(decoded);
    } catch (parseErr) {
      console.error('[Firebase] Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON:', parseErr.message);
    }
  } else if (fs.existsSync(firebaseKeyPath)) {
    serviceAccount = require(firebaseKeyPath);
  }

  if (serviceAccount) {
    const fbApp = initializeApp({ credential: cert(serviceAccount) });
    firebaseAuth = getAuth(fbApp);
    firebaseInitialized = true;
    console.log(`[Firebase] Admin initialized for customer Phone OTP (Project: ${serviceAccount.project_id || 'active'}).`);
  }
} catch (err) {
  console.error('[Firebase] Init error:', err.message);
}

// Google Public X.509 Certificates Cache for Firebase ID Token Verification Fallback
let googlePublicCertsCache = null;
let googlePublicCertsExpiresAt = 0;

async function getGooglePublicCerts() {
  const now = Date.now();
  if (googlePublicCertsCache && now < googlePublicCertsExpiresAt) {
    return googlePublicCertsCache;
  }
  try {
    const res = await fetch('https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const cacheControl = res.headers.get('cache-control') || '';
    const maxAgeMatch = cacheControl.match(/max-age=(\d+)/);
    const ttlSeconds = maxAgeMatch ? parseInt(maxAgeMatch[1], 10) : 3600;
    googlePublicCertsCache = await res.json();
    googlePublicCertsExpiresAt = now + (ttlSeconds * 1000);
    return googlePublicCertsCache;
  } catch (err) {
    console.error('[Firebase] Failed to fetch Google public certs:', err.message);
    return googlePublicCertsCache;
  }
}

async function verifyFirebaseTokenWithPublicKeys(idToken) {
  if (!idToken || typeof idToken !== 'string') return { success: false, reason: 'Missing or invalid token string' };
  const parts = idToken.split('.');
  if (parts.length !== 3) return { success: false, reason: 'Malformed JWT structure' };

  try {
    const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8'));
    if (header.alg !== 'RS256' || !header.kid) {
      return { success: false, reason: 'Invalid token header algorithm or missing key ID' };
    }

    let certs = await getGooglePublicCerts();
    if (!certs || !certs[header.kid]) {
      googlePublicCertsExpiresAt = 0;
      certs = await getGooglePublicCerts();
    }

    if (!certs || !certs[header.kid]) {
      return { success: false, reason: 'Public certificate not found for token key ID' };
    }

    const cert = certs[header.kid];
    const verifier = crypto.createVerify('RSA-SHA256');
    verifier.update(`${parts[0]}.${parts[1]}`);
    const isValid = verifier.verify(crypto.createPublicKey(cert), Buffer.from(parts[2], 'base64url'));
    if (!isValid) {
      return { success: false, reason: 'Invalid token cryptographic signature' };
    }

    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
    const nowSec = Math.floor(Date.now() / 1000);

    if (payload.exp && payload.exp < nowSec) {
      return { success: false, reason: 'Firebase token has expired' };
    }
    if (payload.auth_time && payload.auth_time > nowSec + 300) {
      return { success: false, reason: 'Firebase token auth_time is in the future' };
    }

    const expectedProjectId = process.env.PUBLIC_FIREBASE_PROJECT_ID || 'marku-f73a1';
    if (payload.aud !== expectedProjectId) {
      return { success: false, reason: `Token audience (${payload.aud}) does not match project (${expectedProjectId})` };
    }
    if (payload.iss !== `https://securetoken.google.com/${expectedProjectId}`) {
      return { success: false, reason: `Token issuer (${payload.iss}) does not match expected project issuer` };
    }
    if (!payload.sub || typeof payload.sub !== 'string') {
      return { success: false, reason: 'Token contains invalid subject (UID)' };
    }

    return {
      success: true,
      uid: payload.sub,
      phone: payload.phone_number || null,
      email: payload.email || null,
      name: payload.name || null
    };
  } catch (err) {
    return { success: false, reason: `Token verification error: ${err.message}` };
  }
}

async function verifyFirebaseToken(idToken) {
  if (firebaseInitialized && firebaseAuth) {
    try {
      const decoded = await firebaseAuth.verifyIdToken(idToken);
      return {
        success: true,
        uid: decoded.uid,
        phone: decoded.phone_number || null,
        email: decoded.email || null,
        name: decoded.name || null
      };
    } catch (err) {
      console.warn('[Firebase] Admin SDK verification failed, attempting public key verification:', err.message);
    }
  }
  return await verifyFirebaseTokenWithPublicKeys(idToken);
}


app.set('trust proxy', 1);
// CSP is disabled for now because the frontend uses inline scripts / CDN assets (tracked in plan, Phase 1).
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(express.static(path.join(__dirname, 'public')));

const limiterOpts = { standardHeaders: true, legacyHeaders: false };
app.use('/api', rateLimit({ ...limiterOpts, windowMs: 60 * 1000, limit: 300, message: { success: false, message: 'Too many requests. Slow down.' } }));
app.use(['/api/owner/login', '/api/owner/register', '/api/customer/verify-otp', '/api/customer/send-otp'],
  rateLimit({ ...limiterOpts, windowMs: 15 * 60 * 1000, limit: 20, message: { success: false, message: 'Too many attempts. Try again in 15 minutes.' } }));
app.use('/api/claim-stamp', rateLimit({ ...limiterOpts, windowMs: 60 * 1000, limit: 20, message: { success: false, message: 'Too many scan attempts. Please wait a minute.' } }));

// Health Check for Render, Docker & monitoring
app.get('/health', (req, res) => {
  return res.status(200).json({ status: 'ok', uptime: process.uptime(), timestamp: Date.now() });
});

app.get('/ready', (req, res) => {
  const isDbReady = !!supabase;
  const isFirebaseReady = firebaseInitialized || !!(process.env.PUBLIC_FIREBASE_PROJECT_ID || process.env.PUBLIC_FIREBASE_API_KEY);
  return res.status(200).json({
    ready: true,
    supabaseConnected: isDbReady,
    firebaseConnected: isFirebaseReady,
    firebaseAuthMode: firebaseInitialized ? 'admin-sdk' : 'public-jwt-verification'
  });
});

// Endpoint providing Firebase Client Config to frontend (scan.html)
app.get('/api/config/firebase', (req, res) => {
  const isConfigured = !!(process.env.PUBLIC_FIREBASE_API_KEY && !process.env.PUBLIC_FIREBASE_API_KEY.includes('...'));
  return res.json({
    isConfigured,
    apiKey: process.env.PUBLIC_FIREBASE_API_KEY || '',
    authDomain: process.env.PUBLIC_FIREBASE_AUTH_DOMAIN || '',
    projectId: process.env.PUBLIC_FIREBASE_PROJECT_ID || '',
    storageBucket: process.env.PUBLIC_FIREBASE_STORAGE_BUCKET || '',
    messagingSenderId: process.env.PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
    appId: process.env.PUBLIC_FIREBASE_APP_ID || ''
  });
});

const bcrypt = require('bcryptjs');

function hashPassword(pass) {
  return bcrypt.hashSync(String(pass).trim(), 10);
}

function verifyPassword(candidate, storedHash) {
  if (!storedHash) return false;
  // If stored as bcrypt hash
  if (storedHash.startsWith('$2a$') || storedHash.startsWith('$2b$')) {
    return bcrypt.compareSync(String(candidate).trim(), storedHash);
  }
  // Legacy HMAC check
  const legacyHash = crypto.createHmac('sha256', GLOBAL_SECRET).update(String(candidate).trim()).digest('hex');
  return safeEqual(legacyHash, storedHash);
}


function normalizePhoneNumber(raw) {
  if (!raw) return '';
  let digits = String(raw).replace(/[^0-9]/g, '');
  if (digits.length === 10) return '+91' + digits;
  if (digits.length === 12 && digits.startsWith('91')) return '+' + digits;
  if (digits.startsWith('0') && digits.length === 11) return '+91' + digits.slice(1);
  return digits.startsWith('+') ? digits : '+' + digits;
}

async function resolveShopBySlug(rawSlug) {
  const slug = (rawSlug || 'default').toLowerCase().trim();
  let shop = null;

  if (supabase) {
    try {
      const { data, error } = await supabase.from('shops').select('*').eq('slug', slug).maybeSingle();
      if (error) {
        console.warn('[Supabase] resolveShopBySlug error:', error.message);
      }
      if (data) shop = data;
    } catch (e) {
      console.warn('[Supabase] resolveShopBySlug exception:', e.message);
    }
  }

  if (!shop) {
    const db = loadLocalDb();
    if (db && db.shops && db.shops[slug]) {
      shop = db.shops[slug];
    }
  }

  // Strict resolution only: an unknown slug must never resolve to another tenant's shop.

  return shop;
}

// Dynamic Single-Use QR Token Helpers per Shop
function generateShopQrToken(shopSecret) {
  const now = Date.now();
  const nonce = crypto.randomBytes(4).toString('hex');
  const payload = `${now}_${nonce}`;
  const hash = crypto.createHmac('sha256', shopSecret || GLOBAL_SECRET)
    .update(payload)
    .digest('hex')
    .slice(0, 16);
  
  const expiresAt = now + QR_LIFETIME_MS;
  return {
    token: `${payload}.${hash}`,
    expiresAt,
    remainingSeconds: Math.floor(QR_LIFETIME_MS / 1000)
  };
}

function validateShopQrToken(token, shopSecret) {
  if (!token || typeof token !== 'string') return { valid: false, reason: 'Missing token' };
  const parts = token.split('.');
  if (parts.length !== 2) return { valid: false, reason: 'Malformed token' };

  const [payload, clientHash] = parts;
  const timestampStr = payload.split('_')[0];
  const timestamp = parseInt(timestampStr, 10);
  if (isNaN(timestamp)) return { valid: false, reason: 'Invalid timestamp' };

  const expectedHash = crypto.createHmac('sha256', shopSecret || GLOBAL_SECRET)
    .update(payload)
    .digest('hex')
    .slice(0, 16);

  if (!safeEqual(clientHash, expectedHash)) {
    return { valid: false, reason: 'Counterfeit or tampered QR code' };
  }

  const now = Date.now();
  if (now > timestamp + QR_LIFETIME_MS + 10000) {
    return { valid: false, reason: 'QR Code expired (>5 minutes). Screenshots are rejected. Scan live counter code.' };
  }
  return { valid: true, windowStart: timestamp };
}

function getPublicTunnelUrl() {
  const tunnelFile = path.join(__dirname, 'tunnel_url.txt');
  if (fs.existsSync(tunnelFile)) {
    try {
      const url = fs.readFileSync(tunnelFile, 'utf8').trim();
      if (url && url.startsWith('http')) return url;
    } catch {}
  }
  return null;
}

// --------------------------------------------------------------------
// 3. SHOP OWNER AUTHENTICATION & REGISTRATION
// --------------------------------------------------------------------

// Helper for Owner JWT / Session Tokens
function signOwnerToken(ownerId, email, phone = null) {
  const payload = Buffer.from(JSON.stringify({ ownerId, email, phone, exp: Date.now() + 7 * 86400000 })).toString('base64url');
  const sig = crypto.createHmac('sha256', GLOBAL_SECRET).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

function verifyOwnerToken(tokenStr) {
  if (!tokenStr || typeof tokenStr !== 'string') return null;
  const parts = tokenStr.split('.');
  if (parts.length !== 2) return null;
  const [payloadBase64, clientSig] = parts;
  const expectedSig = crypto.createHmac('sha256', GLOBAL_SECRET).update(payloadBase64).digest('base64url');
  if (!safeEqual(clientSig, expectedSig)) return null;
  try {
    const payload = JSON.parse(Buffer.from(payloadBase64, 'base64url').toString('utf8'));
    if (Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

// Register New Shop Owner (Phone / Firebase OTP or Email)
app.post('/api/owner/register', async (req, res) => {
  const { phone, firebaseIdToken, email, password, shopName, slug, rewardDescription, stampsTarget, cooldownHours } = req.body;
  if (!shopName || !shopName.trim()) {
    return res.status(400).json({ success: false, message: 'Shop name is required.' });
  }

  let verifiedPhone = null;
  let ownerEmail = null;

  // Phone identity is accepted ONLY from a verified Firebase ID token. A raw `phone` field is ignored.
  if (firebaseIdToken) {
    if (!firebaseInitialized) {
      return res.status(503).json({ success: false, message: 'Phone verification is not available right now.' });
    }
    const authResult = await verifyFirebaseToken(firebaseIdToken);
    if (!authResult.success || !authResult.phone) {
      return res.status(401).json({ success: false, message: 'Invalid phone OTP verification.' });
    }
    verifiedPhone = authResult.phone;
  }

  if (verifiedPhone) {
    const cleanDigits = verifiedPhone.replace(/[^0-9]/g, '');
    ownerEmail = email ? email.trim().toLowerCase() : `${cleanDigits}@owner.marku.local`;
  } else if (email && email.trim() && password && password.trim()) {
    ownerEmail = email.trim().toLowerCase();
  } else {
    return res.status(400).json({ success: false, message: 'Mobile number (with OTP) or email and password required.' });
  }

  const db = loadLocalDb();

  // 1. Enforce Strict Account Uniqueness (1 Phone = 1 Shop Account)
  if (verifiedPhone) {
    const cleanDigits = verifiedPhone.replace(/[^0-9]/g, '');
    const existingPhoneOwner = db.owners[verifiedPhone] || Object.values(db.owners).find(o => 
      (o.phone && o.phone.replace(/[^0-9]/g, '') === cleanDigits) ||
      (o.email && o.email.startsWith(cleanDigits))
    );
    if (existingPhoneOwner) {
      return res.status(409).json({
        success: false,
        message: `An account already exists for ${verifiedPhone}. Each mobile number can only register one shop. Please sign in.`
      });
    }
  }

  if (ownerEmail && db.owners[ownerEmail]) {
    return res.status(409).json({
      success: false,
      message: 'This email address is already registered to a shop. Please sign in.'
    });
  }

  const cleanSlug = (slug || shopName).toLowerCase().trim().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-');
  if (db.shops[cleanSlug]) {
    return res.status(409).json({
      success: false,
      message: `The shop URL slug "/shop/${cleanSlug}" is already taken. Please choose another slug.`
    });
  }

  const shopSecret = crypto.randomBytes(32).toString('hex');
  const cooldown = parseFloat(cooldownHours) || 7;
  const targetStamps = parseInt(stampsTarget, 10) || 10;
  const ownerPassword = (password && password.trim()) ? password.trim() : `P_${crypto.randomBytes(8).toString('hex')}`;

  // Supabase Auth + Database
  if (supabase) {
    try {
      const { data: existingSlug } = await supabase.from('shops').select('id, name, slug').eq('slug', cleanSlug).maybeSingle();
      if (existingSlug) {
        return res.status(409).json({ success: false, message: `The shop URL slug "/shop/${cleanSlug}" is already taken. Choose another slug.` });
      }
      // 1. Create Supabase Auth User
      let userId = null;
      let sessionToken = null;

      if (supabase.auth.admin) {
        try {
          const { data: adminData } = await supabase.auth.admin.createUser({
            email: ownerEmail,
            password: ownerPassword,
            email_confirm: true
          });
          if (adminData && adminData.user) userId = adminData.user.id;
        } catch (e) {}
      }

      if (!userId) {
        const { data: signData, error: signErr } = await supabase.auth.signUp({
          email: ownerEmail,
          password: ownerPassword
        });
        if (signErr) {
          if (signErr.message.includes('rate limit')) {
            console.warn('[Register] Supabase email rate limit reached. Proceeding with secure application auth.');
            userId = crypto.randomUUID();
          } else if (!signErr.message.includes('already registered')) {
            // If phone user, fallback to random UUID
            userId = crypto.randomUUID();
          }
        }
        if (signData && signData.user) {
          userId = signData.user.id;
          if (signData.session) sessionToken = signData.session.access_token;
        }
      }

      if (!userId) {
        userId = crypto.randomUUID();
      }

      // Generate signed app token so owner can log in immediately
      const token = sessionToken || signOwnerToken(userId, ownerEmail, verifiedPhone);

      // 2. Insert into shops table
      const trialEndsAt = new Date(Date.now() + 7 * 86400000).toISOString();
      const { data: shop, error: shopErr } = await supabase
        .from('shops')
        .insert({
          owner_id: userId,
          name: shopName.trim(),
          slug: cleanSlug,
          reward_description: rewardDescription?.trim() || '1 Free Item',
          cooldown_hours: cooldown,
          stamps_target: targetStamps,
          secret_key: shopSecret,
          subscription_plan: 'trial',
          subscription_status: 'active',
          subscription_ends_at: trialEndsAt
        })
        .select()
        .single();

      if (shopErr) {
        if (shopErr.code === '23505') {
          return res.status(409).json({ success: false, message: 'Shop URL slug already taken. Choose another slug.' });
        }
        return res.status(400).json({ success: false, message: shopErr.message });
      }

      // Record in local cache
      const db = loadLocalDb();
      const ownerRecord = {
        id: userId,
        phone: verifiedPhone || null,
        email: ownerEmail,
        passwordHash: hashPassword(ownerPassword),
        shopSlug: cleanSlug,
        createdAt: Date.now()
      };
      db.owners[ownerEmail] = ownerRecord;
      if (verifiedPhone) {
        db.owners[verifiedPhone] = ownerRecord;
      }
      db.shops[cleanSlug] = {
        id: shop.id,
        ownerId: userId,
        name: shop.name,
        slug: shop.slug,
        rewardDescription: shop.reward_description,
        cooldownHours: shop.cooldown_hours,
        stampsTarget: shop.stamps_target || targetStamps,
        secretKey: shop.secret_key
      };
      saveLocalDb(db);

      return res.json({
        success: true,
        message: 'Shop owner registered successfully!',
        token,
        shop: { id: shop.id, name: shop.name, slug: shop.slug, rewardDescription: shop.reward_description, stampsTarget: targetStamps }
      });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  // Local fallback
  if (db.owners[ownerEmail] || (verifiedPhone && db.owners[verifiedPhone])) {
    return res.status(409).json({ success: false, message: 'Owner already registered with this mobile number or email.' });
  }
  if (db.shops[cleanSlug]) {
    return res.status(409).json({ success: false, message: 'Shop slug already taken. Choose another.' });
  }

  const ownerId = 'owner_' + Date.now();
  const ownerRecord = {
    id: ownerId,
    phone: verifiedPhone || null,
    email: ownerEmail,
    passwordHash: hashPassword(ownerPassword),
    shopSlug: cleanSlug,
    createdAt: Date.now()
  };
  db.owners[ownerEmail] = ownerRecord;
  if (verifiedPhone) {
    db.owners[verifiedPhone] = ownerRecord;
  }
  db.shops[cleanSlug] = {
    id: 'shop_' + Date.now(),
    ownerId,
    name: shopName.trim(),
    slug: cleanSlug,
    rewardDescription: rewardDescription?.trim() || '1 Free Item',
    cooldownHours: cooldown,
    stampsTarget: targetStamps,
    secretKey: shopSecret,
    createdAt: Date.now()
  };
  saveLocalDb(db);

  return res.json({
    success: true,
    message: 'Shop registered successfully!',
    token: signOwnerToken(ownerId, ownerEmail, verifiedPhone),
    shop: { name: shopName, slug: cleanSlug, stampsTarget: targetStamps }
  });
});

// Shop Owner Login (Supports Phone / Firebase OTP OR Email + Password)
app.post('/api/owner/login', async (req, res) => {
  const { phone, firebaseIdToken, email, password } = req.body;

  let verifiedPhone = null;
  // Phone login requires a verified Firebase ID token. A raw `phone` field never authenticates.
  if (firebaseIdToken) {
    if (!firebaseInitialized) {
      return res.status(503).json({ success: false, message: 'Phone verification is not available right now.' });
    }
    const authResult = await verifyFirebaseToken(firebaseIdToken);
    if (!authResult.success || !authResult.phone) {
      return res.status(401).json({ success: false, message: 'Invalid phone OTP verification.' });
    }
    verifiedPhone = authResult.phone;
  }

  // 1. Phone Login Flow
  if (verifiedPhone) {
    const db = loadLocalDb();
    const cleanDigits = verifiedPhone.replace(/[^0-9]/g, '');
    const owner = db.owners[verifiedPhone] || Object.values(db.owners).find(o => o.phone === verifiedPhone || (o.email && o.email.startsWith(cleanDigits)));

    if (!owner) {
      return res.status(404).json({ success: false, message: 'No registered shop found for this mobile number. Please enroll your shop first.' });
    }

    let shop = null;
    if (supabase) {
      try {
        const { data: s } = await supabase.from('shops').select('*').eq('owner_id', owner.id).maybeSingle();
        shop = s;
        if (!shop && owner.shopSlug) {
          const { data: sSlug } = await supabase.from('shops').select('*').eq('slug', owner.shopSlug).maybeSingle();
          shop = sSlug;
        }
      } catch (e) {}
    }
    if (!shop) shop = db.shops[owner.shopSlug];

    return res.json({
      success: true,
      token: signOwnerToken(owner.id, owner.email, verifiedPhone),
      shop: shop ? { id: shop.id, name: shop.name, slug: shop.slug, rewardDescription: shop.reward_description || shop.rewardDescription, stampsTarget: shop.stamps_target || shop.stampsTarget || 10 } : null
    });
  }

  // 2. Email + Password Login Flow
  if (!email || !password) return res.status(400).json({ success: false, message: 'Mobile number with OTP OR Email & Password required.' });

  const cleanEmail = email.trim().toLowerCase();

  if (supabase) {
    try {
      // 1. Try Supabase Auth Login
      const { data: sessionData, error: logErr } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: password.trim()
      });

      if (!logErr && sessionData && sessionData.user) {
        const { data: shop } = await supabase
          .from('shops')
          .select('*')
          .eq('owner_id', sessionData.user.id)
          .maybeSingle();

        return res.json({
          success: true,
          token: sessionData.session ? sessionData.session.access_token : signOwnerToken(sessionData.user.id, cleanEmail),
          shop: shop || null
        });
      }

      // 2. If Supabase gave "Email not confirmed", bypass via signed token using owner's shop record
      const db = loadLocalDb();
      const localOwner = db.owners[cleanEmail];
      if (localOwner && verifyPassword(password, localOwner.passwordHash)) {
        if (!localOwner.passwordHash.startsWith('$2')) {
          localOwner.passwordHash = hashPassword(password);
          saveLocalDb(db);
        }
        const { data: shop } = await supabase
          .from('shops')
          .select('*')
          .eq('owner_id', localOwner.id)
          .maybeSingle();

        const activeShop = shop || db.shops[localOwner.shopSlug];
        return res.json({
          success: true,
          token: signOwnerToken(localOwner.id, cleanEmail),
          shop: activeShop || null
        });
      }

      // 3. Fallback: Check if password matches and user exists
      if (logErr) {
        if (logErr.message.includes('Email not confirmed')) {
          if (localOwner && verifyPassword(password, localOwner.passwordHash)) {
            return res.json({
              success: true,
              token: signOwnerToken(localOwner.id, cleanEmail),
              shop: db.shops[localOwner.shopSlug] || null
            });
          }
          return res.status(401).json({
            success: false,
            message: 'Email confirmation pending in Supabase. Check your email or disable "Confirm email" in Supabase Auth Settings.'
          });
        }
        return res.status(401).json({ success: false, message: logErr.message });
      }
    } catch (err) {
      console.error('[Login] Supabase error:', err.message);
    }
  }

  // Local fallback
  const db = loadLocalDb();
  const owner = db.owners[cleanEmail];
  if (!owner || !verifyPassword(password, owner.passwordHash)) {
    return res.status(401).json({ success: false, message: 'Invalid email or password.' });
  }
  if (!owner.passwordHash.startsWith('$2')) {
    owner.passwordHash = hashPassword(password);
    saveLocalDb(db);
  }
  const shop = db.shops[owner.shopSlug];
  return res.json({
    success: true,
    token: signOwnerToken(owner.id, cleanEmail),
    shop: shop ? { id: shop.id, name: shop.name, slug: shop.slug, rewardDescription: shop.rewardDescription, cooldownHours: shop.cooldownHours } : null
  });
});

// --------------------------------------------------------------------
// GOOGLE AUTH FOR SHOP OWNERS (100% Free Firebase Google Auth)
// --------------------------------------------------------------------
app.post('/api/owner/google-auth', async (req, res) => {
  const { firebaseIdToken, shopName, slug } = req.body;
  if (!firebaseIdToken) {
    return res.status(400).json({ success: false, message: 'Missing Google ID token.' });
  }

  const authResult = await verifyFirebaseToken(firebaseIdToken);
  if (!authResult.success || !authResult.email) {
    return res.status(401).json({ success: false, message: 'Google authentication failed: ' + (authResult.reason || 'Invalid token') });
  }

  const cleanEmail = authResult.email.trim().toLowerCase();
  let owner = null;
  let shop = null;

  if (supabase) {
    try {
      const { data: existingOwner } = await supabase.from('owners').select('*').eq('email', cleanEmail).maybeSingle();
      if (existingOwner) owner = existingOwner;
      if (owner) {
        const { data: ownerShop } = await supabase.from('shops').select('*').eq('owner_id', owner.id).maybeSingle();
        if (ownerShop) shop = ownerShop;
      }
    } catch (e) {}
  }

  if (!owner) {
    const db = loadLocalDb();
    if (db && db.owners && db.owners[cleanEmail]) {
      owner = db.owners[cleanEmail];
      if (owner.shopSlug && db.shops[owner.shopSlug]) shop = db.shops[owner.shopSlug];
    }
  }

  // 1. If owner already exists, sign them in immediately
  if (owner && shop) {
    const token = signOwnerToken(owner.id, cleanEmail, owner.phone || null);
    return res.json({
      success: true,
      token,
      owner: { id: owner.id, email: owner.email, phone: owner.phone },
      shop: { id: shop.id, name: shop.name, slug: shop.slug, rewardDescription: shop.reward_description || shop.rewardDescription },
      isNew: false
    });
  }

  // 2. If new owner and shop name is provided, register them automatically with 7-day free trial!
  if (shopName && shopName.trim()) {
    const ownerId = crypto.randomUUID();
    const finalSlug = (slug && slug.trim()) ? slug.trim().toLowerCase() : shopName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const shopSecret = crypto.randomBytes(32).toString('hex');
    const trialEndsAt = new Date(Date.now() + 7 * 86400000).toISOString();

    const newShop = {
      id: crypto.randomUUID(),
      owner_id: ownerId,
      name: shopName.trim(),
      slug: finalSlug,
      stamps_target: 10,
      reward_description: '1 Free Item',
      cooldown_hours: 12,
      secret_key: shopSecret,
      subscription_plan: 'trial',
      subscription_status: 'active',
      subscription_ends_at: trialEndsAt
    };

    if (supabase) {
      try {
        await supabase.from('owners').insert({ id: ownerId, email: cleanEmail, phone: authResult.phone || null, full_name: authResult.name || '' });
        const { data: createdShop, error: shopErr } = await supabase.from('shops').insert(newShop).select().single();
        if (createdShop) shop = createdShop;
      } catch (err) {
        console.error('[GoogleAuth] Supabase error:', err);
      }
    }

    const db = loadLocalDb();
    db.owners[cleanEmail] = { id: ownerId, email: cleanEmail, phone: authResult.phone || null, shopSlug: finalSlug };
    db.shops[finalSlug] = newShop;
    saveLocalDb(db);

    const token = signOwnerToken(ownerId, cleanEmail, authResult.phone || null);
    return res.json({
      success: true,
      token,
      owner: { id: ownerId, email: cleanEmail, phone: authResult.phone || null },
      shop: shop || newShop,
      isNew: true
    });
  }

  // 3. New owner needs to provide their shop name
  return res.json({
    success: true,
    needsShop: true,
    email: cleanEmail,
    name: authResult.name || ''
  });
});

// --------------------------------------------------------------------
// OWNER SUBSCRIPTION & BILLING ENDPOINTS
// --------------------------------------------------------------------
app.get('/api/owner/subscription', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Authorization required.' });
  }
  const verifiedToken = verifyOwnerToken(authHeader.split(' ')[1]);
  if (!verifiedToken) return res.status(401).json({ success: false, message: 'Invalid or expired session.' });

  let shop = null;
  if (supabase) {
    try {
      const { data } = await supabase.from('shops').select('*').eq('owner_id', verifiedToken.ownerId).maybeSingle();
      if (data) shop = data;
    } catch (e) {}
  }
  if (!shop) {
    const db = loadLocalDb();
    const owner = db.owners[verifiedToken.email];
    if (owner && owner.shopSlug) shop = db.shops[owner.shopSlug];
  }

  if (!shop) return res.status(404).json({ success: false, message: 'Shop profile not found.' });

  const endsAt = shop.subscription_ends_at || shop.subscriptionEndsAt || new Date(Date.now() + 7 * 86400000).toISOString();
  const endsMs = new Date(endsAt).getTime();
  const nowMs = Date.now();
  const diffDays = Math.max(0, Math.ceil((endsMs - nowMs) / 86400000));
  const isActive = endsMs > nowMs;

  return res.json({
    success: true,
    subscription: {
      plan: shop.subscription_plan || shop.subscriptionPlan || 'trial',
      status: isActive ? 'active' : 'expired',
      endsAt,
      daysRemaining: diffDays,
      pricing: {
        trial: { price: 0, days: 7, label: '1 Week Free Trial' },
        monthly: { price: 149, days: 30, label: 'Pro Monthly (₹149/mo)', link: process.env.PAYMENT_LINK_MONTHLY || 'https://rzp.io/l/marku-monthly' },
        yearly: { price: 999, days: 365, label: 'Growth Annual (₹999/yr)', link: process.env.PAYMENT_LINK_YEARLY || 'https://rzp.io/l/marku-yearly' }
      },
      supportWhatsApp: process.env.SUPPORT_WHATSAPP_NUMBER || '919311594509'
    }
  });
});

app.post('/api/owner/subscription/select', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Authorization required.' });
  }
  const verifiedToken = verifyOwnerToken(authHeader.split(' ')[1]);
  if (!verifiedToken) return res.status(401).json({ success: false, message: 'Invalid or expired session.' });

  const { plan, paymentReference } = req.body;
  if (!['trial', 'monthly', 'yearly'].includes(plan)) {
    return res.status(400).json({ success: false, message: 'Invalid plan selected.' });
  }

  let durationDays = 7;
  if (plan === 'monthly') durationDays = 30;
  if (plan === 'yearly') durationDays = 365;

  const newEndsAt = new Date(Date.now() + durationDays * 86400000).toISOString();

  if (supabase) {
    try {
      await supabase.from('shops').update({
        subscription_plan: plan,
        subscription_status: 'active',
        subscription_ends_at: newEndsAt,
        payment_reference: paymentReference || ''
      }).eq('owner_id', verifiedToken.ownerId);
    } catch (e) {}
  }

  const db = loadLocalDb();
  const owner = db.owners[verifiedToken.email];
  if (owner && owner.shopSlug && db.shops[owner.shopSlug]) {
    db.shops[owner.shopSlug].subscriptionPlan = plan;
    db.shops[owner.shopSlug].subscriptionStatus = 'active';
    db.shops[owner.shopSlug].subscriptionEndsAt = newEndsAt;
    saveLocalDb(db);
  }

  return res.json({
    success: true,
    message: `Plan updated to ${plan}! Valid for ${durationDays} days.`,
    plan,
    endsAt: newEndsAt,
    daysRemaining: durationDays
  });
});

// --------------------------------------------------------------------
// KIOSK REAL-TIME QR STATUS (STRICT 1-CUSTOMER-PER-QR AUTO REFRESH)
// --------------------------------------------------------------------
app.get('/api/shop/:slug/qr-status', async (req, res) => {
  const { token } = req.query;
  if (!token) return res.json({ success: true, used: false });

  let isUsed = false;
  if (supabase) {
    try {
      const { data } = await supabase.from('used_tokens').select('token').eq('token', token).maybeSingle();
      if (data) isUsed = true;
    } catch (e) {}
  }
  if (!isUsed) {
    const db = loadLocalDb();
    if (db && db.usedTokens && db.usedTokens[token]) isUsed = true;
  }

  return res.json({ success: true, used: isUsed });
});

// Protected Owner Dashboard Data (Row-Level Isolated Data Access)
app.get('/api/owner/dashboard', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Authorization token required.' });
  }
  const token = authHeader.split(' ')[1];

  let ownerId = null;

  // Check if token is our signed HMAC token
  const verifiedAppToken = verifyOwnerToken(token);
  if (verifiedAppToken) {
    ownerId = verifiedAppToken.ownerId;
  } else if (supabase) {
    // Check if token is Supabase JWT
    try {
      const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
      if (!authErr && user) ownerId = user.id;
    } catch (e) {}
  }

  if (!ownerId) {
    return res.status(401).json({ success: false, message: 'Invalid or expired session. Please log in again.' });
  }

  const requestedSlug = (req.query.shop || req.query.slug || '').toLowerCase().trim();

  if (supabase) {
    try {
      // 2. Fetch ALL shops owned by this owner
      let { data: allShops } = await supabase.from('shops').select('*').eq('owner_id', ownerId).order('created_at', { ascending: false });
      if (!allShops) allShops = [];

      // Also merge any shops found in local cache for this owner
      const db = loadLocalDb();
      const localShops = Object.values(db.shops).filter(s => s.ownerId === ownerId);
      const shopMap = new Map();
      allShops.forEach(s => shopMap.set(s.slug, s));
      localShops.forEach(s => {
        if (!shopMap.has(s.slug)) {
          shopMap.set(s.slug, {
            id: s.id,
            owner_id: ownerId,
            name: s.name,
            slug: s.slug,
            reward_description: s.rewardDescription,
            cooldown_hours: s.cooldownHours,
            stamps_target: s.stampsTarget,
            google_review_url: s.googleReviewUrl || '',
            instagram_url: s.instagramUrl || ''
          });
        }
      });

      const combinedShops = Array.from(shopMap.values());

      if (combinedShops.length === 0) {
        return res.status(404).json({ success: false, message: 'No shops found for this owner.' });
      }

      // Determine the active shop
      let activeShop = null;
      if (requestedSlug) {
        activeShop = combinedShops.find(s => s.slug === requestedSlug || s.slug === requestedSlug.replace(/-+$/, ''));
      }
      if (!activeShop) {
        activeShop = combinedShops[0];
      }

      // 3. Fetch customer cards strictly for this selected shop!
      let { data: customerCards } = await supabase
        .from('customer_cards')
        .select('*')
        .eq('shop_id', activeShop.id)
        .order('updated_at', { ascending: false });

      // If customerCards is empty, check local cache for this specific shop
      if (!customerCards || customerCards.length === 0) {
        const localCards = Object.values(db.customerCards).filter(c => c.shopSlug === activeShop.slug || c.shopId === activeShop.id);
        if (localCards.length > 0) {
          customerCards = localCards.map(c => ({
            id: c.phone,
            phone: c.phone,
            name: c.name || 'Member',
            stamps: c.stamps || 0,
            completed_cards: c.completedCards || 0,
            last_stamp_at: c.lastStampAt ? new Date(c.lastStampAt).toISOString() : null
          }));
        }
      }

      // Deduplicate cards by normalized phone
      const cardMap = new Map();
      for (const card of (customerCards || [])) {
        const norm = normalizePhoneNumber(card.phone);
        if (!cardMap.has(norm)) {
          cardMap.set(norm, { ...card, phone: norm });
        } else {
          const prev = cardMap.get(norm);
          if (card.stamps > prev.stamps) prev.stamps = card.stamps;
          if (card.completed_cards > prev.completed_cards) prev.completed_cards = card.completed_cards;
        }
      }
      const dedupedCards = Array.from(cardMap.values());

      // 4. Fetch recent scan history strictly for this active shop
      let { data: history } = await supabase
        .from('stamp_history')
        .select('*')
        .eq('shop_id', activeShop.id)
        .order('created_at', { ascending: false })
        .limit(30);

      if (!history || history.length === 0) {
        history = db.history.filter(h => h.shopSlug === activeShop.slug || h.shopId === activeShop.id).slice(0, 30);
      }

      const totalStampsGiven = (history || []).filter(h => h.action_type === 'STAMP_ADDED').length;
      const totalRewardsGiven = (history || []).filter(h => h.action_type === 'REWARD_REDEEMED').length;

      const localShop = db.shops[activeShop.slug] || {};
      const googleReviewUrl = activeShop.google_review_url || activeShop.googleReviewUrl || localShop.googleReviewUrl || '';
      const instagramUrl = activeShop.instagram_url || activeShop.instagramUrl || localShop.instagramUrl || '';
      const logoUrl = activeShop.logo_url || activeShop.logoUrl || localShop.logoUrl || '';

      const shopsSummary = combinedShops.map(s => {
        const loc = db.shops[s.slug] || {};
        return {
          id: s.id,
          name: s.name,
          slug: s.slug,
          rewardDescription: s.reward_description || s.rewardDescription || '1 Free Item',
          cooldownHours: s.cooldown_hours || s.cooldownHours || 7,
          stampsTarget: s.stamps_target || s.stampsTarget || 10,
          googleReviewUrl: s.google_review_url || s.googleReviewUrl || loc.googleReviewUrl || '',
          instagramUrl: s.instagram_url || s.instagramUrl || loc.instagramUrl || '',
          logoUrl: s.logo_url || s.logoUrl || loc.logoUrl || ''
        };
      });

      return res.json({
        success: true,
        shop: {
          id: activeShop.id,
          name: activeShop.name,
          slug: activeShop.slug,
          rewardDescription: activeShop.reward_description || activeShop.rewardDescription || '1 Free Item',
          cooldownHours: activeShop.cooldown_hours || activeShop.cooldownHours || 7,
          stampsTarget: activeShop.stamps_target || activeShop.stampsTarget || 10,
          googleReviewUrl,
          instagramUrl,
          logoUrl
        },
        shops: shopsSummary,
        metrics: {
          totalCustomers: dedupedCards.length,
          totalStampsIssued: Math.max(totalStampsGiven, dedupedCards.reduce((acc, c) => acc + (c.stamps || 0), 0)),
          totalRewardsClaimed: totalRewardsGiven
        },
        customers: dedupedCards,
        recentActivity: history || []
      });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  // Local fallback
  const db = loadLocalDb();
  let owner = null;
  for (const o of Object.values(db.owners)) {
    if (o.id === ownerId) { owner = o; break; }
  }
  if (!owner) return res.status(401).json({ success: false, message: 'Invalid session.' });

  const ownerShops = Object.values(db.shops).filter(s => s.ownerId === ownerId);
  const activeShop = (requestedSlug ? ownerShops.find(s => s.slug === requestedSlug) : null) || ownerShops[0] || db.shops[owner.shopSlug];
  const shopCards = Object.values(db.customerCards).filter(c => c.shopSlug === activeShop.slug);
  const shopHistory = db.history.filter(h => h.shopSlug === activeShop.slug);

  return res.json({
    success: true,
    shop: {
      id: activeShop.id,
      name: activeShop.name,
      slug: activeShop.slug,
      rewardDescription: activeShop.rewardDescription,
      cooldownHours: activeShop.cooldownHours || 7,
      stampsTarget: activeShop.stampsTarget || 10,
      googleReviewUrl: activeShop.googleReviewUrl || '',
      instagramUrl: activeShop.instagramUrl || '',
      logoUrl: activeShop.logoUrl || ''
    },
    shops: ownerShops.map(s => ({
      id: s.id,
      name: s.name,
      slug: s.slug,
      rewardDescription: s.rewardDescription,
      cooldownHours: s.cooldownHours || 7,
      stampsTarget: s.stampsTarget || 10,
      googleReviewUrl: s.googleReviewUrl || '',
      instagramUrl: s.instagramUrl || '',
      logoUrl: s.logoUrl || ''
    })),
    metrics: {
      totalCustomers: shopCards.length,
      totalStampsIssued: shopHistory.filter(h => h.type === 'STAMP_ADDED').length,
      totalRewardsClaimed: shopHistory.filter(h => h.type === 'REWARD_REDEEMED').length
    },
    customers: shopCards,
    recentActivity: shopHistory.slice(0, 20)
  });
});

// Endpoint for Shop Owner to Create an Additional Shop
app.post('/api/owner/create-shop', async (req, res) => {
  const ownerId = await getOwnerIdFromReq(req);
  if (!ownerId) {
    return res.status(401).json({ success: false, message: 'Invalid or expired session. Please log in again.' });
  }

  const { name, slug, rewardDescription, stampsTarget, cooldownHours, googleReviewUrl, instagramUrl } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ success: false, message: 'Shop name is required.' });
  }

  const cleanSlug = (slug || name).toLowerCase().trim().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  if (!cleanSlug) {
    return res.status(400).json({ success: false, message: 'A valid shop slug is required.' });
  }

  const targetStamps = parseInt(stampsTarget, 10) || 10;
  const cooldown = parseFloat(cooldownHours) || 7;
  const reward = (rewardDescription || '1 Free Item').trim();
  const shopSecret = crypto.randomBytes(32).toString('hex');
  const cleanReviewUrl = (googleReviewUrl || '').trim();
  const cleanInstaUrl = (instagramUrl || '').trim();

  const db = loadLocalDb();
  if (db.shops[cleanSlug]) {
    return res.status(409).json({ success: false, message: `The shop URL slug "/shop/${cleanSlug}" is already taken.` });
  }

  let createdShop = null;

  if (supabase) {
    try {
      const { data: existing } = await supabase.from('shops').select('id').eq('slug', cleanSlug).maybeSingle();
      if (existing) {
        return res.status(409).json({ success: false, message: `The shop URL slug "/shop/${cleanSlug}" is already taken.` });
      }

      const insertPayload = {
        owner_id: ownerId,
        name: name.trim(),
        slug: cleanSlug,
        reward_description: reward,
        stamps_target: targetStamps,
        cooldown_hours: cooldown,
        secret_key: shopSecret
      };

      const { data: newShop, error: insErr } = await supabase.from('shops').insert(insertPayload).select().single();
      if (insErr) {
        return res.status(400).json({ success: false, message: insErr.message });
      }
      createdShop = newShop;

      // Try setting social urls if columns exist
      if (cleanReviewUrl || cleanInstaUrl) {
        try {
          await supabase.from('shops').update({
            google_review_url: cleanReviewUrl,
            instagram_url: cleanInstaUrl
          }).eq('id', newShop.id);
        } catch (e) {}
      }
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  if (!createdShop) {
    createdShop = {
      id: 'shop_' + Date.now(),
      ownerId,
      name: name.trim(),
      slug: cleanSlug,
      rewardDescription: reward,
      stampsTarget: targetStamps,
      cooldownHours: cooldown,
      secretKey: shopSecret,
      googleReviewUrl: cleanReviewUrl,
      instagramUrl: cleanInstaUrl,
      createdAt: Date.now()
    };
  }

  // Update local cache mirror
  db.shops[cleanSlug] = {
    id: createdShop.id,
    ownerId,
    name: createdShop.name,
    slug: createdShop.slug,
    rewardDescription: reward,
    stampsTarget: targetStamps,
    cooldownHours: cooldown,
    secretKey: shopSecret,
    googleReviewUrl: cleanReviewUrl,
    instagramUrl: cleanInstaUrl
  };
  saveLocalDb(db);

  return res.json({
    success: true,
    message: 'New shop created successfully!',
    shop: {
      id: createdShop.id,
      name: createdShop.name,
      slug: createdShop.slug,
      rewardDescription: reward,
      stampsTarget: targetStamps,
      cooldownHours: cooldown,
      googleReviewUrl: cleanReviewUrl,
      instagramUrl: cleanInstaUrl
    }
  });
});

// --------------------------------------------------------------------
// 3.1 OWNER SETTINGS: EDIT REWARD & STAMPS TARGET (TASK COMPLETE TARGET)
// --------------------------------------------------------------------
async function getOwnerIdFromReq(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.split(' ')[1];

  const verified = verifyOwnerToken(token);
  if (verified) return verified.ownerId;

  if (supabase) {
    try {
      const { data: { user }, error } = await supabase.auth.getUser(token);
      if (!error && user) return user.id;
    } catch (e) {}
  }
  return null;
}

app.post('/api/owner/settings', async (req, res) => handleUpdateSettings(req, res));
app.put('/api/owner/settings', async (req, res) => handleUpdateSettings(req, res));

async function handleUpdateSettings(req, res) {
  const ownerId = await getOwnerIdFromReq(req);
  if (!ownerId) {
    return res.status(401).json({ success: false, message: 'Invalid or expired session. Please log in again.' });
  }

  const { name, shopSlug, shopId, rewardDescription, stampsTarget, cooldownHours, googleReviewUrl, instagramUrl, logoUrl } = req.body;
  const cleanName = (typeof name === 'string' && name.trim()) ? name.trim() : undefined;
  const cleanLogoUrl = typeof logoUrl === 'string' ? logoUrl.trim() : undefined;

  let targetNum = undefined;
  if (stampsTarget !== undefined && stampsTarget !== null && stampsTarget !== '') {
    const parsed = parseInt(stampsTarget, 10);
    if (isNaN(parsed) || parsed < 2 || parsed > 50) {
      return res.status(400).json({ success: false, message: 'Stamps required must be a valid number between 2 and 50.' });
    }
    targetNum = parsed;
  }

  let cleanReward = undefined;
  if (rewardDescription !== undefined && rewardDescription !== null) {
    const trimmed = String(rewardDescription).trim();
    if (trimmed) cleanReward = trimmed;
  }

  const cleanReviewUrl = typeof googleReviewUrl === 'string' ? googleReviewUrl.trim() : undefined;
  const cleanInstagramUrl = typeof instagramUrl === 'string' ? instagramUrl.trim() : undefined;

  let parsedCooldown = undefined;
  if (cooldownHours !== undefined && cooldownHours !== null && cooldownHours !== '') {
    const cd = parseFloat(cooldownHours);
    if (!isNaN(cd) && cd >= 0 && cd <= 720) {
      parsedCooldown = cd;
    }
  }

  if (supabase) {
    try {
      let shop = null;
      if (shopSlug) {
        const { data } = await supabase.from('shops').select('*').eq('owner_id', ownerId).eq('slug', shopSlug).maybeSingle();
        shop = data;
      } else if (shopId) {
        const { data } = await supabase.from('shops').select('*').eq('owner_id', ownerId).eq('id', shopId).maybeSingle();
        shop = data;
      }

      if (!shop) {
        const { data: shops } = await supabase.from('shops').select('*').eq('owner_id', ownerId).order('created_at', { ascending: false });
        if (shops && shops.length > 0) shop = shops[0];
      }

      if (!shop) {
        const db = loadLocalDb();
        const found = Object.values(db.shops).find(s => s.ownerId === ownerId && (shopSlug ? s.slug === shopSlug : true));
        if (found) {
          const { data: fetchedShop } = await supabase.from('shops').select('*').eq('slug', found.slug).maybeSingle();
          shop = fetchedShop || found;
        }
      }

      if (!shop) return res.status(404).json({ success: false, message: 'Shop profile not found.' });

      const finalName = cleanName !== undefined ? cleanName : shop.name;
      const finalReward = cleanReward !== undefined ? cleanReward : (shop.reward_description || '1 Free Item');
      const finalTarget = targetNum !== undefined ? targetNum : (shop.stamps_target || 10);
      const finalCooldown = parsedCooldown !== undefined ? parsedCooldown : (shop.cooldown_hours !== undefined ? shop.cooldown_hours : 7);
      const finalReviewUrl = cleanReviewUrl !== undefined ? cleanReviewUrl : (shop.google_review_url || '');
      const finalInstaUrl = cleanInstagramUrl !== undefined ? cleanInstagramUrl : (shop.instagram_url || '');
      const finalLogoUrl = cleanLogoUrl !== undefined ? cleanLogoUrl : (shop.logo_url || shop.logoUrl || loadLocalDb()?.shops?.[shop.slug]?.logoUrl || '');

      const updateData = {
        name: finalName,
        reward_description: finalReward,
        stamps_target: finalTarget,
        cooldown_hours: finalCooldown,
        updated_at: new Date().toISOString()
      };

      try {
        const { error: fullErr } = await supabase
          .from('shops')
          .update({
            ...updateData,
            google_review_url: finalReviewUrl,
            instagram_url: finalInstaUrl,
            logo_url: finalLogoUrl
          })
          .eq('id', shop.id);

        if (fullErr) {
          const { error: baseErr } = await supabase
            .from('shops')
            .update(updateData)
            .eq('id', shop.id);
          if (baseErr) console.error('[Supabase Update Error]', baseErr.message);
        }
      } catch (colErr) {
        await supabase.from('shops').update(updateData).eq('id', shop.id);
      }

      // Sync local cache
      const db = loadLocalDb();
      if (db.shops[shop.slug]) {
        db.shops[shop.slug].name = finalName;
        db.shops[shop.slug].rewardDescription = finalReward;
        db.shops[shop.slug].stampsTarget = finalTarget;
        db.shops[shop.slug].cooldownHours = finalCooldown;
        db.shops[shop.slug].googleReviewUrl = finalReviewUrl;
        db.shops[shop.slug].instagramUrl = finalInstaUrl;
        if (finalLogoUrl !== undefined) db.shops[shop.slug].logoUrl = finalLogoUrl;
        saveLocalDb(db);
      }

      return res.json({
        success: true,
        message: 'Settings updated successfully!',
        shop: {
          id: shop.id,
          name: finalName,
          slug: shop.slug,
          rewardDescription: finalReward,
          stampsTarget: finalTarget,
          cooldownHours: finalCooldown,
          googleReviewUrl: finalReviewUrl,
          instagramUrl: finalInstaUrl,
          logoUrl: finalLogoUrl
        }
      });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  // Local fallback
  const db = loadLocalDb();
  let owner = null;
  for (const o of Object.values(db.owners)) {
    if (o.id === ownerId) { owner = o; break; }
  }
  if (!owner) return res.status(401).json({ success: false, message: 'Invalid session.' });

  const shop = db.shops[owner.shopSlug];
  if (!shop) return res.status(404).json({ success: false, message: 'Shop not found.' });

  if (cleanName !== undefined) shop.name = cleanName;
  shop.rewardDescription = cleanReward !== undefined ? cleanReward : shop.rewardDescription;
  shop.stampsTarget = targetNum !== undefined ? targetNum : shop.stampsTarget;
  if (cleanLogoUrl !== undefined) shop.logoUrl = cleanLogoUrl;
  shop.cooldownHours = parsedCooldown;
  shop.googleReviewUrl = cleanReviewUrl;
  shop.instagramUrl = cleanInstagramUrl;
  saveLocalDb(db);

  return res.json({
    success: true,
    message: 'Settings updated successfully!',
    shop: {
      id: shop.id,
      name: shop.name,
      slug: shop.slug,
      rewardDescription: cleanReward,
      stampsTarget: targetNum,
      cooldownHours: parsedCooldown,
      googleReviewUrl: cleanReviewUrl !== undefined ? cleanReviewUrl : (shop.googleReviewUrl || ''),
      instagramUrl: cleanInstagramUrl !== undefined ? cleanInstagramUrl : (shop.instagramUrl || ''),
      logoUrl: shop.logoUrl || ''
    }
  });
}

// --------------------------------------------------------------------
// 3.2 DELETE OWNER ACCOUNT & PURGE STORE DATA
// --------------------------------------------------------------------
app.delete('/api/owner/account', async (req, res) => {
  const ownerId = await getOwnerIdFromReq(req);
  if (!ownerId) {
    return res.status(401).json({ success: false, message: 'Invalid or expired session. Please log in again.' });
  }

  let deletedShopSlug = null;

  if (supabase) {
    try {
      let { data: shop } = await supabase.from('shops').select('*').eq('owner_id', ownerId).maybeSingle();
      if (!shop) {
        const db = loadLocalDb();
        const found = Object.values(db.shops).find(s => s.ownerId === ownerId);
        if (found) {
          const { data: fetchedShop } = await supabase.from('shops').select('*').eq('slug', found.slug).maybeSingle();
          shop = fetchedShop;
        }
      }

      if (shop) {
        deletedShopSlug = shop.slug;
        await supabase.from('stamp_history').delete().eq('shop_id', shop.id);
        await supabase.from('used_tokens').delete().eq('shop_id', shop.id);
        await supabase.from('customer_cards').delete().eq('shop_id', shop.id);
        await supabase.from('shops').delete().eq('id', shop.id);
      }

      if (supabase.auth.admin) {
        try {
          await supabase.auth.admin.deleteUser(ownerId);
        } catch (e) {}
      }
    } catch (err) {
      console.error('[Delete Account] Supabase error:', err.message);
    }
  }

  // Local persistent cleanup
  const db = loadLocalDb();
  for (const [key, owner] of Object.entries(db.owners)) {
    if (owner.id === ownerId) {
      if (!deletedShopSlug) deletedShopSlug = owner.shopSlug;
      delete db.owners[key];
    }
  }

  if (deletedShopSlug) {
    delete db.shops[deletedShopSlug];
    for (const cardKey of Object.keys(db.customerCards)) {
      if (cardKey.startsWith(`${deletedShopSlug}_`)) {
        delete db.customerCards[cardKey];
      }
    }
    db.history = db.history.filter(h => h.shopSlug !== deletedShopSlug);
  }

  saveLocalDb(db);

  return res.json({
    success: true,
    message: 'Your shop account and all customer pass data have been permanently deleted.'
  });
});

// --------------------------------------------------------------------
// Public shop metadata endpoint
app.get('/api/shop/:slug/info', async (req, res) => {
  try {
    const shop = await resolveShopBySlug(req.params.slug);
    if (!shop) {
      return res.status(404).json({
        success: false,
        message: 'Shop not found. Please verify the URL.'
      });
    }

    const db = loadLocalDb();
    const slug = shop.slug || req.params.slug;
    const localShop = db?.shops?.[slug] || {};
    const googleReviewUrl = shop.google_review_url || shop.googleReviewUrl || localShop.googleReviewUrl || '';
    const instagramUrl = shop.instagram_url || shop.instagramUrl || localShop.instagramUrl || '';
    const logoUrl = shop.logo_url || shop.logoUrl || localShop.logoUrl || '';

    return res.json({
      success: true,
      shop: {
        name: shop.name,
        slug: shop.slug,
        rewardDescription: shop.reward_description || shop.rewardDescription || '1 Free Item',
        stampsTarget: shop.stamps_target || shop.stampsTarget || 10,
        cooldownHours: shop.cooldown_hours || shop.cooldownHours || 12,
        googleReviewUrl,
        instagramUrl,
        logoUrl
      }
    });
  } catch (err) {
    console.error('[ShopInfo] Error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error while resolving shop.' });
  }
});

app.get('/api/shop/:slug/live-qr', async (req, res) => {
  try {
    const shop = await resolveShopBySlug(req.params.slug);

    if (!shop) {
      return res.status(404).json({
        success: false,
        message: 'Shop not found. Please launch the kiosk from your Owner Dashboard.'
      });
    }

    const slug = shop.slug;
    const shopSecret = shop.secret_key || shop.secretKey || GLOBAL_SECRET;
    const qrData = generateShopQrToken(shopSecret);
    const rawHost = req.get('host') || `localhost:${PORT}`;
    const publicTunnel = getPublicTunnelUrl();
    const isHttps = req.secure || req.headers['x-forwarded-proto'] === 'https' || rawHost.includes('trycloudflare.com') || rawHost.includes('onrender.com');
    const protocol = isHttps ? 'https' : 'http';

    let targetHost = rawHost;
    let scanUrl;

    if (rawHost.includes('trycloudflare.com') || rawHost.includes('loca.lt')) {
      targetHost = rawHost;
      scanUrl = `${protocol}://${rawHost}/scan.html?shop=${slug}&token=${qrData.token}`;
    } else if (publicTunnel) {
      const cleanPublic = publicTunnel.replace(/\/$/, '');
      targetHost = cleanPublic.replace(/^https?:\/\//, '');
      scanUrl = `${cleanPublic}/scan.html?shop=${slug}&token=${qrData.token}`;
    } else {
      targetHost = (rawHost.includes('localhost') || rawHost.includes('127.0.0.1')) ? `${LAN_IP}:${PORT}` : rawHost;
      scanUrl = `${protocol}://${targetHost}/scan.html?shop=${slug}&token=${qrData.token}`;
    }

    const db = loadLocalDb();
    const qrSvg = await QRCode.toString(scanUrl, {
      type: 'svg',
      errorCorrectionLevel: 'M',
      margin: 1,
      color: { dark: '#171717', light: '#ffffff' }
    });

    return res.json({
      success: true,
      shop: {
        name: shop.name,
        slug: shop.slug,
        rewardDescription: shop.reward_description || shop.rewardDescription,
        stampsTarget: shop.stamps_target || shop.stampsTarget || 10,
        googleReviewUrl: shop.google_review_url || shop.googleReviewUrl || '',
        instagramUrl: shop.instagram_url || shop.instagramUrl || '',
        logoUrl: shop.logo_url || shop.logoUrl || db?.shops?.[slug]?.logoUrl || ''
      },
      scanUrl,
      publicTunnel: publicTunnel || null,
      lanIp: LAN_IP,
      targetHost,
      token: qrData.token,
      expiresAt: qrData.expiresAt,
      remainingSeconds: qrData.remainingSeconds,
      qrSvg
    });
  } catch (err) {
    console.error('[LiveQR] Error:', err);
    return res.status(500).json({ success: false, error: 'QR Generation failed' });
  }
});

// Default counter fallback (first shop or default)
app.get('/api/live-qr', async (req, res) => {
  // Check if default shop exists
  let defaultSlug = 'default';
  if (supabase) {
    const { data } = await supabase.from('shops').select('slug').limit(1).maybeSingle();
    if (data) defaultSlug = data.slug;
  } else {
    const db = loadLocalDb();
    const slugs = Object.keys(db.shops);
    if (slugs.length > 0) defaultSlug = slugs[0];
  }
  res.redirect(`/api/shop/${defaultSlug}/live-qr`);
});

// --------------------------------------------------------------------
// 4.5 CUSTOMER REGISTRATION & OTP VERIFICATION
// --------------------------------------------------------------------
const customerOtpStore = new Map();

function signCustomerOtpToken(phone) {
  const cleanPhone = normalizePhoneNumber(phone);
  const payload = Buffer.from(JSON.stringify({ phone: cleanPhone, verified: true, exp: Date.now() + 30 * 86400000 })).toString('base64url');
  const sig = crypto.createHmac('sha256', GLOBAL_SECRET).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

function verifyCustomerOtpToken(tokenStr) {
  if (!tokenStr || typeof tokenStr !== 'string') return null;
  const parts = tokenStr.split('.');
  if (parts.length !== 2) return null;
  const [payloadBase64, clientSig] = parts;
  const expectedSig = crypto.createHmac('sha256', GLOBAL_SECRET).update(payloadBase64).digest('base64url');
  if (!safeEqual(clientSig, expectedSig)) return null;
  try {
    const payload = JSON.parse(Buffer.from(payloadBase64, 'base64url').toString('utf8'));
    if (Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

// Verify active customer session token
app.post('/api/customer/verify-session', (req, res) => {
  const { token } = req.body;
  const verified = verifyCustomerOtpToken(token);
  if (!verified) {
    return res.status(401).json({ success: false, valid: false, message: 'Session expired or invalid. Please verify via OTP.' });
  }
  return res.json({ success: true, valid: true, phone: verified.phone });
});

// Server-generated OTPs were removed: they were echoed back to the caller (demoCode) and never sent by SMS.
// Customer phone verification is done client-side with Firebase Phone Auth and submitted as firebaseIdToken.
app.post('/api/customer/send-otp', (req, res) => {
  return res.status(410).json({
    success: false,
    message: 'Server-side OTP is disabled. Verify your phone with Firebase SMS OTP.'
  });
});

app.post('/api/customer/verify-otp', async (req, res) => {
  const { firebaseIdToken } = req.body;

  if (!firebaseInitialized) {
    return res.status(503).json({ success: false, message: 'SMS verification service is temporarily unavailable.' });
  }

  if (!firebaseIdToken) {
    return res.status(400).json({ success: false, message: 'Firebase SMS verification token is required.' });
  }

  const authResult = await verifyFirebaseToken(firebaseIdToken);
  if (!authResult.success || !authResult.phone) {
    return res.status(401).json({ success: false, message: 'Invalid or expired phone verification: ' + (authResult.reason || 'Verification failed') });
  }

  const normPhone = normalizePhoneNumber(authResult.phone);
  const vToken = signCustomerOtpToken(normPhone);
  return res.json({
    success: true,
    message: 'Phone number verified via Firebase SMS OTP.',
    verifiedPhone: normPhone,
    verificationToken: vToken
  });
});

// --------------------------------------------------------------------
// 5. CUSTOMER STAMP CLAIM (STRICT SHOP DATA ISOLATION & OTP VERIFICATION)
// --------------------------------------------------------------------
app.post('/api/claim-stamp', async (req, res) => {
  const { shopSlug, token, phone, otp, firebaseIdToken, verificationToken, name } = req.body;

  // 1. Resolve Shop strictly with fallback resolver
  const shop = await resolveShopBySlug(shopSlug);
  if (!shop) {
    return res.status(404).json({ success: false, message: 'Shop not found.' });
  }

  // 2. Validate Customer Identity (Google Auth token, Firebase token, or signed session token)
  let customerIdentifier = null;
  let customerName = name ? name.trim() : '';

  if (firebaseIdToken) {
    const authResult = await verifyFirebaseToken(firebaseIdToken);
    if (!authResult.success) {
      return res.status(401).json({ success: false, message: 'Invalid authentication: ' + (authResult.reason || 'Token invalid') });
    }
    customerIdentifier = authResult.email ? authResult.email.trim().toLowerCase() : (authResult.phone ? normalizePhoneNumber(authResult.phone) : authResult.uid);
    if (!customerName && authResult.name) customerName = authResult.name.trim();
  } else if (verificationToken) {
    const tokenPayload = verifyCustomerOtpToken(verificationToken);
    if (tokenPayload) {
      customerIdentifier = tokenPayload.phone;
    }
  } else if (phone && phone.trim()) {
    customerIdentifier = normalizePhoneNumber(phone);
  }

  if (!customerIdentifier) {
    return res.status(401).json({
      success: false,
      code: 'VERIFICATION_REQUIRED',
      message: 'Sign-in required. Please authenticate with Google or a verified account before collecting your stamp.'
    });
  }

  const sessionToken = signCustomerOtpToken(customerIdentifier);

  // 3. Validate Dynamic Single-Use QR Token using this shop's secret key
  const shopSecret = shop.secret_key || shop.secretKey || GLOBAL_SECRET;
  const qrCheck = validateShopQrToken(token, shopSecret);
  if (!qrCheck.valid) return res.status(403).json({ success: false, code: 'EXPIRED_QR', message: qrCheck.reason });

  const cooldownSeconds = process.env.COOLDOWN_SECONDS ? parseFloat(process.env.COOLDOWN_SECONDS) : null;
  const cooldownHours = parseFloat(shop.cooldown_hours || shop.cooldownHours) || 7;
  const cooldownMs = cooldownSeconds ? cooldownSeconds * 1000 : (cooldownHours * 3600000);
  const now = Date.now();

  // ------------------------------------------------------------------
  // A. SUPABASE MULTI-TENANT TRANSACTION
  // ------------------------------------------------------------------
  if (supabase) {
    try {
      // 1. Try atomic database RPC (safe from race conditions & double-spend)
      const { data: rpcResult, error: rpcErr } = await supabase.rpc('claim_stamp_atomic', {
        p_shop_id: shop.id,
        p_phone: customerIdentifier,
        p_token: token,
        p_customer_name: customerName || '',
        p_cooldown_hours: cooldownHours,
        p_stamps_target: shop.stamps_target || 10
      });

      if (!rpcErr && rpcResult) {
        if (!rpcResult.success) {
          if (rpcResult.code === 'QR_ALREADY_USED') {
            return res.status(409).json({ success: false, code: 'QR_ALREADY_USED', message: rpcResult.message });
          }
          if (rpcResult.code === 'COOLDOWN_ACTIVE') {
            const remSec = rpcResult.remaining_seconds || 0;
            const h = Math.floor(remSec / 3600);
            const m = Math.floor((remSec % 3600) / 60);
            const s = remSec % 60;
            const dur = h > 0 ? `${h}h ${m}m ${s}s` : (m > 0 ? `${m}m ${s}s` : `${s}s`);
            return res.status(429).json({
              success: false,
              code: 'COOLDOWN_ACTIVE',
              message: `Cooldown active at ${shop.name}! Next stamp in ${dur}.`,
              remainingMs: remSec * 1000,
              cooldownEnd: now + (remSec * 1000),
              card: { stamps: rpcResult.current_stamps, shopName: shop.name }
            });
          }
          return res.status(400).json({ success: false, message: rpcResult.message });
        }

        const card = rpcResult.card;
        const rewardUnlocked = rpcResult.reward_unlocked;

        // Mirror to local persistent cache
        try {
          const db = loadLocalDb();
          const cardKey = `${shop.slug}_${customerIdentifier}`;
          db.customerCards[cardKey] = {
            shopSlug: shop.slug,
            shopId: shop.id,
            phone: customerIdentifier,
            name: card.name || customerName || `Customer ${customerIdentifier.slice(-4)}`,
            stamps: card.stamps,
            completedCards: card.completed_cards,
            lastStampAt: now,
            usedTokens: [token]
          };
          if (!db.usedTokens) db.usedTokens = {};
          db.usedTokens[token] = { shopId: shop.id, phone: customerIdentifier, usedAt: now };
          db.history.unshift({
            shopSlug: shop.slug,
            shopId: shop.id,
            phone: customerIdentifier,
            customerName: card.name || customerName || `Customer ${customerIdentifier.slice(-4)}`,
            actionType: rewardUnlocked ? 'REWARD_REDEEMED' : 'STAMP_ADDED',
            stampsAtPoint: card.stamps,
            timestamp: now
          });
          saveLocalDb(db);
        } catch (cacheErr) {}

        return res.json({
          success: true,
          message: rewardUnlocked ? `🎉 Stamp target reached! You unlocked: ${shop.reward_description || '1 Free Item'}!` : `✓ Stamp added at ${shop.name}!`,
          rewardUnlocked,
          shopName: shop.name,
          verificationToken: sessionToken,
          card: {
            phone: card.phone,
            name: card.name,
            stamps: card.stamps,
            completedCards: card.completed_cards,
            lastStampAt: card.last_stamp_at
          },
          cooldownEnd: now + cooldownMs
        });
      }

      // 2. Standard Supabase operations fallback if RPC is not yet created in SQL editor
      // Check single-use token burn FOR THIS SHOP
      const { data: tokenBurned } = await supabase
        .from('used_tokens')
        .select('id')
        .eq('shop_id', shop.id)
        .eq('phone', verifiedPhone)
        .eq('token', token)
        .maybeSingle();

      if (tokenBurned) {
        return res.status(409).json({
          success: false,
          code: 'QR_ALREADY_USED',
          message: 'This specific QR code has already been redeemed for this shop. Please scan the current code on the counter.'
        });
      }

      // Fetch or Create Customer Card FOR THIS SPECIFIC SHOP
      let { data: card } = await supabase
        .from('customer_cards')
        .select('*')
        .eq('shop_id', shop.id)
        .eq('phone', verifiedPhone)
        .maybeSingle();

      if (!card) {
        const { data: newCard } = await supabase
          .from('customer_cards')
          .insert({
            shop_id: shop.id,
            phone: verifiedPhone,
            name: name?.trim() || `Customer ${verifiedPhone.slice(-4)}`,
            stamps: 0,
            completed_cards: 0,
            last_stamp_at: null
          })
          .select()
          .single();
        card = newCard;
      }

      // Enforce Shop Cooldown
      if (card.last_stamp_at) {
        const lastStampMs = new Date(card.last_stamp_at).getTime();
        if ((now - lastStampMs) < cooldownMs) {
          const remMs = cooldownMs - (now - lastStampMs);
          const h = Math.floor(remMs / 3600000);
          const m = Math.floor((remMs % 3600000) / 60000);
          const s = Math.ceil(remMs / 1000);
          const dur = h > 0 ? `${h}h ${m}m ${s % 60}s` : (m > 0 ? `${m}m ${s % 60}s` : `${s}s`);

          return res.status(429).json({
            success: false,
            code: 'COOLDOWN_ACTIVE',
            message: `Cooldown active at ${shop.name}! Next stamp in ${dur}.`,
            remainingMs: remMs,
            cooldownEnd: lastStampMs + cooldownMs,
            card: { stamps: card.stamps, shopName: shop.name }
          });
        }
      }

      // Award Stamp
      let newStamps = card.stamps + 1;
      let newCompleted = card.completed_cards;
      let rewardUnlocked = false;

      if (newStamps >= (shop.stamps_target || 10)) {
        newCompleted += 1;
        newStamps = 0;
        rewardUnlocked = true;
      }

      // Update card in Supabase
      const { data: updatedCard } = await supabase
        .from('customer_cards')
        .update({
          stamps: newStamps,
          completed_cards: newCompleted,
          last_stamp_at: new Date(now).toISOString(),
          updated_at: new Date(now).toISOString()
        })
        .eq('id', card.id)
        .select()
        .single();

      // Burn token for this shop
      await supabase.from('used_tokens').insert({ shop_id: shop.id, phone: verifiedPhone, token });

      // Audit log
      await supabase.from('stamp_history').insert({
        shop_id: shop.id,
        card_id: card.id,
        phone: verifiedPhone,
        customer_name: updatedCard.name,
        action_type: rewardUnlocked ? 'REWARD_REDEEMED' : 'STAMP_ADDED',
        stamps_at_point: newStamps
      });

      // Also mirror to local persistent cache
      try {
        const db = loadLocalDb();
        const cardKey = `${shop.slug}_${verifiedPhone}`;
        db.customerCards[cardKey] = {
          shopSlug: shop.slug,
          shopId: shop.id,
          phone: verifiedPhone,
          name: updatedCard.name,
          stamps: newStamps,
          completedCards: newCompleted,
          lastStampAt: now,
          usedTokens: [token]
        };
        db.history.unshift({
          shopSlug: shop.slug,
          shopId: shop.id,
          phone: verifiedPhone,
          customerName: updatedCard.name,
          actionType: rewardUnlocked ? 'REWARD_REDEEMED' : 'STAMP_ADDED',
          stampsAtPoint: newStamps,
          timestamp: now
        });
        saveLocalDb(db);
      } catch (cacheErr) {}

      return res.json({
        success: true,
        message: rewardUnlocked ? `🎉 10th Stamp Reached! You unlocked: ${shop.reward_description || '1 Free Item'}!` : `✓ Stamp added at ${shop.name}!`,
        rewardUnlocked,
        shopName: shop.name,
        verificationToken: sessionToken,
        card: {
          phone: updatedCard.phone,
          name: updatedCard.name,
          stamps: updatedCard.stamps,
          completedCards: updatedCard.completed_cards,
          lastStampAt: updatedCard.last_stamp_at
        },
        cooldownEnd: now + cooldownMs
      });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  // ------------------------------------------------------------------
  // B. LOCAL MULTI-TENANT FALLBACK
  // ------------------------------------------------------------------
  const db = loadLocalDb();
  const slug = shop.slug;
  const cardKey = `${slug}_${verifiedPhone}`;
  let card = db.customerCards[cardKey];

  if (!card) {
    card = {
      shopSlug: slug,
      phone: verifiedPhone,
      name: name?.trim() || `Customer ${verifiedPhone.slice(-4)}`,
      stamps: 0,
      completedCards: 0,
      lastStampAt: 0,
      usedTokens: []
    };
    db.customerCards[cardKey] = card;
  }

  // Check burned tokens for this shop
  card.usedTokens = card.usedTokens || [];
  if (card.usedTokens.includes(token)) {
    return res.status(409).json({
      success: false,
      code: 'QR_ALREADY_USED',
      message: `This specific QR code has already been redeemed at ${shop.name}. Scan the live code on the counter.`
    });
  }

  if (card.lastStampAt && (now - card.lastStampAt) < cooldownMs) {
    const remMs = cooldownMs - (now - card.lastStampAt);
    const h = Math.floor(remMs / 3600000);
    const m = Math.floor((remMs % 3600000) / 60000);
    const s = Math.ceil(remMs / 1000);
    const dur = h > 0 ? `${h}h ${m}m ${s % 60}s` : (m > 0 ? `${m}m ${s % 60}s` : `${s}s`);

    return res.status(429).json({
      success: false,
      code: 'COOLDOWN_ACTIVE',
      message: `Cooldown active at ${shop.name}! Next stamp in ${dur}.`,
      remainingMs: remMs,
      cooldownEnd: card.lastStampAt + cooldownMs,
      card
    });
  }

  card.stamps += 1;
  let rewardUnlocked = false;
  if (card.stamps >= (shop.stampsTarget || 10)) {
    card.completedCards += 1;
    card.stamps = 0;
    rewardUnlocked = true;
  }

  card.usedTokens.push(token);
  if (card.usedTokens.length > 50) card.usedTokens.shift();
  card.lastStampAt = now;

  db.history.unshift({
    shopSlug: slug,
    phone: verifiedPhone,
    customerName: card.name,
    actionType: rewardUnlocked ? 'REWARD_REDEEMED' : 'STAMP_ADDED',
    stampsAtPoint: card.stamps,
    timestamp: now
  });

  saveLocalDb(db);

  return res.json({
    success: true,
    message: rewardUnlocked ? `🎉 10th Stamp Reached! You unlocked: ${shop.rewardDescription}!` : `✓ Stamp added at ${shop.name}!`,
    rewardUnlocked,
    shopName: shop.name,
    verificationToken: sessionToken,
    card,
    cooldownEnd: now + cooldownMs
  });
});

// Customer View Card for specific shop
app.get('/api/customer/:shopSlug/:phone', async (req, res) => {
  const cleanPhone = normalizePhoneNumber(req.params.phone);
  const shop = await resolveShopBySlug(req.params.shopSlug);
  if (!shop) {
    return res.status(404).json({ success: false, message: 'Shop not found.' });
  }

  const slug = shop.slug;
  const db = loadLocalDb();

  const shopName = shop.name || 'Loyalty Rewards';
  const rewardDesc = shop.reward_description || shop.rewardDescription || '1 Free Item';
  const stampsTarget = shop.stamps_target || shop.stampsTarget || 10;
  const cooldownHours = parseFloat(shop.cooldown_hours || shop.cooldownHours) || 12;
  const cooldownMs = cooldownHours * 3600000;
  const now = Date.now();

  let card = null;
  if (supabase && shop.id) {
    try {
      const { data } = await supabase
        .from('customer_cards')
        .select('*')
        .eq('shop_id', shop.id)
        .eq('phone', cleanPhone)
        .maybeSingle();
      card = data;
    } catch (e) {}
  }

  if (!card) {
    const cardKey = `${slug}_${cleanPhone}`;
    const localCard = db.customerCards[cardKey];
    if (localCard) {
      card = {
        phone: localCard.phone,
        name: localCard.name,
        stamps: localCard.stamps,
        completed_cards: localCard.completedCards,
        last_stamp_at: localCard.lastStampAt ? new Date(localCard.lastStampAt).toISOString() : null
      };
    }
  }

  const stamps = card ? (card.stamps || 0) : 0;
  const completedCards = card ? (card.completed_cards || 0) : 0;
  const lastStampMs = card && card.last_stamp_at ? new Date(card.last_stamp_at).getTime() : 0;
  const remainingCooldown = Math.max(0, (lastStampMs + cooldownMs) - now);
  const localShop = db.shops[slug] || {};
  const googleReviewUrl = shop?.google_review_url || shop?.googleReviewUrl || localShop.googleReviewUrl || '';
  const instagramUrl = shop?.instagram_url || shop?.instagramUrl || localShop.instagramUrl || '';
  const logoUrl = shop?.logo_url || shop?.logoUrl || localShop.logoUrl || '';

  return res.json({
    success: true,
    shop: {
      name: shopName,
      slug,
      rewardDescription: rewardDesc,
      stampsTarget,
      cooldownHours,
      googleReviewUrl,
      instagramUrl,
      logoUrl
    },
    card: {
      phone: cleanPhone,
      name: card?.name || 'Rewards Member',
      stamps,
      completedCards,
      lastStampAt: lastStampMs,
      remainingCooldownMs: remainingCooldown,
      isCooldownActive: remainingCooldown > 0
    }
  });
});

let server = null;
if (require.main === module) {
  server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`[LoyaltyServer] Running on http://localhost:${PORT}`);
    console.log(`[LoyaltyServer] Owner Portal: http://${LAN_IP}:${PORT}/owner/dashboard.html`);
  });

  const shutdown = (signal) => {
    console.log(`[LoyaltyServer] Received ${signal}. Shutting down gracefully...`);
    if (server) {
      server.close(() => {
        console.log('[LoyaltyServer] HTTP server closed.');
        process.exit(0);
      });
      setTimeout(() => {
        console.error('[LoyaltyServer] Forcefully terminating process.');
        process.exit(1);
      }, 10000).unref();
    } else {
      process.exit(0);
    }
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

module.exports = {
  app,
  generateShopQrToken,
  validateShopQrToken,
  signOwnerToken,
  verifyOwnerToken,
  signCustomerOtpToken,
  verifyCustomerOtpToken,
  hashPassword,
  verifyPassword,
  loadLocalDb,
  saveLocalDb,
  resolveShopBySlug,
  verifyFirebaseToken
};
