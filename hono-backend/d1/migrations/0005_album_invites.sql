-- Staff/album invite links (token → join as member/admin). Terpisah dari student_invite_token di albums.
CREATE TABLE IF NOT EXISTS album_invites (
  id TEXT PRIMARY KEY NOT NULL,
  album_id TEXT NOT NULL REFERENCES albums(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  created_by TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'admin')),
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_album_invites_album_id ON album_invites(album_id);
