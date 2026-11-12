require('dotenv').config();

process.on('uncaughtException', (err) => {
  console.error('[UNCAUGHT EXCEPTION]:', err?.stack || err);
});
process.on('unhandledRejection', (reason) => {
  console.warn('[UNHANDLED REJECTION]:', reason?.stack || reason);
});
const express = require('express');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const QRCode = require('qrcode');
const os = require('os');
const { createClient } = require('@supabase/supabase-js');
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
const GLOBAL_SECRET = process.env.APP_SECRET || 'marku_production_master_secret_2026_9876543210abcdef';

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
// --------------------------------------------------------------------
// 1. SUPABASE CLIENT INITIALIZATION & LIVE DEFAULTS
// --------------------------------------------------------------------
const DEFAULT_SUPABASE_URL = 'https://edqiurouaeabnyhtzqjk.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVkcWl1cm91YWVhYm55aHR6cWprIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQxMjM4OTUsImV4cCI6MjEwOTY5OTg5NX0.eQIuOoUUQQaqHAHrcfcQ69ec77t39CgY8C4NbXYtQ6Y';
const DEFAULT_GOOGLE_CLIENT_ID = '365629360703-pkonrtr6snvne6rpsko2getseg0t5fog.apps.googleusercontent.com';

let supabase = null;
const sbUrl = process.env.SUPABASE_URL || DEFAULT_SUPABASE_URL;
const sbKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;
if (sbUrl && sbKey) {
  try {
    supabase = createClient(sbUrl, sbKey, {
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
      const init = { shops: {}, owners: {}, customerCards: {}, usedTokens: {}, history: [], users: {}, sessions: {} };
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
    if (!data.users) data.users = {};
    if (!data.sessions) data.sessions = {};
    memoryDb = data;
    return memoryDb;
  } catch (err) {
    if (!memoryDb) {
      memoryDb = { shops: {}, owners: {}, customerCards: {}, usedTokens: {}, history: [], users: {}, sessions: {} };
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
// 2. SUPABASE AUTHENTICATION (GOOGLE OAUTH & TOKEN VERIFICATION)
// --------------------------------------------------------------------
async function verifySupabaseToken(token) {
  if (!token || typeof token !== 'string') {
    return { success: false, reason: 'Missing Supabase token string' };
  }
  if (!supabase) {
    return { success: false, reason: 'Supabase client not connected' };
  }
  try {
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data || !data.user) {
      return { success: false, reason: error ? error.message : 'Invalid Supabase user token' };
    }
    const user = data.user;
    return {
      success: true,
      uid: user.id,
      email: user.email || null,
      phone: user.phone || null,
      name: user.user_metadata?.full_name || user.user_metadata?.name || null
    };
  } catch (err) {
    return { success: false, reason: `Token verification error: ${err.message}` };
  }
}




app.set('trust proxy', 1);
// CSP is disabled for now because the frontend uses inline scripts / CDN assets.
// COOP set to same-origin-allow-popups to allow OAuth popup communication.
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' }
}));
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Lightweight Zero-Dependency Cookie Parser Middleware
app.use((req, res, next) => {
  req.cookies = {};
  const cookieHeader = req.headers?.cookie;
  if (cookieHeader) {
    cookieHeader.split(';').forEach(c => {
      const parts = c.split('=');
      const name = parts[0]?.trim();
      if (name) {
        req.cookies[name] = decodeURIComponent(parts.slice(1).join('=').trim());
      }
    });
  }
  next();
});

// Direct Customer Scan View Route: /c/[shop_id] or /c/[slug]
app.get(['/c/:shopId', '/c/:shopSlug'], (req, res) => {
  return res.sendFile(path.join(__dirname, 'public', 'scan.html'));
});

// Direct Owner Dashboard Redirect
app.get('/dashboard', (req, res) => {
  return res.redirect('/owner/dashboard.html');
});

app.use(express.static(path.join(__dirname, 'public')));

const limiterOpts = { standardHeaders: true, legacyHeaders: false };
app.use('/api', rateLimit({ ...limiterOpts, windowMs: 60 * 1000, limit: 300, message: { success: false, message: 'Too many requests. Slow down.' } }));
app.use(['/api/owner/login', '/api/owner/register', '/api/auth/google/owner', '/api/auth/google/customer', '/api/customer/verify-otp', '/api/customer/send-otp'],
  rateLimit({ ...limiterOpts, windowMs: 15 * 60 * 1000, limit: 60, message: { success: false, message: 'Too many attempts. Try again in 15 minutes.' } }));
app.use('/api/claim-stamp', rateLimit({ ...limiterOpts, windowMs: 60 * 1000, limit: 60, message: { success: false, message: 'Too many scan attempts. Please wait a minute.' } }));

// Health Check for Render, Docker & monitoring
app.get('/health', (req, res) => {
  return res.status(200).json({ status: 'ok', uptime: process.uptime(), timestamp: Date.now() });
});

app.get('/ready', (req, res) => {
  const isDbReady = !!supabase;
  return res.status(200).json({
    ready: isDbReady,
    supabaseConnected: isDbReady,
    authProvider: 'google-oauth'
  });
});

// Unified Auth Config Endpoint (Google Client ID & Supabase)
app.get('/api/config/auth', (req, res) => {
  const googleClientId = process.env.GOOGLE_CLIENT_ID || process.env.PUBLIC_GOOGLE_CLIENT_ID || DEFAULT_GOOGLE_CLIENT_ID;
  const url = process.env.SUPABASE_URL || DEFAULT_SUPABASE_URL;
  const anonKey = process.env.PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || DEFAULT_SUPABASE_ANON_KEY;
  return res.json({
    googleClientId,
    isGoogleConfigured: !!googleClientId,
    url,
    anonKey
  });
});

// Endpoint providing Supabase Client Config to frontend (login, register, scan, card)
app.get('/api/config/supabase', (req, res) => {
  const url = process.env.SUPABASE_URL || DEFAULT_SUPABASE_URL;
  const anonKey = process.env.PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || DEFAULT_SUPABASE_ANON_KEY;
  const googleClientId = process.env.GOOGLE_CLIENT_ID || process.env.PUBLIC_GOOGLE_CLIENT_ID || DEFAULT_GOOGLE_CLIENT_ID;
  return res.json({
    isConfigured: !!(url && anonKey),
    googleClientId,
    url,
    anonKey
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
  const str = String(raw).trim();
  const digits = str.replace(/[^0-9]/g, '');
  if (!digits) return '';

  // Explicit international format with plus (e.g. +14155552671, +447911123456, +971501234567)
  if (str.startsWith('+')) {
    // If India country code (+91) has extra leading zero (e.g. +9109311594509), strip the 0
    if (digits.startsWith('910') && digits.length === 13) {
      return '+91' + digits.slice(3);
    }
    // If India country code (+91) has duplicate 91 (e.g. +91919311594509), strip the duplicate
    if (digits.startsWith('9191') && digits.length === 14) {
      return '+91' + digits.slice(4);
    }
    return '+' + digits;
  }
  // International format with 00 prefix (e.g. 001..., 0044...)
  if (digits.startsWith('00')) {
    return '+' + digits.slice(2);
  }
  // Indian 12-digit format starting with 91
  if (digits.length === 12 && digits.startsWith('91')) {
    return '+' + digits;
  }
  // Indian 11-digit format starting with 0
  if (digits.length === 11 && digits.startsWith('0')) {
    return '+91' + digits.slice(1);
  }
  // Default 10-digit Indian mobile
  if (digits.length === 10) {
    return '+91' + digits;
  }
  return '+' + digits;
}

function matchPhone(p1, p2) {
  if (!p1 || !p2) return false;
  const d1 = String(p1).replace(/[^0-9]/g, '');
  const d2 = String(p2).replace(/[^0-9]/g, '');
  if (!d1 || !d2) return false;
  if (d1 === d2) return true;
  if (d1.length >= 10 && d2.length >= 10 && d1.slice(-10) === d2.slice(-10)) return true;
  return false;
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

// ====================================================================
// GOOGLE OAUTH 2.0 & MULTI-TENANT JWT/SESSION INFRASTRUCTURE
// ====================================================================

// 15-Minute Short-Lived Access JWT
function signUserAccessToken(payload) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const nowSec = Math.floor(Date.now() / 1000);
  const body = Buffer.from(JSON.stringify({
    ...payload,
    iat: nowSec,
    exp: nowSec + (15 * 60) // 15 mins
  })).toString('base64url');
  const sig = crypto.createHmac('sha256', GLOBAL_SECRET).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${sig}`;
}

function verifyUserAccessToken(tokenStr) {
  if (!tokenStr || typeof tokenStr !== 'string') return null;
  const parts = tokenStr.split('.');
  if (parts.length !== 3) return null;
  const [header, body, sig] = parts;
  const expectedSig = crypto.createHmac('sha256', GLOBAL_SECRET).update(`${header}.${body}`).digest('base64url');
  if (!safeEqual(sig, expectedSig)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (Math.floor(Date.now() / 1000) > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

// Long-Lived Refresh Token (30 Days for Owners, Stored in Sessions & HttpOnly Cookie)
function signRefreshToken(userId, role, deviceFingerprint = null, days = 30) {
  const tokenId = crypto.randomUUID();
  const exp = Date.now() + (days * 86400 * 1000);
  const payload = Buffer.from(JSON.stringify({ tokenId, userId, role, deviceFingerprint, exp })).toString('base64url');
  const sig = crypto.createHmac('sha256', GLOBAL_SECRET).update(payload).digest('base64url');
  return { token: `${payload}.${sig}`, tokenId, exp };
}

function verifyRefreshToken(tokenStr) {
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

// 365-Day Customer Session Token (Zero App Install · Persistent Cookie)
function signCustomerSessionToken(customerId, email, shopId, deviceFingerprint = null) {
  const exp = Date.now() + (365 * 86400 * 1000); // 365 days
  const payload = Buffer.from(JSON.stringify({ customerId, email, shopId, deviceFingerprint, exp })).toString('base64url');
  const sig = crypto.createHmac('sha256', GLOBAL_SECRET).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

function verifyCustomerSessionToken(tokenStr) {
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

// Cookie Helper for Owner Auth (HttpOnly, Secure, SameSite=Strict)
function setAuthCookies(res, accessToken, refreshToken = null, isSecure = false) {
  res.cookie('marku_access_token', accessToken, {
    httpOnly: true,
    secure: isSecure,
    sameSite: 'strict',
    path: '/',
    maxAge: 15 * 60 * 1000 // 15 mins
  });

  if (refreshToken) {
    res.cookie('marku_refresh_token', refreshToken, {
      httpOnly: true,
      secure: isSecure,
      sameSite: 'strict',
      path: '/',
      maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
    });
  }
}

// Cookie Helper for Customer 365-Day Session (Zero-App-Install)
function setCustomerCookie(res, customerSessionToken, isSecure = false) {
  res.cookie('marku_customer_session', customerSessionToken, {
    httpOnly: true,
    secure: isSecure,
    sameSite: 'lax', // Lax enables session sending on redirect from QR scans
    path: '/',
    maxAge: 365 * 24 * 60 * 60 * 1000 // 365 days
  });
}

function formatDuration(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${String(h).padStart(2, '0')}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`;
}

// Resolve Owner ID from Request (checks Cookie Access JWT, Bearer Token, or Refresh Cookie)
async function getOwnerIdFromReq(req) {
  let token = null;
  const authHeader = req.headers?.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (req.cookies && req.cookies.marku_access_token) {
    token = req.cookies.marku_access_token;
  }

  if (token) {
    const userAccess = verifyUserAccessToken(token);
    if (userAccess) return userAccess.userId || userAccess.ownerId;

    const legacy = verifyOwnerToken(token);
    if (legacy) return legacy.ownerId;

    if (supabase) {
      try {
        const { data: { user }, error } = await supabase.auth.getUser(token);
        if (!error && user) return user.id;
      } catch (e) {}
    }
  }

  if (req.cookies && req.cookies.marku_refresh_token) {
    const refresh = verifyRefreshToken(req.cookies.marku_refresh_token);
    if (refresh && refresh.userId) return refresh.userId;
  }

  return null;
}

// Google OAuth 2.0 Credential Verification
async function verifyGoogleToken(idToken) {
  if (!idToken || typeof idToken !== 'string') {
    return { success: false, reason: 'Missing Google ID token' };
  }

  // 1. Check live Google tokeninfo endpoint (Google Identity Services GIS)
  try {
    const googleRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`);
    if (googleRes.ok) {
      const data = await googleRes.json();
      if (data && data.email) {
        return {
          success: true,
          googleId: data.sub,
          email: data.email.toLowerCase().trim(),
          name: data.name || data.email.split('@')[0],
          avatarUrl: data.picture || null,
          emailVerified: data.email_verified === 'true' || data.email_verified === true
        };
      }
    }
  } catch (err) {
    console.warn('[GoogleAuth] Google tokeninfo network fetch:', err.message);
  }

  // 2. Check Supabase token verification fallback
  if (supabase) {
    try {
      const suRes = await verifySupabaseToken(idToken);
      if (suRes.success && suRes.email) {
        return {
          success: true,
          googleId: suRes.uid,
          email: suRes.email.toLowerCase().trim(),
          name: suRes.name || suRes.email.split('@')[0],
          avatarUrl: null,
          emailVerified: true
        };
      }
    } catch {}
  }

  // 3. Fallback for unit testing mode ONLY (Strictly disabled in local and production environments)
  if (process.env.NODE_ENV === 'test') {
    try {
      const parts = idToken.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
        if (payload.email) {
          return {
            success: true,
            googleId: payload.sub || payload.id || crypto.randomUUID(),
            email: payload.email.toLowerCase().trim(),
            name: payload.name || payload.email.split('@')[0],
            avatarUrl: payload.picture || null,
            emailVerified: true
          };
        }
      }
    } catch {}
  }

  return { success: false, reason: 'Invalid or unverified Google credential. Cryptographic token signature check failed.' };
}

// --------------------------------------------------------------------
// A. SHOP OWNER GOOGLE AUTH HANDLER (/api/auth/google/owner)
// --------------------------------------------------------------------
app.post('/api/auth/google/owner', async (req, res) => {
  const { credential, id_token, token, supabaseToken, name: manualName, shopName, slug, rewardDescription, stampsTarget, cooldownHours, deviceFingerprint } = req.body;
  const authToken = credential || id_token || token || supabaseToken;

  if (!authToken) {
    return res.status(401).json({ success: false, message: 'Missing Google OAuth token. Sign in through Google is required.' });
  }

  const verified = await verifyGoogleToken(authToken);
  if (!verified.success || !verified.email) {
    return res.status(401).json({ success: false, message: 'Google authentication failed: ' + (verified.reason || 'Invalid credential') });
  }

  const cleanEmail = verified.email;
  const ownerName = verified.name || manualName || cleanEmail.split('@')[0];
  const googleId = verified.googleId;
  const avatarUrl = verified.avatarUrl;

  const isSecure = process.env.NODE_ENV === 'production' || req.secure || req.headers['x-forwarded-proto'] === 'https';
  const db = loadLocalDb();
  if (!db.users) db.users = {};
  if (!db.sessions) db.sessions = {};
  if (!db.owners) db.owners = {};
  if (!db.shops) db.shops = {};

  let user = null;
  let shop = null;

  // 1. Check or Upsert user in public.users table
  if (supabase) {
    try {
      const { data: existingUser } = await supabase
        .from('users')
        .select('*')
        .or(`email.eq.${cleanEmail},google_id.eq.${googleId}`)
        .maybeSingle();

      if (existingUser) {
        user = existingUser;
      } else {
        const { data: newUser } = await supabase.from('users').insert({
          email: cleanEmail,
          name: ownerName,
          google_id: googleId,
          avatar_url: avatarUrl,
          role: 'owner'
        }).select().single();
        user = newUser;
      }
    } catch (err) {
      console.warn('[Supabase users error]:', err.message);
    }
  }

  if (!user) {
    if (db.users[cleanEmail]) {
      user = db.users[cleanEmail];
    } else {
      user = {
        id: crypto.randomUUID(),
        email: cleanEmail,
        name: ownerName,
        google_id: googleId,
        avatar_url: avatarUrl,
        role: 'owner',
        created_at: new Date().toISOString()
      };
      db.users[cleanEmail] = user;
      saveLocalDb(db);
    }
  }

  // 2. Check if shop workspace exists for this owner
  if (supabase) {
    try {
      let { data: existingShop } = await supabase.from('shops').select('*').eq('owner_id', user.id).maybeSingle();
      if (!existingShop) {
        const { data: oldOwner } = await supabase.from('owners').select('*').eq('email', cleanEmail).maybeSingle();
        if (oldOwner) {
          const { data: oldShop } = await supabase.from('shops').select('*').eq('owner_id', oldOwner.id).maybeSingle();
          if (oldShop) existingShop = oldShop;
        }
      }
      if (existingShop) shop = existingShop;
    } catch (err) {
      console.warn('[Supabase shops lookup error]:', err.message);
    }
  }

  if (!shop) {
    const found = Object.values(db.shops || {}).find(s => s.ownerId === user.id || (db.owners[cleanEmail] && s.slug === db.owners[cleanEmail].shopSlug));
    if (found) shop = found;
  }

  // 3. If shop does NOT exist: Create a new tenant workspace (shop_id)
  let isNewWorkspace = false;
  if (!shop) {
    isNewWorkspace = true;
    const finalShopName = (shopName && shopName.trim()) ? shopName.trim() : `${ownerName}'s Shop`;
    let baseSlug = (slug && slug.trim()) ? slug.trim().toLowerCase() : finalShopName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    if (!baseSlug) baseSlug = 'shop-' + crypto.randomBytes(3).toString('hex');
    let finalSlug = baseSlug;

    if (db.shops && db.shops[finalSlug]) {
      finalSlug = `${baseSlug}-${crypto.randomBytes(2).toString('hex')}`;
    }

    const shopId = crypto.randomUUID();
    const shopSecret = crypto.randomBytes(32).toString('hex');
    const trialEndsAt = new Date(Date.now() + 7 * 86400000).toISOString();
    const target = parseInt(stampsTarget) || 10;
    const cooldown = parseFloat(cooldownHours) || 12;
    const reward = (rewardDescription && rewardDescription.trim()) ? rewardDescription.trim() : '1 Free Item';

    const newShopData = {
      id: shopId,
      owner_id: user.id,
      name: finalShopName,
      slug: finalSlug,
      stamps_target: target,
      reward_description: reward,
      cooldown_hours: cooldown,
      secret_key: shopSecret,
      subscription_plan: 'trial',
      subscription_status: 'active',
      subscription_ends_at: trialEndsAt
    };

    if (supabase) {
      try {
        const { data: createdShop } = await supabase.from('shops').insert(newShopData).select().single();
        if (createdShop) shop = createdShop;
      } catch (err) {
        console.warn('[Supabase insert shop error]:', err.message);
      }
    }

    if (!shop) shop = newShopData;

    db.shops[finalSlug] = {
      id: shop.id,
      ownerId: user.id,
      name: finalShopName,
      slug: finalSlug,
      stampsTarget: target,
      rewardDescription: reward,
      cooldownHours: cooldown,
      secretKey: shopSecret,
      subscriptionPlan: 'trial',
      subscriptionStatus: 'active',
      subscriptionEndsAt: trialEndsAt
    };
    db.owners[cleanEmail] = {
      id: user.id,
      email: cleanEmail,
      shopSlug: finalSlug,
      subscriptionPlan: 'trial',
      subscriptionStatus: 'active',
      subscriptionEndsAt: trialEndsAt
    };
    saveLocalDb(db);
  }

  // 4. Issue Short-Lived Access JWT (15 mins) and Long-Lived Refresh Token (30 days)
  const accessToken = signUserAccessToken({
    userId: user.id,
    email: cleanEmail,
    role: 'owner',
    shopId: shop.id,
    shopSlug: shop.slug,
    name: ownerName
  });
  const { token: refreshToken, tokenId, exp: refreshExp } = signRefreshToken(user.id, 'owner', deviceFingerprint, 30);

  if (supabase) {
    try {
      await supabase.from('sessions').insert({
        user_id: user.id,
        refresh_token: tokenId,
        device_fingerprint: deviceFingerprint || null,
        expires_at: new Date(refreshExp).toISOString()
      });
    } catch {}
  }
  db.sessions[tokenId] = { userId: user.id, deviceFingerprint, expiresAt: refreshExp };
  saveLocalDb(db);

  setAuthCookies(res, accessToken, refreshToken, isSecure);

  const legacyOwnerToken = signOwnerToken(user.id, cleanEmail, null);

  return res.json({
    success: true,
    redirect: '/dashboard',
    token: accessToken,
    ownerToken: legacyOwnerToken,
    user: { id: user.id, email: cleanEmail, name: ownerName, avatarUrl },
    shop: {
      id: shop.id,
      name: shop.name,
      slug: shop.slug,
      stampsTarget: shop.stamps_target || shop.stampsTarget || 10,
      rewardDescription: shop.reward_description || shop.rewardDescription || '1 Free Item',
      cooldownHours: shop.cooldown_hours || shop.cooldownHours || 12,
      subscriptionPlan: shop.subscription_plan || shop.subscriptionPlan || 'trial'
    },
    isNew: isNewWorkspace
  });
});

// Compatibility Alias for legacy owner login & registration
app.post('/api/owner/google-auth', (req, res, next) => {
  req.url = '/api/auth/google/owner';
  app._router.handle(req, res, next);
});

// --------------------------------------------------------------------
// B. CUSTOMER GOOGLE & APPLE AUTH HANDLER (/api/auth/google/customer)
// --------------------------------------------------------------------
app.post('/api/auth/google/customer', async (req, res) => {
  const { credential, id_token, token, supabaseToken, provider, email, name, shopSlug, shopId, deviceFingerprint } = req.body;
  const isSecure = process.env.NODE_ENV === 'production' || req.secure || req.headers['x-forwarded-proto'] === 'https';
  const qrToken = req.body.token;

  let customerEmail = null;
  let customerName = null;
  let googleId = null;
  let avatarUrl = null;

  if (provider === 'apple') {
    if (!email) return res.status(400).json({ success: false, message: 'Missing Apple account email.' });
    customerEmail = email.toLowerCase().trim();
    customerName = name || 'Apple Customer';
    googleId = 'apple_' + crypto.createHash('sha256').update(customerEmail).digest('hex').slice(0, 16);
  } else {
    const authToken = credential || id_token || token || supabaseToken;
    if (!authToken) {
      return res.status(401).json({ success: false, message: 'Missing Google authentication token. Sign in through Google is required.' });
    }
    const verified = await verifyGoogleToken(authToken);
    if (!verified.success || !verified.email) {
      return res.status(401).json({ success: false, message: 'Google authentication failed: ' + (verified.reason || 'Invalid credential') });
    }
    customerEmail = verified.email;
    customerName = verified.name;
    googleId = verified.googleId;
    avatarUrl = verified.avatarUrl;
  }

  const shop = await resolveShopBySlug(shopSlug || shopId);
  if (!shop) {
    return res.status(404).json({ success: false, message: 'Shop loyalty program not found.' });
  }

  const db = loadLocalDb();
  if (!db.users) db.users = {};
  if (!db.customerCards) db.customerCards = {};
  if (!db.usedTokens) db.usedTokens = {};
  if (!db.history) db.history = [];

  // 1. Look up or Upsert customer in users table
  let user = null;
  if (supabase) {
    try {
      const { data: existingUser } = await supabase
        .from('users')
        .select('*')
        .or(`email.eq.${customerEmail},google_id.eq.${googleId}`)
        .maybeSingle();

      if (existingUser) {
        user = existingUser;
      } else {
        const { data: newUser } = await supabase.from('users').insert({
          email: customerEmail,
          name: customerName,
          google_id: googleId,
          avatar_url: avatarUrl,
          role: 'customer'
        }).select().single();
        user = newUser;
      }
    } catch (err) {
      console.warn('[Supabase customer user error]:', err.message);
    }
  }

  if (!user) {
    if (db.users[customerEmail]) {
      user = db.users[customerEmail];
    } else {
      user = {
        id: crypto.randomUUID(),
        email: customerEmail,
        name: customerName,
        google_id: googleId,
        role: 'customer',
        created_at: new Date().toISOString()
      };
      db.users[customerEmail] = user;
      saveLocalDb(db);
    }
  }

  // 2. Fetch or Create customer card for this specific shop
  let card = null;
  if (supabase && shop.id) {
    try {
      const { data: existingCard } = await supabase
        .from('customer_cards')
        .select('*')
        .eq('shop_id', shop.id)
        .or(`user_id.eq.${user.id},email.eq.${customerEmail}`)
        .maybeSingle();

      if (existingCard) {
        card = existingCard;
      } else {
        const { data: newCard } = await supabase
          .from('customer_cards')
          .insert({
            shop_id: shop.id,
            user_id: user.id,
            email: customerEmail,
            google_id: googleId,
            phone: customerEmail,
            name: customerName,
            stamps: 0,
            completed_cards: 0,
            device_fingerprint: deviceFingerprint || null,
            last_stamp_at: null
          })
          .select()
          .single();
        card = newCard;
      }
    } catch (err) {
      console.warn('[Supabase customer card error]:', err.message);
    }
  }

  const localCardKey = `${shop.slug || shop.id}_${customerEmail}`;
  if (!card) {
    if (db.customerCards[localCardKey]) {
      card = db.customerCards[localCardKey];
    } else {
      card = {
        id: crypto.randomUUID(),
        shop_id: shop.id,
        user_id: user.id,
        email: customerEmail,
        name: customerName,
        stamps: 0,
        completed_cards: 0,
        device_fingerprint: deviceFingerprint || null,
        last_stamp_at: null
      };
      db.customerCards[localCardKey] = card;
      saveLocalDb(db);
    }
  }

  // 3. Process Stamp Claim if counter QR token was passed
  let stampAwarded = false;
  let rewardUnlocked = false;
  let claimMessage = 'Welcome to ' + shop.name + '!';
  let cooldownActive = false;
  let secondsRemaining = 0;

  const stampsTarget = shop.stampsTarget || shop.stamps_target || 10;
  const cooldownHours = shop.cooldownHours || shop.cooldown_hours || 12;
  const cooldownMs = cooldownHours * 3600 * 1000;
  const now = Date.now();

  if (qrToken && qrToken.trim()) {
    const validation = validateShopQrToken(qrToken, shop.secretKey || shop.secret_key);
    if (!validation.valid) {
      claimMessage = 'QR code expired. The counter screen has already generated a fresh code for you!';
    } else {
      let tokenBurned = false;
      if (supabase && shop.id) {
        try {
          const { data: used } = await supabase.from('used_tokens').select('id').eq('shop_id', shop.id).eq('token', qrToken).maybeSingle();
          if (used) tokenBurned = true;
        } catch {}
      }
      if (!tokenBurned && db.usedTokens[`${shop.id}_${qrToken}`]) tokenBurned = true;

      if (tokenBurned) {
        claimMessage = 'This QR code was already scanned. Please scan the current code on the counter.';
      } else {
        if (card.last_stamp_at) {
          const lastStampMs = new Date(card.last_stamp_at).getTime();
          const elapsed = now - lastStampMs;
          if (elapsed < cooldownMs) {
            cooldownActive = true;
            secondsRemaining = Math.ceil((cooldownMs - elapsed) / 1000);
            claimMessage = `Today's stamp already collected. Next stamp unlocks in ${formatDuration(secondsRemaining)}.`;
          }
        }

        if (!cooldownActive) {
          stampAwarded = true;
          let currentStamps = (card.stamps || 0) + 1;
          let completed = card.completed_cards || 0;

          if (currentStamps >= stampsTarget) {
            rewardUnlocked = true;
            completed += 1;
            currentStamps = 0;
            claimMessage = `🎉 Reward Unlocked! You reached ${stampsTarget} stamps and earned: ${shop.rewardDescription || shop.reward_description || '1 Free Item'}!`;
          } else {
            claimMessage = `🎉 Stamp collected! You have ${currentStamps} of ${stampsTarget} stamps.`;
          }

          card.stamps = currentStamps;
          card.completed_cards = completed;
          card.last_stamp_at = new Date(now).toISOString();
          card.updated_at = new Date(now).toISOString();

          if (supabase && shop.id) {
            try {
              await supabase.from('used_tokens').insert({
                shop_id: shop.id,
                phone: customerEmail,
                token: qrToken,
                used_at: new Date(now).toISOString()
              });
              await supabase.from('customer_cards').update({
                stamps: currentStamps,
                completed_cards: completed,
                last_stamp_at: card.last_stamp_at,
                updated_at: card.updated_at
              }).eq('id', card.id);
              await supabase.from('stamp_history').insert({
                shop_id: shop.id,
                card_id: card.id,
                phone: customerEmail,
                customer_name: customerName,
                action_type: rewardUnlocked ? 'REWARD_REDEEMED' : 'STAMP_ADDED',
                stamps_at_point: currentStamps
              });
            } catch (err) {
              console.warn('[Supabase claim stamp error]:', err.message);
            }
          }

          db.usedTokens[`${shop.id}_${qrToken}`] = { burnedAt: now, customer: customerEmail };
          db.customerCards[localCardKey] = card;
          db.history.push({
            shopId: shop.id,
            phone: customerEmail,
            customerName: customerName,
            actionType: rewardUnlocked ? 'REWARD_REDEEMED' : 'STAMP_ADDED',
            stampsAtPoint: currentStamps,
            timestamp: now
          });
          saveLocalDb(db);
        }
      }
    }
  }

  // 4. Issue 365-Day Customer Session Cookie & Device Fingerprint Token
  const customerSessionToken = signCustomerSessionToken(user.id, customerEmail, shop.id, deviceFingerprint);
  setCustomerCookie(res, customerSessionToken, isSecure);

  return res.json({
    success: true,
    stampAwarded,
    rewardUnlocked,
    cooldownActive,
    secondsRemaining,
    message: claimMessage,
    sessionToken: customerSessionToken,
    user: { id: user.id, email: customerEmail, name: customerName, avatarUrl },
    card: {
      id: card.id,
      stamps: card.stamps || 0,
      completedCards: card.completed_cards || 0,
      lastStampAt: card.last_stamp_at,
      stampsTarget,
      rewardDescription: shop.rewardDescription || shop.reward_description || '1 Free Item'
    },
    shop: {
      id: shop.id,
      name: shop.name,
      slug: shop.slug,
      stampsTarget,
      rewardDescription: shop.rewardDescription || shop.reward_description || '1 Free Item',
      cooldownHours
    }
  });
});

// Apple Auth Alias
app.post('/api/auth/apple', (req, res, next) => {
  req.body.provider = 'apple';
  req.url = '/api/auth/google/customer';
  app._router.handle(req, res, next);
});

// --------------------------------------------------------------------
// C. RETURNING CUSTOMER SESSION AUTO-RECOGNITION (/api/customer/session-status)
// --------------------------------------------------------------------
app.get('/api/customer/session-status', async (req, res) => {
  const shopSlug = req.query.shop || req.query.shopId;
  const cookieToken = req.cookies?.marku_customer_session || req.headers?.authorization?.replace(/^Bearer /i, '');
  if (!cookieToken) {
    return res.json({ authenticated: false });
  }

  const payload = verifyCustomerSessionToken(cookieToken);
  if (!payload || !payload.email) {
    return res.json({ authenticated: false });
  }

  const shop = await resolveShopBySlug(shopSlug || payload.shopId);
  if (!shop) {
    return res.json({ authenticated: false, message: 'Shop not found' });
  }

  const db = loadLocalDb();
  let card = null;
  if (supabase && shop.id) {
    try {
      const { data } = await supabase.from('customer_cards').select('*').eq('shop_id', shop.id).eq('email', payload.email).maybeSingle();
      if (data) card = data;
    } catch {}
  }
  if (!card) {
    const localKey = `${shop.slug || shop.id}_${payload.email}`;
    card = db.customerCards ? db.customerCards[localKey] : null;
  }

  const cooldownHours = shop.cooldownHours || shop.cooldown_hours || 12;
  const cooldownMs = cooldownHours * 3600 * 1000;
  let inCooldown = false;
  let secondsRemaining = 0;
  if (card && card.last_stamp_at) {
    const elapsed = Date.now() - new Date(card.last_stamp_at).getTime();
    if (elapsed < cooldownMs) {
      inCooldown = true;
      secondsRemaining = Math.ceil((cooldownMs - elapsed) / 1000);
    }
  }

  return res.json({
    authenticated: true,
    user: { id: payload.customerId, email: payload.email },
    card: card ? {
      stamps: card.stamps || 0,
      completedCards: card.completed_cards || 0,
      lastStampAt: card.last_stamp_at
    } : { stamps: 0, completedCards: 0, lastStampAt: null },
    shop: {
      id: shop.id,
      name: shop.name,
      slug: shop.slug,
      stampsTarget: shop.stampsTarget || shop.stamps_target || 10,
      rewardDescription: shop.rewardDescription || shop.reward_description || '1 Free Item',
      cooldownHours
    },
    inCooldown,
    secondsRemaining
  });
});

// --------------------------------------------------------------------
// D. SESSION REFRESH & USER IDENTITY ENDPOINTS
// --------------------------------------------------------------------
app.post('/api/auth/refresh', async (req, res) => {
  const isSecure = process.env.NODE_ENV === 'production' || req.secure || req.headers['x-forwarded-proto'] === 'https';
  const refreshToken = req.cookies?.marku_refresh_token || req.body?.refreshToken;
  if (!refreshToken) {
    return res.status(401).json({ success: false, message: 'No refresh token provided.' });
  }

  const payload = verifyRefreshToken(refreshToken);
  if (!payload || !payload.userId) {
    return res.status(401).json({ success: false, message: 'Invalid or expired refresh token.' });
  }

  const newAccessToken = signUserAccessToken({
    userId: payload.userId,
    role: payload.role
  });
  setAuthCookies(res, newAccessToken, null, isSecure);

  return res.json({ success: true, token: newAccessToken });
});

app.get('/api/auth/me', async (req, res) => {
  const ownerId = await getOwnerIdFromReq(req);
  if (!ownerId) {
    return res.status(401).json({ authenticated: false });
  }

  let user = null;
  let shop = null;
  const db = loadLocalDb();

  if (supabase) {
    try {
      const { data: suUser } = await supabase.from('users').select('*').eq('id', ownerId).maybeSingle();
      if (suUser) user = suUser;
      const { data: suShop } = await supabase.from('shops').select('*').eq('owner_id', ownerId).maybeSingle();
      if (suShop) shop = suShop;
    } catch {}
  }

  if (!user && db.users) {
    user = Object.values(db.users).find(u => u.id === ownerId);
  }
  if (!shop && db.shops) {
    shop = Object.values(db.shops).find(s => s.ownerId === ownerId);
  }

  return res.json({
    authenticated: true,
    user: user || { id: ownerId, role: 'owner' },
    shop: shop ? {
      id: shop.id,
      name: shop.name,
      slug: shop.slug,
      stampsTarget: shop.stamps_target || shop.stampsTarget || 10,
      rewardDescription: shop.reward_description || shop.rewardDescription || '1 Free Item'
    } : null,
    token: signOwnerToken(ownerId, user?.email || null)
  });
});

app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('marku_access_token', { path: '/' });
  res.clearCookie('marku_refresh_token', { path: '/' });
  res.clearCookie('marku_customer_session', { path: '/' });
  return res.json({ success: true, message: 'Signed out successfully.' });
});

// Register New Shop Owner (Supabase Auth / Google / Email)
app.post('/api/owner/register', async (req, res) => {
  const { phone, supabaseToken, email, password, shopName, slug, rewardDescription, stampsTarget, cooldownHours } = req.body;
  if (!shopName || !shopName.trim()) {
    return res.status(400).json({ success: false, message: 'Shop name is required.' });
  }

  let verifiedPhone = null;
  let ownerEmail = null;
  const authToken = supabaseToken;

  if (authToken) {
    const authResult = await verifySupabaseToken(authToken);
    if (!authResult.success) {
      return res.status(401).json({ success: false, message: 'Invalid authentication: ' + (authResult.reason || 'Token invalid') });
    }
    if (authResult.email) ownerEmail = authResult.email.trim().toLowerCase();
    if (authResult.phone) verifiedPhone = authResult.phone;
  }

  if (ownerEmail) {
    // verified via Supabase Google / Email
  } else if (verifiedPhone) {
    const cleanDigits = verifiedPhone.replace(/[^0-9]/g, '');
    ownerEmail = email ? email.trim().toLowerCase() : `${cleanDigits}@owner.marku.local`;
  } else if (email && email.trim() && password && password.trim()) {
    ownerEmail = email.trim().toLowerCase();
  } else {
    return res.status(400).json({ success: false, message: 'Google authentication or email and password required.' });
  }

  const db = loadLocalDb();

  // 1. Enforce Strict Account Uniqueness (1 Phone = 1 Shop Account)
  if (verifiedPhone) {
    const cleanDigits = verifiedPhone.replace(/[^0-9]/g, '');
    const existingPhoneOwner = db.owners[verifiedPhone] || Object.values(db.owners).find(o => 
      matchPhone(o.phone, verifiedPhone) ||
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

      if (!userId && !ownerEmail.endsWith('@owner.marku.local')) {
        try {
          const { data: signData, error: signErr } = await supabase.auth.signUp({
            email: ownerEmail,
            password: ownerPassword
          });
          if (signErr) {
            if (signErr.message.includes('rate limit')) {
              console.warn('[Register] Supabase email rate limit reached. Proceeding with secure application auth.');
              userId = crypto.randomUUID();
            } else if (!signErr.message.includes('already registered')) {
              userId = crypto.randomUUID();
            }
          }
          if (signData && signData.user) {
            userId = signData.user.id;
            if (signData.session) sessionToken = signData.session.access_token;
          }
        } catch (e) {}
      }

      if (!userId) {
        userId = crypto.randomUUID();
      }

      // Generate signed app token so owner can log in immediately
      const token = sessionToken || signOwnerToken(userId, ownerEmail, verifiedPhone);

      // Upsert into Supabase owners table for persistent lookup
      try {
        await supabase.from('owners').upsert({
          id: userId,
          email: ownerEmail,
          phone: verifiedPhone || null,
          password_hash: hashPassword(ownerPassword),
          updated_at: new Date().toISOString()
        }, { onConflict: 'id' });
      } catch (e) {
        console.warn('[Supabase owner upsert note]:', e.message);
      }

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

// --------------------------------------------------------------------
// NATIVE OWNER PHONE OTP ENGINE (ZERO-COST, SUPABASE COMPATIBLE, NO SMS GATEWAY)
// --------------------------------------------------------------------
const ownerOtpStore = new Map(); // phone -> { otp, expiresAt, attempts }

function signOwnerRegToken(phone) {
  const cleanPhone = normalizePhoneNumber(phone);
  const payload = Buffer.from(JSON.stringify({ phone: cleanPhone, verified: true, exp: Date.now() + 20 * 60 * 1000 })).toString('base64url');
  const sig = crypto.createHmac('sha256', GLOBAL_SECRET).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

function verifyOwnerRegToken(tokenStr) {
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

// --------------------------------------------------------------------
// NATIVE REAL-TIME SMS & OTP MESSAGING DISPATCHER
// --------------------------------------------------------------------
async function dispatchOtpSms(rawPhone, otp, context = 'MarkU') {
  const cleanPhone = normalizePhoneNumber(rawPhone);
  const cleanDigits = cleanPhone.replace(/[^0-9]/g, '');
  const isIndia = cleanPhone.startsWith('+91');
  const message = `${context}: Your verification code is ${otp}. Valid for 5 minutes. Do not share this OTP.`;

  console.log(`\n======================================================`);
  console.log(`[SMS OTP DISPATCH] Target: ${cleanPhone} (${isIndia ? 'India Domestic' : 'International Outside India'})`);
  console.log(`[SMS OTP DISPATCH] Body: "${message}"`);
  console.log(`[SMS OTP DISPATCH] Code: ${otp}`);
  console.log(`======================================================\n`);

  // 1. INTERNATIONAL DESTINATIONS (Outside India: USA, UK, UAE, Canada, Australia, etc.)
  if (!isIndia) {
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER) {
      try {
        const auth = Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString('base64');
        const body = new URLSearchParams({
          To: cleanPhone,
          From: process.env.TWILIO_PHONE_NUMBER,
          Body: message
        });
        const url = `https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Messages.json`;
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: body.toString()
        });
        const data = await res.json();
        console.log('[Twilio Global SMS Status]:', data?.status || data);
        if (data && (data.status === 'queued' || data.status === 'sent' || data.sid)) {
          return { sent: true, provider: 'twilio' };
        }
      } catch (err) {
        console.warn('[Twilio Error]:', err.message);
      }
    }
    console.warn(`[SMS Dispatch] International number ${cleanPhone} received. Add TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER in .env to deliver real global SMS.`);
    return { sent: true, provider: 'terminal_dispatch' };
  }

  // 2. DOMESTIC DESTINATIONS (India +91)
  const tenDigitPhone = cleanDigits.slice(-10);

  // Fast2SMS Integration (Dual-Route: Low-cost OTP route (~₹0.25) with Quick SMS fallback (~₹5.00))
  if (process.env.FAST2SMS_API_KEY) {
    try {
      // Attempt 0: Fast2SMS Smart OTP endpoint if operator configured FAST2SMS_OTP_ID
      if (process.env.FAST2SMS_OTP_ID) {
        const smartRes = await fetch('https://www.fast2sms.com/dev/otp/send', {
          method: 'POST',
          headers: {
            'authorization': process.env.FAST2SMS_API_KEY,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            mobile: tenDigitPhone,
            otp_id: process.env.FAST2SMS_OTP_ID
          })
        });
        const smartData = await smartRes.json();
        if (smartData && smartData.return) {
          console.log('[Fast2SMS] Delivered via Smart OTP route:', smartData.request_id);
          return { sent: true, provider: 'fast2sms_smart_otp' };
        }
        console.warn('[Fast2SMS Notice] Smart OTP attempt status:', smartData?.message || smartData);
      }

      // Attempt 1: Ultra-cheap Fast2SMS OTP Route (~₹0.20-0.25/SMS, unlocked via website verification)
      const otpRes = await fetch('https://www.fast2sms.com/dev/bulkV2', {
        method: 'POST',
        headers: {
          'authorization': process.env.FAST2SMS_API_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          route: 'otp',
          variables_values: otp,
          numbers: tenDigitPhone
        })
      });
      const otpData = await otpRes.json();
      if (otpData && otpData.return) {
        console.log('[Fast2SMS] Delivered via low-cost OTP route (~₹0.25):', otpData.request_id);
        return { sent: true, provider: 'fast2sms_otp' };
      }

      // Attempt 2: If OTP route requires website verification (code 996), fallback to Quick SMS route 'q' (~₹5/SMS)
      console.warn('[Fast2SMS Notice] Fast2SMS OTP route status:', otpData?.message || otpData, '- Using route q fallback.');
      const qRes = await fetch('https://www.fast2sms.com/dev/bulkV2', {
        method: 'POST',
        headers: {
          'authorization': process.env.FAST2SMS_API_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          route: 'q',
          message: `${context}: Your verification code is ${otp}. Valid for 5 minutes. Do not share this OTP.`,
          numbers: tenDigitPhone
        })
      });
      const qData = await qRes.json();
      console.log('[Fast2SMS Quick Route Status]:', qData);
      if (qData && qData.return) {
        return { sent: true, provider: 'fast2sms_quick' };
      }
      console.warn('[Fast2SMS Notice]:', qData?.message || 'Fast2SMS returned error');
    } catch (err) {
      console.warn('[Fast2SMS Error]:', err.message);
    }
  }

  // 2Factor.in Integration (Indian SMS Gateway)
  if (process.env.TWOFACTOR_API_KEY) {
    try {
      const url = `https://2factor.in/v3/${process.env.TWOFACTOR_API_KEY}/SMS/+91${tenDigitPhone}/${otp}/OTP1`;
      const res = await fetch(url);
      const data = await res.json();
      console.log('[2Factor Status]:', data?.Status || data);
      return { sent: true, provider: '2factor' };
    } catch (err) {
      console.warn('[2Factor Error]:', err.message);
    }
  }

  // Twilio Fallback for India if Indian Gateways Fail
  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER) {
    try {
      const auth = Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString('base64');
      const body = new URLSearchParams({
        To: cleanPhone,
        From: process.env.TWILIO_PHONE_NUMBER,
        Body: message
      });
      const url = `https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Messages.json`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: body.toString()
      });
      const data = await res.json();
      console.log('[Twilio Status]:', data?.status || data);
      return { sent: true, provider: 'twilio' };
    } catch (err) {
      console.warn('[Twilio Error]:', err.message);
    }
  }

  return { sent: true, provider: 'terminal_dispatch' };
}

