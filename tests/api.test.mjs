// 同步码接口加固：未命中限流、禁止用 acct- 码升级账号
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { onRequestGet } from '../functions/api/sync/[code].js';
import { onRequestPost as register } from '../functions/api/auth/register.js';

function fakeD1() {
  const db = new DatabaseSync(':memory:');
  for (const f of ['0001_init.sql', '0002_auth.sql'])
    db.exec(readFileSync(new URL('../schema/migrations/' + f, import.meta.url), 'utf8'));
  const stmt = (sql, args = []) => ({
    bind: (...a) => stmt(sql, a),
    first: async () => db.prepare(sql).get(...args) ?? null,
    all: async () => ({ results: db.prepare(sql).all(...args) }),
    run: async () => db.prepare(sql).run(...args),
  });
  return { prepare: sql => stmt(sql), batch: async s => Promise.all(s.map(x => x.run())) };
}
function fakeKV() {
  const m = new Map();
  return {
    m,
    get: async k => (m.has(k) ? m.get(k) : null),
    put: async (k, v) => void m.set(k, v),
    list: async ({ prefix }) => ({ keys: [...m.keys()].filter(k => k.startsWith(prefix)).map(name => ({ name })) }),
    getWithMetadata: async k => ({ value: m.get(k) ?? null, metadata: null }),
  };
}
const get = (env, code, ip = '1.1.1.1') =>
  onRequestGet({
    request: new Request(`https://x/api/sync/${code}?meta=1`, { headers: { 'CF-Connecting-IP': ip } }),
    params: { code },
    env,
  });

test('同一 IP 查询不存在的同步码超过 30 次后返回 429，其他 IP 不受影响', async () => {
  const env = { DB: fakeD1(), SYNC_KV: fakeKV() };
  for (let i = 0; i < 30; i++) assert.equal((await get(env, 'nothere-' + String(i).padStart(4, '0'))).status, 200);
  assert.equal((await get(env, 'nothere-9999')).status, 429);
  assert.equal((await get(env, 'nothere-9999', '2.2.2.2')).status, 200);
});

test('命中的同步码不计数，也就不写 KV', async () => {
  const env = { DB: fakeD1(), SYNC_KV: fakeKV() };
  env.SYNC_KV.m.set('sync:realcode1:meta', JSON.stringify({ updatedAt: 'x', recipes: 1 }));
  for (let i = 0; i < 40; i++) assert.equal((await get(env, 'realcode1')).status, 200);
  assert.ok(![...env.SYNC_KV.m.keys()].some(k => k.startsWith('rl:')));
});

test('注册时不能用 acct- 开头的码升级', async () => {
  const env = { DB: fakeD1(), SYNC_KV: fakeKV() };
  const r = await register({
    request: new Request('https://x/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username: 'alice', password: 'password123', legacyCode: 'acct-bob' }),
    }),
    env,
  });
  assert.equal(r.status, 400);
});
