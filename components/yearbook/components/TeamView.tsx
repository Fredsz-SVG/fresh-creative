'use client'

import React, { useState } from 'react'
import { UserCog, Trash2, Search } from 'lucide-react'

export type TeamMember = {
  user_id: string
  email: string
  name?: string
  role: string
}

interface TeamViewProps {
  members: TeamMember[]
  isOwner: boolean
  isGlobalAdmin?: boolean
  canManage: boolean
  currentUserId?: string | null
  onUpdateRole: (userId: string, newRole: 'admin' | 'member') => void | Promise<void>
  onRemoveMember: (userId: string) => void | Promise<void>
}

export default function TeamView({
  members,
  isOwner,
  isGlobalAdmin = false,
  canManage,
  currentUserId,
  onUpdateRole,
  onRemoveMember,
}: TeamViewProps) {
  const [memberSearch, setMemberSearch] = useState('')
  const [roleChangeConfirm, setRoleChangeConfirm] = useState<{
    userId: string
    newRole: 'admin' | 'member'
    memberName: string
  } | null>(null)
  const [removeConfirm, setRemoveConfirm] = useState<{ userId: string; memberName: string } | null>(null)

  const filtered = members.filter((member) => {
    if (!memberSearch) return true
    const q = memberSearch.toLowerCase()
    return (member.name || '').toLowerCase().includes(q) || (member.email || '').toLowerCase().includes(q)
  })

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
    <>
      {roleChangeConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-lg font-bold text-app mb-2">Konfirmasi Perubahan</h3>
            <p className="text-sm text-muted mb-4">
              {roleChangeConfirm.newRole === 'admin'
                ? `Jadikan "${roleChangeConfirm.memberName}" sebagai Admin?`
                : `Hapus "${roleChangeConfirm.memberName}" dari Admin?`}
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setRoleChangeConfirm(null)}
                className="px-4 py-2 rounded-lg bg-gray-100 text-gray-400 hover:bg-gray-100 hover:text-gray-800 transition-colors text-sm font-medium"
              >
                Tidak
              </button>
              <button
                onClick={handleConfirmRole}
                className="px-4 py-2 rounded-lg bg-violet-500 text-white hover:bg-violet-500 transition-colors text-sm font-medium"
              >
                Ya, Lanjutkan
              </button>
            </div>
          </div>
        </div>
      )}

      {removeConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white border border-red-200 rounded-xl p-4 sm:p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-lg font-bold text-red-400 mb-2">Hapus Anggota</h3>
            <p className="text-sm text-muted mb-4">
              Hapus akses &quot;<span className="text-gray-800 font-medium">{removeConfirm.memberName}</span>&quot; dari album ini?
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setRemoveConfirm(null)}
                className="px-4 py-2 rounded-lg bg-gray-100 text-gray-400 hover:bg-gray-100 hover:text-gray-800 transition-colors text-sm font-medium"
              >
                Batal
              </button>
              <button
                onClick={handleConfirmRemove}
                className="px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-500 transition-colors text-sm font-medium"
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-5xl mx-auto px-3 py-3 sm:px-3 sm:py-4">
        <div className="mb-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          <div className="text-center sm:text-left">
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 uppercase tracking-tight">Tim Album</h2>
            <p className="text-xs font-bold text-slate-400 mt-2 uppercase tracking-[0.2em]">{members.length} Orang Terdaftar</p>
          </div>
          <div className="relative sm:w-80 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" strokeWidth={3} />
            <input
              type="text"
              placeholder="Cari anggota..."
              value={memberSearch}
              onChange={(e) => setMemberSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-4 text-sm font-bold rounded-2xl bg-white border-4 border-slate-900 shadow-[6px_6px_0_0_#0f172a] focus:shadow-none focus:translate-x-1 focus:translate-y-1 transition-all focus:outline-none"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          {filtered.map((member, idx) => (
            <div
              key={member.user_id || `member-${idx}`}
              className="group relative flex flex-col sm:flex-row sm:items-center rounded-2xl bg-white border-4 border-slate-900 shadow-[6px_6px_0_0_#0f172a] p-5 gap-4 hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all"
            >
              <div className="flex items-center gap-4 flex-1">
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-black border-4 border-slate-900 shrink-0 bg-emerald-300 text-slate-900 shadow-[inset_-2px_-2px_0_0_rgba(15,23,42,0.2)]"
                >
                  {(member.name || member.email || '?').charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                  <div className="flex items-center gap-2">
                    <p className="text-base sm:text-lg font-black text-slate-900 uppercase tracking-tight truncate">
                      {member.name || member.email}
                    </p>
                    {currentUserId && member.user_id === currentUserId && (
                      <span className="w-fit text-[10px] px-2 py-0.5 rounded-md bg-indigo-500 text-white font-black uppercase tracking-widest border-2 border-slate-900 shrink-0">
                        Anda
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      {member.role === 'owner' && (
                        <span className="w-fit text-[10px] px-2 py-0.5 rounded-md bg-amber-400 text-slate-900 font-black uppercase tracking-widest border-2 border-slate-900 shrink-0">
                          Pemilik
                        </span>
                      )}
                      {member.role === 'admin' && (
                        <span className="w-fit text-[10px] px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-700 font-black uppercase tracking-widest border-2 border-slate-900 shrink-0">
                          Admin
                        </span>
                      )}
                      {member.role === 'member' && (
                        <span className="w-fit text-[10px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-black uppercase tracking-widest border-2 border-slate-900 shrink-0">
                          Anggota
                        </span>
                      )}
                      {member.role === 'no-account' && (
                        <span className="w-fit text-[10px] px-2 py-0.5 rounded-md bg-rose-100 text-rose-600 font-black uppercase tracking-widest border-2 border-slate-900 shrink-0">
                          Belum Login
                        </span>
                      )}
                    </div>
                    {member.name && (
                      <p className="text-xs font-bold text-slate-500">{member.email}</p>
                    )}
                  </div>
                </div>
                {(isOwner || canManage) && member.user_id && member.role !== 'owner' && (
                  <div className="flex gap-1.5 flex-shrink-0">
                    {(isOwner || isGlobalAdmin) && (
                      <div className="flex gap-2">
                        {member.role !== 'admin' ? (
                          <button
                            onClick={() =>
                              setRoleChangeConfirm({
                                userId: member.user_id,
                                newRole: 'admin',
                                memberName: member.name || member.email,
                              })
                            }
                            className="px-4 py-2 rounded-xl text-[10px] font-black uppercase bg-indigo-500 text-white border-2 border-slate-900 shadow-[3px_3px_0_0_#0f172a] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all"
                          >
                            Set Admin
                          </button>
                        ) : (
                          <button
                            onClick={() =>
                              setRoleChangeConfirm({
                                userId: member.user_id,
                                newRole: 'member',
                                memberName: member.name || member.email,
                              })
                            }
                            className="px-4 py-2 rounded-xl text-[10px] font-black uppercase bg-slate-100 text-slate-500 border-2 border-slate-900 hover:bg-slate-200 transition-all"
                          >
                            Jadi Anggota
                          </button>
                        )}
                      </div>
                    )}
                    {canManage && (
                      <button
                        onClick={() =>
                          setRemoveConfirm({ userId: member.user_id, memberName: member.name || member.email })}
                        className="w-10 h-10 rounded-xl bg-white border-2 border-slate-900 text-red-500 hover:bg-red-500 hover:text-white shadow-[3px_3px_0_0_#0f172a] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all flex items-center justify-center"
                        title="Hapus akses"
                      >
                        <Trash2 className="w-4 h-4" strokeWidth={3} />
                      </button>
                    )}
                  </div>
                )}
                {(isOwner || canManage) && !member.user_id && (
                  <span className="text-[11px] text-muted italic flex-shrink-0">Menunggu login</span>
                )}
              </div>
            </div>
          ))}
          {members.length === 0 && (
            <div className="text-center py-12 sm:py-20 px-4 bg-white border-4 border-slate-900 rounded-[32px] shadow-[8px_8px_0_0_#0f172a]">
              <div className="w-20 h-20 mx-auto mb-6 rounded-3xl bg-amber-300 border-4 border-slate-900 flex items-center justify-center shadow-[inset_-4px_-4px_0_0_rgba(15,23,42,0.2)]">
                <UserCog className="w-10 h-10 text-slate-900" strokeWidth={3} />
              </div>
              <p className="text-xl sm:text-2xl font-black text-slate-900 uppercase tracking-tight mb-2">
                Belum ada anggota tim
              </p>
              <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">
                Siswa yang tergabung akan muncul di sini
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
