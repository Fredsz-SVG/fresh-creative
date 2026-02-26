'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import DashboardTitle from '@/components/dashboard/DashboardTitle'
import { BookOpen, History, X } from 'lucide-react'
import { getYearbookSectionQueryUrl } from '@/components/yearbook/lib/yearbook-paths'
import { supabase } from '@/lib/supabase'

type RecentAlbum = {
  id: string
  name?: string | null
  created_at?: string | null
  status?: string | null
  type?: 'public' | 'yearbook' | null
}

type RecentTransaction = {
  id: string
  amount?: number | null
  credits?: number | null
  status?: string | null
  created_at?: string | null
  album_name?: string | null
  invoice_url?: string | null
}

export default function UserPortalPage() {
  const [recentAlbums, setRecentAlbums] = useState<RecentAlbum[]>([])
  const [recentTransactions, setRecentTransactions] = useState<RecentTransaction[]>([])
  const [loadingAlbums, setLoadingAlbums] = useState(true)
  const [loadingTransactions, setLoadingTransactions] = useState(true)
  const [invoicePopupUrl, setInvoicePopupUrl] = useState<string | null>(null)
  const [userName, setUserName] = useState('Pengguna')

  const fetchRecentAlbums = useCallback(async (skipLoading = false) => {
    if (!skipLoading) setLoadingAlbums(true)
    try {
      const ts = Date.now()
      const res = await fetch(`/api/albums?_t=${ts}`, { credentials: 'include', cache: 'no-store' })
      const data = await res.json().catch(() => [])
      if (res.ok && Array.isArray(data)) {
        setRecentAlbums(data.slice(0, 3))
      } else {
        setRecentAlbums([])
      }
    } catch {
      setRecentAlbums([])
    } finally {
      if (!skipLoading) setLoadingAlbums(false)
    }
  }, [])

  const fetchRecentTransactions = useCallback(async (skipLoading = false) => {
    if (!skipLoading) setLoadingTransactions(true)
    try {
      const ts = Date.now()
      const res = await fetch(`/api/user/transactions?_t=${ts}`, { credentials: 'include', cache: 'no-store' })
      const data = await res.json().catch(() => [])
      if (res.ok && Array.isArray(data)) {
        setRecentTransactions(data.slice(0, 3))
      } else {
        setRecentTransactions([])
      }
    } catch {
      setRecentTransactions([])
    } finally {
      if (!skipLoading) setLoadingTransactions(false)
    }
  }, [])

  useEffect(() => {
    fetchRecentAlbums()
    fetchRecentTransactions()
  }, [fetchRecentAlbums, fetchRecentTransactions])

  useEffect(() => {
    let isActive = true
    let albumsChannel: ReturnType<typeof supabase.channel> | null = null
    let transactionsChannel: ReturnType<typeof supabase.channel> | null = null

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user || !isActive) return
      albumsChannel = supabase
        .channel(`overview-albums-${user.id}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'albums' },
          () => {
            fetchRecentAlbums(true)
          }
        )
        .subscribe()
      transactionsChannel = supabase
        .channel(`overview-transactions-${user.id}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'transactions' },
          () => {
            fetchRecentTransactions(true)
          }
        )
        .subscribe()
    })

    return () => {
      isActive = false
      if (albumsChannel) supabase.removeChannel(albumsChannel)
      if (transactionsChannel) supabase.removeChannel(transactionsChannel)
    }
  }, [fetchRecentAlbums, fetchRecentTransactions])

  useEffect(() => {
    let isActive = true
    const loadUserName = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!isActive) return
      const name = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split('@')[0]
      if (name) setUserName(String(name))
    }
    loadUserName()
    return () => {
      isActive = false
    }
  }, [])

  const formatCurrency = (value?: number | null) => {
    if (typeof value !== 'number') return null
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value)
  }

  const getAlbumLink = (album: RecentAlbum) => {
    if (album.type === 'yearbook') {
      return getYearbookSectionQueryUrl(album.id, 'cover')
    }
    return '/user/portal/albums'
  }

  const normalizeStatus = (status?: string | null) => {
    if (!status) return '-'
    if (status === 'SETTLED') return 'success'
    return status.toLowerCase()
  }

  return (
    <>
      {invoicePopupUrl && (
        <div className="fixed inset-0 z-[110] flex flex-col bg-[#0a0a0b]" role="dialog" aria-modal="true" aria-label="Invoice pembayaran">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-white/5 shrink-0">
            <h3 className="text-sm font-semibold text-white">Invoice Pembayaran</h3>
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
        title={`Welcome, ${userName}`}
        subtitle="Mulai dan pantau progres projectmu di sini."
      />

      <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.06] via-white/[0.02] to-transparent p-6 sm:p-8 mb-6">
        <p className="text-[11px] uppercase tracking-wider text-gray-500 mb-2">Mulai dari sini</p>
        <h2 className="text-2xl sm:text-3xl font-semibold text-white mb-2">Buat project pertamamu</h2>
        <p className="text-sm text-gray-400 mb-4">
          Buat album baru, kelola file, dan lanjutkan proses kreatifmu dari sana.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/user/portal/albums"
            className="px-4 py-2 rounded-xl bg-white/10 text-sm font-medium text-white hover:bg-white/20 transition-colors"
          >
            Buat Project
          </Link>
          <Link
            href="/user/portal/riwayat"
            className="px-4 py-2 rounded-xl border border-white/10 text-sm font-medium text-gray-300 hover:text-white hover:border-white/20 transition-colors"
          >
            Lihat Riwayat
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-white">
              <BookOpen className="w-4 h-4" />
              <h3 className="text-sm font-semibold">Album Terakhir Diakses</h3>
            </div>
            <Link href="/user/portal/albums" className="text-[11px] text-gray-400 hover:text-white">
              Lihat semua
            </Link>
          </div>
          {loadingAlbums ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={`album-skel-${i}`} className="h-10 rounded-xl bg-white/5 animate-pulse" />
              ))}
            </div>
          ) : recentAlbums.length === 0 ? (
            <div className="text-sm text-gray-500">Belum ada album.</div>
          ) : (
            <div className="space-y-3">
              {recentAlbums.map((album) => (
                <Link
                  key={album.id}
                  href={getAlbumLink(album)}
                  className="block rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2 hover:border-white/20 hover:bg-white/[0.05] transition-colors"
                >
                  <div className="text-sm font-medium text-white truncate">{album.name || 'Album Tanpa Nama'}</div>
                  <div className="text-[11px] text-gray-500 mt-1 flex items-center justify-between">
                    <span>{album.status || 'draft'}</span>
                    <span>
                      {album.created_at
                        ? new Date(album.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
                        : ''}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-white">
              <History className="w-4 h-4" />
              <h3 className="text-sm font-semibold">Riwayat Terakhir</h3>
            </div>
            <Link href="/user/portal/riwayat" className="text-[11px] text-gray-400 hover:text-white">
              Lihat semua
            </Link>
          </div>
          {loadingTransactions ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={`tx-skel-${i}`} className="h-10 rounded-xl bg-white/5 animate-pulse" />
              ))}
            </div>
          ) : recentTransactions.length === 0 ? (
            <div className="text-sm text-gray-500">Belum ada transaksi.</div>
          ) : (
            <div className="space-y-3">
              {recentTransactions.map((tx) => {
                const isPending = (tx.status ?? '').toLowerCase() === 'pending'
                const canPay = isPending && !!tx.invoice_url
                return (
                  <div
                    key={tx.id}
                    className={`rounded-xl border border-white/10 px-3 py-2 ${canPay ? 'bg-white/[0.04] hover:bg-white/[0.08] cursor-pointer transition-colors' : 'bg-white/[0.02]'}`}
                    onClick={() => {
                      if (canPay) setInvoicePopupUrl(tx.invoice_url!)
                    }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="text-sm font-medium text-white truncate">
                        {tx.album_name ? `Album: ${tx.album_name}` : tx.credits ? `Top Up ${tx.credits} Credits` : 'Top Up Credit'}
                      </div>
                      <div className="text-[11px] text-gray-300 whitespace-nowrap text-right">
                        {formatCurrency(tx.amount) || '-'}
                      </div>
                    </div>
                    <div className="text-[11px] text-gray-500 mt-1 flex items-center justify-between">
                      <span>{normalizeStatus(tx.status)}</span>
                      <span>
                        {tx.created_at
                          ? new Date(tx.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
                          : ''}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
