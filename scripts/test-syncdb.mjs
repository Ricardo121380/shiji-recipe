import { splitState, assembleState, extractImageIds, unionImageIds, assertStoreable } from '../functions/_lib/syncdb.js';

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const hashA = 'a'.repeat(64);
const hashB = 'b'.repeat(64);
const hashC = 'c'.repeat(64);

const state = {
  recipes: [
    { id: 'r1', name: '番茄炒蛋', image: 'idb:' + hashA, steps: [{ text: '炒', image: 'idb:' + hashB }] },
    { id: 'r2', name: '要删的菜', image: 'idb:' + hashC, steps: [{ text: '煮', image: '' }] },
  ],
  dining: [{ id: 'd1', name: '面馆', image: 'idb:' + hashA }],
  pantry: [{ id: 'p1', name: '鸡蛋', qty: 6 }],
  pantryHistory: [{ name: '鸡蛋', unit: '个' }],
  daily: [],
  shopping: [],
  cats: { dish: ['家常菜'] },
  menu: { '2026-09-07': { dinner: [{ refId: 'r1', name: '番茄炒蛋' }] } },
  log: {},
  manualLog: {},
  nutrition: { goal: 2000 },
  settings: { autoSyncPause: false, extraFlag: true },
  mystery: 1,
};

const { records, docs } = splitState(state);
const kinds = records.map(r => r.kind + ':' + r.id).sort();
assert(kinds.includes('recipe:r1') && kinds.includes('recipe:r2') && kinds.includes('dining:d1'), 'records missing');
assert(docs.some(d => d.key === 'cats') && docs.some(d => d.key === '_rest'), 'docs missing');
assert(JSON.parse(docs.find(d => d.key === '_rest').body).mystery === 1, 'rest lost');

const round = assembleState(records, docs);
assert(round.recipes[0].name === '番茄炒蛋', 'recipe order');
assert(round.recipes[1].id === 'r2', 'second recipe');
assert(round.dining[0].name === '面馆', 'dining');
assert(round.pantry[0].name === '鸡蛋', 'pantry');
assert(round.pantryHistory[0].name === '鸡蛋', 'history');
assert(round.menu['2026-09-07'].dinner[0].refId === 'r1', 'menu');
assert(round.settings.extraFlag === true, 'settings');
assert(round.mystery === 1, 'mystery');

const ids = extractImageIds(state);
assert(ids.length === 3 && ids.includes(hashA) && ids.includes(hashB) && ids.includes(hashC), 'extract hashes');

const afterDel = { ...state, recipes: state.recipes.filter(r => r.id !== 'r2') };
const left = extractImageIds(afterDel);
assert(left.length === 2 && !left.includes(hashC), 'delete recipe drops unused hash');
assert(left.includes(hashA), 'shared cover hash kept via dining');

const unioned = unionImageIds(afterDel, [hashC, 'extra-id']);
assert(unioned.includes('extra-id') && unioned.includes(hashA), 'union');

try {
  assertStoreable({ recipes: [{ id: 'x', image: 'data:image/jpeg;base64,xxxx' }], dining: [] });
  throw new Error('should reject inline images');
} catch (e) {
  if (!String(e.message).includes('配图')) throw e;
}

console.log('ok', { records: records.length, docs: docs.length, ids: ids.length, afterDel: left.length });
