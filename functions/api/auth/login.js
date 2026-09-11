import { CORS, json, validUsername, checkPassword, createSession, clientIp, rateLimit } from '../../_lib/auth.js';

export async function onRequestOptions() { return new Response(null, { status: 204, headers: CORS }); }

export async function onRequestPost({ request, env }) {
  if (!env.DB) return json({ error: '账号服务暂不可用' }, 503);
  const ip = clientIp(request);
  if (!(await rateLimit(env, 'login:' + ip, 20, 900))) return json({ error: '尝试次数过多，请 15 分钟后再试' }, 429);
  let body;
  try { body = await request.json() } catch { return json({ error: '数据格式错误' }, 400); }
  const username = String(body.username || '').trim().toLowerCase();
  const password = String(body.password || '');
  if (!validUsername(username) || !password) return json({ error: '请填写用户名和密码' }, 400);
  const row = await env.DB.prepare(
    'SELECT username, pass_salt, pass_hash FROM users WHERE username = ?'
  ).bind(username).first();
  if (!row || !(await checkPassword(password, row.pass_salt, row.pass_hash))) {
    return json({ error: '用户名或密码不正确' }, 401);
  }
  const session = await createSession(env, row.username);
  return json({ ok: true, username: row.username, token: session.token, expiresAt: session.expiresAt });
}
