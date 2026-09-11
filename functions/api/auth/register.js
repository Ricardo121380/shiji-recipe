import { CORS, json, validUsername, validPassword, validCode, accountCode, makePassword, createSession, clientIp, rateLimit } from '../../_lib/auth.js';

export async function onRequestOptions() { return new Response(null, { status: 204, headers: CORS }); }

export async function onRequestPost({ request, env }) {
  if (!env.DB) return json({ error: '账号服务暂不可用' }, 503);
  const ip = clientIp(request);
  if (!(await rateLimit(env, 'reg:' + ip, 8, 3600))) return json({ error: '注册过于频繁，请稍后再试' }, 429);
  let body;
  try { body = await request.json() } catch { return json({ error: '数据格式错误' }, 400); }
  const username = String(body.username || '').trim().toLowerCase();
  const password = String(body.password || '');
  const legacy = String(body.legacyCode || body.code || '').trim().toLowerCase();
  if (!validUsername(username)) return json({ error: '用户名为 3-24 位，需以字母开头，只能含小写字母和数字' }, 400);
  if (!validPassword(password)) return json({ error: '密码至少 8 位' }, 400);
  if (password.toLowerCase() === username) return json({ error: '密码不能与用户名相同' }, 400);
  let code = accountCode(username);
  if (legacy) {
    if (!validCode(legacy)) return json({ error: '同步码格式不正确' }, 400);
    const taken = await env.DB.prepare('SELECT username FROM users WHERE code = ?').bind(legacy).first();
    if (taken) return json({ error: '该同步码已绑定其他账号' }, 409);
    code = legacy;
  }
  const exists = await env.DB.prepare('SELECT username FROM users WHERE username = ?').bind(username).first();
  if (exists) return json({ error: '用户名已被使用' }, 409);
  const { salt, hash } = await makePassword(password);
  const now = new Date().toISOString();
  try {
    await env.DB.prepare(
      'INSERT INTO users (username, pass_salt, pass_hash, code, created_at) VALUES (?, ?, ?, ?, ?)'
    ).bind(username, salt, hash, code, now).run();
  } catch (e) {
    const msg = String(e && e.message || '');
    if (/UNIQUE|constraint/i.test(msg)) return json({ error: '用户名或同步空间已被使用' }, 409);
    return json({ error: '注册失败' }, 500);
  }
  const session = await createSession(env, username);
  return json({ ok: true, username, token: session.token, expiresAt: session.expiresAt });
}
