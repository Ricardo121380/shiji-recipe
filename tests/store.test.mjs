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

import { matchRecipes, addCustomItem, derivedLog, dayIntake, orderSpecGroups, addDays, today } from '../src/store.js';

const fresh = over => {
  const next = normalizeImport({ state: { ...JSON.parse(JSON.stringify(S)), ...over } });
  assert.ok(replaceState(next));
};

test('matchRecipes：命中数相同时临期食材的菜谱排前', () => {
  const t = today();
  fresh({
    pantry: [
      { id: 'p1', name: '牛肉', kind: 'ingredient', qty: 1, expiryDate: addDays(t, 10) },
      { id: 'p2', name: '番茄', kind: 'ingredient', qty: 1, expiryDate: addDays(t, 1) },
    ],
    recipes: [
      { id: 'r1', type: 'dish', name: '炖牛肉', ingredients: [{ name: '牛肉' }] },
      { id: 'r2', type: 'dish', name: '番茄汤', ingredients: [{ name: '番茄' }] },
    ],
  });
  const { some } = matchRecipes(['p1', 'p2']);
  assert.deepEqual(
    some.map(x => x.r.id),
    ['r2', 'r1'],
  );
});

test('自定义项：勾选已吃后计入热量和就餐记录（含备注）', () => {
  const t = today();
  fresh({ menu: {}, manualLog: {} });
  addCustomItem(t, 'dinner', '外卖披萨', '800', '拼单');
  const it = S.menu[t].dinner[0];
  assert.equal(it.refType, 'custom');
  assert.equal(it.calories, 800);
  assert.equal(dayIntake(t), 0);
  it.done = true;
  assert.equal(dayIntake(t), 800);
  assert.equal(derivedLog()[t][0].note, '拼单');
});

test('自定义项：热量留空时记为 null', () => {
  const t = today();
  fresh({ menu: {} });
  addCustomItem(t, 'lunch', '食堂', '', '');
  assert.equal(S.menu[t].lunch[0].calories, null);
});

test('温度规格：旧备份没有 temps 时补默认值，非法值被过滤', () => {
  const s = normalizeImport({
    state: {
      ...JSON.parse(JSON.stringify(S)),
      recipes: [
        { id: 'd1', type: 'drink', name: '拿铁' },
        { id: 'd2', type: 'drink', name: '美式', temps: ['热', '烫'] },
      ],
    },
  });
  assert.deepEqual(s.recipes[0].temps, []);
  assert.deepEqual(s.recipes[1].temps, ['热']);
});

test('orderSpecGroups：饮品追加温度组，已有同名规格时不重复，菜品不追加', () => {
  const drink = { type: 'drink', temps: ['热', '冷'], specs: [{ name: '甜度', options: ['少糖'], enabled: true }] };
  assert.deepEqual(
    orderSpecGroups(drink).map(g => [g.name, g.options]),
    [
      ['甜度', ['少糖']],
      ['温度', ['冷', '热']],
    ],
  );
  const own = { type: 'drink', temps: ['冷'], specs: [{ name: '温度', options: ['去冰'], enabled: true }] };
  assert.equal(orderSpecGroups(own).filter(g => g.name === '温度').length, 1);
  assert.equal(orderSpecGroups({ type: 'dish', temps: ['热'], specs: [] }).length, 0);
});