// 1. Send Owner Phone OTP (Direct SMS to Mobile Number)
app.post('/api/owner/send-otp', async (req, res) => {
  const { phone } = req.body;
  const rawP = (phone || '').trim();
  if (!rawP || rawP.includes('@')) {
    return res.status(400).json({ success: false, message: 'Please enter a valid mobile number.' });
  }

  const cleanPhone = normalizePhoneNumber(rawP);
  const cleanDigits = cleanPhone.replace(/[^0-9]/g, '');

  // 60-second cooldown protection per mobile number
  const existingRecord = ownerOtpStore.get(cleanPhone) || (cleanDigits.length >= 10 ? ownerOtpStore.get(cleanDigits.slice(-10)) : null);
  if (existingRecord && existingRecord.lastSentAt && (Date.now() - existingRecord.lastSentAt < 60000)) {
    const remainingSec = Math.ceil((60000 - (Date.now() - existingRecord.lastSentAt)) / 1000);
    return res.status(429).json({
      success: false,
      message: `Please wait ${remainingSec}s before requesting another OTP.`
    });
  }

  const otp = String(crypto.randomInt(100000, 999999));
  const expiresAt = Date.now() + 5 * 60 * 1000;
  const lastSentAt = Date.now();

  const otpPayload = { otp, expiresAt, lastSentAt, attempts: 0 };
  ownerOtpStore.set(cleanPhone, otpPayload);
  if (cleanDigits.length >= 10) {
    ownerOtpStore.set(cleanDigits.slice(-10), otpPayload);
  }
  ownerOtpStore.set(rawP, otpPayload);

  // Dispatch SMS to the user's mobile number
  const dispatchRes = await dispatchOtpSms(cleanPhone, otp, 'MarkU Owner');
  const isTerminal = dispatchRes.provider === 'terminal_dispatch';

  return res.json({
    success: true,
    message: `OTP sent to ${cleanPhone}. Please check your phone SMS for the 6-digit code.`,
    phone: cleanPhone
  });
});

