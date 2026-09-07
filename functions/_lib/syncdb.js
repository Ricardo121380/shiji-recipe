// 云端状态拆成 D1 行：列表按记录存，对象按文档存；配图只留哈希，字节在 R2
export const SYNC_VERSION = 5;
const MAX_ROW = 1_000_000;
const MAX_PARAMS = 100;

export const LIST_KEYS = [
  ['recipes', 'recipe'],
  ['dining', 'dining'],
  ['pantry', 'pantry'],
  ['daily', 'daily'],
  ['shopping', 'shopping'],
  ['pantryHistory', 'pantry_history'],
];
export const DOC_KEYS = ['cats', 'menu', 'log', 'manualLog', 'nutrition', 'settings'];

const kindToList = Object.fromEntries(LIST_KEYS.map(([arr, kind]) => [kind, arr]));

export function walkImageRefs(state, fn) {
  for (const r of state.recipes || []) {
    fn(r && r.image);
    for (const s of r && r.steps || []) fn(s && s.image);
  }
  for (const d of state.dining || []) fn(d && d.image);
}

export function extractImageIds(state) {
  const ids = [];
  const seen = new Set();
  walkImageRefs(state, ref => {
    if (typeof ref !== 'string' || !ref.startsWith('idb:')) return;
    const id = ref.slice(4);
    if (!id || seen.has(id)) return;
    seen.add(id);
    ids.push(id);
  });
  return ids;
}

export function unionImageIds(state, extra) {
  const ids = extractImageIds(state);
  const seen = new Set(ids);
  for (const id of extra || []) {
    if (typeof id !== 'string' || !id || seen.has(id)) continue;
    seen.add(id);
    ids.push(id);
  }
  return ids;
}

function recId(item, i, used) {
  let id = item && item.id != null && String(item.id) !== '' ? String(item.id) : String(i);
  if (used.has(id)) id = id + ':' + i;
  used.add(id);
  return id;
}

export function splitState(state) {
  const records = [];
  const docs = [];
  const usedKeys = new Set();
  if (!state || typeof state !== 'object') return { records, docs };
  for (const [arrKey, kind] of LIST_KEYS) {
    usedKeys.add(arrKey);
    const arr = Array.isArray(state[arrKey]) ? state[arrKey] : [];
    const used = new Set();
    arr.forEach((item, pos) => {
      records.push({ kind, id: recId(item, pos, used), pos, body: JSON.stringify(item ?? null) });
    });
  }
  for (const key of DOC_KEYS) {
    usedKeys.add(key);
    if (state[key] !== undefined) docs.push({ key, body: JSON.stringify(state[key]) });
  }
  const rest = {};
  for (const k of Object.keys(state)) {
    if (!usedKeys.has(k)) rest[k] = state[k];
  }
  if (Object.keys(rest).length) docs.push({ key: '_rest', body: JSON.stringify(rest) });
  return { records, docs };
}

export function assembleState(records, docs) {
  const state = {};
  for (const [arrKey] of LIST_KEYS) state[arrKey] = [];
  const buckets = {};
  for (const rec of records || []) {
    const arrKey = kindToList[rec.kind];
    if (!arrKey) continue;
    let item;
    try { item = JSON.parse(rec.body) } catch { continue }
    (buckets[arrKey] ||= []).push({ pos: Number(rec.pos) || 0, item });
  }
  for (const arrKey of Object.keys(buckets)) {
    buckets[arrKey].sort((a, b) => a.pos - b.pos);
    state[arrKey] = buckets[arrKey].map(x => x.item);
  }
  for (const doc of docs || []) {
    let val;
    try { val = JSON.parse(doc.body) } catch { continue }
    if (doc.key === '_rest' && val && typeof val === 'object' && !Array.isArray(val)) Object.assign(state, val);
    else state[doc.key] = val;
  }
  return state;
}

export function assertStoreable(state) {
  const raw = JSON.stringify(state);
  if (raw.includes('data:image/')) throw new Error('配图尚未转成本机引用，请稍后重试上传');
  if (raw.length > 1_500_000) throw new Error('菜谱文字数据过大，请减少记录后重试');
  const { records, docs } = splitState(state);
  for (const rec of records) {
    if (rec.body.length > MAX_ROW) throw new Error('单条记录过大，请检查该菜谱的配图是否仍嵌在正文里');
  }
  for (const doc of docs) {
    if (doc.body.length > MAX_ROW) throw new Error('菜单或设置数据过大');
  }
  return { records, docs, raw };
}

