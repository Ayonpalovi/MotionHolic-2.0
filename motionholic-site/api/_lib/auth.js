// Password sign-in with a signed, expiring cookie. No database needed.
const crypto = require('crypto');

const COOKIE = 'mh_admin';
const TTL_MS = 12 * 3600 * 1000;

// Everything the admin needs to be switched on. Returns the list of what is still missing.
function missingSetup() {
  const miss = [];
  if ((process.env.ADMIN_PASSWORD || '').length < 10) miss.push('ADMIN_PASSWORD (at least 10 characters)');
  if ((process.env.SESSION_SECRET || '').length < 24) miss.push('SESSION_SECRET');
  if (!process.env.GITHUB_TOKEN) miss.push('GITHUB_TOKEN');
  return miss;
}

// The password is part of the signing key, so changing the password signs everyone out.
const key = () => `${process.env.SESSION_SECRET}|${process.env.ADMIN_PASSWORD}`;
const sign = (payload) => crypto.createHmac('sha256', key()).update(payload).digest('base64url');

function makeToken() {
  const payload = Buffer.from(JSON.stringify({ exp: Date.now() + TTL_MS })).toString('base64url');
  return `${payload}.${sign(payload)}`;
}

function verifyToken(token) {
  if (!token || missingSetup().length) return false;
  const [payload, sig] = String(token).split('.');
  if (!payload || !sig) return false;
  const expected = sign(payload);
  if (expected.length !== sig.length || !crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sig))) return false;
  try { return JSON.parse(Buffer.from(payload, 'base64url').toString()).exp > Date.now(); } catch { return false; }
}

function passwordOk(pw) {
  const hash = (v) => crypto.createHash('sha256').update(String(v)).digest();
  return crypto.timingSafeEqual(hash(pw), hash(process.env.ADMIN_PASSWORD || ''));
}

const tokenFrom = (req) => {
  const m = new RegExp(`(?:^|;\\s*)${COOKIE}=([^;]+)`).exec(req.headers.cookie || '');
  return m && m[1];
};
const isAuthed = (req) => verifyToken(tokenFrom(req));

function cookie(req, value, maxAgeSec) {
  const secure = (req.headers['x-forwarded-proto'] || '').split(',')[0] === 'https' ? '; Secure' : '';
  return `${COOKIE}=${value}; HttpOnly; SameSite=Strict; Path=/${secure}; Max-Age=${maxAgeSec}`;
}

module.exports = { missingSetup, makeToken, passwordOk, isAuthed, cookie };
