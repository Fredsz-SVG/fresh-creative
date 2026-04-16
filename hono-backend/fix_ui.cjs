const fs = require('fs')
let code = fs.readFileSync('../components/albums/AlbumsView.tsx', 'utf8')

// Fix Button
code = code.replace(
  /className="p-2 bg-white rounded-full text-slate-700 hover:bg-slate-100 transition-all shadow-\[2px_2px_0_0_#475569\]"/g,
  'className="w-8 h-8 flex items-center justify-center shrink-0 bg-white rounded-full text-slate-700 hover:bg-slate-100 transition-all shadow-[2px_2px_0_0_#475569]"'
)

// Fix Title
code = code.replace(
  /<h2 className="text-base font-bold text-slate-900 dark:text-white truncate mb-1" title=\{album\.name\}>/g,
  '<h2 className="text-sm md:text-sm font-bold text-slate-900 dark:text-white line-clamp-2 mb-1 leading-tight" title={album.name}>'
)

fs.writeFileSync('../components/albums/AlbumsView.tsx', code)
