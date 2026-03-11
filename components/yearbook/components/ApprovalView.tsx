'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { Edit3, Plus, Minus, Check, X, Clock, ClipboardList, Copy, Link as LinkIcon, CreditCard, Loader2, Wallet } from 'lucide-react'
import { toast } from 'sonner'
import { apiUrl } from '../../../lib/api-url'
import { fetchWithAuth } from '../../../lib/api-client'
import TeamView from './TeamView'

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
  const [assigningRequest, setAssigningRequest] = useState<string | null>(null)
  const [selectedClassForAssign, setSelectedClassForAssign] = useState('')
  const [pricingPackages, setPricingPackages] = useState<PricingPackage[]>([])
  const [loadingPricing, setLoadingPricing] = useState(false)
  const [loadingCheckout, setLoadingCheckout] = useState(false)
  const [checkoutInvoiceUrl, setCheckoutInvoiceUrl] = useState<string | null>(null)

  // Fetch pricing packages when editing limit
  useEffect(() => {
    if (!editingLimit) return
    setLoadingPricing(true)
    fetchWithAuth('/api/pricing')
      .then(res => res.ok ? res.json() : [])
      .then((data: unknown[]) => {
        if (Array.isArray(data) && data.length > 0) {
          const normalized = data.map((p: Record<string, unknown>) => ({
            id: String(p.id ?? ''),
            name: String(p.name ?? ''),
            pricePerStudent: Number(p.price_per_student ?? p.pricePerStudent ?? 0),
            minStudents: Number(p.min_students ?? p.minStudents ?? 100),
            features: Array.isArray(p.features) ? p.features.map(String) : [],
          }))
          setPricingPackages(normalized)
        }
      })
      .catch(() => { })
      .finally(() => setLoadingPricing(false))
  }, [editingLimit])

  // Calculate price for the new limit
  const newLimitVal = parseInt(editLimitValue) || 0
  const isIncreasingLimit = newLimitVal > originalLimitValue
  const addedStudents = isIncreasingLimit ? newLimitVal - originalLimitValue : 0

  // Use lowest price package as default for calculation
  const cheapestPackage = useMemo(() => {
    if (pricingPackages.length === 0) return null
    return pricingPackages.reduce((prev, curr) =>
      curr.pricePerStudent < prev.pricePerStudent ? curr : prev
    )
  }, [pricingPackages])

  const estimatedPrice = useMemo(() => {
    if (!cheapestPackage || newLimitVal <= 0) return 0
    return newLimitVal * cheapestPackage.pricePerStudent
  }, [cheapestPackage, newLimitVal])

  const additionalPrice = useMemo(() => {
    if (!cheapestPackage || addedStudents <= 0) return 0
    return addedStudents * cheapestPackage.pricePerStudent
  }, [cheapestPackage, addedStudents])

  const needsPayment = isIncreasingLimit

  const handleCheckoutForLimit = async () => {
    if (!albumId) return
    setLoadingCheckout(true)
    try {
      // Determine if this is an upgrade (already paid before) or first-time payment
      const isUpgrade = paymentStatus === 'paid'
      const chargePrice = isUpgrade ? additionalPrice : estimatedPrice

      // DO NOT update students_count here — it will be updated by webhook after payment succeeds
      // Only create the invoice with the new limit info
      const res = await fetchWithAuth(`/api/albums/${albumId}/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          upgrade: isUpgrade,
          amount: chargePrice,
          added_students: addedStudents,
          new_students_count: newLimitVal,
        }),
      })
      const data = await res.json()
      if (res.ok && data.invoiceUrl) {
        toast.success('Faktur pembayaran berhasil dibuat!')
        setCheckoutInvoiceUrl(data.invoiceUrl)
        setEditingLimit(false)
      } else {
        toast.error(data.error || 'Gagal membuat tagihan pembayaran')
      }
    } catch {
      toast.error('Gagal memproses pembayaran')
    } finally {
      setLoadingCheckout(false)
    }
  }

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
    // If increasing limit, require payment
    if (val > originalLimitValue) {
      await handleCheckoutForLimit()
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
      {/* Checkout Invoice Popup */}
      {checkoutInvoiceUrl && (
        <div className="fixed inset-0 z-[110] flex flex-col bg-white" role="dialog" aria-modal="true" aria-label="Pembayaran">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-100 shrink-0">
            <h3 className="text-sm font-semibold text-gray-800">Selesaikan Pembayaran</h3>
            <button
              type="button"
              onClick={() => setCheckoutInvoiceUrl(null)}
              className="flex items-center justify-center w-9 h-9 rounded-lg text-gray-400 hover:text-gray-800 hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex-1 min-h-0 relative">
            <iframe
              src={checkoutInvoiceUrl}
              title="Invoice Pembayaran"
              className="absolute inset-0 w-full h-full border-0"
              sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-top-navigation"
              allow="payment"
            />
          </div>
        </div>
      )}

      <div className="mb-4 sm:mb-5">
        {joinStats && (
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 mb-8 p-6 bg-white border-4 border-slate-900 rounded-[32px] shadow-[10px_10px_0_0_#0f172a]">
            <div className="flex flex-col items-center px-4 border-r-2 border-slate-100">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Terisi</span>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-black text-slate-900">{joinStats.approved_count}</span>
                <span className="text-slate-400 font-bold text-sm">/ {joinStats.limit_count || '∞'}</span>
                {canManage && !editingLimit && (
                  <button
                    type="button"
                    onClick={() => {
                      const currentLimit = joinStats.limit_count || 0
                      setEditLimitValue(String(currentLimit))
                      setOriginalLimitValue(Number(currentLimit))
                      setEditingLimit(true)
                    }}
                    className="w-6 h-6 rounded-lg bg-slate-100 border-2 border-slate-900 text-slate-900 flex items-center justify-center hover:bg-amber-300 transition-all"
                  >
                    <Edit3 className="w-3 h-3" strokeWidth={3} />
                  </button>
                )}
              </div>
            </div>

            <div className="flex flex-col items-center px-4 border-r-2 border-slate-100">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Menunggu</span>
              <span className="text-2xl font-black text-amber-500">{joinStats.pending_count}</span>
            </div>

            {joinStats.available_slots !== 999999 && (
              <div className="flex flex-col items-center px-4">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Sisa Slot</span>
                <span className="text-2xl font-black text-indigo-500">{joinStats.available_slots}</span>
              </div>
            )}
          </div>
        )}

        {editingLimit && (
          <div className="mt-4 p-6 rounded-[24px] bg-white border-4 border-slate-900 shadow-[6px_6px_0_0_#0f172a] animate-in zoom-in-95 duration-200">
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-900 font-black uppercase tracking-widest">Ubah Batas Siswa</span>
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Terisi: {joinStats?.approved_count || 0}</span>
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
                  className="w-12 h-12 rounded-xl bg-slate-100 border-2 border-slate-900 text-slate-900 hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-all shadow-[2px_2px_0_0_#0f172a] active:shadow-none active:translate-x-0.5 active:translate-y-0.5"
                >
                  <Minus className="w-5 h-5" strokeWidth={3} />
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
                  className="flex-1 w-full max-w-[120px] px-2 py-3 rounded-xl bg-white border-2 border-slate-900 text-slate-900 text-center text-xl font-black focus:outline-none focus:ring-2 focus:ring-indigo-500/20 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none shadow-[inset_2px_2px_0_0_rgba(15,23,42,0.1)] transition-all"
                />
                <button
                  type="button"
                  onClick={() => setEditLimitValue(String((parseInt(editLimitValue) || 0) + 1))}
                  className="w-12 h-12 rounded-xl bg-indigo-50 border-2 border-indigo-200 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-100 flex items-center justify-center transition-all shadow-[2px_2px_0_0_#c7d2fe] active:shadow-none active:translate-x-0.5 active:translate-y-0.5"
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
                    className="flex-1 py-2 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border-2 border-emerald-200 transition-all text-xs font-black shadow-[2px_2px_0_0_#a7f3d0] active:shadow-none active:translate-x-0.5 active:translate-y-0.5"
                  >
                    +{n}
                  </button>
                ))}
              </div>

              {/* Pricing Info - shown when increasing limit */}
              {isIncreasingLimit && cheapestPackage && (
                <div className="p-4 rounded-xl bg-amber-50 border-2 border-amber-500 shadow-[2px_2px_0_0_#f59e0b]">
                  <div className="flex items-center gap-2 mb-3">
                    <Wallet className="w-4 h-4 text-amber-500 flex-shrink-0" strokeWidth={3} />
                    <span className="text-xs font-black text-amber-600 uppercase tracking-widest">Biaya Tambahan Anggota</span>
                  </div>
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                      <span>Tambahan anggota</span>
                      <span>+{addedStudents} siswa</span>
                    </div>
                    <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                      <span>Harga per siswa</span>
                      <span>Rp {cheapestPackage.pricePerStudent.toLocaleString('id-ID')}</span>
                    </div>
                    <div className="border-t-2 border-amber-500/20 pt-2 mt-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-amber-600 font-black uppercase tracking-widest">
                          {paymentStatus === 'paid' ? 'Biaya Tambahan' : 'Total Baru'}
                        </span>
                        <span className="text-sm text-amber-600 font-black">
                          Rp {(paymentStatus === 'paid' ? additionalPrice : estimatedPrice).toLocaleString('id-ID')}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {loadingPricing && isIncreasingLimit && (
                <div className="flex items-center justify-center py-2">
                  <Loader2 className="w-5 h-5 text-indigo-500 animate-spin" strokeWidth={3} />
                  <span className="text-[10px] text-slate-500 font-bold ml-2 uppercase tracking-widest">Memuat harga...</span>
                </div>
              )}

              <div className="flex gap-2 w-full">
                <button
                  type="button"
                  onClick={() => setEditingLimit(false)}
                  className="flex-1 py-3 px-4 rounded-xl bg-white border-2 border-slate-900 text-slate-900 hover:bg-slate-50 transition-all font-black text-xs uppercase tracking-widest shadow-[2px_2px_0_0_#0f172a] active:shadow-none active:translate-x-0.5 active:translate-y-0.5"
                >
                  Batal
                </button>
                {isIncreasingLimit ? (
                  <button
                    type="button"
                    disabled={savingLimit || loadingCheckout || !cheapestPackage}
                    onClick={handleSaveLimit}
                    className="flex-[2] py-3 px-4 rounded-xl bg-amber-400 border-2 border-slate-900 text-slate-900 hover:bg-amber-500 transition-all font-black text-xs uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-[2px_2px_0_0_#0f172a] active:shadow-none active:translate-x-0.5 active:translate-y-0.5"
                  >
                    {loadingCheckout ? (
                      <Loader2 className="w-4 h-4 animate-spin" strokeWidth={3} />
                    ) : (
                      <CreditCard className="w-4 h-4" strokeWidth={3} />
                    )}
                    {loadingCheckout ? 'Memproses...' : 'Bayar & Tambah'}
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={savingLimit}
                    onClick={handleSaveLimit}
                    className="flex-[2] py-3 px-4 rounded-xl bg-indigo-500 border-2 border-slate-900 text-white hover:bg-indigo-600 transition-all font-black text-xs uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-[2px_2px_0_0_#0f172a] active:shadow-none active:translate-x-0.5 active:translate-y-0.5"
                  >
                    {savingLimit ? (
                      <Loader2 className="w-4 h-4 animate-spin" strokeWidth={3} />
                    ) : (
                      <Check className="w-4 h-4" strokeWidth={3} />
                    )}
                    {savingLimit ? 'Menyimpan...' : 'Simpan'}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="mt-4 p-6 rounded-[32px] bg-indigo-50 border-4 border-slate-900 shadow-[8px_8px_0_0_#0f172a]">
          <div className="flex items-center gap-2 mb-4">
            <LinkIcon className="w-4 h-4 text-slate-900" strokeWidth={3} />
            <span className="text-xs font-black text-slate-900 uppercase tracking-widest">Akses Registrasi Siswa</span>
            {inviteToken && inviteExpiresAt && (
              <span className="ml-auto text-[10px] font-black uppercase tracking-widest">
                {new Date(inviteExpiresAt) > new Date() ? (
                  <span className="text-emerald-500">Active</span>
                ) : (
                  <span className="text-red-500">Expired</span>
                )}
              </span>
            )}
          </div>
          {inviteToken ? (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <div className="flex-1 font-mono font-black text-slate-900 text-lg px-4 py-3 rounded-xl bg-white border-2 border-slate-900">
                  {inviteToken}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(inviteToken)
                    toast.success('Kode disalin!')
                  }}
                  className="px-6 py-4 rounded-xl bg-slate-900 text-white hover:bg-slate-800 transition-all text-xs font-black uppercase shadow-[4px_4px_0_0_#4f46e5] active:shadow-none translate-y-[-2px] active:translate-y-0"
                >
                  <Copy className="w-4 h-4 inline mr-2" /> Salin
                </button>
              </div>
              <button
                type="button"
                onClick={onGenerateInvite}
                disabled={generatingInvite}
                className="w-full py-2 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] hover:text-slate-900 transition-colors"
              >
                {generatingInvite ? 'Memproses...' : 'Generate Ulang Kode Baru'}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={onGenerateInvite}
              disabled={generatingInvite}
              className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-xl bg-indigo-500 text-white border-4 border-slate-900 font-black text-sm uppercase shadow-[8px_8px_0_0_#0f172a] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all disabled:opacity-50"
            >
              <LinkIcon className="w-5 h-5" strokeWidth={3} />
              {generatingInvite ? 'Membuat...' : 'Buat Link Undangan'}
            </button>
          )}
        </div>
      </div>

      <div className="flex gap-2 mb-8 bg-slate-100 p-2 rounded-[24px] border-4 border-slate-900 shadow-[6px_6px_0_0_#0f172a] overflow-x-auto no-scrollbar">
        <button
          type="button"
          onClick={() => setApprovalTab('pending')}
          className={`flex-shrink-0 flex items-center justify-center gap-2 px-6 py-4 rounded-xl transition-all font-black text-xs sm:text-sm uppercase border-2 ${approvalTab === 'pending'
            ? 'bg-amber-400 border-slate-900 text-slate-900 shadow-[4px_4px_0_0_#0f172a]'
            : 'bg-white border-transparent text-slate-400 opacity-60'
            }`}
        >
          <Clock className="w-5 h-5" strokeWidth={3} />
          <span>Menunggu</span>
          <span className={`px-2 py-0.5 rounded-lg text-[10px] ${approvalTab === 'pending' ? 'bg-slate-900 text-amber-400' : 'bg-slate-200 text-slate-400'}`}>
            {joinStats?.pending_count || 0}
          </span>
        </button>
        <button
          type="button"
          onClick={() => setApprovalTab('approved')}
          className={`flex-shrink-0 flex items-center justify-center gap-2 px-6 py-4 rounded-xl transition-all font-black text-xs sm:text-sm uppercase border-2 ${approvalTab === 'approved'
            ? 'bg-indigo-500 border-slate-900 text-white shadow-[4px_4px_0_0_#0f172a]'
            : 'bg-white border-transparent text-slate-400 opacity-60'
            }`}
        >
          <Check className="w-5 h-5" strokeWidth={3} />
          <span>Disetujui</span>
          <span className={`px-2 py-0.5 rounded-lg text-[10px] ${approvalTab === 'approved' ? 'bg-white text-indigo-500' : 'bg-slate-200 text-slate-400'}`}>
            {joinStats?.approved_count || 0}
          </span>
        </button>
        <button
          type="button"
          onClick={() => setApprovalTab('team')}
          className={`flex-shrink-0 flex items-center justify-center gap-2 px-6 py-4 rounded-xl transition-all font-black text-xs sm:text-sm uppercase border-2 ${approvalTab === 'team'
            ? 'bg-emerald-400 border-slate-900 text-slate-900 shadow-[4px_4px_0_0_#0f172a]'
            : 'bg-white border-transparent text-slate-400 opacity-60'
            }`}
        >
          <ClipboardList className="w-5 h-5" strokeWidth={3} />
          <span>Tim</span>
          <span className={`px-2 py-0.5 rounded-lg text-[10px] ${approvalTab === 'team' ? 'bg-slate-900 text-emerald-400' : 'bg-slate-200 text-slate-400'}`}>
            {members.length || 0}
          </span>
        </button>
      </div>

      {approvalTab === 'team' ? (
        <div className="-mx-3 sm:mx-0">
          <TeamView
            members={members}
            isOwner={isOwner}
            isGlobalAdmin={isGlobalAdmin}
            canManage={canManage}
            currentUserId={currentUserId}
            onUpdateRole={onUpdateRole}
            onRemoveMember={onRemoveMember}
          />
        </div>
      ) : (
        sortedGroupKeys.length === 0 ? (
          <div className="text-center py-12 sm:py-20 px-4 bg-white border-4 border-slate-900 rounded-[32px] shadow-[8px_8px_0_0_#0f172a]">
            <div className="w-20 h-20 mx-auto mb-6 rounded-3xl bg-amber-300 border-4 border-slate-900 flex items-center justify-center shadow-[inset_-4px_-4px_0_0_rgba(15,23,42,0.2)]">
              <ClipboardList className="w-10 h-10 text-slate-900" strokeWidth={3} />
            </div>
            <p className="text-xl sm:text-2xl font-black text-slate-900 uppercase tracking-tight mb-2">
              {approvalTab === 'pending' ? 'Semua sudah diproses' : 'Belum ada tanggapan'}
            </p>
            <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">
              {approvalTab === 'pending' ? 'Tidak ada permintaan menunggu' : 'Setujui permintaan untuk menampilkan'}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            <div className="flex gap-3 overflow-x-auto pb-4 pt-2 px-1" style={{ scrollbarWidth: 'none' }}>
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
                    className={`flex-shrink-0 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-black uppercase tracking-widest transition-all flex items-center gap-3 border-4 shadow-[4px_4px_0_0_#0f172a] active:shadow-none active:translate-x-1 active:translate-y-1 ${idx === safeIndex
                      ? 'bg-indigo-400 border-slate-900 text-slate-900'
                      : 'bg-white border-slate-900 text-slate-400 hover:bg-slate-50'
                      }`}
                  >
                    {tabLabel}
                    <span
                      className={`px-2 py-0.5 rounded-lg text-[10px] sm:text-xs font-black border-2 border-slate-900 ${idx === safeIndex ? 'bg-slate-900 text-indigo-400' : 'bg-slate-200 text-slate-500'}`}
                    >
                      {tabCount}
                    </span>
                  </button>
                )
              })}
            </div>
            <div className="flex flex-col gap-4">
              {classRequests.map((request) => {
                const isAssigning = assigningRequest === request.id
                return (
                  <div
                    key={request.id}
                    className="group relative flex flex-col sm:flex-row sm:items-center rounded-2xl bg-white border-4 border-slate-900 shadow-[6px_6px_0_0_#0f172a] p-5 gap-4"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div
                        className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-black border-4 border-slate-900 shrink-0 ${request.status === 'approved' ? 'bg-indigo-300 text-slate-900 shadow-[inset_-2px_-2px_0_0_rgba(15,23,42,0.2)]' : 'bg-amber-300 text-slate-900 shadow-[inset_-2px_-2px_0_0_rgba(15,23,42,0.2)]'
                          }`}
                      >
                        {request.student_name?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                      <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                        <p className="text-base sm:text-lg font-black text-slate-900 uppercase tracking-tight truncate">{request.student_name}</p>

                        <div className="flex flex-col gap-2">
                          {request.status === 'approved' && classObj && (
                            <span className="w-fit text-[10px] px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-700 font-black uppercase tracking-widest border-2 border-slate-900 shrink-0">
                              {classObj.name}
                            </span>
                          )}
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                            {request.email && (
                              <p className="text-xs font-bold text-slate-500">{request.email}</p>
                            )}
                            {request.phone && (
                              <p className="text-xs font-bold text-slate-500">• {request.phone}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    {request.status === 'pending' && !isAssigning && (
                      <div className="flex gap-2 shrink-0 sm:ml-auto w-full sm:w-auto mt-2 sm:mt-0 pt-3 sm:pt-0 border-t-2 sm:border-t-0 border-slate-100">
                        <button
                          type="button"
                          onClick={() => setAssigningRequest(request.id)}
                          className="flex-1 sm:flex-none sm:w-12 h-12 rounded-xl bg-emerald-400 border-4 border-slate-900 text-slate-900 flex items-center justify-center shadow-[4px_4px_0_0_#0f172a] hover:shadow-none hover:translate-x-1 hover:translate-y-1 active:shadow-none active:translate-x-1 active:translate-y-1 transition-all"
                          title="Setujui"
                        >
                          <Check className="w-6 h-6" strokeWidth={4} />
                        </button>
                        <button
                          type="button"
                          onClick={() => onRejectRequest(request.id)}
                          className="flex-1 sm:flex-none sm:w-12 h-12 rounded-xl bg-red-100 border-4 border-slate-900 text-red-500 hover:bg-red-200 flex items-center justify-center shadow-[4px_4px_0_0_#0f172a] hover:shadow-none hover:translate-x-1 hover:translate-y-1 active:shadow-none active:translate-x-1 active:translate-y-1 transition-all"
                          title="Tolak"
                        >
                          <X className="w-6 h-6" strokeWidth={4} />
                        </button>
                      </div>
                    )}
                    {isAssigning && (
                      <div className="w-full sm:w-auto flex flex-col sm:flex-row gap-3 mt-3 sm:mt-0 pt-4 sm:pt-0 border-t-4 sm:border-t-0 border-slate-900/10 sm:ml-auto">
                        <select
                          value={selectedClassForAssign}
                          onChange={(e) => setSelectedClassForAssign(e.target.value)}
                          className="w-full sm:w-[150px] px-4 py-3 text-xs sm:text-sm rounded-xl bg-slate-50 border-4 border-slate-900 text-slate-900 font-black focus:outline-none focus:ring-0 shadow-[4px_4px_0_0_#0f172a]"
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
                            className="flex-1 sm:flex-none px-6 py-3 rounded-xl bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed text-xs font-black uppercase tracking-widest transition-all shadow-[4px_4px_0_0_#6366f1] active:shadow-none active:translate-x-1 active:translate-y-1"
                          >
                            OK
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setAssigningRequest(null)
                              setSelectedClassForAssign('')
                            }}
                            className="w-12 h-12 flex items-center justify-center rounded-xl bg-slate-100 border-4 border-slate-900 text-slate-900 transition-all shadow-[4px_4px_0_0_#0f172a] active:shadow-none active:translate-x-1 active:translate-y-1"
                          >
                            <X className="w-5 h-5" strokeWidth={4} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )
      )}
    </div>
  )
}
