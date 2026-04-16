const fs = require('fs')
let code = fs.readFileSync('../components/albums/AlbumsView.tsx', 'utf8')
code = code.replace(
  /if \(!res\.ok\) throw new Error\('Failed to fetch albums'\)/g,
  'if (!res.ok) { const txt = await res.text(); console.error(\"API_ERROR\", txt); throw new Error(\"Failed to fetch albums: \" + txt); }'
)
fs.writeFileSync('../components/albums/AlbumsView.tsx', code)
