-- Pengaturan key/value (showcase landing, bisa dikembangkan key lain)
CREATE TABLE IF NOT EXISTS site_settings (
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL DEFAULT '{}'
);

INSERT OR REPLACE INTO site_settings (key, value)
VALUES ('showcase', '{"albumPreviews":[],"flipbookPreviewUrl":""}');
