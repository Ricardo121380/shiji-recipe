import './setup.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { S, load, replaceState, normalizeImport, isPristine, update } from '../src/store.js';

const KEY = 'shiji-state-v2';
const OLD_KEY = 'shiji-recipes-v1';

test('load：v2 损坏时回退到 v1 迁移，且不写入 v1 旧键', () => {
  localStorage.clear();
  const v1 = JSON.stringify([{ id: 'a', name: '红烧肉', time: 90, ingredients: '五花肉 500g', steps: ['炖'] }]);
  localStorage.setItem(KEY, '{broken');
  localStorage.setItem(OLD_KEY, v1);
  const s = load();
  assert.equal(s.recipes[0].name, '红烧肉');
  assert.equal(s.recipes[0].hours, 1);
  assert.equal(localStorage.getItem(OLD_KEY), v1);
});

test('load：两者都没有时生成种子数据', () => {
  localStorage.clear();
  const s = load();
  assert.ok(s.recipes.length > 0);
  assert.ok(Array.isArray(s.pantry));
});

test('replaceState：写盘失败时内存不变', () => {
  const before = JSON.stringify(S);
  localStorage.failWrites = true;
  try {
    assert.equal(replaceState(normalizeImport({ recipes: [], cats: {}, pantry: [] })), false);
  } finally {
    localStorage.failWrites = false;
  }
  assert.equal(JSON.stringify(S), before);
});

test('replaceState：成功时先写盘再替换内存', () => {
  const next = normalizeImport({ state: { ...JSON.parse(JSON.stringify(S)), recipes: [] } });
  assert.equal(replaceState(next), true);
  assert.equal(S.recipes.length, 0);
  assert.equal(JSON.parse(localStorage.getItem(KEY)).recipes.length, 0);
});

test('isPristine：update() 之后不再视为未改动', () => {
  const next = normalizeImport({ state: { ...JSON.parse(JSON.stringify(S)), settings: {} } });
  replaceState(next);
  assert.equal(isPristine(), true);
  update(() => {
    S.nutrition.goal = 1800;
  });
  assert.equal(isPristine(), false);
});
