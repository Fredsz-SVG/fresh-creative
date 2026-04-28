-- Store applied discount voucher on albums.
ALTER TABLE albums ADD COLUMN discount_voucher_code TEXT;
ALTER TABLE albums ADD COLUMN discount_percent_off INTEGER;

CREATE INDEX IF NOT EXISTS idx_albums_discount_voucher_code ON albums(discount_voucher_code);

