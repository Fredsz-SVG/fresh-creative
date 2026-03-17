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
        <div className="fixed inset-0 bg-slate-900/40 dark:bg-black/50 backdrop-blur-md flex items-center justify-center z-[100] p-4">
          <div className="bg-white dark:bg-slate-900 border-2 border-slate-900 dark:border-slate-700 rounded-[32px] p-6 sm:p-8 max-w-sm w-full shadow-[6px_6px_0_0_#0f172a] dark:shadow-[6px_6px_0_0_#334155] text-center">
            <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2 uppercase tracking-tight">Konfirmasi Perubahan</h3>
            <p className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-6">
              {roleChangeConfirm.newRole === 'admin'
                ? `Jadikan "${roleChangeConfirm.memberName}" sebagai Admin?`
                : `Hapus "${roleChangeConfirm.memberName}" dari Admin?`}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setRoleChangeConfirm(null)}
                className="flex-1 py-3.5 rounded-xl bg-slate-100 dark:bg-slate-800 border-2 border-slate-900 dark:border-slate-600 text-slate-900 dark:text-white text-xs font-black uppercase tracking-widest shadow-[2px_2px_0_0_#0f172a] dark:shadow-[2px_2px_0_0_#334155] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all"
              >
                Tidak
              </button>
              <button
                onClick={handleConfirmRole}
                className="flex-1 py-3.5 rounded-xl bg-violet-500 text-white border-2 border-slate-900 dark:border-slate-600 text-xs font-black uppercase tracking-widest shadow-[2px_2px_0_0_#0f172a] dark:shadow-[2px_2px_0_0_#334155] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all"
              >
                Ya, Lanjutkan
              </button>
            </div>
          </div>
        </div>
      )}

      {removeConfirm && (
        <div className="fixed inset-0 bg-slate-900/40 dark:bg-black/50 backdrop-blur-md flex items-center justify-center z-[100] p-4">
          <div className="bg-white dark:bg-slate-900 border-2 border-slate-900 dark:border-slate-700 rounded-[32px] p-6 sm:p-8 max-w-sm w-full shadow-[6px_6px_0_0_#0f172a] dark:shadow-[6px_6px_0_0_#334155] text-center">
            <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2 uppercase tracking-tight">Hapus Anggota</h3>
            <p className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-6">
              Hapus akses &quot;<span className="text-slate-900 dark:text-slate-200 font-black">{removeConfirm.memberName}</span>&quot; dari album ini?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setRemoveConfirm(null)}
                className="flex-1 py-3.5 rounded-xl bg-slate-100 dark:bg-slate-800 border-2 border-slate-900 dark:border-slate-600 text-slate-900 dark:text-white text-xs font-black uppercase tracking-widest shadow-[2px_2px_0_0_#0f172a] dark:shadow-[2px_2px_0_0_#334155] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all"
              >
                Batal
              </button>
              <button
                onClick={handleConfirmRemove}
                className="flex-1 py-3.5 rounded-xl bg-red-500 text-white border-2 border-slate-900 dark:border-slate-700 text-xs font-black uppercase tracking-widest shadow-[2px_2px_0_0_#0f172a] dark:shadow-[2px_2px_0_0_#334155] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all"
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-5xl mx-auto px-2 py-2 sm:px-3 sm:py-4">
        <div className="mb-4 sm:mb-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-6">
          <div className="text-center sm:text-left">
            <h2 className="text-xl sm:text-4xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Tim Album</h2>
            <p className="text-[10px] sm:text-xs font-bold text-slate-400 dark:text-slate-500 mt-1 sm:mt-2 uppercase tracking-[0.2em]">{members.length} Orang Terdaftar</p>
          </div>
          <div className="relative w-full sm:w-80 group">
            <Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400 dark:text-slate-500 group-focus-within:text-indigo-500 dark:group-focus-within:text-indigo-400 transition-colors" strokeWidth={3} />
            <input
              type="text"
              placeholder="Cari anggota..."
              value={memberSearch}
              onChange={(e) => setMemberSearch(e.target.value)}
              className="w-full pl-10 sm:pl-12 pr-3 sm:pr-4 py-2.5 sm:py-4 text-xs sm:text-sm font-bold rounded-xl sm:rounded-2xl bg-white dark:bg-slate-800 border-2 sm:border-4 border-slate-900 dark:border-slate-600 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 shadow-[4px_4px_0_0_#0f172a] dark:shadow-[6px_6px_0_0_#334155] focus:shadow-none focus:translate-x-0.5 focus:translate-y-0.5 transition-all focus:outline-none"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          {filtered.map((member, idx) => (
            <div
              key={member.user_id || `member-${idx}`}
              className="group relative flex flex-col sm:flex-row sm:items-center rounded-xl sm:rounded-2xl bg-white dark:bg-slate-900 border-2 sm:border-4 border-slate-900 dark:border-slate-700 shadow-[4px_4px_0_0_#0f172a] dark:shadow-[6px_6px_0_0_#334155] p-3 sm:p-5 gap-3 sm:gap-4 hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 sm:hover:translate-x-1 sm:hover:translate-y-1 transition-all"
            >
              <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                <div
                  className="w-11 h-11 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl flex items-center justify-center text-lg sm:text-2xl font-black border-2 sm:border-4 border-slate-900 dark:border-slate-600 shrink-0 bg-emerald-300 dark:bg-emerald-600 text-slate-900 dark:text-white shadow-[inset_-2px_-2px_0_0_rgba(15,23,42,0.2)]"
                >
                  {(member.name || member.email || '?').charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0 flex flex-col gap-1 sm:gap-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm sm:text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight truncate">
                      {member.name || member.email}
                    </p>
                    {currentUserId && member.user_id === currentUserId && (
                      <span className="w-fit text-[10px] px-2 py-0.5 rounded-md bg-indigo-500 dark:bg-indigo-600 text-white font-black uppercase tracking-widest border-2 border-slate-900 dark:border-slate-600 shrink-0">
                        Anda
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      {member.role === 'owner' && (
                        <span className="w-fit text-[10px] px-2 py-0.5 rounded-md bg-amber-400 dark:bg-amber-500 text-slate-900 font-black uppercase tracking-widest border-2 border-slate-900 dark:border-slate-600 shrink-0">
                          Pemilik
                        </span>
                      )}
                      {member.role === 'admin' && (
                        <span className="w-fit text-[10px] px-2 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 font-black uppercase tracking-widest border-2 border-slate-900 dark:border-slate-600 shrink-0">
                          Admin
                        </span>
                      )}
                      {member.role === 'member' && (
                        <span className="w-fit text-[10px] px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-black uppercase tracking-widest border-2 border-slate-900 dark:border-slate-600 shrink-0">
                          Anggota
                        </span>
                      )}
                      {member.role === 'no-account' && (
                        <span className="w-fit text-[10px] px-2 py-0.5 rounded-md bg-rose-100 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 font-black uppercase tracking-widest border-2 border-slate-900 dark:border-slate-600 shrink-0">
                          Belum Login
                        </span>
                      )}
                    </div>
                    {member.name && (
                      <p className="text-xs font-bold text-slate-500 dark:text-slate-400">{member.email}</p>
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
                            className="px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg sm:rounded-xl text-[9px] sm:text-[10px] font-black uppercase bg-indigo-500 dark:bg-indigo-600 text-white border-2 border-slate-900 dark:border-slate-600 shadow-[2px_2px_0_0_#0f172a] dark:shadow-[3px_3px_0_0_#334155] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all"
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
                            className="px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg sm:rounded-xl text-[9px] sm:text-[10px] font-black uppercase bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-2 border-slate-900 dark:border-slate-600 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
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
                        className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-white dark:bg-slate-800 border-2 border-slate-900 dark:border-slate-600 text-red-500 dark:text-red-400 hover:bg-red-500 hover:text-white shadow-[2px_2px_0_0_#0f172a] dark:shadow-[3px_3px_0_0_#334155] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all flex items-center justify-center"
                        title="Hapus akses"
                      >
                        <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" strokeWidth={3} />
                      </button>
                    )}
                  </div>
                )}
                {(isOwner || canManage) && !member.user_id && (
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 italic flex-shrink-0">Menunggu login</span>
                )}
              </div>
            </div>
          ))}
          {members.length === 0 && (
            <div className="text-center py-8 sm:py-20 px-3 sm:px-4 bg-white dark:bg-slate-900 border-2 sm:border-4 border-slate-900 dark:border-slate-700 rounded-2xl sm:rounded-[32px] shadow-[6px_6px_0_0_#0f172a] dark:shadow-[8px_8px_0_0_#334155]">
              <div className="w-14 h-14 sm:w-20 sm:h-20 mx-auto mb-4 sm:mb-6 rounded-2xl sm:rounded-3xl bg-amber-300 dark:bg-amber-500 border-2 sm:border-4 border-slate-900 dark:border-slate-600 flex items-center justify-center shadow-[inset_-4px_-4px_0_0_rgba(15,23,42,0.2)]">
                <UserCog className="w-7 h-7 sm:w-10 sm:h-10 text-slate-900" strokeWidth={3} />
              </div>
              <p className="text-base sm:text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight mb-1.5 sm:mb-2">
                Belum ada anggota tim
              </p>
              <p className="text-[10px] sm:text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                Siswa yang tergabung akan muncul di sini
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
