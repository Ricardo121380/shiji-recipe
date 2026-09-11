import { CORS, json, requireUser } from '../../_lib/auth.js';

export async function onRequestOptions() { return new Response(null, { status: 204, headers: CORS }); }

export async function onRequestGet({ request, env }) {
  const auth = await requireUser(request, env);
  if (auth.error) return auth.error;
  return json({ ok: true, username: auth.user.username });
}