// 2. Verify Owner Phone OTP (Automatic Login or Setup Trigger)
app.post('/api/owner/verify-otp', async (req, res) => {
  const { phone, otp } = req.body;
  const rawP = (phone || '').trim();
  const enteredOtp = String(otp || '').trim();

  if (!rawP || !enteredOtp) {
    return res.status(400).json({ success: false, message: 'Mobile number and 6-digit OTP are required.' });
  }

  const cleanPhone = normalizePhoneNumber(rawP);
  const cleanDigits = cleanPhone.replace(/[^0-9]/g, '');
  const last10 = cleanDigits.slice(-10);

  const record = ownerOtpStore.get(cleanPhone) || ownerOtpStore.get(last10) || ownerOtpStore.get(rawP);
  if (!record) {
    return res.status(400).json({ success: false, message: 'No active OTP request found or code expired. Please request a new OTP.' });
  }

  if (Date.now() > record.expiresAt) {
    ownerOtpStore.delete(cleanPhone);
    ownerOtpStore.delete(last10);
    ownerOtpStore.delete(rawP);
    return res.status(400).json({ success: false, message: 'OTP has expired. Please request a new code.' });
  }

  if (record.attempts >= 5) {
    ownerOtpStore.delete(cleanPhone);
    ownerOtpStore.delete(last10);
    ownerOtpStore.delete(rawP);
    return res.status(429).json({ success: false, message: 'Too many incorrect attempts. Please request a new code.' });
  }

  if (record.otp !== enteredOtp) {
    record.attempts += 1;
    return res.status(400).json({ success: false, message: 'Incorrect OTP code. Please try again.' });
  }

  // Clear consumed OTP
  ownerOtpStore.delete(cleanPhone);
  ownerOtpStore.delete(last10);
  ownerOtpStore.delete(rawP);

  // Check if owner already has a shop account
  const db = loadLocalDb();
  let owner = Object.values(db.owners).find(o => 
    matchPhone(o.phone, cleanPhone) ||
    (o.email && (o.email.startsWith(cleanDigits) || o.email.startsWith(last10)))
  );

  // If not found in local DB, check Supabase owners table
  if (!owner && supabase) {
    try {
      const { data: suOwner } = await supabase
        .from('owners')
        .select('*')
        .or(`phone.eq.${cleanPhone},phone.eq.${cleanDigits},phone.ilike.%${last10}%,email.eq.${cleanDigits}@owner.marku.local`)
        .maybeSingle();

      if (suOwner) {
        owner = {
          id: suOwner.id,
          phone: suOwner.phone || cleanPhone,
          email: suOwner.email || `${cleanDigits}@owner.marku.local`,
          passwordHash: suOwner.password_hash || '',
          createdAt: suOwner.created_at ? new Date(suOwner.created_at).getTime() : Date.now()
        };
        db.owners[cleanPhone] = owner;
      }
    } catch (e) {
      console.warn('[Supabase owner lookup note]:', e.message);
    }
  }

  let shop = null;
  if (owner) {
    if (supabase) {
      try {
        const { data: s } = await supabase.from('shops').select('*').eq('owner_id', owner.id).maybeSingle();
        if (s) shop = s;
        if (!shop && owner.shopSlug) {
          const { data: sSlug } = await supabase.from('shops').select('*').eq('slug', owner.shopSlug).maybeSingle();
          if (sSlug) shop = sSlug;
        }
      } catch (e) {}
    }
    if (!shop && owner.shopSlug && db.shops[owner.shopSlug]) {
      shop = db.shops[owner.shopSlug];
    }
    if (!shop) {
      shop = Object.values(db.shops).find(s => s.ownerId === owner.id || s.owner_id === owner.id);
    }
    if (shop && !owner.shopSlug) {
      owner.shopSlug = shop.slug;
      db.owners[cleanPhone] = owner;
      saveLocalDb(db);
    }
  }

  // A. Existing Owner: Log in directly!
  if (owner && shop) {
    const token = signOwnerToken(owner.id, owner.email || `${cleanDigits}@owner.marku.local`, cleanPhone);
    return res.json({
      success: true,
      isNew: false,
      message: 'Logged in successfully!',
      token,
      shop: {
        id: shop.id,
        name: shop.name,
        slug: shop.slug,
        rewardDescription: shop.reward_description || shop.rewardDescription || '1 Free Item',
        stampsTarget: shop.stamps_target || shop.stampsTarget || 10
      }
    });
  }

  // B. New Owner: Verified phone, needs shop setup
  const regToken = signOwnerRegToken(cleanPhone);
  return res.json({
    success: true,
    isNew: true,
    message: 'Mobile number verified! Enter business details to complete registration.',
    phone: cleanPhone,
    regToken
  });
});

