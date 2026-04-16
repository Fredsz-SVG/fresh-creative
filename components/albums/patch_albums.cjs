const fs = require('fs');

let txt = fs.readFileSync('AlbumsView.tsx', 'utf8');

// 1. API fixes
txt = txt.replace(/fetchWithAuth\('\/api\/albums', \{\s*method: 'PUT',\s*credentials: 'include',\s*headers: \{ 'Content-Type': 'application\/json' \},\s*body: JSON\.stringify\(\{ id: album\.id, status: 'approved' \}\),\s*\}\)/g, 
  "fetchWithAuth(`/api/albums/${album.id}`, { method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'approved' }) })");

txt = txt.replace(/fetchWithAuth\('\/api\/albums', \{\s*method: 'PUT',\s*credentials: 'include',\s*headers: \{ 'Content-Type': 'application\/json' \},\s*body: JSON\.stringify\(\{ id: album\.id, status: 'declined' \}\),\s*\}\)/g, 
  "fetchWithAuth(`/api/albums/${album.id}`, { method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'declined' }) })");

txt = txt.replace(/fetchWithAuth\('\/api\/albums\/\${album\.id}'/g, "fetchWithAuth(`/api/albums/${album.id}`"); // Just in case it's partially patched
txt = txt.replace(/fetchWithAuth\('\/api\/albums',\s*\{\s*method: 'DELETE',\s*credentials: 'include'\s*\}\)/g, 
  "fetchWithAuth(`/api/albums/${album.id}`, { method: 'DELETE', credentials: 'include' })");


// 2. Add Modal UI and handle Delete logically
if (!txt.includes('deleteConfirm')) {
  txt = txt.replace(/const \[confirmModal, setConfirmModal\] = useState<.*?\(null\)/, 
    "const [confirmModal, setConfirmModal] = useState<'personal' | 'yearbook' | null>(null)\n  const [deleteConfirm, setDeleteConfirm] = useState<AlbumRow | null>(null)"
  );
}

const handleDeleteRegex = /const handleDelete = async \(e: React\.MouseEvent, album: AlbumRow\) => \{[\s\S]*?setLoadingId\(null\)\n    \}\n  \}/;

const newHandleDelete = `const handleDelete = async (e: React.MouseEvent, album: AlbumRow) => {
    e.stopPropagation()
    setDeleteConfirm(album)
  }

  const confirmDelete = async () => {
    if (!deleteConfirm) return
    const album = deleteConfirm
    setDeleteConfirm(null)
    setLoadingId(album.id!)
    try {
      const res = await fetchWithAuth(\`/api/albums/\${album.id}\`, { method: 'DELETE', credentials: 'include' })
      if (!res.ok) {
        const err = asObject(await res.json().catch(() => ({})))
        alert(getErrorMessage(err, 'Gagal hapus'))
        return
      }
      await fetchAlbums(true)
    } catch (err: any) {
      alert(err.message)
    } finally {
      setLoadingId(null)
    }
  }`;

txt = txt.replace(handleDeleteRegex, newHandleDelete);

const deleteModal = `
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div 
            className="w-full max-w-sm bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-[8px_8px_0_0_#94a3b8] dark:shadow-[8px_8px_0_0_#1e293b] border-2 border-slate-200 dark:border-slate-700 animate-in fade-in zoom-in-95 duration-200"
          >
            <div className="bg-rose-100 dark:bg-rose-900/30 w-12 h-12 rounded-2xl flex items-center justify-center mb-4">
              <Trash2 className="w-6 h-6 text-rose-600 dark:text-rose-400" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Hapus Album?</h3>
            <p className="text-slate-600 dark:text-slate-300 mb-6 text-sm">
              Anda yakin ingin menghapus album <span className="font-bold">"{deleteConfirm.name}"</span>?
              Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors shadow-[2px_2px_0_0_#94a3b8] dark:shadow-[2px_2px_0_0_#475569] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="flex-1 py-3 rounded-xl bg-rose-500 text-white text-sm font-bold hover:bg-rose-600 transition-colors shadow-[2px_2px_0_0_#e11d48] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5"
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}
`;

if (!txt.includes('Hapus Album?')) {
  txt = txt.replace('{invoicePopupUrl && (', deleteModal + '\n      {invoicePopupUrl && (');
}

