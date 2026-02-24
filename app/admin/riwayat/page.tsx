'use client'

import DashboardTitle from '@/components/dashboard/DashboardTitle'
import { History, ExternalLink, Loader2, CreditCard, X, Users, User, Search } from 'lucide-react'
import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { supabase } from '@/lib/supabase'

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
}

type ViewMode = 'mine' | 'all'

export default function AdminRiwayatPage() {
  const [loading, setLoading] = useState(true)
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
  const currentLoading = loading && transactionsMap[viewMode] === null

  const fetchTransactions = useCallback(async (mode: ViewMode, skipLoading = false) => {
    // Hanya tampilkan loading dari awal jika datanya belum pernah di load atau kosong
    if (!skipLoading) {
      setLoading(true)
    }
    try {
      const ts = Date.now()
      const url = mode === 'all' ? `/api/admin/transactions?scope=all&_t=${ts}` : `/api/admin/transactions?_t=${ts}`
      const res = await fetch(url, { credentials: 'include', cache: 'no-store' })
      if (!res.ok) {
        setTransactionsMap(prev => ({ ...prev, [mode]: [] }))
        return
      }
      const data = await res.json()
      setTransactionsMap(prev => ({ ...prev, [mode]: Array.isArray(data) ? data : [] }))
    } catch (err) {
      console.error('Error fetching transactions:', err)
      setTransactionsMap(prev => ({ ...prev, [mode]: [] }))
    } finally {
      if (!skipLoading) {
        setLoading(false)
      }
    }
  }, [])

  useEffect(() => {
    fetchTransactions(viewMode)
  }, [viewMode, fetchTransactions])

  // Saat kembali dari pembayaran (?status=success): sync status + credit dari Xendit (retry), lalu refetch
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
                const res = await fetch('/api/credits/sync-invoice', { method: 'POST', credentials: 'include' })
                const data = await res.json().catch(() => ({}))
                synced = data.synced ?? 0
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

  // Realtime: update daftar saat ada INSERT/UPDATE/DELETE (tanpa filter agar DELETE ikut terkirim)
  useEffect(() => {
    let isActive = true
    let ch: ReturnType<typeof supabase.channel> | null = null

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user || !isActive) return
      const channelName = viewMode === 'all' ? 'riwayat-admin-all' : `riwayat-admin-mine-${user.id}`
      ch = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'transactions' },
          () => {
            // Bypass loading screen untuk refresh background
            fetchTransactions(viewMode, true)
          }
        )
        .subscribe((status, err) => {
          if (err) console.warn('Realtime transactions:', status, err)
        })
    })

    return () => {
      isActive = false
      if (ch) {
        supabase.removeChannel(ch)
      }
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
        <div className="fixed inset-0 z-[110] flex flex-col bg-[#0a0a0b]" role="dialog" aria-modal="true" aria-label="Lihat invoice">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-white/5 shrink-0">
            <h3 className="text-sm font-semibold text-white">Lihat Invoice</h3>
            <button
              type="button"
              onClick={() => setInvoicePopupUrl(null)}
              className="flex items-center justify-center w-9 h-9 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
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

      <DashboardTitle
        title="Riwayat Transaksi"
        subtitle={viewMode === 'mine' ? 'Riwayat transaksi Top Up Anda.' : 'Semua transaksi Top Up dari seluruh user.'}
      />

      <div className="flex flex-wrap gap-2 mb-4">
        <button
          type="button"
          onClick={() => { setViewMode('mine'); setCurrentPage(1); }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${viewMode === 'mine' ? 'bg-lime-500 text-black' : 'bg-white/10 text-gray-400 hover:bg-white/15 hover:text-white'}`}
        >
          <User className="w-4 h-4" />
          Riwayat saya
        </button>
        <button
          type="button"
          onClick={() => { setViewMode('all'); setCurrentPage(1); }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${viewMode === 'all' ? 'bg-lime-500 text-black' : 'bg-white/10 text-gray-400 hover:bg-white/15 hover:text-white'}`}
        >
          <Users className="w-4 h-4" />
          Riwayat semua user
        </button>
      </div>

      {viewMode === 'all' && (
        <div className="mb-6 relative max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Cari nama, email, atau ID transaksi..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-lime-500/50 text-white placeholder-gray-500 transition-all"
          />
        </div>
      )}

      {currentLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-2xl border border-white/5 bg-white/[0.02] p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 animate-pulse">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-white/5 shrink-0" />
                <div className="space-y-2 py-1">
                  <div className="h-4 w-32 bg-white/5 rounded" />
                  <div className="space-y-1">
                    <div className="h-3 w-48 bg-white/5 rounded" />
                    <div className="h-4 w-16 bg-white/5 rounded" />
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <div className="h-5 w-24 bg-white/5 rounded" />
                <div className="h-4 w-16 bg-white/5 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      ) : transactions.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 sm:p-8">
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-4 text-gray-500">
              <History className="w-8 h-8" />
            </div>
            <p className="text-sm font-medium text-white mb-1">Belum ada riwayat</p>
            <p className="text-xs text-gray-500 max-w-sm">
              {viewMode === 'mine' ? 'Riwayat transaksi Top Up Anda akan muncul di sini.' : 'Belum ada transaksi dari user.'}
            </p>
          </div>
        </div>
      ) : filteredTransactions.length === 0 && viewMode === 'all' && searchQuery ? (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 sm:p-8">
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-4 text-gray-500">
              <Search className="w-8 h-8" />
            </div>
            <p className="text-sm font-medium text-white mb-1">Hasil tidak ditemukan</p>
            <p className="text-xs text-gray-500 max-w-sm">
              Tidak ada transaksi yang cocok dengan pencarian "{searchQuery}"
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {paginatedTransactions.map((tx) => (
            <div
              key={tx.id}
              className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="flex items-start gap-4">
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${tx.status === 'PAID' || tx.status === 'SETTLED'
                    ? 'bg-lime-500/20 text-lime-400'
                    : tx.status === 'PENDING'
                      ? 'bg-yellow-500/20 text-yellow-400'
                      : 'bg-red-500/20 text-red-400'
                    }`}
                >
                  <CreditCard className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-semibold text-white">
                    {tx.album_name ? `Pembayaran Album: ${tx.album_name}` : (tx.credits != null ? `Top Up ${tx.credits} Credits` : 'Top Up Credit')}
                  </h4>
                  <div className="text-xs text-gray-400 mt-1 space-y-0.5">
                    {viewMode === 'all' && (tx.user_full_name != null || tx.user_email != null) && (
                      <>
                        <p className="text-white/90 font-medium">{tx.user_full_name ?? '-'}</p>
                        <p>{tx.user_email ?? '-'}</p>
                      </>
                    )}
                    <p>
                      {new Date(tx.created_at).toLocaleDateString('id-ID', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                    {tx.external_id && (
                      <p className="font-mono text-[10px] text-gray-500" title={tx.external_id}>
                        ID: TR-{tx.external_id.split('_ts_')[1] || tx.external_id.slice(-8)}
                      </p>
                    )}
                    {tx.payment_method && (
                      <p className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-white/5 border border-white/10 w-fit">
                        {tx.payment_method.replace(/_/g, ' ').toUpperCase()}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between md:flex-col md:items-end gap-3 md:gap-2">
                <div className="text-right">
                  <span className="block font-bold text-white mb-1">
                    Rp {tx.amount.toLocaleString('id-ID')}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${tx.status === 'PAID' || tx.status === 'SETTLED'
                      ? 'bg-lime-500/10 text-lime-400 border border-lime-500/20'
                      : tx.status === 'PENDING'
                        ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                        : 'bg-red-500/10 text-red-400 border border-red-500/20'
                      }`}
                  >
                    {tx.status === 'PAID' || tx.status === 'SETTLED' ? 'SUCCESS' : tx.status}
                  </span>
                </div>

                {tx.invoice_url && tx.status === 'PENDING' && (
                  <button
                    type="button"
                    onClick={() => tx.invoice_url && setInvoicePopupUrl(tx.invoice_url)}
                    className="flex items-center gap-1.5 text-xs font-medium bg-lime-500 text-black px-3 py-1.5 rounded-lg hover:bg-lime-400 transition-colors"
                  >
                    Lanjutkan Bayar
                    <ExternalLink className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      {!currentLoading && filteredTransactions.length > itemsPerPage && (
        <div className="flex items-center justify-between mt-6 flex-wrap gap-4">
          <p className="text-xs text-gray-400">
            Menampilkan {((currentPage - 1) * itemsPerPage) + 1} hingga {Math.min(currentPage * itemsPerPage, filteredTransactions.length)} dari {filteredTransactions.length} entri
          </p>
          <div className="flex gap-1.5 shrink-0">
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(p => p - 1)}
              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-white/5 border border-white/10 text-white hover:bg-white/10 disabled:opacity-50 transition-colors"
            >
              Sebelumnya
            </button>
            <div className="flex items-center px-3 py-1.5 text-xs font-medium bg-white/5 border border-white/10 rounded-lg text-white">
              {currentPage} / {totalPages}
            </div>
            <button
              type="button"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(p => p + 1)}
              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-white/5 border border-white/10 text-white hover:bg-white/10 disabled:opacity-50 transition-colors"
            >
              Selanjutnya
            </button>
          </div>
        </div>
      )}
    </>
  )
}
