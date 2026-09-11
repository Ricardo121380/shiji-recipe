const enc = new TextEncoder();
export const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,PUT,POST,HEAD,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};
export const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS },
});
export const validUsername = u => /^[a-z][a-z0-9]{2,23}$/.test(String(u || ''));
export const validPassword = p => typeof p === 'string' && p.length >= 8 && p.length <= 128;
export const validCode = c => /^[a-z0-9-]{8,48}$/.test(String(c || ''));
export const accountCode = username => 'acct-' + String(username || '').toLowerCase();

function bufToHex(buf) {
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}
function hexToBuf(hex) {
  const h = String(hex || '');
  const out = new Uint8Array(h.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(h.slice(i * 2, i * 2 + 2), 16);
  return out;
}
function timingSafeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let x = 0;
  for (let i = 0; i < a.length; i++) x |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return x === 0;
}

export async function hashPassword(password, saltHex) {
  const salt = hexToBuf(saltHex);
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: 80000 }, key, 256);
  return bufToHex(bits);
}
export function randomHex(bytes = 16) {
  return bufToHex(crypto.getRandomValues(new Uint8Array(bytes)));
}
export async function makePassword(password) {
  const salt = randomHex(16);
  const hash = await hashPassword(password, salt);
  return { salt, hash };
}
export async function checkPassword(password, salt, hash) {
  const got = await hashPassword(password, salt);
  return timingSafeEqual(got, hash);
}

export function clientIp(request) {
  return request.headers.get('CF-Connecting-IP') || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '0';
}

export async function rateLimit(env, key, limit, ttl) {
  if (!env.SYNC_KV) return true;
  const k = 'rl:' + key;
  const n = Number((await env.SYNC_KV.get(k)) || 0);
  if (n >= limit) return false;
  await env.SYNC_KV.put(k, String(n + 1), { expirationTtl: ttl });
  return true;
}

export async function createSession(env, username) {
  const token = randomHex(32);
  const now = new Date();
  const exp = new Date(now.getTime() + 30 * 24 * 3600 * 1000);
  await env.DB.prepare(
    'INSERT INTO sessions (token, username, created_at, expires_at) VALUES (?, ?, ?, ?)'
  ).bind(token, username, now.toISOString(), exp.toISOString()).run();
  try {
    await env.DB.prepare("DELETE FROM sessions WHERE username = ? AND expires_at < ?").bind(username, now.toISOString()).run();
  } catch {}
  return { token, expiresAt: exp.toISOString() };
}

export async function isClaimedCode(env, code) {
  const c = String(code || '').toLowerCase();
  if (!c) return false;
  if (c.startsWith('acct-')) return true;
  if (!env.DB) return false;
  try {
    const row = await env.DB.prepare('SELECT username FROM users WHERE code = ?').bind(c).first();
    return !!row;
  } catch {
    return false;
  }
}

export async function requireUser(request, env) {
  if (!env.DB) return { error: json({ error: '账号服务暂不可用' }, 503) };
  const h = request.headers.get('Authorization') || '';
  const m = h.match(/^Bearer\s+(\S+)$/i);
  if (!m) return { error: json({ error: '请先登录' }, 401) };
  const row = await env.DB.prepare(
    `SELECT s.token, s.username, s.expires_at, u.code
     FROM sessions s JOIN users u ON u.username = s.username
     WHERE s.token = ?`
  ).bind(m[1]).first();
  if (!row) return { error: json({ error: '登录已失效，请重新登录' }, 401) };
  if (row.expires_at < new Date().toISOString()) {
    try { await env.DB.prepare('DELETE FROM sessions WHERE token = ?').bind(m[1]).run(); } catch {}
    return { error: json({ error: '登录已过期，请重新登录' }, 401) };
  }
  return { user: { username: row.username, code: row.code, token: row.token } };
}
