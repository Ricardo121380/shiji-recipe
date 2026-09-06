// 饭Fun 云同步 API：GET 读取 / PUT 上传，同步码即唯一凭证
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,PUT,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS } });
const valid = code => /^[a-z0-9-]{8,48}$/.test(String(code || ''));

export async function onRequestOptions() { return new Response(null, { status: 204, headers: CORS }); }

export async function onRequestGet({ params, env }) {
  const code = String(params.code || '').toLowerCase();
  if (!valid(code)) return json({ error: '同步码格式不正确' }, 400);
  const { value, metadata } = await env.SYNC_KV.getWithMetadata('sync:' + code);
  let data = null;
  try { data = value ? JSON.parse(value) : null } catch { data = null }
  return json({ updatedAt: metadata?.updatedAt || null, data });
}

export async function onRequestPut({ request, params, env }) {
  const code = String(params.code || '').toLowerCase();
  if (!valid(code)) return json({ error: '同步码格式不正确' }, 400);
  const body = await request.text();
  if (!body || body.length > 8 * 1024 * 1024) return json({ error: '数据过大，请减少配图后重试' }, 413);
  try { JSON.parse(body) } catch { return json({ error: '数据格式错误' }, 400); }
  const updatedAt = new Date().toISOString();
  await env.SYNC_KV.put('sync:' + code, body, { metadata: { updatedAt } });
  return json({ ok: true, updatedAt });
}
