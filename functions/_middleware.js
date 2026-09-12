import { SITE_CLOSED, closedHtml } from './_lib/site.js';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,PUT,POST,HEAD,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function onRequest(context) {
  if (!SITE_CLOSED) return context.next();
  const path = new URL(context.request.url).pathname;
  if (path.startsWith('/api/')) {
    return new Response(JSON.stringify({ error: '站点暂停开放' }), {
      status: 503,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
        'Retry-After': '86400',
        ...CORS,
      },
    });
  }
  return new Response(closedHtml, {
    status: 503,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      'Retry-After': '86400',
    },
  });
}
