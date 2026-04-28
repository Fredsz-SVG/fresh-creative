-- Discount vouchers (percentage off) for pricing pages.
-- Managed by admin, validated publicly (no mutation on validate).
CREATE TABLE IF NOT EXISTS discount_vouchers (
  id TEXT PRIMARY KEY NOT NULL,
  code TEXT NOT NULL UNIQUE,
  percent_off INTEGER NOT NULL CHECK (percent_off >= 1 AND percent_off <= 100),
  max_uses INTEGER NOT NULL DEFAULT 1 CHECK (max_uses >= 1),
  used_count INTEGER NOT NULL DEFAULT 0 CHECK (used_count >= 0),
  is_active INTEGER NOT NULL DEFAULT 1,
  expires_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_discount_vouchers_code ON discount_vouchers(code);
CREATE INDEX IF NOT EXISTS idx_discount_vouchers_active ON discount_vouchers(is_active);
CREATE INDEX IF NOT EXISTS idx_discount_vouchers_expires_at ON discount_vouchers(expires_at);

