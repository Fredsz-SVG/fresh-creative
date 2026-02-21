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
          <div className="bg-gray-900 border border-white/10 rounded-xl p-4 sm:p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-lg font-bold text-app mb-2">Konfirmasi Perubahan</h3>
            <p className="text-sm text-muted mb-4">
              {roleChangeConfirm.newRole === 'admin'
                ? `Jadikan "${roleChangeConfirm.memberName}" sebagai Admin?`
                : `Hapus "${roleChangeConfirm.memberName}" dari Admin?`}
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setRoleChangeConfirm(null)}
                className="px-4 py-2 rounded-lg bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white transition-colors text-sm font-medium"
              >
                Tidak
              </button>
              <button
                onClick={handleConfirmRole}
                className="px-4 py-2 rounded-lg bg-lime-600 text-white hover:bg-lime-500 transition-colors text-sm font-medium"
              >
                Ya, Lanjutkan
              </button>
            </div>
          </div>
        </div>
      )}

      {removeConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-gray-900 border border-red-500/20 rounded-xl p-4 sm:p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-lg font-bold text-red-400 mb-2">Hapus Anggota</h3>
            <p className="text-sm text-muted mb-4">
              Hapus akses &quot;<span className="text-white font-medium">{removeConfirm.memberName}</span>&quot; dari album ini?
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setRemoveConfirm(null)}
                className="px-4 py-2 rounded-lg bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white transition-colors text-sm font-medium"
              >
                Batal
              </button>
              <button
                onClick={handleConfirmRemove}
                className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-500 transition-colors text-sm font-medium"
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-5xl mx-auto px-3 py-3 sm:px-3 sm:py-4">
        <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="text-center sm:text-left max-sm:hidden lg:hidden">
            <h2 className="text-lg sm:text-xl font-bold text-app">Kelola anggota</h2>
            <p className="text-xs text-muted mt-1">{members.length} orang • Kelola akses dan peran</p>
          </div>
          <div className="relative sm:w-64">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              type="text"
              placeholder="Cari..."
              value={memberSearch}
              onChange={(e) => setMemberSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-sm rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-lime-500 transition-colors"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          {filtered.map((member, idx) => (
            <div
              key={member.user_id || `member-${idx}`}
              className="p-2.5 sm:p-3 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition-colors"
            >
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-app truncate">{member.name || member.email}</p>
                    {currentUserId && member.user_id === currentUserId && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-lime-600/20 text-lime-400 font-semibold flex-shrink-0">
                        Anda
                      </span>
                    )}
                    {member.role === 'owner' && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400 border border-purple-500/30 flex-shrink-0">
                        Pemilik
                      </span>
                    )}
                    {member.role === 'admin' && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-lime-500/20 text-lime-400 border border-lime-500/30 flex-shrink-0">
                        Admin
                      </span>
                    )}
                    {member.role === 'member' && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30 flex-shrink-0">
                        Anggota
                      </span>
                    )}
                    {member.role === 'student' && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-500/20 text-gray-400 border border-gray-500/30 flex-shrink-0">
                        Anggota
                      </span>
                    )}
                    {member.role === 'no-account' && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-400 border border-orange-500/30 flex-shrink-0">
                        Belum Login
                      </span>
                    )}
                  </div>
                  {member.name && <p className="text-[11px] text-muted mt-0.5 truncate">{member.email}</p>}
                </div>
                {(isOwner || canManage) && member.user_id && member.role !== 'owner' && (
                  <div className="flex gap-1.5 flex-shrink-0">
                    {(isOwner || isGlobalAdmin) && (
                      <>
                        {member.role !== 'admin' ? (
                          <button
                            onClick={() =>
                              setRoleChangeConfirm({
                                userId: member.user_id,
                                newRole: 'admin',
                                memberName: member.name || member.email,
                              })
                            }
                            className="px-2 py-1 rounded text-[11px] bg-lime-600/20 text-lime-400 hover:bg-lime-600 hover:text-white transition-colors border border-lime-500/20 whitespace-nowrap"
                            title="Jadikan Admin"
                          >
                            ↑ Admin
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
                            className="px-2 py-1 rounded text-[11px] bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white transition-colors border border-white/10 whitespace-nowrap"
                            title="Hapus Admin"
                          >
                            ↓ Anggota
                          </button>
                        )}
                      </>
                    )}
                    {canManage && (
                      <button
                        onClick={() =>
                          setRemoveConfirm({ userId: member.user_id, memberName: member.name || member.email })}
                        className="p-1.5 rounded text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-colors"
                        title="Hapus akses"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
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
            <div className="text-center py-12 border-2 border-dashed border-white/10 rounded-xl">
              <UserCog className="w-16 h-16 mx-auto mb-4 text-gray-600" />
              <p className="text-app font-medium mb-1">Belum ada anggota</p>
              <p className="text-sm text-muted">Siswa yang bergabung ke group akan muncul di sini</p>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