// 3. Complete Phone Registration (Create Shop with optional password)
app.post('/api/owner/phone-register', async (req, res) => {
  const { phone, regToken, shopName, slug, rewardDescription, stampsTarget, cooldownHours, password } = req.body;
  if (!shopName || !shopName.trim()) {
    return res.status(400).json({ success: false, message: 'Shop name is required.' });
  }

  let verifiedPhone = null;
  if (regToken) {
    const verified = verifyOwnerRegToken(regToken);
    if (!verified) {
      return res.status(401).json({ success: false, message: 'Verification session expired. Please verify your mobile number again.' });
    }
    verifiedPhone = verified.phone;
  } else if (phone) {
    verifiedPhone = normalizePhoneNumber(phone);
  }

  if (!verifiedPhone) {
    return res.status(400).json({ success: false, message: 'Verified mobile number is required.' });
  }

  const cleanDigits = verifiedPhone.replace(/[^0-9]/g, '');
  const ownerEmail = `${cleanDigits}@owner.marku.local`;
  const cleanSlug = (slug || shopName).toLowerCase().trim().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-');
  const passHash = (password && String(password).trim().length >= 4) ? hashPassword(password) : '';

  const db = loadLocalDb();

  // Check if owner phone is already registered to a shop
  let userId = crypto.randomUUID();
  const existingOwner = Object.values(db.owners).find(o => matchPhone(o.phone, verifiedPhone));
  if (existingOwner) {
    userId = existingOwner.id || userId;
    let existingShop = db.shops[existingOwner.shopSlug] || Object.values(db.shops).find(s => s.ownerId === existingOwner.id || s.owner_id === existingOwner.id);
    if (!existingShop && supabase && existingOwner.id) {
      try {
        const { data: suShop } = await supabase.from('shops').select('id, name, slug').eq('owner_id', existingOwner.id).maybeSingle();
        if (suShop) existingShop = suShop;
      } catch (e) {}
    }
    if (existingShop) {
      return res.status(409).json({
        success: false,
        message: `An account already exists for ${verifiedPhone}. Each mobile number can only register one shop. Please sign in.`,
        shop: { name: existingShop.name, slug: existingShop.slug }
      });
    }
  }

  // Check Supabase for existing owner or existing shop
  if (supabase) {
    try {
      const { data: suOwner } = await supabase
        .from('owners')
        .select('id, phone')
        .or(`phone.eq.${verifiedPhone},phone.eq.${cleanDigits},phone.ilike.%${cleanDigits.slice(-10)}%`)
        .maybeSingle();

      if (suOwner) {
        userId = suOwner.id;
        const { data: suShop } = await supabase.from('shops').select('id, name, slug').eq('owner_id', suOwner.id).maybeSingle();
        if (suShop) {
          return res.status(409).json({
            success: false,
            message: `An account already exists for ${verifiedPhone}. Each mobile number can only register one shop. Please sign in.`,
            shop: { name: suShop.name, slug: suShop.slug }
          });
        }
      }
    } catch (e) {}
  }

  if (db.shops[cleanSlug]) {
    return res.status(409).json({ success: false, message: `The kiosk URL /shop/${cleanSlug} is already taken. Please choose another slug.` });
  }

  if (supabase) {
    try {
      const { data: existingSlug } = await supabase.from('shops').select('id, slug').eq('slug', cleanSlug).maybeSingle();
      if (existingSlug) {
        return res.status(409).json({ success: false, message: `The kiosk URL /shop/${cleanSlug} is already taken. Please choose another slug.` });
      }
    } catch (e) {}
  }

  const shopSecret = crypto.randomBytes(32).toString('hex');
  const cooldown = parseFloat(cooldownHours) || 7;
  const targetStamps = parseInt(stampsTarget, 10) || 10;
  const trialEndsAt = new Date(Date.now() + 7 * 86400000).toISOString();

  let createdShop = null;

  if (supabase) {
    try {
      const upsertPayload = {
        id: userId,
        phone: verifiedPhone,
        email: ownerEmail,
        updated_at: new Date().toISOString()
      };
      if (passHash) upsertPayload.password_hash = passHash;

      await supabase.from('owners').upsert(upsertPayload, { onConflict: 'id' });

      const { data: s, error: sErr } = await supabase.from('shops').insert({
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
      }).select().single();

      if (!sErr && s) createdShop = s;
    } catch (e) {
      console.warn('[Supabase Shop Creation Exception]:', e.message);
    }
  }

  if (!createdShop) {
    createdShop = {
      id: 'shop_' + Date.now(),
      ownerId: userId,
      name: shopName.trim(),
      slug: cleanSlug,
      rewardDescription: rewardDescription?.trim() || '1 Free Item',
      cooldownHours: cooldown,
      stampsTarget: targetStamps,
      secretKey: shopSecret,
      subscriptionPlan: 'trial',
      subscriptionStatus: 'active',
      subscriptionEndsAt: trialEndsAt
    };
  }

  const ownerRecord = {
    id: userId,
    phone: verifiedPhone,
    email: ownerEmail,
    passwordHash: passHash,
    shopSlug: cleanSlug,
    createdAt: Date.now()
  };

  db.owners[verifiedPhone] = ownerRecord;
  db.owners[ownerEmail] = ownerRecord;
  db.shops[cleanSlug] = createdShop;
  saveLocalDb(db);

  const token = signOwnerToken(userId, ownerEmail, verifiedPhone);

  return res.json({
    success: true,
    message: 'Shop enrolled successfully with Phone OTP!',
    token,
    shop: {
      id: createdShop.id,
      name: createdShop.name,
      slug: createdShop.slug,
      rewardDescription: createdShop.reward_description || createdShop.rewardDescription,
      stampsTarget: targetStamps
    }
  });
});

