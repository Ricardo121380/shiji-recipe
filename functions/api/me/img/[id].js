import { CORS, json, requireUser } from '../../../_lib/auth.js';

const validId = id => /^[a-z0-9-]{8,64}$/i.test(String(id || ''));
const r2key = (code, id) => `${code}/${id}`;
const kvkey = (code, id) => 'sync:' + code + ':img:' + id;

export async function onRequestOptions() { return new Response(null, { status: 204, headers: CORS }); }

export async function onRequestHead({ request, params, env }) {
  const auth = await requireUser(request, env);
  if (auth.error) return auth.error;
  const id = String(params.id || '');
  if (!validId(id)) return new Response(null, { status: 400, headers: CORS });
  const code = auth.user.code;
  if (env.IMAGES) {
    const h = await env.IMAGES.head(r2key(code, id));
    if (h) return new Response(null, { status: 200, headers: CORS });
  }
  const v = env.SYNC_KV ? await env.SYNC_KV.get(kvkey(code, id)) : null;
  return new Response(null, { status: v ? 200 : 404, headers: CORS });
}

export async function onRequestGet({ request, params, env }) {
  const auth = await requireUser(request, env);
  if (auth.error) return auth.error;
  const id = String(params.id || '');
  if (!validId(id)) return json({ error: '参数不正确' }, 400);
  const code = auth.user.code;
  if (env.IMAGES) {
    const obj = await env.IMAGES.get(r2key(code, id));
    if (obj) return new Response(obj.body, { headers: { 'Content-Type': obj.httpMetadata?.contentType || 'image/jpeg', 'Cache-Control': 'private, max-age=31536000, immutable', ...CORS } });
  }
  if (env.SYNC_KV) {
    const { value, metadata } = await env.SYNC_KV.getWithMetadata(kvkey(code, id), { type: 'arrayBuffer' });
    if (value) return new Response(value, { headers: { 'Content-Type': metadata?.type || 'image/jpeg', 'Cache-Control': 'private, max-age=31536000, immutable', ...CORS } });
  }
  return json({ error: 'not found' }, 404);
}

export async function onRequestPut({ request, params, env }) {
  const auth = await requireUser(request, env);
  if (auth.error) return auth.error;
  const id = String(params.id || '');
  if (!validId(id)) return json({ error: '参数不正确' }, 400);
  const buf = await request.arrayBuffer();
  if (!buf || buf.byteLength < 16) return json({ error: '图片为空' }, 400);
  if (buf.byteLength > 900 * 1024) return json({ error: '单张配图过大' }, 413);
  const type = (request.headers.get('Content-Type') || 'image/jpeg').split(';')[0];
  const code = auth.user.code;
  if (env.IMAGES) {
    await env.IMAGES.put(r2key(code, id), buf, { httpMetadata: { contentType: type } });
    return json({ ok: true, bytes: buf.byteLength, store: 'r2' });
  }
  await env.SYNC_KV.put(kvkey(code, id), buf, { metadata: { type } });
  return json({ ok: true, bytes: buf.byteLength, store: 'kv' });
}
