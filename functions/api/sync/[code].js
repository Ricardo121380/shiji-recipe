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
  const { value, metadata } = await env.SYNC_KV.getWithMetadata('sync:' + code);
  const updatedAt = metadata?.updatedAt || null;
  const light = new URL(request.url).searchParams.get('meta') === '1';
  if (light) {
    let recipes = metadata?.recipes != null ? Number(metadata.recipes) : null;
    if (recipes == null && value) {
      try { recipes = JSON.parse(value)?.state?.recipes?.length ?? 0 } catch { recipes = 0 }
    }
    return json({ updatedAt, recipes, empty: !value });
  }
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
  let recipes = 0;
  try { recipes = JSON.parse(body)?.state?.recipes?.length || 0 } catch { return json({ error: '数据格式错误' }, 400); }
  const updatedAt = new Date().toISOString();
  await env.SYNC_KV.put('sync:' + code, body, { metadata: { updatedAt, recipes: String(recipes) } });
  return json({ ok: true, updatedAt, recipes });
}
