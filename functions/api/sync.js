// 云同步接口：以同步码为凭据读写整个应用状态（JSON）
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...CORS } });
const codeOk = (code) => /^[A-Za-z0-9]{6,16}$/.test(code || '');

export async function onRequestOptions() { return new Response(null, { headers: CORS }); }

export async function onRequestGet({ env, request }) {
  const code = (new URL(request.url).searchParams.get('code') || '').trim();
  if (!codeOk(code)) return json({ error: 'invalid code' }, 400);
  const data = await env.SYNC_KV.get('sync:' + code);
  if (data === null) return json({ error: 'not found' }, 404);
  return new Response(data, { headers: { 'Content-Type': 'application/json', ...CORS } });
}

export async function onRequestPost({ env, request }) {
  const code = (new URL(request.url).searchParams.get('code') || '').trim();
  if (!codeOk(code)) return json({ error: 'invalid code' }, 400);
  const body = await request.text();
  if (body.length > 20 * 1024 * 1024) return json({ error: 'too large' }, 413);
  try { JSON.parse(body); } catch { return json({ error: 'bad json' }, 400); }
  await env.SYNC_KV.put('sync:' + code, body);
  return json({ ok: true, size: body.length });
}
