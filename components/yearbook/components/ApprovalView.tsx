'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { Edit3, Plus, Minus, Check, X, Clock, ClipboardList, Copy, Link as LinkIcon, Loader2, Trash2, Search } from 'lucide-react'
import { toast } from '@/lib/toast'
import { apiUrl } from '../../../lib/api-url'
import { fetchWithAuth } from '../../../lib/api-client'
import { asObject, asString } from '@/components/yearbook/utils/response-narrowing'

type AlbumClass = { id: string; name: string; sort_order?: number; student_count?: number }
type JoinRequest = {
  id: string
  student_name: string
  email?: string | null
  phone?: string | null
  status: string
  has_paid?: number
  payment_status?: string
  assigned_class_id?: string | null
  class_name?: string | null
}
type JoinStats = {
  approved_count: number
  pending_count: number
  limit_count?: number | null
  available_slots?: number
}
type PricingPackage = {
  id: string
  name: string
  pricePerStudent: number
  minStudents: number
  features: string[]
}

interface ApprovalViewProps {
  joinStats: JoinStats | null
  canManage: boolean
  approvalTab: 'pending' | 'approved' | 'team'
  setApprovalTab: (tab: 'pending' | 'approved' | 'team') => void
  joinRequests: JoinRequest[] // already filtered by parent (pending or approved list for current tab)
  classes: AlbumClass[]
  inviteToken: string | null
  inviteExpiresAt: string | null
  inviteTokenLoaded?: boolean
  generatingInvite: boolean
  onGenerateInvite: () => Promise<void>
  savingLimit: boolean
  onSaveLimit: (value: number) => Promise<void>
  onApproveRequest: (requestId: string, assignedClassId: string) => Promise<void>
  onRejectRequest: (requestId: string) => void | Promise<void>
  albumId?: string
  paymentStatus?: string
  members: any[]
  isOwner: boolean
  isGlobalAdmin?: boolean
  currentUserId?: string | null
  onUpdateRole: (userId: string, newRole: 'admin' | 'member') => void | Promise<void>
  onRemoveMember: (userId: string) => void | Promise<void>
}

