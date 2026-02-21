'use client'

import React, { useState } from 'react'
import { Edit3, Plus, Minus, Check, X, Clock, ClipboardList, Copy, Link as LinkIcon } from 'lucide-react'
import { toast } from 'sonner'

type AlbumClass = { id: string; name: string; sort_order?: number; student_count?: number }
type JoinRequest = {
  id: string
  student_name: string
  email?: string | null
  phone?: string | null
  status: string
  assigned_class_id?: string | null
  class_name?: string | null
}
type JoinStats = {
  approved_count: number
  pending_count: number
  limit_count?: number | null
  available_slots?: number
}

interface ApprovalViewProps {
  joinStats: JoinStats | null
  canManage: boolean
  approvalTab: 'pending' | 'approved'
  setApprovalTab: (tab: 'pending' | 'approved') => void
  joinRequests: JoinRequest[]
  classes: AlbumClass[]
  inviteToken: string | null
  inviteExpiresAt: string | null
  generatingInvite: boolean
  onGenerateInvite: () => Promise<void>
  savingLimit: boolean
  onSaveLimit: (value: number) => Promise<void>
  onApproveRequest: (requestId: string, assignedClassId: string) => Promise<void>
  onRejectRequest: (requestId: string) => void | Promise<void>
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
  generatingInvite,
  onGenerateInvite,
  savingLimit,
  onSaveLimit,
  onApproveRequest,
  onRejectRequest,
}: ApprovalViewProps) {
  const [editingLimit, setEditingLimit] = useState(false)
  const [editLimitValue, setEditLimitValue] = useState('')
  const [originalLimitValue, setOriginalLimitValue] = useState(0)
  const [approvalClassIndex, setApprovalClassIndex] = useState(0)
  const [assigningRequest, setAssigningRequest] = useState<string | null>(null)
  const [selectedClassForAssign, setSelectedClassForAssign] = useState('')

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

  return (
    <div className="max-w-5xl mx-auto px-3 py-3 sm:px-3 sm:py-4">
      <div className="mb-4 sm:mb-5">
        {joinStats && (
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-3 gap-y-2 mt-1.5 sm:mt-2">
            <div className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-lime-500 flex-shrink-0" />
              <span className="text-[10px] sm:text-xs text-gray-400">
                Terisi <span className="text-lime-400 font-semibold">{joinStats.approved_count}</span>/
                {joinStats.limit_count || '∞'}
              </span>
              {canManage && !editingLimit && (
                <button
                  type="button"
                  onClick={() => {
                    const currentLimit = joinStats.limit_count || 0
                    setEditLimitValue(String(currentLimit))
                    setOriginalLimitValue(Number(currentLimit))
                    setEditingLimit(true)
                  }}
                  className="w-[14px] h-[14px] sm:w-4 sm:h-4 rounded-full bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white flex items-center justify-center transition-colors flex-shrink-0 touch-manipulation"
                  title="Ubah batas"
                >
                  <Edit3 className="w-[7px] h-[7px] sm:w-2.5 sm:h-2.5" />
                </button>
              )}
            </div>
            <span className="text-gray-600 text-[10px] sm:text-xs hidden sm:inline">•</span>
            <div className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-amber-500 flex-shrink-0" />
              <span className="text-[10px] sm:text-xs text-gray-400">
                <span className="text-amber-400 font-semibold">{joinStats.pending_count}</span> Menunggu
              </span>
            </div>
            {joinStats.available_slots !== 999999 && (
              <>
                <span className="text-gray-600 text-[10px] sm:text-xs hidden sm:inline">•</span>
                <div className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-blue-500 flex-shrink-0" />
                  <span className="text-[10px] sm:text-xs text-gray-400">
                    <span className="text-blue-400 font-semibold">{joinStats.available_slots}</span> Sisa
                  </span>
                </div>
              </>
            )}
          </div>
        )}

        {editingLimit && (
          <div className="mt-3 p-3 rounded-xl bg-white/[0.03] border border-white/10">
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400 font-medium">Ubah Batas Siswa</span>
                <span className="text-[10px] text-gray-500">Terisi: {joinStats?.approved_count || 0}</span>
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
                  className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 text-gray-400 hover:text-red-400 hover:bg-red-500/10 disabled:opacity-20 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <input
                  type="number"
                  min={joinStats?.approved_count || 1}
                  value={editLimitValue}
                  onChange={(e) => {
                    const v = parseInt(e.target.value)
                    if (!isNaN(v) && v < (joinStats?.approved_count || 1)) return
                    setEditLimitValue(e.target.value)
                  }}
                  className="w-16 px-2 py-1.5 rounded-lg bg-white/5 border border-white/10 text-app text-center text-base font-bold focus:outline-none focus:border-lime-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <button
                  type="button"
                  onClick={() => setEditLimitValue(String((parseInt(editLimitValue) || 0) + 1))}
                  className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 text-gray-400 hover:text-lime-400 hover:bg-lime-500/10 flex items-center justify-center transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="flex items-center justify-center gap-1.5">
                {[10, 50, 100].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setEditLimitValue(String((parseInt(editLimitValue) || 0) + n))}
                    className="px-2.5 py-1 rounded bg-white/5 text-gray-500 hover:text-white hover:bg-white/10 transition-colors text-[11px] font-medium"
                  >
                    +{n}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setEditingLimit(false)}
                  className="flex-1 px-2.5 py-1.5 rounded-lg bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 transition-colors text-xs font-medium"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={savingLimit}
                  onClick={handleSaveLimit}
                  className="flex-1 px-2.5 py-1.5 rounded-lg bg-lime-600 text-white hover:bg-lime-500 transition-colors text-xs font-medium disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  <Check className="w-3 h-3" />
                  {savingLimit ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="mt-2 sm:mt-3 p-2.5 sm:p-3 rounded-lg sm:rounded-xl bg-white/[0.03] border border-white/10">
          <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
            <LinkIcon className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-gray-500 flex-shrink-0" />
            <span className="text-[10px] sm:text-xs text-gray-400 font-medium">Link Undangan</span>
            {inviteToken && inviteExpiresAt && (
              <span className="ml-auto text-[10px] text-gray-600">
                {new Date(inviteExpiresAt) > new Date() ? (
                  <>
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500 mr-0.5 align-middle" />
                    Aktif
                  </>
                ) : (
                  <>
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 mr-0.5 align-middle" />
                    Kadaluarsa
                  </>
                )}
              </span>
            )}
          </div>
          {inviteToken ? (
            <div className="flex flex-col gap-1.5">
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={`${typeof window !== 'undefined' ? window.location.origin : ''}/invite/${inviteToken}`}
                  readOnly
                  className="flex-1 min-w-0 px-2 py-1.5 rounded-lg bg-white/5 border border-white/10 text-app text-[11px] truncate"
                />
                <button
                  type="button"
                  onClick={() => {
                    const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
                    const url = `${baseUrl}/invite/${inviteToken}`
                    navigator.clipboard.writeText(url)
                    toast.success('Link disalin!')
                  }}
                  className="px-3 py-1.5 rounded-lg bg-lime-600 text-white hover:bg-lime-500 transition-colors text-[11px] font-medium flex items-center gap-1 whitespace-nowrap"
                >
                  <Copy className="w-3 h-3" />
                  Salin
                </button>
              </div>
              <button
                type="button"
                onClick={onGenerateInvite}
                disabled={generatingInvite}
                className="w-full px-2 py-1.5 rounded-lg bg-white/5 text-gray-500 hover:text-white hover:bg-white/10 transition-colors text-[11px] font-medium disabled:opacity-50"
              >
                {generatingInvite ? 'Membuat...' : 'Generate Ulang'}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={onGenerateInvite}
              disabled={generatingInvite}
              className="w-full px-3 py-2 rounded-lg bg-lime-600 text-white hover:bg-lime-500 transition-colors text-xs font-medium flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              <LinkIcon className="w-3.5 h-3.5" />
              {generatingInvite ? 'Membuat...' : 'Buat Link Undangan'}
            </button>
          )}
        </div>
      </div>

      <div className="flex gap-1 sm:gap-2 mb-3 sm:mb-4 bg-white/[0.03] p-0.5 sm:p-1 rounded-lg sm:rounded-xl">
        <button
          type="button"
          onClick={() => setApprovalTab('pending')}
          className={`flex-1 px-2 sm:px-3 py-1.5 sm:py-2 rounded-md sm:rounded-lg text-xs sm:text-sm font-medium transition-all flex items-center justify-center gap-1 sm:gap-1.5 ${
            approvalTab === 'pending'
              ? 'bg-amber-500/20 text-amber-400 shadow-sm'
              : 'text-gray-500 hover:text-white hover:bg-white/5'
          }`}
        >
          <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5 flex-shrink-0" />
          <span className="truncate">Menunggu</span>
          {joinStats && joinStats.pending_count > 0 && (
            <span
              className={`px-1 sm:px-1.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold flex-shrink-0 ${
                approvalTab === 'pending' ? 'bg-amber-500/30 text-amber-300' : 'bg-white/10 text-gray-500'
              }`}
            >
              {joinStats.pending_count}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => setApprovalTab('approved')}
          className={`flex-1 px-2 sm:px-3 py-1.5 sm:py-2 rounded-md sm:rounded-lg text-xs sm:text-sm font-medium transition-all flex items-center justify-center gap-1 sm:gap-1.5 ${
            approvalTab === 'approved'
              ? 'bg-lime-500/20 text-lime-400 shadow-sm'
              : 'text-gray-500 hover:text-white hover:bg-white/5'
          }`}
        >
          <Check className="w-3 h-3 sm:w-3.5 sm:h-3.5 flex-shrink-0" />
          <span className="truncate">Disetujui</span>
          {joinStats && joinStats.approved_count > 0 && (
            <span
              className={`px-1 sm:px-1.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold flex-shrink-0 ${
                approvalTab === 'approved' ? 'bg-lime-500/30 text-lime-300' : 'bg-white/10 text-gray-500'
              }`}
            >
              {joinStats.approved_count}
            </span>
          )}
        </button>
      </div>

      {sortedGroupKeys.length === 0 ? (
        <div className="text-center py-10 sm:py-14">
          <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-white/[0.04] flex items-center justify-center">
            <ClipboardList className="w-7 h-7 text-gray-600" />
          </div>
          <p className="text-sm text-app font-medium mb-0.5">
            {approvalTab === 'pending' ? 'Semua sudah diproses' : 'Belum ada yang disetujui'}
          </p>
          <p className="text-xs text-gray-600">
            {approvalTab === 'pending' ? 'Tidak ada permintaan menunggu' : 'Setujui permintaan untuk menampilkan'}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex gap-1.5 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
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
                  className={`flex-shrink-0 px-2.5 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1.5 ${
                    idx === safeIndex
                      ? 'bg-lime-500/20 text-lime-400 ring-1 ring-lime-500/40'
                      : 'bg-white/[0.04] text-gray-500 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {tabLabel}
                  <span
                    className={`min-w-[18px] h-[18px] flex items-center justify-center rounded-full text-[10px] font-bold ${
                      idx === safeIndex ? 'bg-lime-500/30 text-lime-300' : 'bg-white/10 text-gray-500'
                    }`}
                  >
                    {tabCount}
                  </span>
                </button>
              )
            })}
          </div>
          <div className="flex flex-col gap-1.5">
            {classRequests.map((request) => {
              const isAssigning = assigningRequest === request.id
              return (
                <div
                  key={request.id}
                  className="group relative rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] transition-all"
                >
                  <div className="p-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                          request.status === 'approved' ? 'bg-lime-500/20 text-lime-400' : 'bg-amber-500/20 text-amber-400'
                        }`}
                      >
                        {request.student_name?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm text-app font-medium truncate">{request.student_name}</p>
                          {request.status === 'approved' && classObj && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-lime-500/15 text-lime-500 font-medium flex-shrink-0">
                              {classObj.name}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          {request.email && (
                            <p className="text-[11px] text-gray-500 truncate">{request.email}</p>
                          )}
                          {request.phone && (
                            <p className="text-[11px] text-gray-500 truncate">• {request.phone}</p>
                          )}
                        </div>
                      </div>
                      {request.status === 'pending' && !isAssigning && (
                        <div className="flex gap-1 flex-shrink-0">
                          <button
                            type="button"
                            onClick={() => setAssigningRequest(request.id)}
                            className="w-8 h-8 rounded-lg bg-lime-500/15 text-lime-400 hover:bg-lime-500/30 flex items-center justify-center transition-colors"
                            title="Setujui"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onRejectRequest(request.id)}
                            className="w-8 h-8 rounded-lg bg-white/5 text-gray-500 hover:bg-red-500/20 hover:text-red-400 flex items-center justify-center transition-colors"
                            title="Tolak"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                    {isAssigning && (
                      <div className="mt-2.5 pt-2.5 border-t border-white/[0.06]">
                        <div className="flex gap-1.5">
                          <select
                            value={selectedClassForAssign}
                            onChange={(e) => setSelectedClassForAssign(e.target.value)}
                            className="flex-1 px-2.5 py-1.5 text-xs rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-lime-500 [&>option]:bg-gray-800 [&>option]:text-white"
                          >
                            <option value="">Pilih Kelas...</option>
                            {classes.map((cls) => (
                              <option key={cls.id} value={cls.id}>
                                {cls.name}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={async () => {
                              await onApproveRequest(request.id, selectedClassForAssign)
                              setAssigningRequest(null)
                              setSelectedClassForAssign('')
                            }}
                            disabled={!selectedClassForAssign}
                            className="px-3 py-1.5 rounded-lg bg-lime-600 text-white hover:bg-lime-500 disabled:opacity-30 disabled:cursor-not-allowed text-xs font-medium transition-colors"
                          >
                            OK
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setAssigningRequest(null)
                              setSelectedClassForAssign('')
                            }}
                            className="px-2 py-1.5 rounded-lg bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 text-xs transition-colors"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
