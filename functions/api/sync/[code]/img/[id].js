import { isClaimedCode } from '../../../../_lib/auth.js';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,PUT,HEAD,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};
const validCode = code => /^[a-z0-9-]{8,48}$/.test(String(code || ''));
const validId = id => /^[a-z0-9-]{8,64}$/i.test(String(id || ''));
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS } });
const r2key = (code, id) => `${code}/${id}`;
const kvkey = (code, id) => 'sync:' + code + ':img:' + id;

async function denyClaimed(env, code) {
  if (await isClaimedCode(env, code)) return json({ error: '该同步码已升级为账号，请登录后同步' }, 401);
  return null;
}

export async function onRequestOptions() { return new Response(null, { status: 204, headers: CORS }); }

export async function onRequestHead({ params, env }) {
  const code = String(params.code || '').toLowerCase();
  const id = String(params.id || '');
  if (!validCode(code) || !validId(id)) return new Response(null, { status: 400, headers: CORS });
  const denied = await denyClaimed(env, code);
  if (denied) return denied;
  if (env.IMAGES) {
    const h = await env.IMAGES.head(r2key(code, id));
    if (h) return new Response(null, { status: 200, headers: CORS });
  }
  const v = await env.SYNC_KV.get(kvkey(code, id));
  return new Response(null, { status: v ? 200 : 404, headers: CORS });
}

export async function onRequestGet({ params, env }) {
  const code = String(params.code || '').toLowerCase();
  const id = String(params.id || '');
  if (!validCode(code) || !validId(id)) return json({ error: '参数不正确' }, 400);
  const denied = await denyClaimed(env, code);
  if (denied) return denied;
  if (env.IMAGES) {
    const obj = await env.IMAGES.get(r2key(code, id));
    if (obj) return new Response(obj.body, { headers: { 'Content-Type': obj.httpMetadata?.contentType || 'image/jpeg', 'Cache-Control': 'public, max-age=31536000, immutable', ...CORS } });
  }
  const { value, metadata } = await env.SYNC_KV.getWithMetadata(kvkey(code, id), { type: 'arrayBuffer' });
  if (!value) return json({ error: 'not found' }, 404);
  return new Response(value, { headers: { 'Content-Type': metadata?.type || 'image/jpeg', 'Cache-Control': 'public, max-age=31536000, immutable', ...CORS } });
}

export async function onRequestPut({ request, params, env }) {
  const code = String(params.code || '').toLowerCase();
  const id = String(params.id || '');
  if (!validCode(code) || !validId(id)) return json({ error: '参数不正确' }, 400);
  const denied = await denyClaimed(env, code);
  if (denied) return denied;
  const buf = await request.arrayBuffer();
  if (!buf || buf.byteLength < 16) return json({ error: '图片为空' }, 400);
  if (buf.byteLength > 900 * 1024) return json({ error: '单张配图过大' }, 413);
  const type = (request.headers.get('Content-Type') || 'image/jpeg').split(';')[0];
  if (env.IMAGES) {
    await env.IMAGES.put(r2key(code, id), buf, { httpMetadata: { contentType: type } });
    return json({ ok: true, bytes: buf.byteLength, store: 'r2' });
  }
  await env.SYNC_KV.put(kvkey(code, id), buf, { metadata: { type } });
  return json({ ok: true, bytes: buf.byteLength, store: 'kv' });
}
