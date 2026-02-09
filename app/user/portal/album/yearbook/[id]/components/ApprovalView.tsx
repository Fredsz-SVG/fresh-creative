'use client'

import { ClipboardList, Check, X } from 'lucide-react'

type ClassRequest = { id: string; student_name: string; email?: string | null; status: string }
type AlbumClass = { id: string; name: string; sort_order?: number; student_count?: number }

interface ApprovalViewProps {
  requestsByClass: Record<string, ClassRequest[]>
  classes: AlbumClass[]
  handleApproveReject: (classId: string, requestId: string, newStatus: string) => void
}

export default function ApprovalView({
  requestsByClass,
  classes,
  handleApproveReject,
}: ApprovalViewProps) {
  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="mb-6 text-center">
        <h2 className="text-2xl font-bold text-app mb-2">Approval Requests</h2>
        <p className="text-sm text-muted">Kelola permintaan akses siswa ke group</p>
      </div>
      {Object.entries(requestsByClass).map(([classId, requests]) => {
        const classObj = classes.find(c => c.id === classId)
        if (!classObj || (requests as ClassRequest[]).length === 0) return null
        return (
          <div key={classId} className="mb-6">
            <h3 className="text-lg font-semibold text-app mb-3 px-2">{classObj.name}</h3>
            <div className="flex flex-col gap-3">
              {(requests as ClassRequest[]).map(request => (
                <div key={request.id} className="p-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex-1">
                      <p className="text-app font-medium">{request.student_name}</p>
                      {request.email && <p className="text-xs text-muted mt-1">{request.email}</p>}
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => handleApproveReject(classId, request.id, 'approved')}
                        className="px-4 py-2 rounded-lg bg-green-600/80 text-white hover:bg-green-600 text-sm font-medium transition-colors"
                      >
                        <Check className="w-4 h-4 inline mr-1" /> Setujui
                      </button>
                      <button
                        type="button"
                        onClick={() => handleApproveReject(classId, request.id, 'rejected')}
                        className="px-4 py-2 rounded-lg bg-red-600/80 text-white hover:bg-red-600 text-sm font-medium transition-colors"
                      >
                        <X className="w-4 h-4 inline mr-1" /> Tolak
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      })}
      {Object.values(requestsByClass).flat().length === 0 && (
        <div className="text-center py-12 border-2 border-dashed border-white/10 rounded-xl">
          <ClipboardList className="w-16 h-16 mx-auto mb-4 text-gray-600" />
          <p className="text-app font-medium mb-1">Tidak ada request</p>
          <p className="text-sm text-muted">Semua permintaan sudah diproses</p>
        </div>
      )}
    </div>
  )
}
