const fs = require('fs');
let code = fs.readFileSync('AlbumsView.tsx', 'utf8');
const startIndex = code.indexOf('const handleDelete = async (e: React.MouseEvent, album: AlbumRow) => {');
const endIndex = code.indexOf('\n    }', code.indexOf('setLoadingId(null)', startIndex)) + 6;
const target = code.substring(startIndex, endIndex);

const replacement = `const handleDelete = async (e: React.MouseEvent, album: AlbumRow) => {
    e.stopPropagation()
    setDeleteConfirm(album)
  }

  const confirmDelete = async () => {
    if (!deleteConfirm) return
    const album = deleteConfirm
    setDeleteConfirm(null)
    setLoadingId(album.id)
    try {
      const res = await fetchWithAuth(\`/api/albums/\${album.id}\`, { method: 'DELETE', credentials: 'include' })
      if (!res.ok) {