-- 账号：用户名密码登录；每人一份独立同步命名空间（code）
CREATE TABLE IF NOT EXISTS users (
  username TEXT PRIMARY KEY,
  pass_salt TEXT NOT NULL,
  pass_hash TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  username TEXT NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_username ON sessions (username);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions (expires_at);
CREATE INDEX IF NOT EXISTS idx_users_code ON users (code);