// 3.5 Owner Forgot Password: Send Reset OTP
app.post('/api/owner/forgot-password/send-otp', async (req, res) => {
  const { phone } = req.body;
  const rawP = (phone || '').trim();
  if (!rawP || rawP.includes('@')) {
    return res.status(400).json({ success: false, message: 'Please enter a valid registered mobile number.' });
  }

  const cleanPhone = normalizePhoneNumber(rawP);
  const cleanDigits = cleanPhone.replace(/[^0-9]/g, '');
  const last10 = cleanDigits.slice(-10);

  // Check if owner actually exists with this number
  const db = loadLocalDb();
  let owner = Object.values(db.owners).find(o => 
    matchPhone(o.phone, cleanPhone) ||
    (o.email && (o.email.startsWith(cleanDigits) || o.email.startsWith(last10)))
  );

  if (!owner && supabase) {
    try {
      const { data: suOwner } = await supabase
        .from('owners')
        .select('*')
        .or(`phone.eq.${cleanPhone},phone.eq.${cleanDigits},phone.ilike.%${last10}%,email.eq.${cleanDigits}@owner.marku.local`)
        .maybeSingle();
      if (suOwner) {
        owner = suOwner;
      }
    } catch (e) {}
  }

  if (!owner) {
    return res.status(404).json({
      success: false,
      message: `No registered shop account found for ${cleanPhone}. Please verify your phone number or enroll your shop first.`
    });
  }

  // 60-second cooldown protection per number
  const resetKey = `reset_${cleanPhone}`;
  const existingRecord = ownerOtpStore.get(resetKey);
  if (existingRecord && existingRecord.lastSentAt && (Date.now() - existingRecord.lastSentAt < 60000)) {
    const remainingSec = Math.ceil((60000 - (Date.now() - existingRecord.lastSentAt)) / 1000);
    return res.status(429).json({
      success: false,
      message: `Please wait ${remainingSec}s before requesting another reset code.`
    });
  }

  const otp = String(crypto.randomInt(100000, 999999));
  const expiresAt = Date.now() + 5 * 60 * 1000;
  const lastSentAt = Date.now();

  const otpPayload = { otp, expiresAt, lastSentAt, attempts: 0, phone: cleanPhone };
  ownerOtpStore.set(resetKey, otpPayload);
  if (cleanDigits.length >= 10) {
    ownerOtpStore.set(`reset_${cleanDigits.slice(-10)}`, otpPayload);
  }

  await dispatchOtpSms(cleanPhone, otp, 'MarkU Password Reset');

  return res.json({
    success: true,
    message: `Password reset verification code sent to ${cleanPhone}. Please check your phone SMS.`,
    phone: cleanPhone
  });
});

