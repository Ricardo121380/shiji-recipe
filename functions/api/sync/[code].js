// 饭Fun 云同步 API：D1 存记录，R2 存配图；旧 KV 快照只读回退
import { SYNC_VERSION, extractImageIds, d1Meta, d1Load, d1Save, gcR2 } from '../../_lib/syncdb.js';
import { isClaimedCode } from '../../_lib/auth.js';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,PUT,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS } });
const valid = code => /^[a-z0-9-]{8,48}$/.test(String(code || ''));

async function denyClaimed(env, code) {
  if (await isClaimedCode(env, code)) return json({ error: '该同步码已升级为账号，请登录后同步' }, 401);
  return null;
}

export async function onRequestOptions() { return new Response(null, { status: 204, headers: CORS }); }

async function kvMeta(env, code) {
  const side = await env.SYNC_KV.get('sync:' + code + ':meta');
  if (side) {
    try { return { empty: false, ...JSON.parse(side) } } catch {}
  }
  const listed = await env.SYNC_KV.list({ prefix: 'sync:' + code, limit: 50 });
  const main = (listed.keys || []).find(k => k.name === 'sync:' + code);
  if (!main) return { updatedAt: null, recipes: 0, empty: true, version: 0 };
  const md = main.metadata || {};
  const version = Number(md.version) || 2;
  return { updatedAt: md.updatedAt || null, recipes: md.recipes != null ? Number(md.recipes) : null, empty: false, version, bulky: version < 3, store: 'kv' };
}

export async function onRequestGet({ request, params, env }) {
  const code = String(params.code || '').toLowerCase();
  if (!valid(code)) return json({ error: '同步码格式不正确' }, 400);
  const denied = await denyClaimed(env, code);
  if (denied) return denied;
  const light = new URL(request.url).searchParams.get('meta') === '1';

  if (env.DB) {
    try {
      if (light) {
        const meta = await d1Meta(env.DB, code);
        if (meta) return json(meta);
      } else {
        const loaded = await d1Load(env.DB, code);
        if (loaded) {
          const data = { version: loaded.meta.version, state: loaded.state, imageIds: loaded.imageIds };
          return json({ updatedAt: loaded.meta.updatedAt, data, empty: false, store: 'd1' });
        }
      }
    } catch {}
  }

  if (light) return json(await kvMeta(env, code));
  const { value, metadata } = await env.SYNC_KV.getWithMetadata('sync:' + code);
  const updatedAt = metadata?.updatedAt || null;
  if (!value) return json({ updatedAt: null, data: null, empty: true });
  return new Response(`{"updatedAt":${JSON.stringify(updatedAt)},"data":${value},"store":"kv"}`, {
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS },
  });
}

export async function onRequestPut({ request, params, env }) {
  const code = String(params.code || '').toLowerCase();
  if (!valid(code)) return json({ error: '同步码格式不正确' }, 400);
  const denied = await denyClaimed(env, code);
  if (denied) return denied;
  const body = await request.text();
  if (!body || body.length > 8 * 1024 * 1024) return json({ error: '数据过大，请减少配图后重试' }, 413);
  let parsed;
  try { parsed = JSON.parse(body) } catch { return json({ error: '数据格式错误' }, 400); }
  const state = parsed?.state;
  if (!state || typeof state !== 'object' || !Array.isArray(state.recipes)) return json({ error: '缺少菜谱数据' }, 400);
  const updatedAt = new Date().toISOString();
  const imageIds = extractImageIds(state);
  const compact = JSON.stringify({ version: SYNC_VERSION, state, imageIds, pushedAt: parsed.pushedAt || updatedAt });

  if (env.DB) {
    try {
      const saved = await d1Save(env.DB, code, state, imageIds, updatedAt);
      const meta = { updatedAt, recipes: saved.recipes, dining: saved.dining, version: saved.version, images: saved.images, empty: false, store: 'd1' };
      try {
        await env.SYNC_KV.put('sync:' + code, compact, { metadata: { updatedAt, recipes: String(saved.recipes), version: String(saved.version) } });
        await env.SYNC_KV.put('sync:' + code + ':meta', JSON.stringify(meta));
      } catch {}
      let collected = 0;
      try { collected = await gcR2(env.IMAGES, code, imageIds) } catch {}
      return json({ ok: true, ...meta, collected });
    } catch (e) {
      const msg = e && e.message ? e.message : '写入云端数据库失败';
      const status = /过大|配图/.test(msg) ? 413 : 500;
      return json({ error: msg }, status);
    }
  }

  const recipes = state.recipes.length || 0;
  const version = Number(parsed?.version) || 2;
  const images = imageIds.length;
  await env.SYNC_KV.put('sync:' + code, JSON.stringify({ version: version >= 4 ? version : 4, state, imageIds, pushedAt: parsed.pushedAt || updatedAt }), { metadata: { updatedAt, recipes: String(recipes), version: String(Math.max(version, 4)) } });
  await env.SYNC_KV.put('sync:' + code + ':meta', JSON.stringify({ updatedAt, recipes, version: Math.max(version, 4), images, empty: false, store: 'kv' }));
  return json({ ok: true, updatedAt, recipes, version: Math.max(version, 4), images, store: 'kv' });
}
