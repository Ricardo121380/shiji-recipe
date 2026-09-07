-- 饭Fun 云同步：结构化记录在 D1，配图字节只在 R2。禁止把 data URL / 图片二进制写入本库。
CREATE TABLE IF NOT EXISTS snapshots (
  code TEXT PRIMARY KEY,
  updated_at TEXT NOT NULL,
  version INTEGER NOT NULL,
  recipes INTEGER NOT NULL DEFAULT 0,
  dining INTEGER NOT NULL DEFAULT 0,
  images INTEGER NOT NULL DEFAULT 0,
  image_ids TEXT NOT NULL DEFAULT '[]'
);

CREATE TABLE IF NOT EXISTS records (
  code TEXT NOT NULL,
  kind TEXT NOT NULL,
  id TEXT NOT NULL,
  pos INTEGER NOT NULL DEFAULT 0,
  body TEXT NOT NULL,
  PRIMARY KEY (code, kind, id)
);

CREATE INDEX IF NOT EXISTS idx_records_code_kind_pos ON records (code, kind, pos);

CREATE TABLE IF NOT EXISTS docs (
  code TEXT NOT NULL,
  key TEXT NOT NULL,
  body TEXT NOT NULL,
  PRIMARY KEY (code, key)
);