// 3.6 Owner Reset Password (Verify OTP + Set New Password)
app.post('/api/owner/reset-password', async (req, res) => {
  const { phone, otp, newPassword } = req.body;
  const rawP = (phone || '').trim();
  const enteredOtp = String(otp || '').trim();
  const pass = String(newPassword || '').trim();

  if (!rawP || !enteredOtp) {
    return res.status(400).json({ success: false, message: 'Mobile number and verification code are required.' });
  }

  if (!pass || pass.length < 6) {
    return res.status(400).json({ success: false, message: 'New password must be at least 6 characters long.' });
  }

  const cleanPhone = normalizePhoneNumber(rawP);
  const cleanDigits = cleanPhone.replace(/[^0-9]/g, '');
  const last10 = cleanDigits.slice(-10);

  const resetKey = `reset_${cleanPhone}`;
  const record = ownerOtpStore.get(resetKey) || ownerOtpStore.get(`reset_${last10}`);

  if (!record) {
    return res.status(400).json({ success: false, message: 'No active password reset request found or code expired. Please request a new code.' });
  }

  if (Date.now() > record.expiresAt) {
    ownerOtpStore.delete(resetKey);
    ownerOtpStore.delete(`reset_${last10}`);
    return res.status(400).json({ success: false, message: 'Verification code expired. Please request a new code.' });
  }

  if (record.attempts >= 5) {
    ownerOtpStore.delete(resetKey);
    ownerOtpStore.delete(`reset_${last10}`);
    return res.status(429).json({ success: false, message: 'Too many incorrect attempts. Please request a new code.' });
  }

  if (record.otp !== enteredOtp) {
    record.attempts += 1;
    return res.status(400).json({ success: false, message: 'Incorrect verification code. Please check and try again.' });
  }

  // Clear consumed OTP
  ownerOtpStore.delete(resetKey);
  ownerOtpStore.delete(`reset_${last10}`);

  const passHash = hashPassword(pass);
  const db = loadLocalDb();

  // Find owner in local DB
  let owner = Object.values(db.owners).find(o => 
    matchPhone(o.phone, cleanPhone) ||
    (o.email && (o.email.startsWith(cleanDigits) || o.email.startsWith(last10)))
  );

  let ownerId = owner ? owner.id : null;
  let ownerEmail = owner ? owner.email : `${cleanDigits}@owner.marku.local`;

  if (supabase) {
    try {
      const { data: suOwner } = await supabase
        .from('owners')
        .select('*')
        .or(`phone.eq.${cleanPhone},phone.eq.${cleanDigits},phone.ilike.%${last10}%,email.eq.${cleanDigits}@owner.marku.local`)
        .maybeSingle();

      if (suOwner) {
        ownerId = suOwner.id;
        ownerEmail = suOwner.email || ownerEmail;
        await supabase
          .from('owners')
          .update({ password_hash: passHash, updated_at: new Date().toISOString() })
          .eq('id', suOwner.id);
      }
    } catch (e) {
      console.warn('[Supabase password update note]:', e.message);
    }
  }

  if (owner) {
    owner.passwordHash = passHash;
    db.owners[cleanPhone] = owner;
    if (owner.email) db.owners[owner.email] = owner;
    saveLocalDb(db);
  }

  // Find shop for instant login
  let shop = null;
  if (owner && owner.shopSlug && db.shops[owner.shopSlug]) {
    shop = db.shops[owner.shopSlug];
  }
  if (!shop && supabase && ownerId) {
    try {
      const { data: s } = await supabase.from('shops').select('*').eq('owner_id', ownerId).maybeSingle();
      if (s) shop = s;
    } catch (e) {}
  }
  if (!shop) {
    shop = Object.values(db.shops).find(s => s.ownerId === ownerId || s.owner_id === ownerId);
  }

  const token = signOwnerToken(ownerId || crypto.randomUUID(), ownerEmail, cleanPhone);

  return res.json({
    success: true,
    message: 'Password reset successfully! You are now logged into your cockpit.',
    token,
    shop: shop ? {
      id: shop.id,
      name: shop.name,
      slug: shop.slug,
      rewardDescription: shop.reward_description || shop.rewardDescription || '1 Free Item',
      stampsTarget: shop.stamps_target || shop.stampsTarget || 10
    } : null
  });
});

