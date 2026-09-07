// 饭Fun 云同步 API：GET 读取 / PUT 上传，同步码即唯一凭证
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,PUT,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS } });
const valid = code => /^[a-z0-9-]{8,48}$/.test(String(code || ''));

export async function onRequestOptions() { return new Response(null, { status: 204, headers: CORS }); }

export async function onRequestGet({ request, params, env }) {
  const code = String(params.code || '').toLowerCase();
  if (!valid(code)) return json({ error: '同步码格式不正确' }, 400);
  const light = new URL(request.url).searchParams.get('meta') === '1';
  if (light) {
    const side = await env.SYNC_KV.get('sync:' + code + ':meta');
    if (side) {
      try { return json({ empty: false, ...JSON.parse(side) }) } catch {}
    }
    const listed = await env.SYNC_KV.list({ prefix: 'sync:' + code, limit: 50 });
    const main = (listed.keys || []).find(k => k.name === 'sync:' + code);
    if (!main) return json({ updatedAt: null, recipes: 0, empty: true, version: 0 });
    const md = main.metadata || {};
    const version = Number(md.version) || 2;
    return json({ updatedAt: md.updatedAt || null, recipes: md.recipes != null ? Number(md.recipes) : null, empty: false, version, bulky: version < 3 });
  }
  const { value, metadata } = await env.SYNC_KV.getWithMetadata('sync:' + code);
  const updatedAt = metadata?.updatedAt || null;
  if (!value) return json({ updatedAt: null, data: null, empty: true });
  return new Response(`{"updatedAt":${JSON.stringify(updatedAt)},"data":${value}}`, {
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS },
  });
}

export async function onRequestPut({ request, params, env }) {
  const code = String(params.code || '').toLowerCase();
  if (!valid(code)) return json({ error: '同步码格式不正确' }, 400);
  const body = await request.text();
  if (!body || body.length > 8 * 1024 * 1024) return json({ error: '数据过大，请减少配图后重试' }, 413);
  let parsed;
  try { parsed = JSON.parse(body) } catch { return json({ error: '数据格式错误' }, 400); }
  const recipes = parsed?.state?.recipes?.length || 0;
  const version = Number(parsed?.version) || 2;
  const images = Array.isArray(parsed?.imageIds) ? parsed.imageIds.length : 0;
  const updatedAt = new Date().toISOString();
  await env.SYNC_KV.put('sync:' + code, body, { metadata: { updatedAt, recipes: String(recipes), version: String(version) } });
  await env.SYNC_KV.put('sync:' + code + ':meta', JSON.stringify({ updatedAt, recipes, version, images, empty: false }));
  return json({ ok: true, updatedAt, recipes, version, images });
}
