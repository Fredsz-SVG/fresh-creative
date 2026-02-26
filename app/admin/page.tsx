'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import DashboardTitle from '@/components/dashboard/DashboardTitle'
import { supabase } from '@/lib/supabase'

type OverviewStats = {
  totalUsers: number
  totalAdmins: number
  totalCredits: number
  newUsers7d: number
  latestUsers: {
    id: string
    email: string | null
    full_name: string | null
    role?: string | null
    is_suspended?: boolean | null
    credits?: number | null
    created_at?: string | null
  }[]
  page?: number
  perPage?: number
  total?: number
}

export default function AdminPage() {
  const [stats, setStats] = useState<OverviewStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editUserId, setEditUserId] = useState<string | null>(null)
  const [editCredits, setEditCredits] = useState('')
  const [savingId, setSavingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmTitle, setConfirmTitle] = useState('')
  const [confirmDescription, setConfirmDescription] = useState('')
  const [confirmConfirmText, setConfirmConfirmText] = useState('Konfirmasi')
  const [confirmCancelText, setConfirmCancelText] = useState('Batal')
  const [confirmVariant, setConfirmVariant] = useState<'danger' | 'warning'>('warning')
  const [confirmLoading, setConfirmLoading] = useState(false)
  const confirmActionRef = useRef<null | (() => Promise<void>)>(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  const fetchOverview = useCallback(async (silent = false) => {
    if (!mountedRef.current) return
    if (!silent) {
      setLoading(true)
      setError(null)
    }
    try {
      const params = new URLSearchParams()
      params.set('page', String(page))
      params.set('perPage', '10')
      if (search.trim()) params.set('search', search.trim())

      const ts = Date.now()
      params.set('_t', String(ts))

      const res = await fetch(`/api/admin/users/overview?${params.toString()}`)
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        if (mountedRef.current && !silent) setError(data?.error || 'Gagal memuat overview')
        if (mountedRef.current && !silent) setLoading(false)
        return
      }
      if (mountedRef.current) {
        setStats(data)
      }
    } catch {
      if (mountedRef.current && !silent) {
        setError('Gagal memuat overview')
      }
    } finally {
      if (mountedRef.current && !silent) {
        setLoading(false)
      }
    }
  }, [page, search])

  useEffect(() => {
    fetchOverview()
  }, [fetchOverview])

  useEffect(() => {
    let usersChannel: ReturnType<typeof supabase.channel> | null = null
    let transactionsChannel: ReturnType<typeof supabase.channel> | null = null

    usersChannel = supabase
      .channel('admin-users-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'users' },
        () => {
          fetchOverview(true)
        }
      )
      .subscribe()

    transactionsChannel = supabase
      .channel('admin-transactions-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'transactions' },
        () => {
          fetchOverview(true)
        }
      )
      .subscribe()

    return () => {
      if (usersChannel) supabase.removeChannel(usersChannel)
      if (transactionsChannel) supabase.removeChannel(transactionsChannel)
    }
  }, [fetchOverview])

  const updateCredits = async (id: string, value: number) => {
    setSavingId(id)
    try {
      const res = await fetch('/api/admin/users/overview', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, credits: value }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        alert(data?.error || 'Gagal update credit')
        return
      }
      setStats((prev) => {
        if (!prev) return prev
        const users = prev.latestUsers.map((u) =>
          u.id === id ? { ...u, credits: value } : u
        )
        const totalCredits = users.reduce(
          (sum, u) => sum + (typeof u.credits === 'number' ? u.credits : 0),
          0
        )
        return { ...prev, latestUsers: users, totalCredits }
      })
      setEditUserId((current) => (current === id ? null : current))
    } finally {
      setSavingId(null)
    }
  }

  const updateUser = async (id: string, payload: { isSuspended?: boolean }) => {
    setSavingId(id)
    try {
      const res = await fetch('/api/admin/users/overview', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, isSuspended: payload.isSuspended }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        alert(data?.error || 'Gagal update user')
        return
      }
      if (typeof payload.isSuspended === 'boolean') {
        setStats((prev) => {
          if (!prev) return prev
          const users = prev.latestUsers.map((u) =>
            u.id === id ? { ...u, is_suspended: payload.isSuspended } : u
          )
          return { ...prev, latestUsers: users }
        })
      }
    } finally {
      setSavingId(null)
    }
  }

  const handleStartEditCredits = (userId: string, currentCredits: number | null | undefined) => {
    setEditUserId(userId)
    setEditCredits(String(currentCredits ?? 0))
  }

  const handleSaveCredits = (userId: string) => {
    const value = parseInt(editCredits, 10)
    if (Number.isNaN(value) || value < 0) {
      alert('Credit harus angka >= 0')
      return
    }
    updateCredits(userId, value)
  }

  const openConfirm = (config: {
    title: string
    description: string
    confirmText: string
    cancelText?: string
    variant?: 'danger' | 'warning'
    onConfirm: () => Promise<void>
  }) => {
    setConfirmTitle(config.title)
    setConfirmDescription(config.description)
    setConfirmConfirmText(config.confirmText)
    setConfirmCancelText(config.cancelText ?? 'Batal')
    setConfirmVariant(config.variant ?? 'warning')
    confirmActionRef.current = config.onConfirm
    setConfirmOpen(true)
  }

  const handleConfirm = async () => {
    if (!confirmActionRef.current) return
    setConfirmLoading(true)
    try {
      await confirmActionRef.current()
      setConfirmOpen(false)
    } finally {
      setConfirmLoading(false)
    }
  }

  const handleSuspendUser = (userId: string, currentlySuspended: boolean) => {
    const next = !currentlySuspended
    openConfirm({
      title: next ? 'Suspend User' : 'Unsuspend User',
      description: next
        ? 'User tidak bisa login sampai admin membuka suspend.'
        : 'User bisa login kembali setelah suspend dibuka.',
      confirmText: next ? 'Suspend' : 'Unsuspend',
      variant: 'warning',
      onConfirm: async () => {
        await updateUser(userId, { isSuspended: next })
      },
    })
  }

  const handleDeleteUser = async (userId: string) => {
    openConfirm({
      title: 'Hapus Akun User',
      description: 'Tindakan ini tidak dapat dibatalkan.',
      confirmText: 'Hapus',
      variant: 'danger',
      onConfirm: async () => {
        setDeletingId(userId)
        try {
          const res = await fetch('/api/admin/users/overview', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: userId }),
          })
          const data = await res.json().catch(() => null)
          if (!res.ok) {
            alert(data?.error || 'Gagal menghapus user')
            return
          }
          setStats((prev) => {
            if (!prev) return prev
            const users = prev.latestUsers.filter((u) => u.id !== userId)
            const totalUsers = users.length
            const totalAdmins = users.filter((u) => u.role === 'admin').length
            const totalCredits = users.reduce(
              (sum, u) => sum + (typeof u.credits === 'number' ? u.credits : 0),
              0
            )
            const now = new Date()
            const since = new Date(now)
            since.setDate(now.getDate() - 7)
            const newUsers7d = users.filter((u) => {
              if (!u.created_at) return false
              const created = new Date(u.created_at)
              return created >= since
            }).length
            return {
              ...prev,
              latestUsers: users,
              totalUsers,
              totalAdmins,
              totalCredits,
              newUsers7d,
            }
          })
        } finally {
          setDeletingId(null)
        }
      },
    })
  }

  const handleChangeRole = async (userId: string, nextRole: 'user' | 'admin') => {
    openConfirm({
      title: nextRole === 'admin' ? 'Jadikan Admin' : 'Jadikan User',
      description: nextRole === 'admin'
        ? 'User akan mendapatkan akses dashboard admin.'
        : 'Akses admin akan dicabut dari user ini.',
      confirmText: nextRole === 'admin' ? 'Jadikan Admin' : 'Jadikan User',
      variant: 'warning',
      onConfirm: async () => {
        setSavingId(userId)
        try {
          const res = await fetch('/api/admin/users/overview', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: userId, role: nextRole }),
          })
          const data = await res.json().catch(() => null)
          if (!res.ok) {
            alert(data?.error || 'Gagal update role')
            return
          }
          setStats((prev) => {
            if (!prev) return prev
            const users = prev.latestUsers.map((u) =>
              u.id === userId ? { ...u, role: nextRole } : u
            )
            const totalAdmins = users.filter((u) => u.role === 'admin').length
            return { ...prev, latestUsers: users, totalAdmins }
          })
        } finally {
          setSavingId(null)
        }
      },
    })
  }

  const totalRows = stats?.total ?? stats?.latestUsers.length ?? 0
  const perPage = stats?.perPage ?? 10
  const currentPage = stats?.page ?? page
  const totalPages = totalRows > 0 ? Math.ceil(totalRows / perPage) : 1

  return (
    <>
      <DashboardTitle
        title="Admin Dashboard"
        subtitle="Kelola pengguna"
      />

      {error && (
        <div className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        {loading && !stats ? (
          [1, 2, 3, 4].map((i) => (
            <div key={`stat-skeleton-${i}`} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 animate-pulse">
              <div className="h-3 w-20 bg-white/10 rounded mb-2" />
              <div className="h-7 w-16 bg-white/10 rounded" />
            </div>
          ))
        ) : (
          <>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-[11px] text-gray-400 mb-1">Total User</p>
              <p className="text-2xl font-bold text-white">
                {stats?.totalUsers.toLocaleString() ?? '0'}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-[11px] text-gray-400 mb-1">Admin</p>
              <p className="text-2xl font-bold text-white">
                {stats?.totalAdmins.toLocaleString() ?? '0'}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-[11px] text-gray-400 mb-1">Total Credit</p>
              <p className="text-2xl font-bold text-lime-400">
                {stats?.totalCredits.toLocaleString() ?? '0'}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-[11px] text-gray-400 mb-1">User Baru 7 Hari</p>
              <p className="text-2xl font-bold text-white">
                {stats?.newUsers7d.toLocaleString() ?? '0'}
              </p>
            </div>
          </>
        )}
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden">
        <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-white">Daftar User</h2>
            <span className="text-[11px] text-gray-500">
              {totalRows} user
            </span>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setPage(1)
                setSearch(e.target.value)
              }}
              placeholder="Cari nama atau email..."
              className="px-2 py-1 rounded bg-black/40 border border-white/10 text-xs text-white w-full sm:w-56"
            />
          </div>
        </div>
        <div className="md:hidden p-3 space-y-3">
          {loading && (
            <>
              {[1, 2, 3].map((i) => (
                <div key={`mobile-skeleton-${i}`} className="rounded-2xl border border-white/10 bg-white/[0.02] p-3 space-y-3 animate-pulse">
                  <div className="h-4 w-40 bg-white/10 rounded" />
                  <div className="h-3 w-32 bg-white/10 rounded" />
                  <div className="h-3 w-24 bg-white/10 rounded" />
                  <div className="h-8 w-full bg-white/10 rounded" />
                  <div className="h-9 w-full bg-white/10 rounded" />
                </div>
              ))}
            </>
          )}
          {!loading && stats && stats.latestUsers.length === 0 && (
            <div className="rounded-xl border border-white/10 bg-white/[0.02] px-3 py-4 text-center text-xs text-gray-500">
              Belum ada user terdaftar.
            </div>
          )}
          {!loading && stats && stats.latestUsers.length > 0 && stats.latestUsers.map((u) => (
            <div key={u.id} className="rounded-2xl border border-white/10 bg-white/[0.02] p-3 space-y-3">
              <div>
                <p className="text-sm text-white font-semibold">{u.full_name || '-'}</p>
                <p className="text-[11px] text-gray-400">{u.email || '-'}</p>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-2 text-gray-300">
                  <span>{u.role || 'user'}</span>
                  <button
                    type="button"
                    disabled={savingId === u.id}
                    onClick={() => handleChangeRole(u.id, u.role === 'admin' ? 'user' : 'admin')}
                    className="px-2 py-0.5 rounded border border-white/10 text-[10px] text-gray-300 hover:bg-white/10 disabled:opacity-50"
                  >
                    {u.role === 'admin' ? 'Jadikan User' : 'Jadikan Admin'}
                  </button>
                </div>
                {u.is_suspended ? (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-red-500/10 text-red-300 text-[10px]">
                    Suspended
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-lime-500/10 text-lime-300 text-[10px]">
                    Aktif
                  </span>
                )}
              </div>
              <div className="text-[11px] text-gray-400">
                {u.created_at
                  ? new Date(u.created_at).toLocaleString('id-ID', {
                      day: '2-digit',
                      month: 'short',
                      year: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : '-'}
              </div>
              <div className="rounded-xl border border-white/10 bg-black/30 p-2">
                {editUserId === u.id ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      value={editCredits}
                      onChange={(e) => setEditCredits(e.target.value)}
                      className="flex-1 px-2 py-1 rounded bg-black/40 border border-white/10 text-right text-xs text-white"
                    />
                    <button
                      type="button"
                      onClick={() => handleSaveCredits(u.id)}
                      disabled={savingId === u.id}
                      className="px-2 py-1 rounded bg-lime-600 text-white text-[11px] disabled:opacity-50"
                    >
                      {savingId === u.id ? 'Simpan...' : 'Simpan'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditUserId(null)}
                      className="px-2 py-1 rounded bg-white/5 text-gray-300 text-[11px]"
                    >
                      Batal
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <span className="text-lime-400 text-sm font-semibold">
                      {typeof u.credits === 'number' ? u.credits.toLocaleString() : '0'}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleStartEditCredits(u.id, u.credits ?? 0)}
                      className="px-2 py-1 rounded border border-white/10 text-[11px] text-gray-300 hover:bg-white/10"
                    >
                      Edit
                    </button>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleSuspendUser(u.id, !!u.is_suspended)}
                  disabled={savingId === u.id}
                  className="flex-1 px-2 py-2 rounded border border-amber-500/50 text-[11px] text-amber-300 hover:bg-amber-500/10 disabled:opacity-50"
                >
                  {u.is_suspended ? 'Unsuspend' : 'Suspend'}
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteUser(u.id)}
                  disabled={deletingId === u.id}
                  className="flex-1 px-2 py-2 rounded border border-red-500/50 text-[11px] text-red-300 hover:bg-red-500/10 disabled:opacity-50"
                >
                  {deletingId === u.id ? 'Hapus...' : 'Hapus'}
                </button>
              </div>
            </div>
          ))}
        </div>
        <div className="overflow-x-auto hidden md:block">
          <table className="min-w-full text-xs">
            <thead className="bg-white/[0.02] text-gray-400">
              <tr>
                <th className="px-4 py-2 text-left font-medium">Nama</th>
                <th className="px-4 py-2 text-left font-medium">Email</th>
                <th className="px-4 py-2 text-left font-medium">Role</th>
                <th className="px-4 py-2 text-left font-medium">Status</th>
                <th className="px-4 py-2 text-right font-medium">Credits</th>
                <th className="px-4 py-2 text-left font-medium">Dibuat</th>
                <th className="px-4 py-2 text-right font-medium">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <tr key={`table-skeleton-${i}`} className="border-t border-white/5 animate-pulse">
                      <td className="px-4 py-2">
                        <div className="h-3 w-28 bg-white/10 rounded" />
                      </td>
                      <td className="px-4 py-2">
                        <div className="h-3 w-40 bg-white/10 rounded" />
                      </td>
                      <td className="px-4 py-2">
                        <div className="h-3 w-20 bg-white/10 rounded" />
                      </td>
                      <td className="px-4 py-2">
                        <div className="h-3 w-16 bg-white/10 rounded" />
                      </td>
                      <td className="px-4 py-2 text-right">
                        <div className="h-3 w-14 bg-white/10 rounded ml-auto" />
                      </td>
                      <td className="px-4 py-2">
                        <div className="h-3 w-20 bg-white/10 rounded" />
                      </td>
                      <td className="px-4 py-2 text-right">
                        <div className="h-7 w-24 bg-white/10 rounded ml-auto" />
                      </td>
                    </tr>
                  ))}
                </>
              )}
              {!loading && stats && stats.latestUsers.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-gray-500">
                    Belum ada user terdaftar.
                  </td>
                </tr>
              )}
              {!loading && stats && stats.latestUsers.length > 0 && stats.latestUsers.map((u) => (
                <tr key={u.id} className="border-t border-white/5 hover:bg-white/[0.03]">
                  <td className="px-4 py-2 text-white text-xs">
                    {u.full_name || '-'}
                  </td>
                  <td className="px-4 py-2 text-gray-300 text-xs">
                    {u.email || '-'}
                  </td>
                  <td className="px-4 py-2 text-gray-300 text-xs">
                    <div className="flex items-center gap-2">
                      <span>{u.role || 'user'}</span>
                      <button
                        type="button"
                        disabled={savingId === u.id}
                        onClick={() => handleChangeRole(u.id, u.role === 'admin' ? 'user' : 'admin')}
                        className="px-2 py-0.5 rounded border border-white/10 text-[10px] text-gray-300 hover:bg-white/10 disabled:opacity-50"
                      >
                        {u.role === 'admin' ? 'Jadikan User' : 'Jadikan Admin'}
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-2 text-xs">
                    {u.is_suspended ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-red-500/10 text-red-300 text-[10px]">
                        Suspended
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-lime-500/10 text-lime-300 text-[10px]">
                        Aktif
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-right text-xs">
                    {editUserId === u.id ? (
                      <div className="flex items-center justify-end gap-1">
                        <input
                          type="number"
                          min={0}
                          value={editCredits}
                          onChange={(e) => setEditCredits(e.target.value)}
                          className="w-20 px-2 py-1 rounded bg-black/40 border border-white/10 text-right text-xs text-white"
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveCredits(u.id)}
                          disabled={savingId === u.id}
                          className="px-2 py-1 rounded bg-lime-600 text-white text-[11px] disabled:opacity-50"
                        >
                          {savingId === u.id ? 'Simpan...' : 'Simpan'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditUserId(null)}
                          className="px-2 py-1 rounded bg-white/5 text-gray-300 text-[11px]"
                        >
                          Batal
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-end gap-2">
                        <span className="text-lime-400">
                          {typeof u.credits === 'number' ? u.credits.toLocaleString() : '0'}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleStartEditCredits(u.id, u.credits ?? 0)}
                          className="px-2 py-1 rounded border border-white/10 text-[11px] text-gray-300 hover:bg-white/10"
                        >
                          Edit
                        </button>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-2 text-gray-400 text-[11px]">
                    {u.created_at
                      ? new Date(u.created_at).toLocaleString('id-ID', {
                          day: '2-digit',
                          month: 'short',
                          year: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : '-'}
                  </td>
                  <td className="px-4 py-2 text-right text-xs">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => handleSuspendUser(u.id, !!u.is_suspended)}
                        disabled={savingId === u.id}
                        className="px-2 py-1 rounded border border-amber-500/50 text-[11px] text-amber-300 hover:bg-amber-500/10 disabled:opacity-50"
                      >
                        {u.is_suspended ? 'Unsuspend' : 'Suspend'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteUser(u.id)}
                        disabled={deletingId === u.id}
                        className="px-2 py-1 rounded border border-red-500/50 text-[11px] text-red-300 hover:bg-red-500/10 disabled:opacity-50"
                      >
                        {deletingId === u.id ? 'Hapus...' : 'Hapus'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {stats && totalPages > 1 && (
        <div className="mt-3 flex items-center justify-between text-[11px] text-gray-400">
          <span>
            Halaman {currentPage} dari {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={currentPage <= 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-2 py-1 rounded border border-white/10 disabled:opacity-40"
            >
              Sebelumnya
            </button>
            <button
              type="button"
              disabled={currentPage >= totalPages || loading}
              onClick={() => setPage((p) => p + 1)}
              className="px-2 py-1 rounded border border-white/10 disabled:opacity-40"
            >
              Berikutnya
            </button>
          </div>
        </div>
      )}
      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="bg-[#0b0b0f] border border-white/10 rounded-2xl w-full max-w-sm p-5 text-center">
            <h3 className="text-base font-semibold text-white mb-2">{confirmTitle}</h3>
            <p className="text-xs text-gray-400 mb-5">{confirmDescription}</p>
            <div className="flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                disabled={confirmLoading}
                className="px-4 py-2 rounded-lg border border-white/10 text-xs text-gray-300 hover:bg-white/10 disabled:opacity-50"
              >
                {confirmCancelText}
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={confirmLoading}
                className={`px-4 py-2 rounded-lg text-xs font-semibold text-white disabled:opacity-50 ${
                  confirmVariant === 'danger'
                    ? 'bg-red-600 hover:bg-red-500'
                    : 'bg-amber-500 hover:bg-amber-400'
                }`}
              >
                {confirmLoading ? 'Memproses...' : confirmConfirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