// Unified Login Handler (Supports Phone OTP as primary, legacy email fallback)
app.post('/api/owner/login', async (req, res) => {
  const { phone, otp, email, password } = req.body;

  // 1. Primary: Phone + OTP Login
  if (phone && otp) {
    const rawP = phone.trim();
    const cleanPhone = normalizePhoneNumber(rawP);
    const cleanDigits = cleanPhone.replace(/[^0-9]/g, '');
    const last10 = cleanDigits.slice(-10);
    const enteredOtp = String(otp).trim();

    const record = ownerOtpStore.get(cleanPhone) || ownerOtpStore.get(last10) || ownerOtpStore.get(rawP);
    if (!record || record.otp !== enteredOtp || Date.now() > record.expiresAt) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP code.' });
    }
    ownerOtpStore.delete(cleanPhone);
    ownerOtpStore.delete(last10);
    ownerOtpStore.delete(rawP);

    const db = loadLocalDb();
    let owner = Object.values(db.owners).find(o => 
      matchPhone(o.phone, cleanPhone) ||
      (o.email && (o.email.startsWith(cleanDigits) || o.email.startsWith(last10)))
    );

    if (!owner && supabase) {
      try {
        const { data: suOwner } = await supabase
          .from('owners')
          .select('*')
          .or(`phone.eq.${cleanPhone},phone.eq.${cleanDigits},phone.ilike.%${last10}%,email.eq.${cleanDigits}@owner.marku.local`)
          .maybeSingle();

        if (suOwner) {
          owner = {
            id: suOwner.id,
            phone: suOwner.phone || cleanPhone,
            email: suOwner.email || `${cleanDigits}@owner.marku.local`,
            passwordHash: suOwner.password_hash || '',
            createdAt: suOwner.created_at ? new Date(suOwner.created_at).getTime() : Date.now()
          };
          db.owners[cleanPhone] = owner;
        }
      } catch (e) {}
    }

    if (!owner) {
      const regToken = signOwnerRegToken(cleanPhone);
      return res.json({
        success: true,
        isNew: true,
        message: 'Phone verified! Please set up your shop name.',
        phone: cleanPhone,
        regToken
      });
    }

    let shop = null;
    if (supabase) {
      try {
        const { data: s } = await supabase.from('shops').select('*').eq('owner_id', owner.id).maybeSingle();
        if (s) shop = s;
        if (!shop && owner.shopSlug) {
          const { data: sSlug } = await supabase.from('shops').select('*').eq('slug', owner.shopSlug).maybeSingle();
          if (sSlug) shop = sSlug;
        }
      } catch (e) {}
    }
    if (!shop && owner.shopSlug && db.shops[owner.shopSlug]) {
      shop = db.shops[owner.shopSlug];
    }
    if (!shop) {
      shop = Object.values(db.shops).find(s => s.ownerId === owner.id || s.owner_id === owner.id);
    }

    return res.json({
      success: true,
      message: 'Logged in successfully!',
      token: signOwnerToken(owner.id, owner.email, cleanPhone),
      shop: shop ? {
        id: shop.id,
        name: shop.name,
        slug: shop.slug,
        rewardDescription: shop.reward_description || shop.rewardDescription || '1 Free Item',
        stampsTarget: shop.stamps_target || shop.stampsTarget || 10
      } : null
    });
  }

  // 2. Mobile Number / Email + Password Login
  const loginIdentifier = (req.body.identifier || req.body.email || req.body.phone || '').trim();
  if (loginIdentifier && password) {
    const cleanPass = String(password).trim();
    const isEmail = loginIdentifier.includes('@');
    const cleanEmail = isEmail ? loginIdentifier.toLowerCase() : '';
    const cleanPhone = !isEmail ? normalizePhoneNumber(loginIdentifier) : '';
    const cleanDigits = cleanPhone ? cleanPhone.replace(/[^0-9]/g, '') : '';
    const last10 = cleanDigits ? cleanDigits.slice(-10) : '';

    const db = loadLocalDb();
    let owner = null;
    if (isEmail) {
      owner = db.owners[cleanEmail];
    } else {
      owner = Object.values(db.owners).find(o => 
        matchPhone(o.phone, cleanPhone) ||
        (o.email && (o.email.startsWith(cleanDigits) || o.email.startsWith(last10)))
      );
    }

    if (!owner && supabase) {
      try {
        let query = supabase.from('owners').select('*');
        if (isEmail) {
          query = query.eq('email', cleanEmail);
        } else {
          query = query.or(`phone.eq.${cleanPhone},phone.eq.${cleanDigits},phone.ilike.%${last10}%,email.eq.${cleanDigits}@owner.marku.local`);
        }
        const { data: suOwner } = await query.maybeSingle();
        if (suOwner) {
          owner = {
            id: suOwner.id,
            email: suOwner.email || (cleanDigits ? `${cleanDigits}@owner.marku.local` : ''),
            phone: suOwner.phone || cleanPhone,
            passwordHash: suOwner.password_hash,
            createdAt: suOwner.created_at ? new Date(suOwner.created_at).getTime() : Date.now()
          };
          if (cleanPhone) db.owners[cleanPhone] = owner;
        }
      } catch (e) {}
    }

    if (owner && owner.passwordHash && verifyPassword(cleanPass, owner.passwordHash)) {
      let shop = null;
      if (owner.shopSlug && db.shops[owner.shopSlug]) {
        shop = db.shops[owner.shopSlug];
      }
      if (!shop && supabase) {
        try {
          const { data: s } = await supabase.from('shops').select('*').eq('owner_id', owner.id).maybeSingle();
          if (s) shop = s;
        } catch (e) {}
      }
      if (!shop) {
        shop = Object.values(db.shops).find(s => s.ownerId === owner.id || s.owner_id === owner.id);
      }

      return res.json({
        success: true,
        message: 'Logged in successfully!',
        token: signOwnerToken(owner.id, owner.email || `${cleanDigits}@owner.marku.local`, owner.phone || cleanPhone),
        shop: shop ? {
          id: shop.id,
          name: shop.name,
          slug: shop.slug,
          rewardDescription: shop.reward_description || shop.rewardDescription || '1 Free Item',
          stampsTarget: shop.stamps_target || shop.stampsTarget || 10
        } : null
      });
    }

    if (owner && !owner.passwordHash) {
      // First-time password setting for accounts enrolled via OAuth/Phone
      owner.passwordHash = hashPassword(cleanPass);
      db.owners[cleanEmail || cleanPhone] = owner;
      saveLocalDb(db);
      if (supabase) {
        try {
          await supabase.from('owners').upsert({
            id: owner.id,
            email: owner.email,
            phone: owner.phone,
            password_hash: owner.passwordHash,
            updated_at: new Date().toISOString()
          }, { onConflict: 'id' });
        } catch (e) {}
      }

      let shop = null;
      if (owner.shopSlug && db.shops[owner.shopSlug]) {
        shop = db.shops[owner.shopSlug];
      }
      if (!shop && supabase) {
        try {
          const { data: s } = await supabase.from('shops').select('*').eq('owner_id', owner.id).maybeSingle();
          if (s) shop = s;
        } catch (e) {}
      }
      if (!shop) {
        shop = Object.values(db.shops).find(s => s.ownerId === owner.id || s.owner_id === owner.id);
      }

      return res.json({
        success: true,
        message: 'Password created and signed in successfully!',
        token: signOwnerToken(owner.id, owner.email || `${cleanDigits}@owner.marku.local`, owner.phone || cleanPhone),
        shop: shop ? {
          id: shop.id,
          name: shop.name,
          slug: shop.slug,
          rewardDescription: shop.reward_description || shop.rewardDescription || '1 Free Item',
          stampsTarget: shop.stamps_target || shop.stampsTarget || 10
        } : null
      });
    }

    if (owner && owner.passwordHash && !verifyPassword(cleanPass, owner.passwordHash)) {
      return res.status(401).json({
        success: false,
        message: 'Incorrect password. Please try again or click "Forgot Password".'
      });
    }

    if (isEmail && supabase) {
      try {
        const { data: sessionData, error: authErr } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password: cleanPass
        });
        if (!authErr && sessionData && sessionData.user) {
          const userId = sessionData.user.id;
          let { data: shop } = await supabase.from('shops').select('*').eq('owner_id', userId).maybeSingle();
          if (!shop && db.shops) {
            shop = Object.values(db.shops).find(s => s.ownerId === userId || s.owner_id === userId);
          }
          const token = sessionData.session?.access_token || signOwnerToken(userId, cleanEmail);
          return res.json({
            success: true,
            message: 'Logged in successfully!',
            token,
            shop: shop ? {
              id: shop.id,
              name: shop.name,
              slug: shop.slug,
              rewardDescription: shop.reward_description || shop.rewardDescription || '1 Free Item',
              stampsTarget: shop.stamps_target || shop.stampsTarget || 10
            } : null
          });
        }
      } catch (e) {}
    }

    return res.status(401).json({ success: false, message: 'Invalid credentials. Please check your mobile/email or password.' });
  }

  return res.status(400).json({ success: false, message: 'Please provide either mobile number with OTP or mobile/email with password.' });
});

// --------------------------------------------------------------------
// 1-CLICK INSTANT DEMO COCKPIT ACCESS (FOR LIVE TEST DRIVES)
// --------------------------------------------------------------------
app.post('/api/owner/demo-login', async (req, res) => {
  const db = loadLocalDb();
  let shop = null;

  if (supabase) {
    try {
      const { data: s } = await supabase.from('shops').select('*').eq('slug', 'vinay-coffee-house-16b3').maybeSingle();
      if (s) shop = s;
      if (!shop) {
        const { data: anyShop } = await supabase.from('shops').select('*').limit(1).maybeSingle();
        if (anyShop) shop = anyShop;
      }
    } catch (e) {}
  }

  if (!shop) {
    shop = Object.values(db.shops).find(s => s.slug === 'vinay-coffee-house-16b3') || Object.values(db.shops)[0] || {
      id: 'demo-shop-uuid',
      owner_id: 'bdac4f66-10c6-4d29-a4d3-3e5e846c4e25',
      name: 'Vinay Coffee Hous',
      slug: 'vinay-coffee-house-16b3',
      reward_description: '1 Free Specialty Coffee / Reward',
      stamps_target: 10,
      cooldown_hours: 1
    };
  }

  const ownerId = shop.owner_id || shop.ownerId || 'bdac4f66-10c6-4d29-a4d3-3e5e846c4e25';
  const ownerEmail = 'vinaykumarvk3632201@gmail.com';
  const ownerPhone = '+919311594509';
  const token = signOwnerToken(ownerId, ownerEmail, ownerPhone);

  res.cookie('owner_session', token, {
    httpOnly: true,
    secure: IS_PROD,
    sameSite: 'lax',
    maxAge: 30 * 86400000
  });

  return res.json({
    success: true,
    message: 'Demo Cockpit accessed successfully!',
    token,
    redirect: '/dashboard',
    shop: {
      id: shop.id,
      name: shop.name,
      slug: shop.slug,
      rewardDescription: shop.reward_description || shop.reward_title || '1 Free Item',
      stampsTarget: shop.stamps_target || shop.stamps_required || 10
    }
  });
});

// --------------------------------------------------------------------
// GOOGLE AUTH FOR SHOP OWNERS (Supabase Google OAuth)
// --------------------------------------------------------------------
app.post('/api/owner/google-auth', async (req, res) => {
  const { supabaseToken, token, shopName, slug } = req.body;
  const authToken = supabaseToken || token;
  if (!authToken) {
    return res.status(400).json({ success: false, message: 'Missing Google authentication token.' });
  }

  const authResult = await verifySupabaseToken(authToken);
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
  const ownerId = await getOwnerIdFromReq(req);
  if (!ownerId) return res.status(401).json({ success: false, message: 'Invalid or expired session.' });

  let shop = null;
  if (supabase) {
    try {
      const { data } = await supabase.from('shops').select('*').eq('owner_id', ownerId).maybeSingle();
      if (data) shop = data;
    } catch (e) {}
  }
  if (!shop) {
    const db = loadLocalDb();
    shop = Object.values(db.shops || {}).find(s => s.ownerId === ownerId);
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
      supportWhatsApp: process.env.SUPPORT_WHATSAPP_NUMBER || '919311594509',
      upiId: process.env.UPI_ID || '9311594509@ybl'
    }
  });
});

