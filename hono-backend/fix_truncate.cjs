const fs = require('fs')
let code = fs.readFileSync('../components/albums/AlbumsView.tsx', 'utf8')

code = code.replace(
  /<p className="text-xl font-bold text-slate-900 dark:text-white mb-1 truncate">/g,
  '<p className="text-base font-bold text-slate-900 dark:text-white mb-1 line-clamp-2 leading-snug">'
)

code = code.replace(
  /<p className="text-sm font-bold text-slate-900 dark:text-white truncate">\{album.name\}<\/p>/g,
  '<p className="text-sm font-bold text-slate-900 dark:text-white line-clamp-2 leading-tight" title={album.name}>{album.name}</p>'
)

code = code.replace(
  /<p className="text-xs text-slate-500 truncate">\{album\.school_city \|\| '-'\}<\/p>/g,
  '<p className="text-xs text-slate-500 line-clamp-1">{album.school_city || "-"}</p>'
)

fs.writeFileSync('../components/albums/AlbumsView.tsx', code)
