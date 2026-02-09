'use client'

import { Shield, Trash2 } from 'lucide-react'

type TeamMember = { 
  user_id: string
  email: string
  name?: string
  role: string
}

interface TeamViewProps {
  members: TeamMember[]
  isOwner: boolean
  canManage: boolean
  handleUpdateRole: (userId: string, newRole: string) => void
  handleRemoveMember: (userId: string) => void
}

export default function TeamView({
  members,
  isOwner,
  canManage,
  handleUpdateRole,
  handleRemoveMember,
}: TeamViewProps) {
  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="mb-6 text-center">
        <h2 className="text-2xl font-bold text-app mb-2">Manajemen Tim ({members.length} orang)</h2>
        <p className="text-sm text-muted">Kelola admin dan akses anggota album</p>
      </div>
      <div className="flex flex-col gap-3">
        {members.map((member, idx) => (
          <div key={member.user_id || `member-${idx}`} className="p-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex-1">
                <p className="text-app font-medium">{member.name || member.email}</p>
                {member.name && <p className="text-xs text-muted mt-1">{member.email}</p>}
                <div className="flex gap-2 mt-2 flex-wrap">
                  {member.role === 'owner' && <span className="text-xs px-2 py-1 rounded bg-purple-500/20 text-purple-400 border border-purple-500/30">Owner</span>}
                  {member.role === 'admin' && <span className="text-xs px-2 py-1 rounded bg-lime-500/20 text-lime-400 border border-lime-500/30">Admin</span>}
                  {member.role === 'member' && <span className="text-xs px-2 py-1 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">Member</span>}
                  {member.role === 'student' && <span className="text-xs px-2 py-1 rounded bg-gray-500/20 text-gray-400 border border-gray-500/30">Member</span>}
                  {member.role === 'no-account' && <span className="text-xs px-2 py-1 rounded bg-orange-500/20 text-orange-400 border border-orange-500/30">Belum Login</span>}
                </div>
              </div>
              {(isOwner || canManage) && member.user_id && member.role !== 'owner' && (
                <div className="flex gap-2 flex-shrink-0">
                  {isOwner && (
                    <>
                      {member.role !== 'admin' ? (
                        <button
                          onClick={() => handleUpdateRole(member.user_id, 'admin')}
                          className="px-3 py-2 rounded-lg text-sm bg-lime-600/20 text-lime-400 hover:bg-lime-600 hover:text-white transition-colors border border-lime-500/20"
                        >
                          Jadikan Admin
                        </button>
                      ) : (
                        <button
                          onClick={() => handleUpdateRole(member.user_id, 'member')}
                          className="px-3 py-2 rounded-lg text-sm bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white transition-colors border border-white/10"
                        >
                          Hapus Admin
                        </button>
                      )}
                    </>
                  )}
                  {canManage && (
                    <button
                      onClick={() => handleRemoveMember(member.user_id)}
                      className="p-2 rounded-lg text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-colors"
                      title="Hapus akses sepenuhnya"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                </div>
              )}
              {(isOwner || canManage) && !member.user_id && (
                <div className="text-sm text-muted italic">
                  Menunggu login
                </div>
              )}
            </div>
          </div>
        ))}
        {members.length === 0 && (
          <div className="text-center py-12 border-2 border-dashed border-white/10 rounded-xl">
            <Shield className="w-16 h-16 mx-auto mb-4 text-gray-600" />
            <p className="text-app font-medium mb-1">Belum ada anggota</p>
            <p className="text-sm text-muted">Siswa yang bergabung ke group akan muncul di sini</p>
          </div>
        )}
      </div>
    </div>
  )
}
