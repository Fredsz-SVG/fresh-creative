'use client'

import DashboardTitle from '@/components/dashboard/DashboardTitle'
import { History, ExternalLink, Loader2, CreditCard, X, Download } from 'lucide-react'
import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { fetchWithAuth } from '../../../lib/api-client'
import { asObject } from '@/components/yearbook/utils/response-narrowing'
import { generateAndPrintInvoice } from '@/lib/generate-invoice'

type Transaction = {
  id: string
  external_id: string
  amount: number
  status: string
  invoice_url: string | null
  created_at: string
  credits: number | null
  payment_method?: string | null
  album_name?: string | null
  description?: string | null
  package_snapshot?: string | null
  new_students_count?: number | null
}

export default function UserRiwayatPage() {
  const cacheKey = 'user_transactions_v1'

  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    if (typeof window === 'undefined') return []
    try {
      const raw = window.sessionStorage.getItem(cacheKey)
      if (!raw) return []
      const parsed = JSON.parse(raw) as { ts: number; data: Transaction[] }
      return Array.isArray(parsed?.data) ? parsed.data : []
    } catch {
      return []
    }
  })
  const [loading, setLoading] = useState(() => {
    if (typeof window === 'undefined') return true
    try {
      const raw = window.sessionStorage.getItem(cacheKey)
      if (!raw) return true
      const parsed = JSON.parse(raw) as { ts: number; data: Transaction[] }
      return !Array.isArray(parsed?.data)
    } catch {
      return true
    }
  })
  const [invoicePopupUrl, setInvoicePopupUrl] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  const paginatedTransactions = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return transactions.slice(start, start + itemsPerPage)
  }, [transactions, currentPage])

  const totalPages = Math.ceil(transactions.length / itemsPerPage)

  // Cache is hydrated in state initializer (no skeleton flash).

  const fetchTransactions = useCallback(async (skipLoading = false) => {
    if (!skipLoading) setLoading(true)
    try {
      const ts = Date.now()
      const res = await fetchWithAuth(`/api/user/transactions?_t=${ts}`, { cache: 'no-store' })
      if (!res.ok) {
        setTransactions([])
        return
      }
      const data = await res.json()
      const list = Array.isArray(data) ? data : []
      setTransactions(list)
      if (typeof window !== 'undefined') {
        try {
          window.sessionStorage.setItem(cacheKey, JSON.stringify({ ts: Date.now(), data: list }))
        } catch {
          // ignore
        }
      }
    } catch (err) {
      console.error('Error fetching transactions:', err)
      setTransactions([])
    } finally {
      if (!skipLoading) setLoading(false)
    }
  }, [])

  const hasCacheRef = useRef(!loading)

  useEffect(() => {
    fetchTransactions(hasCacheRef.current)
  }, [fetchTransactions])

  useEffect(() => {
    const onVisible = () => fetchTransactions(true)
    window.addEventListener('focus', onVisible)
    document.addEventListener('visibilitychange', onVisible)

    // Realtime: refresh saat ada transaksi baru / status berubah
    const lastFetchRef = { ts: 0 }
    const onRealtime = (event: Event) => {
      const detail = (event as CustomEvent<{ type?: string; channel?: string; payload?: Record<string, unknown> }>).detail
      if (!detail?.type || detail.channel !== 'global') return
      const path = typeof detail.payload?.path === 'string' ? detail.payload.path : ''
      const isTransactionEvent =
        path.startsWith('/api/credits/') ||
        path.startsWith('/api/webhooks/xendit') ||
        (path.startsWith('/api/albums') && path.includes('/checkout'))
      if (!isTransactionEvent) return
      const now = Date.now()
      if (now - lastFetchRef.ts < 3000) return
      lastFetchRef.ts = now
      fetchTransactions(true)
    }
    window.addEventListener('fresh:realtime', onRealtime)

    return () => {
      window.removeEventListener('focus', onVisible)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('fresh:realtime', onRealtime)
    }
  }, [fetchTransactions])

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
                const data = asObject(await res.json().catch(() => ({})))
                synced = typeof data.synced === 'number' ? data.synced : 0
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
        await fetchTransactions()
        window.history.replaceState({}, '', '/user/riwayat')
      }
      run()
    }
  }, [fetchTransactions])

  return (
    <>
      {invoicePopupUrl && (
        <div className="fixed inset-0 z-[110] flex flex-col bg-white dark:bg-slate-900" role="dialog" aria-modal="true" aria-label="Invoice pembayaran">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 shrink-0">
            <h3 className="text-sm font-bold text-gray-800">Invoice Pembayaran</h3>
            <button
              type="button"
              onClick={() => setInvoicePopupUrl(null)}
              className="flex items-center justify-center w-9 h-9 rounded-xl text-gray-400 dark:text-slate-300 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
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
        <h1 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
          Riwayat Transaksi
        </h1>
        <p className="text-slate-600 dark:text-slate-300 font-medium text-xs md:text-sm">
          Daftar transaksi Top Up credit Anda.
        </p>
      </div>

      {loading ? (
        <div className="space-y-5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-2xl border-2 border-slate-200 bg-white dark:bg-slate-900 p-5 sm:p-6 flex items-start justify-between gap-4 animate-pulse shadow-[4px_4px_0_0_#334155] dark:shadow-[4px_4px_0_0_#1e293b]">
              <div className="flex items-start gap-3 sm:gap-4 flex-1 min-w-0">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-slate-200 dark:bg-slate-800 border-2 border-slate-200 shrink-0" />
                <div className="flex flex-col min-w-0 py-1 w-full">
                  <div className="h-5 w-3/4 bg-slate-200 dark:bg-slate-800 rounded mb-3" />
                  <div className="space-y-2">
                    <div className="h-4 w-1/2 bg-slate-100 dark:bg-slate-900 rounded" />
                    <div className="h-3 w-1/4 bg-slate-100 dark:bg-slate-900 rounded" />
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-end shrink-0 self-end">
                <div className="h-6 w-24 bg-slate-200 dark:bg-slate-800 rounded" />
                <div className="h-5 w-16 bg-slate-100 dark:bg-slate-900 rounded mt-2" />
              </div>
            </div>
          ))}
        </div>
      ) : transactions.length === 0 ? (
        <div className="rounded-2xl border-2 border-slate-200 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-[4px_4px_0_0_#334155] dark:shadow-[4px_4px_0_0_#1e293b]">
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-20 h-20 rounded-2xl bg-indigo-100 dark:bg-slate-800 border-2 border-slate-200 flex items-center justify-center mb-6 text-slate-900 dark:text-white shadow-[4px_4px_0_0_#334155] dark:shadow-[4px_4px_0_0_#1e293b]">
              <History className="w-10 h-10" />
            </div>
            <p className="text-[17px] font-bold text-slate-900 dark:text-white mb-2">Belum ada riwayat</p>
            <p className="text-[14px] font-bold text-slate-500 dark:text-slate-300 max-w-sm">
              Riwayat transaksi top up Anda akan muncul di sini.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          {paginatedTransactions.map((tx) => (
            <div key={tx.id} className="rounded-2xl border-2 border-slate-200 bg-white dark:bg-slate-900 p-5 sm:p-6 flex items-start justify-between gap-4 shadow-[4px_4px_0_0_#334155] dark:shadow-[4px_4px_0_0_#1e293b] hover:shadow-[4px_4px_0_0_#334155] dark:hover:shadow-[7px_7px_0_0_#334155] hover:-translate-y-1 hover:-translate-x-1 transition-all">
              {/* Left Side: Icon + Details */}
              <div className="flex items-start gap-3 sm:gap-4 flex-1 min-w-0">
                <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl border-2 border-slate-200 flex items-center justify-center shrink-0 shadow-inner ${tx.status === 'PAID' || tx.status === 'SETTLED' ? 'bg-emerald-300 text-slate-900'
                  : tx.status === 'PENDING' ? 'bg-orange-300 text-slate-900'
                    : 'bg-red-400 text-white'
                  }`}>
                  <CreditCard className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <div className="flex flex-col min-w-0 py-0.5">
                  <h4 className="font-bold text-[14px] sm:text-[17px] text-slate-900 dark:text-white leading-tight">
                    {tx.description
                      ? tx.description
                      : tx.album_name
                        ? `Pembayaran Album: ${tx.album_name}`
                        : tx.credits != null
                          ? `Top Up ${tx.credits} Credits`
                          : 'Top Up Credit'}
                  </h4>
                  <div className="text-[11px] sm:text-[13px] font-bold text-slate-500 mt-1.5 space-y-1.5">
                    <p>{new Date(tx.created_at).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                    <div className="flex flex-wrap items-center gap-2">
                      {tx.external_id && (
                        <span className="flex items-center gap-1.5 font-mono">
                          <code className="bg-slate-200 dark:bg-slate-700 px-2 rounded text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 text-xs tracking-wider">
                            {`TR-${tx.external_id.split('_ts_')[1] || tx.external_id.slice(-8)}`}
                          </code>
                        </span>
                      )}
                      {tx.payment_method && (
                        <span className="px-2 py-0.5 rounded border-2 border-slate-200 dark:border-slate-700 bg-indigo-50 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-200 font-bold text-[10px] uppercase tracking-wide">
                          {tx.payment_method.replace(/_/g, ' ')}
                        </span>
                      )}
                    </div>
                  </div>

                  {tx.invoice_url && tx.status === 'PENDING' && (
                    <button
                      type="button"
                      onClick={() => tx.invoice_url && setInvoicePopupUrl(tx.invoice_url)}
                      className="flex items-center gap-2 text-[12px] sm:text-[13px] font-bold bg-indigo-300 border-2 border-slate-200 text-slate-900 px-3 py-1.5 mt-3 rounded-xl hover:translate-x-0.5 hover:translate-y-0.5 transition-all shadow-[4px_4px_0_0_#334155] w-fit"
                    >
                      Bayar Sekarang
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {tx.invoice_url && (tx.status === 'PAID' || tx.status === 'SETTLED') && (
                    <button
                      type="button"
                      onClick={() => generateAndPrintInvoice(tx)}
                      className="flex items-center gap-2 text-[12px] sm:text-[13px] font-bold bg-emerald-200 border-2 border-slate-200 text-slate-900 px-3 py-1.5 mt-3 rounded-xl hover:translate-x-0.5 hover:translate-y-0.5 transition-all shadow-[4px_4px_0_0_#334155] w-fit"
                    >
                      Download Invoice
                      <Download className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Right Side: Amount + Status (Bottom Right) */}
              <div className="flex flex-col items-end shrink-0 text-right self-end ml-2">
                <span className="whitespace-nowrap font-bold text-[15px] sm:text-xl text-slate-900 dark:text-white">
                  Rp {tx.amount.toLocaleString('id-ID')}
                </span>
                <span className={`inline-block text-[9px] sm:text-[11px] font-bold px-2 py-0.5 sm:px-2.5 sm:py-1 mt-2 rounded border-2 border-slate-200 uppercase tracking-widest shadow-[4px_4px_0_0_#334155] ${tx.status === 'PAID' || tx.status === 'SETTLED' ? 'bg-emerald-300 text-slate-900'
                  : tx.status === 'PENDING' ? 'bg-orange-300 text-slate-900'
                    : 'bg-red-400 text-white'
                  }`}>
                  {tx.status === 'PAID' || tx.status === 'SETTLED' ? 'SUCCESS' : tx.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      {!loading && transactions.length > itemsPerPage && (
        <div className="flex items-center justify-between mt-8 flex-wrap gap-4">
          <p className="text-[13px] font-bold text-slate-500">
            Menampilkan {((currentPage - 1) * itemsPerPage) + 1} hingga {Math.min(currentPage * itemsPerPage, transactions.length)} dari {transactions.length} entri
          </p>
          <div className="flex gap-2 shrink-0">
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(p => p - 1)}
              className="px-4 py-2 text-[13px] font-bold rounded-xl bg-white border-2 border-slate-200 text-slate-900 shadow-[4px_4px_0_0_#334155] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none disabled:opacity-50 transition-all"
            >
              Sebelumnya
            </button>
            <div className="flex items-center px-4 py-2 text-[13px] font-bold bg-indigo-200 border-2 border-slate-200 shadow-[4px_4px_0_0_#334155] rounded-xl text-slate-900">
              {currentPage} / {totalPages}
            </div>
            <button
              type="button"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(p => p + 1)}
              className="px-4 py-2 text-[13px] font-bold rounded-xl bg-white border-2 border-slate-200 text-slate-900 shadow-[4px_4px_0_0_#334155] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none disabled:opacity-50 transition-all"
            >
              Selanjutnya
            </button>
          </div>
        </div>
      )}
    </>
  )
}
