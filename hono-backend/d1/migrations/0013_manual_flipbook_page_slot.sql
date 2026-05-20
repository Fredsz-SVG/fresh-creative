-- Tracks semantic role so order stays: front cover → body (PDF/pages) → back cover,
-- regardless of upload order.

ALTER TABLE manual_flipbook_pages ADD COLUMN page_slot TEXT NOT NULL DEFAULT 'body';
