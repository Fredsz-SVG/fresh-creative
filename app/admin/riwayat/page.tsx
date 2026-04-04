'use client'

import { History, ExternalLink, Loader2, CreditCard, X, Users, User, Search, RefreshCw, ChevronLeft, ChevronRight, Calendar } from 'lucide-react'
import { useEffect, useLayoutEffect, useState, useCallback, useRef, useMemo } from 'react'
import { fetchWithAuth } from '../../../lib/api-client'
import Link from 'next/link'

type Transaction = {
  id: string
  user_id?: string
  external_id?: string
  amount: number
  status: string
  invoice_url: string | null
  created_at: string
  credits?: number | null
  user_full_name?: string
  user_email?: string
  payment_method?: string | null
  album_name?: string | null
  description?: string | null
}

type ViewMode = 'mine' | 'all'

export default function AdminRiwayatPage() {
  const [loadingMap, setLoadingMap] = useState<{ mine: boolean, all: boolean }>({ mine: true, all: true })
  const [invoicePopupUrl, setInvoicePopupUrl] = useState<string | null>(null)
  const [viewMode, setViewModeState] = useState<ViewMode>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('adminRiwayatTab') as ViewMode) || 'mine'
    }
    return 'mine'
  })

  const setViewMode = (mode: ViewMode) => {
    setViewModeState(mode)
    if (typeof window !== 'undefined') {
      localStorage.setItem('adminRiwayatTab', mode)
    }
  }

  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  const [transactionsMap, setTransactionsMap] = useState<{ mine: Transaction[] | null, all: Transaction[] | null }>({ mine: null, all: null })
  const transactions = transactionsMap[viewMode] || []
  const currentLoading = loadingMap[viewMode] && transactionsMap[viewMode] === null

  // Cache per tab so switching sidebar doesn't re-skeleton.
  const cacheKeyMine = 'admin_transactions_v1:mine'
  const cacheKeyAll = 'admin_transactions_v1:all'

  useLayoutEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const mineRaw = window.sessionStorage.getItem(cacheKeyMine)
      const allRaw = window.sessionStorage.getItem(cacheKeyAll)
      const mine = mineRaw ? (JSON.parse(mineRaw) as { ts: number; data: Transaction[] }).data : null
      const all = allRaw ? (JSON.parse(allRaw) as { ts: number; data: Transaction[] }).data : null
      if (mine || all) {
        setTransactionsMap({ mine: mine ?? null, all: all ?? null })
        setLoadingMap({ mine: mine == null, all: all == null })
      }
    } catch {
      // ignore
    }
  }, [])

  const fetchTransactions = useCallback(async (mode: ViewMode, skipLoading = false) => {
    if (!skipLoading) {
      setLoadingMap(prev => ({ ...prev, [mode]: true }))
    }
    try {
      const ts = Date.now()
      const url = mode === 'all' ? `/api/admin/transactions?scope=all&_t=${ts}` : `/api/admin/transactions?_t=${ts}`
      const res = await fetchWithAuth(url, { credentials: 'include', cache: 'no-store' })
      if (!res.ok) {
        setTransactionsMap(prev => ({ ...prev, [mode]: [] }))
        return
      }
      const data = await res.json()
      const list = Array.isArray(data) ? data : []
      setTransactionsMap(prev => ({ ...prev, [mode]: list }))
      if (typeof window !== 'undefined') {
        try {
          window.sessionStorage.setItem(mode === 'all' ? cacheKeyAll : cacheKeyMine, JSON.stringify({ ts: Date.now(), data: list }))
        } catch {
          // ignore
        }
      }
    } catch (err) {
      console.error('Error fetching transactions:', err)
      setTransactionsMap(prev => ({ ...prev, [mode]: [] }))
    } finally {
      if (!skipLoading) {
        setLoadingMap(prev => ({ ...prev, [mode]: false }))
      }
    }
  }, [])

  useEffect(() => {
    fetchTransactions(viewMode)
  }, [viewMode, fetchTransactions])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const statusParam = params.get('status')
    if (statusParam === 'success' || statusParam === 'failed') {
      const run = async () => {
        if (statusParam === 'success') {
          let synced = 0
          const syncWithRetry = async (retries = 2) => {
            for (let i = 0; i <= retries; i++) {
              try {
                const res = await fetchWithAuth('/api/credits/sync-invoice', { method: 'POST' })
                const data = (await res.json().catch(() => ({}))) as { synced?: number }
                synced = data?.synced ?? 0
                if (synced > 0) break
                if (i < retries) await new Promise((r) => setTimeout(r, 2500))
              } catch {
                if (i < retries) await new Promise((r) => setTimeout(r, 2500))
              }
            }
            return synced
          }
          const n = await syncWithRetry()
          if (n > 0) window.dispatchEvent(new CustomEvent('credits-updated'))
        }
        await fetchTransactions(viewMode)
        window.history.replaceState({}, '', '/admin/riwayat')
      }
      run()
    }
  }, [viewMode, fetchTransactions])

  // Supabase auth-only: no Realtime, no polling. Use manual refresh button + refetch on tab focus.
  useEffect(() => {
    const onVisible = () => {
      fetchTransactions(viewMode, true)
    }
    window.addEventListener('focus', onVisible)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.removeEventListener('focus', onVisible)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [viewMode, fetchTransactions])

  const filteredTransactions = useMemo(() => {
    if (viewMode !== 'all' || !searchQuery.trim()) return transactions;
    const q = searchQuery.toLowerCase();
    return transactions.filter(tx =>
      (tx.user_full_name && tx.user_full_name.toLowerCase().includes(q)) ||
      (tx.user_email && tx.user_email.toLowerCase().includes(q)) ||
      (tx.external_id && tx.external_id.toLowerCase().includes(q))
    );
  }, [transactions, searchQuery, viewMode]);

  const paginatedTransactions = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return filteredTransactions.slice(start, start + itemsPerPage)
  }, [filteredTransactions, currentPage, itemsPerPage])
  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage)

  return (
    <>
      {invoicePopupUrl && (
        <div className="fixed inset-0 z-[110] flex flex-col bg-white dark:bg-slate-900" role="dialog" aria-modal="true" aria-label="Lihat invoice">
          <div className="flex items-center justify-between px-4 py-3 border-b-4 border-slate-900 bg-slate-50 dark:bg-slate-800 shrink-0">
            <h3 className="text-base font-black text-slate-900">Invoice Pembayaran</h3>
            <button
              type="button"
              onClick={() => setInvoicePopupUrl(null)}
              className="flex items-center justify-center w-10 h-10 rounded-xl border-2 border-slate-900 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-red-50 dark:hover:bg-red-900 hover:text-red-500 shadow-[2px_2px_0_0_#0f172a] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex-1 min-h-0 relative">
            <iframe
              src={invoicePopupUrl}
              title="Invoice Xendit"
              className="absolute inset-0 w-full h-full border-0"
              sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-top-navigation"
              allow="payment"
            />
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2 mb-8">
        <h1 className="text-3xl font-black text-slate-900 dark:text-white sm:text-4xl tracking-tight">
          Riwayat Transaksi
        </h1>
        <p className="text-slate-600 dark:text-slate-300 font-bold text-sm sm:text-base">
          {viewMode === 'mine' ? 'Daftar riwayat transaksi Top Up Anda.' : 'Monitor semua transaksi dari pengguna.'}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:gap-3 mb-8">
        <button
          type="button"
          onClick={() => { setViewMode('mine'); setCurrentPage(1); }}
          className={`flex min-w-0 items-center justify-center gap-1.5 sm:gap-2 px-2 py-2.5 sm:px-6 sm:py-3 rounded-2xl text-xs sm:text-sm font-black border-4 border-slate-900 transition-all active:scale-95 whitespace-nowrap ${viewMode === 'mine' ? 'bg-violet-400 text-slate-900 shadow-[4px_4px_0_0_#0f172a]' : 'bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-none'}`}
        >
          <User className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" strokeWidth={3} />
          <span className="truncate"><span className="sm:hidden">Saya</span><span className="hidden sm:inline">Riwayat Saya</span></span>
        </button>
        <button
          type="button"
          onClick={() => { setViewMode('all'); setCurrentPage(1); }}
          className={`flex min-w-0 items-center justify-center gap-1.5 sm:gap-2 px-2 py-2.5 sm:px-6 sm:py-3 rounded-2xl text-xs sm:text-sm font-black border-4 border-slate-900 transition-all active:scale-95 whitespace-nowrap ${viewMode === 'all' ? 'bg-sky-400 text-slate-900 shadow-[4px_4px_0_0_#0f172a]' : 'bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-none'}`}
        >
          <Users className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" strokeWidth={3} />
          <span className="truncate"><span className="sm:hidden">Semua user</span><span className="hidden sm:inline">Riwayat Semua User</span></span>
        </button>
      </div>

      {viewMode === 'all' && (
        <div className="mb-8 relative max-w-2xl">
          <div className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-800 border-4 border-slate-900 rounded-3xl shadow-inner group focus-within:bg-white dark:focus-within:bg-slate-900 transition-all">
            <Search className="h-5 w-5 text-slate-400 group-focus-within:text-slate-900 transition-colors" strokeWidth={3} />
            <input
              type="text"
              placeholder="Cari nama, email, atau ID transaksi..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              className="w-full bg-transparent text-base font-bold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none"
            />
          </div>
        </div>
      )}

      {currentLoading ? (
        <div className="space-y-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-3xl border-4 border-slate-900 bg-white dark:bg-slate-900 p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 animate-pulse shadow-[6px_6px_0_0_#0f172a] dark:shadow-[6px_6px_0_0_#334155]">
              <div className="flex items-center gap-5">
                <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 shrink-0 border-2 border-slate-200 dark:border-slate-700" />
                <div className="space-y-3">
                  <div className="h-5 bg-slate-100 dark:bg-slate-800 rounded-lg w-48" />
                  <div className="h-4 bg-slate-50 dark:bg-slate-900 rounded-lg w-64" />
                </div>
              </div>
              <div className="flex flex-col items-end gap-3">
                <div className="h-6 bg-slate-100 dark:bg-slate-800 rounded-lg w-32" />
                <div className="h-5 bg-slate-100 dark:bg-slate-800 rounded-full w-20" />
              </div>
            </div>
          ))}
        </div>
      ) : transactions.length === 0 ? (
        <div className="rounded-[40px] border-4 border-slate-900 bg-white dark:bg-slate-900 p-12 shadow-[12px_12px_0_0_#0f172a] dark:shadow-[12px_12px_0_0_#334155]">
          <div className="flex flex-col items-center justify-center text-center">
            <div className="w-24 h-24 rounded-3xl bg-slate-50 dark:bg-slate-800 border-4 border-slate-100 dark:border-slate-700 flex items-center justify-center mb-6 text-slate-300">
              <History className="w-12 h-12" strokeWidth={1.5} />
            </div>
            <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">Belum Ada Riwayat</h3>
            <p className="text-sm font-bold text-slate-400 dark:text-slate-300 max-w-sm">
              {viewMode === 'mine' ? 'Transaksi Top Up atau pemesanan album Anda akan tercatat secara otomatis di sini.' : 'Belum ada transaksi yang tercatat dalam sistem.'}
            </p>
          </div>
        </div>
      ) : filteredTransactions.length === 0 && viewMode === 'all' && searchQuery ? (
        <div className="rounded-[40px] border-4 border-slate-900 bg-white p-12 shadow-[12px_12px_0_0_#0f172a]">
          <div className="flex flex-col items-center justify-center text-center">
            <div className="w-24 h-24 rounded-3xl bg-slate-50 border-4 border-slate-100 flex items-center justify-center mb-6 text-slate-300">
              <Search className="w-12 h-12" strokeWidth={1.5} />
            </div>
            <h3 className="text-xl font-black text-slate-900 mb-2">Hasil Tidak Ditemukan</h3>
            <p className="text-sm font-bold text-slate-400 max-w-sm">
              Tidak ada transaksi yang cocok dengan pencarian &quot;<span className="text-slate-900">{searchQuery}</span>&quot;
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {paginatedTransactions.map((tx) => (
            <div
              key={tx.id}
              className="rounded-3xl border-4 border-slate-900 bg-white dark:bg-slate-900 p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-[6px_6px_0_0_#0f172a] dark:shadow-[6px_6px_0_0_#334155] hover:shadow-[10px_10px_0_0_#0f172a] dark:hover:shadow-[10px_10px_0_0_#334155] hover:-translate-x-1 hover:-translate-y-1 transition-all"
            >
              <div className="flex items-center gap-6">
                <div
                  className={`w-14 h-14 rounded-2xl border-4 border-slate-900 flex items-center justify-center shrink-0 shadow-[4px_4px_0_0_#0f172a] ${tx.status === 'PAID' || tx.status === 'SETTLED'
                    ? 'bg-emerald-300'
                    : tx.status === 'PENDING'
                      ? 'bg-orange-300'
                      : 'bg-red-400'
                    }`}
                >
                  <CreditCard className="w-6 h-6 text-slate-900" strokeWidth={2.5} />
                </div>
                <div className="space-y-1">
                  <h4 className="text-lg font-black text-slate-900 dark:text-white leading-tight">
                    {tx.description || (tx.album_name ? tx.album_name : (tx.credits != null ? `Top Up ${tx.credits} Credits` : 'Transaction'))}
                  </h4>
                  <div className="flex flex-col gap-1.5">
                    {viewMode === 'all' && (tx.user_full_name != null || tx.user_email != null) && (
                      <div className="flex flex-wrap items-center gap-2 text-[13px] font-bold bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 w-fit">
                        <User className="w-4 h-4 text-indigo-500 mr-1" />
                        <span className="text-slate-900 dark:text-white font-black">{tx.user_full_name ?? '-'}</span>
                        <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600 mx-1" />
                        <span className="font-medium text-slate-500 dark:text-slate-300">{tx.user_email ?? '-'}</span>
                      </div>
                    )}
                    <div className="flex flex-wrap items-center gap-3 text-[12px] font-bold text-slate-400">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" />
                        {new Date(tx.created_at).toLocaleDateString('id-ID', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      {tx.external_id && (
                        <span className="flex items-center gap-1.5 font-mono">
                          <code className="bg-slate-200 dark:bg-slate-700 px-2 rounded text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 text-xs tracking-wider">
                            {`TR-${tx.external_id.split('_ts_')[1] || tx.external_id.slice(-8)}`}
                          </code>
                        </span>
                      )}
                      {tx.payment_method && (
                        <span className="px-2 py-0.5 rounded border-2 border-slate-900 dark:border-slate-700 bg-indigo-50 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-200 font-black text-[10px] uppercase tracking-wide">
                          {tx.payment_method.replace(/_/g, ' ')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between md:flex-col md:items-end gap-6 md:gap-3">
                <div className="text-right">
                  <span className="block text-2xl font-black text-slate-900 dark:text-white">
                    Rp {tx.amount.toLocaleString('id-ID')}
                  </span>
                  <div className="mt-1">
                    <span
                      className={`text-[10px] font-black px-2.5 py-1 rounded-lg border-2 border-slate-900 shadow-[2px_2px_0_0_#0f172a] uppercase tracking-widest ${tx.status === 'PAID' || tx.status === 'SETTLED'
                        ? 'bg-emerald-300 text-slate-900'
                        : tx.status === 'PENDING'
                          ? 'bg-orange-300 text-slate-900'
                          : 'bg-red-400 text-white'
                        }`}
                    >
                      {tx.status === 'PAID' || tx.status === 'SETTLED' ? 'SUCCESS' : tx.status}
                    </span>
                  </div>
                </div>

                {tx.invoice_url && tx.status === 'PENDING' && (
                  <button
                    type="button"
                    onClick={() => tx.invoice_url && setInvoicePopupUrl(tx.invoice_url)}
                    className="flex items-center gap-2 text-sm font-black bg-orange-400 text-slate-900 px-5 py-2.5 rounded-2xl border-2 border-slate-900 hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none shadow-[3px_3px_0_0_#0f172a] transition-all"
                  >
                    Lanjutkan Bayar
                    <ExternalLink className="w-4 h-4" strokeWidth={3} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      {!currentLoading && filteredTransactions.length > itemsPerPage && (
        <div className="flex items-center justify-between mt-10 flex-wrap gap-4 px-2">
          <p className="text-sm font-black text-slate-400">
            Menampilkan <span className="text-slate-900">{((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, filteredTransactions.length)}</span> dari <span className="text-slate-900">{filteredTransactions.length}</span> data
          </p>
          <div className="flex gap-2 shrink-0">
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(p => p - 1)}
              className="flex items-center justify-center w-10 h-10 rounded-xl bg-white border-2 border-slate-900 text-slate-900 shadow-[3px_3px_0_0_#0f172a] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none disabled:opacity-50 transition-all"
            >
              <ChevronLeft className="w-5 h-5" strokeWidth={3} />
            </button>
            <div className="flex items-center px-4 py-2 text-sm font-black bg-indigo-200 border-2 border-slate-900 shadow-[3px_3px_0_0_#0f172a] rounded-xl text-slate-900">
              {currentPage} / {totalPages}
            </div>
            <button
              type="button"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(p => p + 1)}
              className="flex items-center justify-center w-10 h-10 rounded-xl bg-white border-2 border-slate-900 text-slate-900 shadow-[3px_3px_0_0_#0f172a] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none disabled:opacity-50 transition-all"
            >
              <ChevronRight className="w-5 h-5" strokeWidth={3} />
            </button>
          </div>
        </div>
      )}
    </>
  )
}