// 3. Desktop buttons replacing X and Check icons with text
// Ensure we're targeting the right desktop class list to avoid changing the AlbumCard inadvertently.
txt = txt.replace(/<button\s+onClick=\{\(e\) => handleApprove\(e, album\)\}\s+disabled=\{!!loadingId\}\s+className="p-2 rounded-xl bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition-colors shadow-\[2px_2px_0_0_#059669\] hover:shadow-none hover:translate-x-0\.5 hover:translate-y-0\.5 disabled:opacity-50">\s*<Check className="w-4 h-4" \/>\s*<\/button>/g,
  `<button onClick={(e) => handleApprove(e, album)} disabled={!!loadingId} className="flex items-center gap-1 p-2 md:px-3 md:py-2 rounded-xl bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition-colors shadow-[2px_2px_0_0_#059669] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 disabled:opacity-50"> <Check className="w-4 h-4" /> <span className="hidden md:inline text-xs font-bold">Approve</span> </button>`);

txt = txt.replace(/<button\s+onClick=\{\(e\) => handleDecline\(e, album\)\}\s+disabled=\{!!loadingId\}\s+className="p-2 rounded-xl bg-amber-100 text-amber-700 hover:bg-amber-200 transition-colors shadow-\[2px_2px_0_0_#d97706\] hover:shadow-none hover:translate-x-0\.5 hover:translate-y-0\.5 disabled:opacity-50">\s*<X className="w-4 h-4" \/>\s*<\/button>/g,
  `<button onClick={(e) => handleDecline(e, album)} disabled={!!loadingId} className="flex items-center gap-1 p-2 md:px-3 md:py-2 rounded-xl bg-amber-100 text-amber-700 hover:bg-amber-200 transition-colors shadow-[2px_2px_0_0_#d97706] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 disabled:opacity-50"> <X className="w-4 h-4" /> <span className="hidden md:inline text-xs font-bold">Decline</span> </button>`);

txt = txt.replace(/<button\s+onClick=\{\(e\) => handleDelete\(e, album\)\}\s+disabled=\{!!loadingId\}\s+className="p-2 rounded-xl bg-rose-100 text-rose-700 hover:bg-rose-200 transition-colors shadow-\[2px_2px_0_0_#e11d48\] hover:shadow-none hover:translate-x-0\.5 hover:translate-y-0\.5 disabled:opacity-50">\s*<Trash2 className="w-4 h-4" \/>\s*<\/button>/g,
  `<button onClick={(e) => handleDelete(e, album)} disabled={!!loadingId} className="flex items-center gap-1 p-2 md:px-3 md:py-2 rounded-xl bg-rose-100 text-rose-700 hover:bg-rose-200 transition-colors shadow-[2px_2px_0_0_#e11d48] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 disabled:opacity-50"> <Trash2 className="w-4 h-4" /> <span className="hidden md:inline text-xs font-bold">Hapus</span> </button>`);

// 4. Mobile buttons: The UI has `{(album.status ?? 'pending') !== 'approved' && (`
// Let's replace the mobile section to include Decline.
const mobileBlockBefore = `{(album.status ?? 'pending') !== 'approved' && (
                      <button
                        onClick={(e) => handleApprove(e as any, album)}
                        disabled={!!loadingId}
                        className="flex-1 py-2 text-xs font-bold rounded-xl bg-emerald-100 text-emerald-600 hover:bg-emerald-200 transition-colors shadow-[2px_2px_0_0_#059669] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 disabled:opacity-50"
                      >
                        Approve
                      </button>
                    )}`;
const mobileBlockAfter = `{(album.status ?? 'pending') !== 'approved' && (
                      <button
                        onClick={(e) => handleApprove(e as any, album)}
                        disabled={!!loadingId}
                        className="flex-1 py-2 text-xs font-bold rounded-xl bg-emerald-100 text-emerald-600 hover:bg-emerald-200 transition-colors shadow-[2px_2px_0_0_#059669] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 disabled:opacity-50"
                      >
                        Approve
                      </button>
                    )}
                    {(album.status ?? 'pending') !== 'declined' && (
                      <button
                        onClick={(e) => handleDecline(e as any, album)}
                        disabled={!!loadingId}
                        className="flex-1 py-2 text-xs font-bold rounded-xl bg-amber-100 text-amber-600 hover:bg-amber-200 transition-colors shadow-[2px_2px_0_0_#d97706] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 disabled:opacity-50"
                      >
                        Decline
                      </button>
                    )}`;
txt = txt.replace(mobileBlockBefore, mobileBlockAfter);

fs.writeFileSync('AlbumsView.tsx', txt);
console.log('✅ Final exact patch applied.');
