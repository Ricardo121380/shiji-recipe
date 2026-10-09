// 云端版本备份：用 node:sqlite 模拟 D1，用内存 Map 模拟 R2
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import {
  saveWithBackup,
  d1Load,
  listBackups,
  backupsToKeep,
  backupPrefix,
  BACKUP_KEEP_LATEST,
} from '../functions/_lib/syncdb.js';

function fakeD1() {
  const db = new DatabaseSync(':memory:');
  db.exec(readFileSync(new URL('../schema/migrations/0001_init.sql', import.meta.url), 'utf8'));
  const stmt = (sql, args = []) => ({
    bind: (...a) => stmt(sql, a),
    first: async () => db.prepare(sql).get(...args) ?? null,
    all: async () => ({ results: db.prepare(sql).all(...args) }),
    run: async () => db.prepare(sql).run(...args),
  });
  return {
    prepare: sql => stmt(sql),
    batch: async stmts => {
      db.exec('BEGIN');
      try {
        for (const s of stmts) await s.run();
        db.exec('COMMIT');
      } catch (e) {
        db.exec('ROLLBACK');
        throw e;
      }
    },
  };
}

function fakeR2() {
  const m = new Map();
  return {
    m,
    failPuts: false,
    async put(k, v) {
      if (this.failPuts) throw new Error('r2 down');
      m.set(k, typeof v === 'string' ? v : 'bin');
    },
    async get(k) {
      return m.has(k) ? { text: async () => m.get(k) } : null;
    },
    async delete(k) {
      m.delete(k);
    },
    async list({ prefix }) {
      return { objects: [...m.keys()].filter(k => k.startsWith(prefix)).map(key => ({ key })), truncated: false };
    },
  };
}

const h = c => c.repeat(64);
const st = (name, img) => ({ recipes: [{ id: 'r1', name, image: img ? 'idb:' + img : '' }], dining: [] });
const ids = s => (s.recipes[0].image ? [s.recipes[0].image.slice(4)] : []);

async function push(env, state, at) {
  return saveWithBackup(env, 'acct-test', state, ids(state), at);
}

test('覆盖前备份上一版；首次上传没有备份', async () => {
  const env = { DB: fakeD1(), IMAGES: fakeR2() };
  await push(env, st('第一版', h('a')), '2026-10-01T10:00:00.000Z');
  assert.equal((await listBackups(env.IMAGES, 'acct-test')).length, 0);
  await push(env, st('第二版', h('b')), '2026-10-02T10:00:00.000Z');
  const bases = await listBackups(env.IMAGES, 'acct-test');
  assert.equal(bases.length, 1);
  const saved = JSON.parse(env.IMAGES.m.get(bases[0] + '.json'));
  assert.equal(saved.state.recipes[0].name, '第一版');
  assert.equal(saved.backupOf, '2026-10-01T10:00:00.000Z');
  assert.equal((await d1Load(env.DB, 'acct-test')).state.recipes[0].name, '第二版');
});

test('旧版本引用的配图不会被 GC 删除', async () => {
  const env = { DB: fakeD1(), IMAGES: fakeR2() };
  env.IMAGES.m.set('acct-test/' + h('a'), 'bin');
  await push(env, st('第一版', h('a')), '2026-10-01T10:00:00.000Z');
  env.IMAGES.m.set('acct-test/' + h('b'), 'bin');
  env.IMAGES.m.set('acct-test/' + h('z'), 'bin');
  await push(env, st('第二版', h('b')), '2026-10-02T10:00:00.000Z');
  assert.ok(env.IMAGES.m.has('acct-test/' + h('a')), '备份引用的配图保留');
  assert.ok(env.IMAGES.m.has('acct-test/' + h('b')));
  assert.ok(!env.IMAGES.m.has('acct-test/' + h('z')), '没有任何版本引用的才清理');
});

test('备份写入失败时不覆盖云端', async () => {
  const env = { DB: fakeD1(), IMAGES: fakeR2() };
  await push(env, st('第一版'), '2026-10-01T10:00:00.000Z');
  env.IMAGES.failPuts = true;
  await assert.rejects(push(env, st('第二版'), '2026-10-02T10:00:00.000Z'), /未覆盖云端/);
  assert.equal((await d1Load(env.DB, 'acct-test')).state.recipes[0].name, '第一版');
});

test('读不到备份的配图清单时跳过 GC', async () => {
  const env = { DB: fakeD1(), IMAGES: fakeR2() };
  env.IMAGES.m.set('acct-test/' + h('a'), 'bin');
  await push(env, st('第一版', h('a')), '2026-10-01T10:00:00.000Z');
  await push(env, st('第二版'), '2026-10-02T10:00:00.000Z');
  const [base] = await listBackups(env.IMAGES, 'acct-test');
  env.IMAGES.m.delete(base + '.ids');
  await push(env, st('第三版'), '2026-10-03T10:00:00.000Z');
  assert.ok(env.IMAGES.m.has('acct-test/' + h('a')));
});

test('保留策略：最近 10 份 + 30 天内每天一份', () => {
  const p = backupPrefix('c');
  const sameDay = Array.from({ length: 15 }, (_, i) => `${p}2026-10-09T10-${String(59 - i).padStart(2, '0')}-00-000Z`);
  assert.equal(backupsToKeep(sameDay, p, '2026-10-09T12:00:00.000Z').length, BACKUP_KEEP_LATEST);
  const daily = Array.from({ length: 40 }, (_, i) => {
    const d = new Date(Date.UTC(2026, 9, 9) - i * 86400000).toISOString().slice(0, 10);
    return `${p}${d}T08-00-00-000Z`;
  });
  const kept = backupsToKeep(daily, p, '2026-10-09T12:00:00.000Z');
  assert.equal(kept.length, 31);
  assert.ok(kept.every(b => b.slice(p.length, p.length + 10) >= '2026-09-09'));
});