function insertStmts(db, table, columns, rows, bindRow) {
  if (!rows.length) return [];
  const n = columns.length;
  const chunk = Math.max(1, Math.floor(MAX_PARAMS / n));
  const stmts = [];
  const colSql = columns.join(',');
  for (let i = 0; i < rows.length; i += chunk) {
    const part = rows.slice(i, i + chunk);
    const placeholders = part.map(() => `(${columns.map(() => '?').join(',')})`).join(',');
    const binds = [];
    for (const row of part) binds.push(...bindRow(row));
    stmts.push(db.prepare(`INSERT INTO ${table} (${colSql}) VALUES ${placeholders}`).bind(...binds));
  }
  return stmts;
}

export async function d1Meta(db, code) {
  const row = await db.prepare(
    'SELECT updated_at, version, recipes, dining, images, image_ids FROM snapshots WHERE code = ?'
  ).bind(code).first();
  if (!row) return null;
  let imageIds = [];
  try { imageIds = JSON.parse(row.image_ids || '[]') } catch { imageIds = [] }
  if (!Array.isArray(imageIds)) imageIds = [];
  return {
    empty: false,
    updatedAt: row.updated_at || null,
    recipes: Number(row.recipes) || 0,
    dining: Number(row.dining) || 0,
    images: Number(row.images) || 0,
    version: Number(row.version) || SYNC_VERSION,
    imageIds,
    store: 'd1',
  };
}

export async function d1Load(db, code) {
  const meta = await d1Meta(db, code);
  if (!meta) return null;
  const recs = await db.prepare('SELECT kind, id, pos, body FROM records WHERE code = ?').bind(code).all();
  const docs = await db.prepare('SELECT key, body FROM docs WHERE code = ?').bind(code).all();
  const state = assembleState(recs.results || [], docs.results || []);
  return { meta, state, imageIds: meta.imageIds };
}

export async function d1Save(db, code, state, imageIds, updatedAt) {
  const { records, docs } = assertStoreable(state);
  const recipes = Array.isArray(state.recipes) ? state.recipes.length : 0;
  const dining = Array.isArray(state.dining) ? state.dining.length : 0;
  const idsJson = JSON.stringify(imageIds || []);
  const stmts = [
    db.prepare('DELETE FROM records WHERE code = ?').bind(code),
    db.prepare('DELETE FROM docs WHERE code = ?').bind(code),
    db.prepare(
      `INSERT INTO snapshots (code, updated_at, version, recipes, dining, images, image_ids)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(code) DO UPDATE SET
         updated_at = excluded.updated_at,
         version = excluded.version,
         recipes = excluded.recipes,
         dining = excluded.dining,
         images = excluded.images,
         image_ids = excluded.image_ids`
    ).bind(code, updatedAt, SYNC_VERSION, recipes, dining, (imageIds || []).length, idsJson),
  ];
  stmts.push(...insertStmts(db, 'records', ['code', 'kind', 'id', 'pos', 'body'], records,
    rec => [code, rec.kind, rec.id, rec.pos, rec.body]));
  stmts.push(...insertStmts(db, 'docs', ['code', 'key', 'body'], docs,
    doc => [code, doc.key, doc.body]));
  await db.batch(stmts);
  return { recipes, dining, images: (imageIds || []).length, version: SYNC_VERSION };
}

export async function gcR2(bucket, code, keep) {
  if (!bucket) return 0;
  const keepSet = new Set(keep || []);
  const prefix = code + '/';
  const toDelete = [];
  let cursor;
  do {
    const listed = await bucket.list({ prefix, cursor, limit: 1000 });
    for (const obj of listed.objects || []) {
      const id = obj.key.slice(prefix.length);
      if (id && !keepSet.has(id)) toDelete.push(obj.key);
    }
    cursor = listed.truncated ? listed.cursor : undefined;
  } while (cursor);
  for (let i = 0; i < toDelete.length; i += 100) {
    const part = toDelete.slice(i, i + 100);
    await Promise.all(part.map(key => bucket.delete(key)));
  }
  return toDelete.length;
}
