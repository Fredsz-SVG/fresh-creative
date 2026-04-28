-- Track voucher usage per user (prevent double use per user).
CREATE TABLE IF NOT EXISTS discount_voucher_history (
  id TEXT PRIMARY KEY NOT NULL,
  discount_voucher_id TEXT NOT NULL REFERENCES discount_vouchers(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  album_id TEXT NOT NULL REFERENCES albums(id) ON DELETE CASCADE,
  percent_off INTEGER NOT NULL,
  used_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- One voucher per user (ever).
CREATE UNIQUE INDEX IF NOT EXISTS uq_discount_voucher_history_voucher_user
  ON discount_voucher_history(discount_voucher_id, user_id);

CREATE INDEX IF NOT EXISTS idx_discount_voucher_history_voucher_id
  ON discount_voucher_history(discount_voucher_id);
CREATE INDEX IF NOT EXISTS idx_discount_voucher_history_user_id
  ON discount_voucher_history(user_id);
CREATE INDEX IF NOT EXISTS idx_discount_voucher_history_used_at
  ON discount_voucher_history(used_at);

