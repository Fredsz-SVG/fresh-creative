const fs = require('fs');

let txt = fs.readFileSync('AlbumsView.tsx', 'utf8');

txt = txt.replace(/<button[\s\S]*?onClick=\{\(e\) => handleApprove\(e, album\)\}[\s\S]*?<Check className="w-4 h-4" \/>[\s\S]*?<\/button>/, 
`<button onClick={(e) => handleApprove(e, album)} disabled={!!loadingId} className="flex items-center gap-1 p-2 md:px-3 md:py-2 rounded-xl bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition-colors shadow-[2px_2px_0_0_#059669] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 disabled:opacity-50"> <Check className="w-4 h-4" /> <span className="hidden xl:inline text-xs font-bold">Approve</span> </button>`);

txt = txt.replace(/<button[\s\S]*?onClick=\{\(e\) => handleDecline\(e, album\)\}[\s\S]*?<X className="w-4 h-4" \/>[\s\S]*?<\/button>/, 
`<button onClick={(e) => handleDecline(e, album)} disabled={!!loadingId} className="flex items-center gap-1 p-2 md:px-3 md:py-2 rounded-xl bg-amber-100 text-amber-700 hover:bg-amber-200 transition-colors shadow-[2px_2px_0_0_#d97706] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 disabled:opacity-50"> <X className="w-4 h-4" /> <span className="hidden xl:inline text-xs font-bold">Decline</span> </button>`);

txt = txt.replace(/<button[\s\S]*?onClick=\{\(e\) => handleDelete\(e, album\)\}[\s\S]*?<Trash2 className="w-4 h-4" \/>[\s\S]*?<\/button>/, 
`<button onClick={(e) => handleDelete(e, album)} disabled={!!loadingId} className="flex items-center gap-1 p-2 md:px-3 md:py-2 rounded-xl bg-rose-100 text-rose-700 hover:bg-rose-200 transition-colors shadow-[2px_2px_0_0_#e11d48] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 disabled:opacity-50"> <Trash2 className="w-4 h-4" /> <span className="hidden xl:inline text-xs font-bold">Hapus</span> </button>`);

fs.writeFileSync('AlbumsView.tsx', txt);
console.log('✅ Replaced desktop actions with text included');
