import { CORS, json, requireUser } from '../../_lib/auth.js';
import { SYNC_VERSION, extractImageIds, d1Meta, d1Load, d1Save, gcR2 } from '../../_lib/syncdb.js';

export async function onRequestOptions() { return new Response(null, { status: 204, headers: CORS }); }

export async function onRequestGet({ request, env }) {
  const auth = await requireUser(request, env);
  if (auth.error) return auth.error;
  const code = auth.user.code;
  const light = new URL(request.url).searchParams.get('meta') === '1';
  if (!env.DB) return json({ error: '同步服务暂不可用' }, 503);
  try {
    if (light) {
      const meta = await d1Meta(env.DB, code);
      return json(meta || { updatedAt: null, recipes: 0, empty: true, version: 0 });
    }
    const loaded = await d1Load(env.DB, code);
    if (!loaded) return json({ updatedAt: null, data: null, empty: true });
    return json({ updatedAt: loaded.meta.updatedAt, data: { version: loaded.meta.version, state: loaded.state, imageIds: loaded.imageIds }, empty: false, store: 'd1' });
  } catch {
    return json({ error: '读取云端失败' }, 500);
  }
}

export async function onRequestPut({ request, env }) {
  const auth = await requireUser(request, env);
  if (auth.error) return auth.error;
  const code = auth.user.code;
  if (!env.DB) return json({ error: '同步服务暂不可用' }, 503);
  const body = await request.text();
  if (!body || body.length > 8 * 1024 * 1024) return json({ error: '数据过大，请减少配图后重试' }, 413);
  let parsed;
  try { parsed = JSON.parse(body) } catch { return json({ error: '数据格式错误' }, 400); }
  const state = parsed?.state;
  if (!state || typeof state !== 'object' || !Array.isArray(state.recipes)) return json({ error: '缺少菜谱数据' }, 400);
  const updatedAt = new Date().toISOString();
  const imageIds = extractImageIds(state);
  try {
    const saved = await d1Save(env.DB, code, state, imageIds, updatedAt);
    const meta = { updatedAt, recipes: saved.recipes, dining: saved.dining, version: saved.version, images: saved.images, empty: false, store: 'd1' };
    let collected = 0;
    try { collected = await gcR2(env.IMAGES, code, imageIds) } catch {}
    return json({ ok: true, ...meta, collected });
  } catch (e) {
    const msg = e && e.message ? e.message : '写入云端数据库失败';
    const status = /过大|配图/.test(msg) ? 413 : 500;
    return json({ error: msg }, status);
  }
}