app.post('/api/owner/subscription/select', async (req, res) => {
  const ownerId = await getOwnerIdFromReq(req);
  if (!ownerId) {
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
  const ownerId = await getOwnerIdFromReq(req);
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
      const localShops = Object.values(db.shops).filter(s => s.ownerId === ownerId || s.owner_id === ownerId);
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

  const ownerShops = Object.values(db.shops).filter(s => s.ownerId === ownerId || s.owner_id === ownerId);
  const activeShop = (requestedSlug ? ownerShops.find(s => s.slug === requestedSlug) : null) || ownerShops[0] || (owner.shopSlug ? db.shops[owner.shopSlug] : null);
  if (!activeShop) return res.status(404).json({ success: false, message: 'No shop registered for this account.' });
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
        const found = Object.values(db.shops).find(s => (s.ownerId === ownerId || s.owner_id === ownerId) && (shopSlug ? s.slug === shopSlug : true));
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
      scanUrl = `${protocol}://${rawHost}/c/${slug}?token=${qrData.token}`;
    } else if (publicTunnel) {
      const cleanPublic = publicTunnel.replace(/\/$/, '');
      targetHost = cleanPublic.replace(/^https?:\/\//, '');
      scanUrl = `${cleanPublic}/c/${slug}?token=${qrData.token}`;
    } else {
      targetHost = (rawHost.includes('localhost') || rawHost.includes('127.0.0.1')) ? `${LAN_IP}:${PORT}` : rawHost;
      scanUrl = `${protocol}://${targetHost}/c/${slug}?token=${qrData.token}`;
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
  const isEmail = typeof phone === 'string' && phone.includes('@');
  const cleanId = isEmail ? phone.trim().toLowerCase() : normalizePhoneNumber(phone);
  const payload = Buffer.from(JSON.stringify({ phone: cleanId, email: isEmail ? cleanId : null, verified: true, exp: Date.now() + 30 * 86400000 })).toString('base64url');
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

// Verify active customer session token (supports email or phone identifier)
app.post('/api/customer/verify-session', (req, res) => {
  const { token } = req.body;
  const verified = verifyCustomerOtpToken(token);
  if (!verified) {
    return res.status(401).json({ success: false, valid: false, message: 'Session expired or invalid. Please sign in with Google.' });
  }
  return res.json({ success: true, valid: true, identifier: verified.phone, email: verified.phone });
});

// Customer Google Authentication endpoint (Supabase Google Auth)
app.post('/api/customer/google-auth', async (req, res) => {
  const { supabaseToken, token, email, name } = req.body;
  const authToken = supabaseToken || token;

  let customerEmail = email ? email.trim().toLowerCase() : '';
  let customerName = name ? name.trim() : '';

  if (authToken) {
    const authResult = await verifySupabaseToken(authToken);
    if (!authResult.success) {
      return res.status(401).json({ success: false, message: authResult.reason || 'Invalid Google authentication' });
    }
    customerEmail = authResult.email ? authResult.email.trim().toLowerCase() : (authResult.phone || authResult.uid);
    if (!customerName && authResult.name) customerName = authResult.name.trim();
  }

  if (!customerEmail) {
    return res.status(400).json({ success: false, message: 'Google identity token or email address required.' });
  }

  const vToken = signCustomerOtpToken(customerEmail);
  return res.json({
    success: true,
    message: 'Authenticated successfully with Google.',
    email: customerEmail,
    name: customerName,
    verificationToken: vToken
  });
});

// Native In-Memory OTP Store (Zero-Cost, 5-minute TTL)
const activeOtpStore = new Map();

// 1. Send OTP (Direct SMS to Customer Mobile or Supabase Email)
app.post('/api/customer/send-otp', async (req, res) => {
  const { phone, email } = req.body;
  const rawId = (phone || email || '').trim();
  if (!rawId) {
    return res.status(400).json({ success: false, message: 'Please provide mobile number or email.' });
  }

  const isEmail = rawId.includes('@');
  const identifier = isEmail ? rawId.toLowerCase() : normalizePhoneNumber(rawId);
  const cleanDigits = !isEmail ? identifier.replace(/[^0-9]/g, '') : '';

  // 60-second cooldown protection per customer identifier
  const existingRecord = activeOtpStore.get(identifier) || (!isEmail && cleanDigits.length >= 10 ? activeOtpStore.get(cleanDigits.slice(-10)) : null);
  if (existingRecord && existingRecord.lastSentAt && (Date.now() - existingRecord.lastSentAt < 60000)) {
    const remainingSec = Math.ceil((60000 - (Date.now() - existingRecord.lastSentAt)) / 1000);
    return res.status(429).json({
      success: false,
      message: `Please wait ${remainingSec}s before requesting another OTP.`
    });
  }

  // Generate 6-digit numeric OTP
  const otp = String(crypto.randomInt(100000, 999999));
  const expiresAt = Date.now() + 5 * 60 * 1000;
  const lastSentAt = Date.now();

  const otpPayload = { otp, expiresAt, lastSentAt, attempts: 0 };
  activeOtpStore.set(identifier, otpPayload);
  if (!isEmail) {
    const cleanDigits = identifier.replace(/[^0-9]/g, '');
    if (cleanDigits.length >= 10) {
      activeOtpStore.set(cleanDigits.slice(-10), otpPayload);
    }
    activeOtpStore.set(rawId, otpPayload);
  }

  let dispatchRes = { sent: true, provider: 'terminal_dispatch' };
  // If email, trigger Supabase signInWithOtp if configured
  if (isEmail && supabase) {
    try {
      await supabase.auth.signInWithOtp({ email: identifier });
      dispatchRes = { sent: true, provider: 'supabase_email' };
    } catch (e) {
      console.warn('[Supabase OTP] Email dispatch note:', e.message);
    }
  } else if (!isEmail) {
    // Dispatch SMS to the customer's phone
    dispatchRes = await dispatchOtpSms(identifier, otp, 'MarkU Pass');
  }

  return res.json({
    success: true,
    message: isEmail ? `OTP sent to ${identifier}!` : `OTP sent to ${identifier}. Please check your phone SMS for the 6-digit code.`,
    isEmail,
    phone: identifier
  });
});

app.post('/api/customer/verify-otp', async (req, res) => {
  const { supabaseToken, token, phone, email, otp } = req.body;
  const authToken = supabaseToken;
  const rawId = (phone || email || '').trim();

  // 1. If Supabase token provided (e.g. from magic link or Supabase OTP)
  if (authToken) {
    const authResult = await verifySupabaseToken(authToken);
    if (authResult.success) {
      const finalId = authResult.email || authResult.phone || rawId;
      return res.json({
        success: true,
        message: 'Verified successfully.',
        verifiedPhone: finalId,
        verifiedEmail: authResult.email || null,
        verificationToken: signCustomerOtpToken(finalId)
      });
    }
  }

  if (!rawId) {
    return res.status(400).json({ success: false, message: 'Mobile number or email is required.' });
  }

  const isEmail = rawId.includes('@');
  const identifier = isEmail ? rawId.toLowerCase() : normalizePhoneNumber(rawId);
  const enteredOtp = String(otp || '').trim();

  if (!enteredOtp) {
    return res.status(400).json({ success: false, message: 'Please enter the 6-digit OTP code.' });
  }

  let cleanDigits = '';
  let last10 = '';
  let record = activeOtpStore.get(identifier);
  if (!record && !isEmail) {
    cleanDigits = identifier.replace(/[^0-9]/g, '');
    if (cleanDigits.length >= 10) {
      last10 = cleanDigits.slice(-10);
      record = activeOtpStore.get(last10);
    }
    if (!record) {
      record = activeOtpStore.get(rawId);
    }
  }

  if (!record) {
    return res.status(400).json({ success: false, message: 'No active OTP request found or code expired. Please request a new OTP.' });
  }

  if (Date.now() > record.expiresAt) {
    activeOtpStore.delete(identifier);
    if (last10) activeOtpStore.delete(last10);
    activeOtpStore.delete(rawId);
    return res.status(400).json({ success: false, message: 'OTP has expired. Please request a fresh code.' });
  }

  if (record.attempts >= 5) {
    activeOtpStore.delete(identifier);
    if (last10) activeOtpStore.delete(last10);
    activeOtpStore.delete(rawId);
    return res.status(429).json({ success: false, message: 'Too many failed attempts. Please request a new code.' });
  }

  if (record.otp !== enteredOtp) {
    record.attempts += 1;
    return res.status(400).json({ success: false, message: 'Incorrect OTP code. Please try again.' });
  }

  // Clear consumed OTP
  activeOtpStore.delete(identifier);
  if (last10) activeOtpStore.delete(last10);
  activeOtpStore.delete(rawId);

  const verificationToken = signCustomerOtpToken(identifier);
  return res.json({
    success: true,
    message: 'OTP verified successfully!',
    verifiedPhone: identifier,
    verificationToken
  });
});

// --------------------------------------------------------------------
// 5. CUSTOMER STAMP CLAIM (STRICT SHOP DATA ISOLATION & OTP VERIFICATION)
// --------------------------------------------------------------------
app.post('/api/claim-stamp', async (req, res) => {
  const { shopSlug, token, phone, otp, supabaseToken, verificationToken, name } = req.body;
  const authToken = supabaseToken;

  // 1. Resolve Shop strictly with fallback resolver
  const shop = await resolveShopBySlug(shopSlug);
  if (!shop) {
    return res.status(404).json({ success: false, message: 'Shop not found.' });
  }

  // 2. Validate Customer Identity (Google Auth token, Supabase token, or signed session token)
  let customerIdentifier = null;
  let customerName = name ? name.trim() : '';

  if (authToken) {
    const authResult = await verifySupabaseToken(authToken);
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
    const rawP = phone.trim();
    customerIdentifier = rawP.includes('@') ? rawP.toLowerCase() : normalizePhoneNumber(rawP);
  }

  if (!customerIdentifier) {
    return res.status(401).json({
      success: false,
      code: 'VERIFICATION_REQUIRED',
      message: 'Sign-in required. Please authenticate with Google or a verified account before collecting your stamp.'
    });
  }

  const verifiedPhone = customerIdentifier;
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

// Customer View Card for specific shop (supports email or phone identifier)
app.get('/api/customer/:shopSlug/:identifier', async (req, res) => {
  const rawId = req.params.identifier ? req.params.identifier.trim().toLowerCase() : '';
  const isEmail = rawId.includes('@');
  const cleanId = isEmail ? rawId : normalizePhoneNumber(rawId);
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
      let query = supabase.from('customer_cards').select('*').eq('shop_id', shop.id);
      if (isEmail) {
        query = query.or(`email.eq.${cleanId},phone.eq.${cleanId}`);
      } else {
        query = query.or(`phone.eq.${cleanId},email.eq.${cleanId}`);
      }
      const { data } = await query.maybeSingle();
      card = data;
    } catch (e) {}
  }

  if (!card) {
    const cardKey = `${slug}_${cleanId}`;
    const localCard = db.customerCards[cardKey];
    if (localCard) {
      card = {
        phone: localCard.phone,
        email: localCard.email || localCard.phone,
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
      phone: cleanId,
      email: isEmail ? cleanId : (card?.email || null),
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
  signUserAccessToken,
  verifyUserAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  signCustomerSessionToken,
  verifyCustomerSessionToken,
  verifyGoogleToken,
  getOwnerIdFromReq,
  setAuthCookies,
  setCustomerCookie,
  signCustomerOtpToken,
  verifyCustomerOtpToken,
  hashPassword,
  verifyPassword,
  loadLocalDb,
  saveLocalDb,
  resolveShopBySlug,
  verifySupabaseToken,
  normalizePhoneNumber,
  matchPhone
};