export default function ApprovalView({
  joinStats,
  canManage,
  approvalTab,
  setApprovalTab,
  joinRequests,
  classes,
  inviteToken,
  inviteExpiresAt,
  inviteTokenLoaded = true,
  generatingInvite,
  onGenerateInvite,
  savingLimit,
  onSaveLimit,
  onApproveRequest,
  onRejectRequest,
  albumId,
  paymentStatus,
  members,
  isOwner,
  isGlobalAdmin = false,
  currentUserId,
  onUpdateRole,
  onRemoveMember,
}: ApprovalViewProps) {
  const [editingLimit, setEditingLimit] = useState(false)
  const [editLimitValue, setEditLimitValue] = useState('')
  const [originalLimitValue, setOriginalLimitValue] = useState(0)
  const [approvalClassIndex, setApprovalClassIndex] = useState(0)

  // Reset class index when switching tab so each tab starts from awal
  useEffect(() => {
    setApprovalClassIndex(0)
  }, [approvalTab])
  // Backward compatibility: if old state still sets "team", fold it into approved.
  useEffect(() => {
    if (approvalTab === 'team') setApprovalTab('approved')
  }, [approvalTab, setApprovalTab])
  const [assigningRequest, setAssigningRequest] = useState<string | null>(null)
  const [selectedClassForAssign, setSelectedClassForAssign] = useState('')

  const [approvedSearch, setApprovedSearch] = useState('')
  const [roleChangeConfirm, setRoleChangeConfirm] = useState<{
    userId: string
    newRole: 'admin' | 'member'
    memberName: string
  } | null>(null)
  const [removeConfirm, setRemoveConfirm] = useState<{ userId: string; memberName: string } | null>(null)
  const statsLoading = !joinStats

  const handleSaveLimit = async () => {
    const val = parseInt(editLimitValue)
    const currentLimit = joinStats?.approved_count || 0
    if (!val || val < 1) {
      toast.error('Jumlah harus minimal 1')
      return
    }
    if (val < currentLimit) {
      toast.error(`Tidak bisa dikurangi. Batas saat ini: ${currentLimit}`)
      return
    }
    await onSaveLimit(val)
    setEditingLimit(false)
  }

  const requestsByGroup: Record<string, JoinRequest[]> = {}
  joinRequests.forEach((request) => {
    let groupKey: string
    if (request.status === 'approved' && request.assigned_class_id) {
      groupKey = `id:${request.assigned_class_id}`
    } else if (request.class_name) {
      groupKey = `name:${request.class_name}`
    } else {
      groupKey = 'unassigned'
    }
    if (!requestsByGroup[groupKey]) requestsByGroup[groupKey] = []
    requestsByGroup[groupKey].push(request)
  })

  const sortedGroupKeys = Object.keys(requestsByGroup).sort((a, b) => {
    if (a === 'unassigned') return -1
    if (b === 'unassigned') return 1
    const nameA = a.startsWith('id:') ? classes.find((c) => c.id === a.slice(3))?.name || '' : a.slice(5)
    const nameB = b.startsWith('id:') ? classes.find((c) => c.id === b.slice(3))?.name || '' : b.slice(5)
    return nameA.localeCompare(nameB)
  })

  const safeIndex = Math.min(approvalClassIndex, Math.max(0, sortedGroupKeys.length - 1))
  const currentGroupKey = sortedGroupKeys[safeIndex] || ''
  const classRequests = requestsByGroup[currentGroupKey] || []
  const searchQ = approvedSearch.trim().toLowerCase()
  const showCrossClassSearch = approvalTab === 'approved' && searchQ.length > 0
  const displayRequests = showCrossClassSearch
    ? joinRequests.filter((r) =>
      `${r.student_name ?? ''} ${r.email ?? ''}`.toLowerCase().includes(searchQ)
    )
    : classRequests
  let groupLabel: string
  let classObj: AlbumClass | null = null
  if (currentGroupKey === 'unassigned') {
    groupLabel = 'Belum Ditentukan Kelas'
  } else if (currentGroupKey.startsWith('id:')) {
    classObj = classes.find((c) => c.id === currentGroupKey.slice(3)) || null
    groupLabel = classObj?.name || 'Kelas Tidak Ditemukan'
  } else {
    const className = currentGroupKey.slice(5)
    classObj = classes.find((c) => c.name === className) || null
    groupLabel = className
  }

  const handleConfirmRole = async () => {
    if (!roleChangeConfirm) return
    await onUpdateRole(roleChangeConfirm.userId, roleChangeConfirm.newRole)
    setRoleChangeConfirm(null)
  }

  const handleConfirmRemove = async () => {
    if (!removeConfirm) return
    await onRemoveMember(removeConfirm.userId)
    setRemoveConfirm(null)
  }

  return (
    <div className="max-w-5xl mx-auto px-2 py-2 sm:px-3 sm:py-4">
      {roleChangeConfirm && (
        <div className="fixed inset-0 bg-slate-900/40 dark:bg-black/50 backdrop-blur-md flex items-center justify-center z-[100] p-4">
          <div className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-[32px] p-6 sm:p-8 max-w-sm w-full shadow-[4px_4px_0_0_#334155] dark:shadow-[4px_4px_0_0_#1e293b] text-center">
            <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2 uppercase tracking-tight">Konfirmasi Perubahan</h3>
            <p className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-6">
              {roleChangeConfirm.newRole === 'admin'
                ? `Jadikan "${roleChangeConfirm.memberName}" sebagai Admin?`
                : `Jadikan "${roleChangeConfirm.memberName}" sebagai Anggota?`}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setRoleChangeConfirm(null)}
                className="flex-1 py-3.5 rounded-xl bg-slate-100 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white text-xs font-black uppercase tracking-widest shadow-[4px_4px_0_0_#334155] dark:shadow-[4px_4px_0_0_#1e293b] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all"
              >
                Tidak
              </button>
              <button
                onClick={handleConfirmRole}
                className="flex-1 py-3.5 rounded-xl bg-violet-500 text-white border-2 border-slate-200 dark:border-slate-600 text-xs font-black uppercase tracking-widest shadow-[4px_4px_0_0_#334155] dark:shadow-[4px_4px_0_0_#1e293b] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all"
              >
                Ya, Lanjutkan
              </button>
            </div>
          </div>
        </div>
      )}

      {removeConfirm && (
        <div className="fixed inset-0 bg-slate-900/40 dark:bg-black/50 backdrop-blur-md flex items-center justify-center z-[100] p-4">
          <div className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-[32px] p-6 sm:p-8 max-w-sm w-full shadow-[4px_4px_0_0_#334155] dark:shadow-[4px_4px_0_0_#1e293b] text-center">
            <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2 uppercase tracking-tight">Hapus Anggota</h3>
            <p className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-6">
              Hapus akses "<span className="text-slate-900 dark:text-slate-200 font-black">{removeConfirm.memberName}</span>" dari album ini?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setRemoveConfirm(null)}
                className="flex-1 py-3.5 rounded-xl bg-slate-100 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white text-xs font-black uppercase tracking-widest shadow-[4px_4px_0_0_#334155] dark:shadow-[4px_4px_0_0_#1e293b] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all"
              >
                Batal
              </button>
              <button
                onClick={handleConfirmRemove}
                className="flex-1 py-3.5 rounded-xl bg-red-500 text-white border-2 border-slate-200 dark:border-slate-700 text-xs font-black uppercase tracking-widest shadow-[4px_4px_0_0_#334155] dark:shadow-[4px_4px_0_0_#1e293b] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all"
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mb-3 sm:mb-5">
        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 sm:gap-4 mb-4 sm:mb-8 p-3 sm:p-6 bg-white dark:bg-slate-900 border-2 sm:border-2 border-slate-200 dark:border-slate-700 rounded-2xl sm:rounded-[32px] shadow-[4px_4px_0_0_#334155] dark:shadow-[4px_4px_0_0_#1e293b]">
            <div className="flex flex-col items-center px-2 sm:px-4 border-r-2 border-slate-100 dark:border-slate-700">
              <span className="text-[9px] sm:text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-0.5">Terisi</span>
              <div className="flex items-center gap-1.5">
                {statsLoading ? (
                  <span className="inline-block h-7 sm:h-8 w-20 rounded-md bg-slate-200 dark:bg-slate-700 animate-pulse" />
                ) : (
                  <>
                    <span className="text-lg sm:text-2xl font-black text-slate-900 dark:text-white">{joinStats.approved_count}</span>
                    <span className="text-slate-400 dark:text-slate-500 font-bold text-xs sm:text-sm">/ {joinStats.limit_count || '∞'}</span>
                  </>
                )}
                {canManage && !editingLimit && !statsLoading && (
                  <button
                    type="button"
                    onClick={() => {
                      const currentLimit = joinStats.limit_count || 0
                      setEditLimitValue(String(currentLimit))
                      setOriginalLimitValue(Number(currentLimit))
                      setEditingLimit(true)
                    }}
                    className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white flex items-center justify-center hover:bg-amber-300 dark:hover:bg-slate-700 transition-all"
                  >
                    <Edit3 className="w-3 h-3" strokeWidth={3} />
                  </button>
                )}
              </div>
            </div>

            <div className="flex flex-col items-center px-2 sm:px-4 border-r-2 border-slate-100 dark:border-slate-700">
              <span className="text-[9px] sm:text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-0.5">Menunggu</span>
              {statsLoading ? (
                <span className="inline-block h-7 sm:h-8 w-12 rounded-md bg-slate-200 dark:bg-slate-700 animate-pulse" />
              ) : (
                <span className="text-lg sm:text-2xl font-black text-amber-500 dark:text-amber-400">{joinStats.pending_count}</span>
              )}
            </div>

            <div className="flex flex-col items-center px-2 sm:px-4">
              <span className="text-[9px] sm:text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-0.5">Sisa Slot</span>
              {statsLoading ? (
                <span className="inline-block h-7 sm:h-8 w-12 rounded-md bg-slate-200 dark:bg-slate-700 animate-pulse" />
              ) : (
                <span className="text-lg sm:text-2xl font-black text-indigo-500 dark:text-indigo-400">
                  {joinStats.available_slots === 999999 ? '∞' : joinStats.available_slots}
                </span>
              )}
            </div>
          </div>

        {editingLimit && (
          <div className="mt-3 sm:mt-4 p-4 sm:p-6 rounded-2xl sm:rounded-[24px] bg-white dark:bg-slate-900 border-2 sm:border-2 border-slate-200 dark:border-slate-700 shadow-[4px_4px_0_0_#334155] dark:shadow-[4px_4px_0_0_#1e293b] animate-in zoom-in-95 duration-200">
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-900 dark:text-white font-black uppercase tracking-widest">Ubah Batas Siswa</span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest">Terisi: {joinStats?.approved_count || 0}</span>
              </div>
              <div className="flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const current = parseInt(editLimitValue) || 0
                    const minAllowed = Math.max(originalLimitValue, joinStats?.approved_count || 0)
                    if (current > minAllowed) setEditLimitValue(String(current - 1))
                  }}
                  disabled={
                    parseInt(editLimitValue) <= Math.max(originalLimitValue, joinStats?.approved_count || 0)
                  }
                  className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-all shadow-[4px_4px_0_0_#334155] dark:shadow-[4px_4px_0_0_#1e293b] active:shadow-none active:translate-x-0.5 active:translate-y-0.5"
                >
                  <Minus className="w-5 h-5" strokeWidth={3} />
                </button>
                <input
                  type="number"
                  min={Math.max(originalLimitValue, joinStats?.approved_count || 1)}
                  value={editLimitValue}
                  onChange={(e) => {
                    const v = parseInt(e.target.value)
                    const minAllowed = Math.max(originalLimitValue, joinStats?.approved_count || 1)
                    if (!isNaN(v) && v < minAllowed) {
                      setEditLimitValue(String(minAllowed))
                      return
                    }
                    setEditLimitValue(e.target.value)
                  }}
                  className="flex-1 w-full max-w-[120px] px-2 py-3 rounded-xl bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white text-center text-xl font-black focus:outline-none focus:ring-2 focus:ring-indigo-500/20 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none shadow-[inset_2px_2px_0_0_rgba(15,23,42,0.1)] dark:shadow-[inset_2px_2px_0_0_rgba(51,65,85,0.3)] transition-all"
                />
                <button
                  type="button"
                  onClick={() => setEditLimitValue(String((parseInt(editLimitValue) || 0) + 1))}
                  className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 border-2 border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 flex items-center justify-center transition-all shadow-[2px_2px_0_0_#c7d2fe] dark:shadow-[4px_4px_0_0_#1e293b] active:shadow-none active:translate-x-0.5 active:translate-y-0.5"
                >
                  <Plus className="w-5 h-5" strokeWidth={3} />
                </button>
              </div>
              <div className="flex items-center justify-center gap-2 mt-2">
                {[10, 50, 100].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setEditLimitValue(String((parseInt(editLimitValue) || 0) + n))}
                    className="flex-1 py-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 border-2 border-emerald-200 dark:border-emerald-800 transition-all text-xs font-black shadow-[2px_2px_0_0_#a7f3d0] dark:shadow-[4px_4px_0_0_#1e293b] active:shadow-none active:translate-x-0.5 active:translate-y-0.5"
                  >
                    +{n}
                  </button>
                ))}
              </div>

              <div className="flex gap-2 w-full mt-4">
                <button
                  type="button"
                  onClick={() => setEditingLimit(false)}
                  className="flex-1 py-3 px-4 rounded-xl bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-700 transition-all font-black text-xs uppercase tracking-widest shadow-[4px_4px_0_0_#334155] dark:shadow-[4px_4px_0_0_#1e293b] active:shadow-none active:translate-x-0.5 active:translate-y-0.5"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={savingLimit}
                  onClick={handleSaveLimit}
                  className="flex-[2] py-3 px-4 rounded-xl bg-indigo-500 border-2 border-slate-200 dark:border-slate-600 text-white hover:bg-indigo-600 dark:hover:bg-indigo-600 transition-all font-black text-xs uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-[4px_4px_0_0_#334155] dark:shadow-[4px_4px_0_0_#1e293b] active:shadow-none active:translate-x-0.5 active:translate-y-0.5"
                >
                  {savingLimit ? (
                    <Loader2 className="w-4 h-4 animate-spin" strokeWidth={3} />
                  ) : (
                    <Check className="w-4 h-4" strokeWidth={3} />
                  )}
                  {savingLimit ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="mt-3 sm:mt-4 p-4 sm:p-6 rounded-2xl sm:rounded-[32px] bg-indigo-50 dark:bg-indigo-950/40 border-2 sm:border-2 border-slate-200 dark:border-slate-700 shadow-[4px_4px_0_0_#334155] dark:shadow-[4px_4px_0_0_#1e293b]">
          <div className="flex flex-wrap items-center gap-2 mb-3 sm:mb-4">
            <LinkIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-900 dark:text-white" strokeWidth={3} />
            <span className="text-[10px] sm:text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest">Akses Registrasi Siswa</span>
            {!inviteTokenLoaded ? (
              <div className="ml-auto flex flex-col items-end gap-1">
                <span className="inline-block h-3 w-12 rounded bg-slate-200 dark:bg-slate-700 animate-pulse" />
                <span className="inline-block h-3 w-28 rounded bg-slate-200 dark:bg-slate-700 animate-pulse" />
              </div>
            ) : inviteToken && inviteExpiresAt ? (
              <div className="ml-auto flex flex-col items-end">
                {new Date(inviteExpiresAt) > new Date() ? (
                  <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Active</span>
                ) : (
                  <span className="text-[10px] font-black uppercase tracking-widest text-red-500">Expired</span>
                )}
                <span className="text-[9px] sm:text-[10px] font-bold text-slate-500 dark:text-slate-400 mt-0.5" title="Berakhir pada">
                  Berakhir: {new Date(inviteExpiresAt).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
                </span>
              </div>
            ) : null}
          </div>
          {!inviteTokenLoaded ? (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="flex-1 min-w-0 h-11 sm:h-14 rounded-lg sm:rounded-xl bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-600 animate-pulse" />
                <div className="shrink-0 h-11 sm:h-14 w-20 sm:w-24 rounded-lg sm:rounded-xl bg-slate-300 dark:bg-slate-700 border-2 border-slate-200 dark:border-slate-600 animate-pulse" />
              </div>
              <div className="w-full h-9 rounded-lg bg-slate-200 dark:bg-slate-700 animate-pulse" />
            </div>
          ) : inviteToken ? (
              <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="flex-1 min-w-0 font-mono font-black text-slate-900 dark:text-white text-xs sm:text-lg px-3 py-2 sm:px-4 sm:py-3 rounded-lg sm:rounded-xl bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-600 truncate sm:truncate-none">
                  {inviteToken}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(inviteToken)
                    toast.success('Kode disalin!')
                  }}
                  className="shrink-0 px-4 py-2.5 sm:px-6 sm:py-4 rounded-lg sm:rounded-xl bg-slate-900 dark:bg-slate-700 text-white hover:bg-slate-800 dark:hover:bg-slate-600 transition-all text-[10px] sm:text-xs font-black uppercase shadow-[4px_4px_0_0_#4f46e5] dark:shadow-[4px_4px_0_0_#1e293b] active:shadow-none translate-y-[-2px] active:translate-y-0 flex items-center gap-1.5"
                >
                  <Copy className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Salin
                </button>
              </div>
              <button
                type="button"
                onClick={onGenerateInvite}
                disabled={generatingInvite}
                className="w-full py-2 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                {generatingInvite ? 'Memproses...' : 'Generate Ulang Kode Baru'}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={onGenerateInvite}
              disabled={generatingInvite}
              className="w-full flex items-center justify-center gap-2 sm:gap-3 px-4 py-3 sm:px-6 sm:py-4 rounded-xl bg-indigo-500 text-white border-2 sm:border-2 border-slate-200 dark:border-slate-700 font-black text-xs sm:text-sm uppercase shadow-[4px_4px_0_0_#334155] dark:shadow-[4px_4px_0_0_#1e293b] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all disabled:opacity-50"
            >
              <LinkIcon className="w-4 h-4 sm:w-5 sm:h-5" strokeWidth={3} />
              {generatingInvite ? 'Membuat...' : 'Buat Link Undangan'}
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:flex gap-1.5 sm:gap-2 mb-4 sm:mb-8 bg-slate-100 dark:bg-slate-800 p-1.5 sm:p-2 rounded-xl sm:rounded-[24px] border-2 sm:border-2 border-slate-200 dark:border-slate-700 shadow-[4px_4px_0_0_#334155] dark:shadow-[4px_4px_0_0_#1e293b]">
        <button
          type="button"
          onClick={() => setApprovalTab('pending')}
          className={`flex-1 min-w-0 flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-2 px-1 py-2 sm:px-6 sm:py-4 rounded-md sm:rounded-xl transition-all font-black text-[8px] sm:text-xs md:text-sm uppercase border-2 ${approvalTab === 'pending'
            ? 'bg-amber-400 dark:bg-amber-600 border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white shadow-[4px_4px_0_0_#334155] dark:shadow-[4px_4px_0_0_#1e293b]'
            : 'bg-white dark:bg-slate-800 border-transparent text-slate-400 dark:text-slate-500 opacity-60'
            }`}
        >
          <Clock className="w-3 h-3 sm:w-5 sm:h-5 shrink-0" strokeWidth={3} />
          <span className="truncate w-full text-center sm:truncate-none">Menunggu</span>
          <span className={`inline-flex items-center justify-center min-w-7 px-1 py-0.5 rounded text-[8px] sm:text-[10px] shrink-0 ${approvalTab === 'pending' ? 'bg-slate-900 dark:bg-slate-700 text-amber-400' : 'bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500'}`}>
            {statsLoading ? (
              <span className="inline-block h-2 w-4 rounded bg-slate-500/40 animate-pulse" />
            ) : (
              joinStats?.pending_count || 0
            )}
          </span>
        </button>
        <button
          type="button"
          onClick={() => setApprovalTab('approved')}
          className={`flex-1 min-w-0 flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-2 px-1 py-2 sm:px-6 sm:py-4 rounded-md sm:rounded-xl transition-all font-black text-[8px] sm:text-xs md:text-sm uppercase border-2 ${approvalTab === 'approved'
            ? 'bg-indigo-500 border-slate-200 dark:border-slate-600 text-white shadow-[4px_4px_0_0_#334155] dark:shadow-[4px_4px_0_0_#1e293b]'
            : 'bg-white dark:bg-slate-800 border-transparent text-slate-400 dark:text-slate-500 opacity-60'
            }`}
        >
          <Check className="w-3 h-3 sm:w-5 sm:h-5 shrink-0" strokeWidth={3} />
          <span className="truncate w-full text-center sm:truncate-none">Disetujui</span>
          <span className={`inline-flex items-center justify-center min-w-7 px-1 py-0.5 rounded text-[8px] sm:text-[10px] shrink-0 ${approvalTab === 'approved' ? 'bg-white dark:bg-slate-800 text-indigo-500 dark:text-indigo-400' : 'bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500'}`}>
            {statsLoading ? (
              <span className="inline-block h-2 w-4 rounded bg-slate-500/40 animate-pulse" />
            ) : (
              joinStats?.approved_count || 0
            )}
          </span>
        </button>
      </div>

      {sortedGroupKeys.length === 0 ? (
          <div className="text-center py-8 sm:py-20 px-3 sm:px-4 bg-white dark:bg-slate-900 border-2 sm:border-2 border-slate-200 dark:border-slate-700 rounded-2xl sm:rounded-[32px] shadow-[4px_4px_0_0_#334155] dark:shadow-[4px_4px_0_0_#1e293b]">
            <div className="w-14 h-14 sm:w-20 sm:h-20 mx-auto mb-4 sm:mb-6 rounded-2xl sm:rounded-3xl bg-amber-300 dark:bg-amber-500 border-2 sm:border-2 border-slate-200 dark:border-slate-600 flex items-center justify-center shadow-[inset_-4px_-4px_0_0_rgba(15,23,42,0.2)]">
              <ClipboardList className="w-7 h-7 sm:w-10 sm:h-10 text-slate-900" strokeWidth={3} />
            </div>
            <p className="text-base sm:text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight mb-1.5 sm:mb-2">
              Semua sudah diproses
            </p>
            <p className="text-[10px] sm:text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
              Tidak ada permintaan menunggu
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3 sm:gap-6">
            {approvalTab === 'approved' && (
              <div className="flex justify-end">
                <div className="relative w-full sm:max-w-sm mb-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" strokeWidth={3} />
                  <input
                    type="text"
                    value={approvedSearch}
                    onChange={(e) => setApprovedSearch(e.target.value)}
                    placeholder="Cari nama / email (semua kelas)..."
                    className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm font-bold rounded-xl bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 shadow-[4px_4px_0_0_#334155] dark:shadow-[4px_4px_0_0_#1e293b] focus:shadow-none focus:translate-x-0.5 focus:translate-y-0.5 transition-all focus:outline-none"
                  />
                </div>
              </div>
            )}
            <div className="flex gap-2 sm:gap-3 overflow-x-auto pb-3 pt-1 px-0.5 no-scrollbar" style={{ scrollbarWidth: 'none' }}>
              {sortedGroupKeys.map((groupKey, idx) => {
                const tabLabel =
                  groupKey === 'unassigned'
                    ? 'Belum Ditentukan'
                    : groupKey.startsWith('id:')
                      ? classes.find((c) => c.id === groupKey.slice(3))?.name || '?'
                      : groupKey.slice(5)
                const tabCount = requestsByGroup[groupKey].length
                return (
                  <button
                    key={groupKey}
                    type="button"
                    onClick={() => setApprovalClassIndex(idx)}
                    className={`flex-shrink-0 px-3 py-2 sm:px-4 sm:py-2.5 rounded-lg sm:rounded-xl text-[10px] sm:text-sm font-black uppercase tracking-widest transition-all flex items-center gap-2 sm:gap-3 border-2 sm:border-4 shadow-[4px_4px_0_0_#334155] dark:shadow-[4px_4px_0_0_#1e293b] active:shadow-none active:translate-x-0.5 active:translate-y-0.5 ${idx === safeIndex
                      ? 'bg-indigo-400 dark:bg-indigo-600 border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600 text-slate-400 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700'
                      }`}
                  >
                    <span className="truncate max-w-[100px] sm:max-w-none">{tabLabel}</span>
                    <span
                      className={`px-1.5 py-0.5 rounded-md sm:rounded-lg text-[9px] sm:text-xs font-black border-2 border-slate-200 dark:border-slate-600 shrink-0 ${idx === safeIndex ? 'bg-slate-900 dark:bg-slate-700 text-indigo-400 dark:text-indigo-300' : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'}`}
                    >
                      {tabCount}
                    </span>
                  </button>
                )
              })}
            </div>
            <div className="flex flex-col gap-3 sm:gap-4">
              {displayRequests.map((request) => {
                const isAssigning = assigningRequest === request.id
                const matchedMember = members.find((m: any) => {
                  if (request.email && m?.email && String(m.email).toLowerCase() === String(request.email).toLowerCase()) return true
                  if (request.student_name && m?.name && String(m.name).toLowerCase() === String(request.student_name).toLowerCase()) return true
                  return false
                })
                return (
                  <div
                    key={request.id}
                    className="group relative flex flex-col sm:flex-row sm:items-center rounded-xl sm:rounded-2xl bg-white dark:bg-slate-900 border-2 sm:border-2 border-slate-200 dark:border-slate-700 shadow-[4px_4px_0_0_#334155] dark:shadow-[4px_4px_0_0_#1e293b] p-3 sm:p-5 gap-3 sm:gap-4"
                  >
                    <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                      <div
                        className={`w-11 h-11 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl flex items-center justify-center text-lg sm:text-2xl font-black border-2 sm:border-2 border-slate-200 dark:border-slate-600 shrink-0 ${request.status === 'approved' ? 'bg-indigo-300 dark:bg-indigo-600 text-slate-900 dark:text-white shadow-[inset_-2px_-2px_0_0_rgba(15,23,42,0.2)]' : 'bg-amber-300 dark:bg-amber-500 text-slate-900 dark:text-white shadow-[inset_-2px_-2px_0_0_rgba(15,23,42,0.2)]'
                          }`}
                      >
                        {request.student_name?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                      <div className="flex-1 min-w-0 flex flex-col gap-1 sm:gap-1.5">
                        <p className="text-sm sm:text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight truncate">{request.student_name}</p>

                        <div className="flex flex-col gap-2">
                          {request.status === 'approved' && classObj && (
                            <div className="flex flex-wrap items-center gap-2">
                              {matchedMember?.role === 'owner' && <span className="w-fit text-[10px] px-2 py-0.5 rounded-md bg-amber-400 dark:bg-amber-500 text-slate-900 font-black uppercase tracking-widest border-2 border-slate-200 dark:border-slate-600 shrink-0">Pemilik</span>}
                              {matchedMember?.role === 'admin' && <span className="w-fit text-[10px] px-2 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 font-black uppercase tracking-widest border-2 border-slate-200 dark:border-slate-600 shrink-0">Admin</span>}
                              {matchedMember?.role === 'member' && <span className="w-fit text-[10px] px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-black uppercase tracking-widest border-2 border-slate-200 dark:border-slate-600 shrink-0">Anggota</span>}
                              {matchedMember?.role === 'no-account' && <span className="w-fit text-[10px] px-2 py-0.5 rounded-md bg-rose-100 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 font-black uppercase tracking-widest border-2 border-slate-200 dark:border-slate-600 shrink-0">Belum Login</span>}
                              {currentUserId && matchedMember?.user_id === currentUserId && <span className="w-fit text-[10px] px-2 py-0.5 rounded-md bg-indigo-500 dark:bg-indigo-600 text-white font-black uppercase tracking-widest border-2 border-slate-200 dark:border-slate-600 shrink-0">Anda</span>}
                              {request.payment_status === 'unpaid' && (
                                <span className="w-fit text-[10px] px-2 py-0.5 rounded-md bg-red-100 dark:bg-red-950/50 text-red-600 dark:text-red-400 font-black uppercase tracking-widest border-2 border-slate-200 dark:border-slate-600 shrink-0">Belum Bayar</span>
                              )}
                              {request.payment_status === 'pending' && (
                                <span className="w-fit text-[10px] px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 font-black uppercase tracking-widest border-2 border-slate-200 dark:border-slate-600 shrink-0">Menunggu Bayar</span>
                              )}
                              {request.payment_status === 'paid' && (
                                <span className="w-fit text-[10px] px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 font-black uppercase tracking-widest border-2 border-slate-200 dark:border-slate-600 shrink-0">Lunas</span>
                              )}
                            </div>
                          )}
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                            {request.email && (
                              <p className="text-xs font-bold text-slate-500 dark:text-slate-400">{request.email}</p>
                            )}
                            {request.phone && (
                              <p className="text-xs font-bold text-slate-500 dark:text-slate-400">• {request.phone}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    {approvalTab === 'approved' && (isOwner || canManage) && matchedMember?.user_id && matchedMember?.role !== 'owner' && (
                      <div className="flex gap-1.5 sm:gap-2 shrink-0 sm:ml-auto w-full sm:w-auto mt-2 sm:mt-0 pt-2 sm:pt-0 border-t-2 sm:border-t-0 border-slate-100 dark:border-slate-700">
                        {(isOwner || isGlobalAdmin) && (
                          matchedMember.role !== 'admin' ? (
                            <button
                              type="button"
                              onClick={() => setRoleChangeConfirm({ userId: matchedMember.user_id, newRole: 'admin', memberName: matchedMember.name || matchedMember.email || request.student_name })}
                              className="flex-1 sm:flex-none px-3 py-2 rounded-lg sm:rounded-xl text-[9px] sm:text-[10px] font-black uppercase bg-indigo-500 dark:bg-indigo-600 text-white border-2 border-slate-200 dark:border-slate-600 shadow-[4px_4px_0_0_#334155] dark:shadow-[4px_4px_0_0_#1e293b]"
                            >
                              Set Admin
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setRoleChangeConfirm({ userId: matchedMember.user_id, newRole: 'member', memberName: matchedMember.name || matchedMember.email || request.student_name })}
                              className="flex-1 sm:flex-none px-3 py-2 rounded-lg sm:rounded-xl text-[9px] sm:text-[10px] font-black uppercase bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-2 border-slate-200 dark:border-slate-600"
                            >
                              Jadi Anggota
                            </button>
                          )
                        )}
                        {canManage && (
                          <button
                            type="button"
                            onClick={() => setRemoveConfirm({ userId: matchedMember.user_id, memberName: matchedMember.name || matchedMember.email || request.student_name })}
                            className="w-10 h-10 sm:w-11 sm:h-11 rounded-lg sm:rounded-xl bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-600 text-red-500 dark:text-red-400 hover:bg-red-500 hover:text-white flex items-center justify-center"
                            title="Hapus akses"
                          >
                            <Trash2 className="w-4 h-4" strokeWidth={3} />
                          </button>
                        )}
                      </div>
                    )}
                    {request.status === 'pending' && !isAssigning && (
                      <div className="flex gap-1.5 sm:gap-2 shrink-0 sm:ml-auto w-full sm:w-auto mt-2 sm:mt-0 pt-2 sm:pt-0 border-t-2 sm:border-t-0 border-slate-100 dark:border-slate-700">
                        <button
                          type="button"
                          onClick={() => setAssigningRequest(request.id)}
                          className="flex-1 sm:flex-none sm:w-12 h-10 sm:h-12 rounded-lg sm:rounded-xl bg-emerald-400 dark:bg-emerald-600 border-2 sm:border-2 border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white flex items-center justify-center shadow-[4px_4px_0_0_#334155] dark:shadow-[4px_4px_0_0_#1e293b] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 active:shadow-none active:translate-x-0.5 active:translate-y-0.5 transition-all"
                          title="Setujui"
                        >
                          <Check className="w-5 h-5 sm:w-6 sm:h-6" strokeWidth={4} />
                        </button>
                        <button
                          type="button"
                          onClick={() => onRejectRequest(request.id)}
                          className="flex-1 sm:flex-none sm:w-12 h-10 sm:h-12 rounded-lg sm:rounded-xl bg-red-100 dark:bg-red-950/50 border-2 sm:border-2 border-slate-200 dark:border-slate-600 text-red-500 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 flex items-center justify-center shadow-[4px_4px_0_0_#334155] dark:shadow-[4px_4px_0_0_#1e293b] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 active:shadow-none active:translate-x-0.5 active:translate-y-0.5 transition-all"
                          title="Tolak"
                        >
                          <X className="w-5 h-5 sm:w-6 sm:h-6" strokeWidth={4} />
                        </button>
                      </div>
                    )}
                    {isAssigning && (
                      <div className="w-full sm:w-auto flex flex-col sm:flex-row gap-2 sm:gap-3 mt-2 sm:mt-0 pt-3 sm:pt-0 border-t-2 sm:border-t-0 border-slate-200/10 dark:border-slate-500/20 sm:ml-auto">
                        <select
                          value={selectedClassForAssign}
                          onChange={(e) => setSelectedClassForAssign(e.target.value)}
                          className="w-full sm:w-[150px] px-3 py-2 sm:py-3 text-xs sm:text-sm rounded-lg sm:rounded-xl bg-slate-50 dark:bg-slate-800 border-2 sm:border-2 border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white font-black focus:outline-none focus:ring-0 shadow-[4px_4px_0_0_#334155] dark:shadow-[4px_4px_0_0_#1e293b]"
                        >
                          <option value="">Pilih Kelas...</option>
                          {classes.map((cls) => (
                            <option key={cls.id} value={cls.id}>
                              {cls.name}
                            </option>
                          ))}
                        </select>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={async () => {
                              await onApproveRequest(request.id, selectedClassForAssign)
                              setAssigningRequest(null)
                              setSelectedClassForAssign('')
                            }}
                            disabled={!selectedClassForAssign}
                            className="flex-1 sm:flex-none px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg sm:rounded-xl bg-slate-900 dark:bg-slate-700 text-white hover:bg-slate-800 dark:hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all shadow-[3px_3px_0_0_#6366f1] dark:shadow-[4px_4px_0_0_#1e293b] active:shadow-none active:translate-x-0.5 active:translate-y-0.5"
                          >
                            OK
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setAssigningRequest(null)
                              setSelectedClassForAssign('')
                            }}
                            className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-lg sm:rounded-xl bg-slate-100 dark:bg-slate-800 border-2 sm:border-2 border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white transition-all shadow-[4px_4px_0_0_#334155] dark:shadow-[4px_4px_0_0_#1e293b] active:shadow-none active:translate-x-0.5 active:translate-y-0.5"
                          >
                            <X className="w-4 h-4 sm:w-5 sm:h-5" strokeWidth={4} />
                          </button>
                        </div>
            {showCrossClassSearch && displayRequests.length === 0 && (
              <div className="text-center py-10 px-4 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-2xl shadow-[4px_4px_0_0_#334155] dark:shadow-[4px_4px_0_0_#1e293b]">
                <p className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">Tidak ada hasil</p>
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-2">Coba kata kunci lain.</p>
              </div>
            )}
                      </div>
                    )}

      {/* team management now attached directly to approved request cards above */}
                  </div>
                )
              })}
            </div>
          </div>
      )}
    </div>
  )
}

