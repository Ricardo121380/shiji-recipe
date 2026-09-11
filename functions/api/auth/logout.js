import { CORS, json, requireUser } from '../../_lib/auth.js';

export async function onRequestOptions() { return new Response(null, { status: 204, headers: CORS }); }

export async function onRequestPost({ request, env }) {
  const auth = await requireUser(request, env);
  if (auth.error) return auth.error;
  try { await env.DB.prepare('DELETE FROM sessions WHERE token = ?').bind(auth.user.token).run(); } catch {}
  return json({ ok: true });
}
