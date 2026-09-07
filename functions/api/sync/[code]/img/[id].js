const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,PUT,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};
const validCode = code => /^[a-z0-9-]{8,48}$/.test(String(code || ''));
const validId = id => /^[a-z0-9-]{8,64}$/i.test(String(id || ''));
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS } });

export async function onRequestOptions() { return new Response(null, { status: 204, headers: CORS }); }

export async function onRequestGet({ params, env }) {
  const code = String(params.code || '').toLowerCase();
  const id = String(params.id || '');
  if (!validCode(code) || !validId(id)) return json({ error: '参数不正确' }, 400);
  const { value, metadata } = await env.SYNC_KV.getWithMetadata('sync:' + code + ':img:' + id, { type: 'arrayBuffer' });
  if (!value) return json({ error: 'not found' }, 404);
  return new Response(value, { headers: { 'Content-Type': metadata?.type || 'image/jpeg', ...CORS } });
}

export async function onRequestPut({ request, params, env }) {
  const code = String(params.code || '').toLowerCase();
  const id = String(params.id || '');
  if (!validCode(code) || !validId(id)) return json({ error: '参数不正确' }, 400);
  const buf = await request.arrayBuffer();
  if (!buf || buf.byteLength < 16) return json({ error: '图片为空' }, 400);
  if (buf.byteLength > 900 * 1024) return json({ error: '单张配图过大' }, 413);
  const type = (request.headers.get('Content-Type') || 'image/jpeg').split(';')[0];
  await env.SYNC_KV.put('sync:' + code + ':img:' + id, buf, { metadata: { type } });
  return json({ ok: true, bytes: buf.byteLength });
}
