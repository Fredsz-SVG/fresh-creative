'use client'

import { Users, Clock, Plus, Check, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Edit3, Trash2 } from 'lucide-react'

type AlbumClass = { id: string; name: string; sort_order?: number; student_count?: number }
type ClassRequest = { id: string; student_name: string; email?: string | null; status: string }

function InlineClassEditor(p: any) {
  const classObj = p.classObj as AlbumClass
  const isOwner = p.isOwner as boolean
  const onDelete = p.onDelete
  const onUpdate = p.onUpdate
  const classIndex = p.classIndex as number
  const classesCount = p.classesCount as number
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(classObj?.name ?? '')
  const [order, setOrder] = useState<number>(typeof classIndex === 'number' ? classIndex : (classObj?.sort_order ?? 0))
  const nameRef = useRef<HTMLInputElement | null>(null)
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    setName(classObj?.name ?? '')
    setOrder(typeof classIndex === 'number' ? classIndex : (classObj?.sort_order ?? 0))
  }, [classObj, classIndex])

  useEffect(() => {
    if (editing && nameRef.current) nameRef.current.focus()
  }, [editing])

  const saveChanges = (nameVal: string, orderVal: number) => {
    if (!onUpdate) return
    onUpdate(classObj.id, { name: nameVal.trim(), sort_order: Number(orderVal) }).catch((e: any) => {
      console.error('Error saving class:', e)
    })
  }

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value
    setName(newName)

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    saveTimeoutRef.current = setTimeout(() => {
      if (newName.trim() && newName.trim() !== classObj.name) {
        saveChanges(newName, order)
      }
    }, 1000)
  }

  const handleOrderChange = (newOrder: number) => {
    setOrder(newOrder)
    saveChanges(name, newOrder)
  }

  const handleSaveName = () => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    saveChanges(name, order)
    setEditing(false)
  }

  const handleCancel = () => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    setEditing(false)
    setName(classObj.name)
    setOrder(classObj.sort_order ?? 0)
  }

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    }
  }, [])

  return (
    <div className={`flex items-center gap-1.5 w-full ${p.center ? 'justify-center' : ''}`}>
      {!editing ? (
        <>
          <h2 className={`text-sm lg:text-base font-semibold text-app flex-1 break-words truncate ${p.center ? 'text-center' : 'text-left'}`}>{classObj.name}</h2>
          {isOwner && (
            <>
              <button onClick={() => setEditing(true)} className="w-7 h-7 lg:w-8 lg:h-8 flex items-center justify-center rounded-md hover:bg-white/5 flex-shrink-0" title="Edit group">
                <Edit3 className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
              </button>
              <button
                onClick={() => onDelete && onDelete(classObj.id, classObj.name)}
                className="w-7 h-7 lg:w-8 lg:h-8 flex items-center justify-center rounded-md hover:bg-red-500/10 text-red-400 flex-shrink-0"
                title="Hapus group"
              >
                <Trash2 className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
              </button>
            </>
          )}
        </>
      ) : (
        <div className="flex items-center gap-2 w-full">
          <input
            ref={nameRef}
            type="text"
            value={name}
            onChange={handleNameChange}
            className="flex-1 px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-app text-sm"
          />
          <button onClick={handleSaveName} className="w-7 h-7 flex items-center justify-center rounded-md bg-lime-600 text-white hover:bg-lime-500 flex-shrink-0">
            <Check className="w-4 h-4" />
          </button>
          <button onClick={handleCancel} className="w-7 h-7 flex items-center justify-center rounded-md border border-white/10 text-gray-400 hover:text-white flex-shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  )
}

interface GroupPanelProps {
  currentClass: AlbumClass | null
  classes: AlbumClass[]
  canManage: boolean
  classIndex: number
  setClassIndex: (idx: number) => void
  handleDeleteClass: (classId: string) => void
  handleUpdateClass: (classId: string, updates: any) => void
  myAccessByClass: Record<string, any>
  myRequestByClass: Record<string, ClassRequest>
  membersByClass: Record<string, any[]>
  addingClass: boolean
  setAddingClass: (val: boolean) => void
  newClassName: string
  setNewClassName: (val: string) => void
  handleAddClass: () => void
  requestForm: { student_name: string; email: string }
  setRequestForm: (form: { student_name: string; email: string }) => void
  handleRequestAccess: (classId: string) => void
  isOwner: boolean
  accessDataLoaded: boolean
  isCoverView: boolean
  setView: (view: string) => void
}

export default function GroupPanel({
  currentClass,
  classes,
  canManage,
  classIndex,
  setClassIndex,
  handleDeleteClass,
  handleUpdateClass,
  myAccessByClass,
  myRequestByClass,
  membersByClass,
  addingClass,
  setAddingClass,
  newClassName,
  setNewClassName,
  handleAddClass,
  requestForm,
  setRequestForm,
  handleRequestAccess,
  isOwner,
  accessDataLoaded,
  isCoverView,
  setView,
}: GroupPanelProps) {
  return (
    <div className="hidden lg:fixed lg:left-16 lg:top-20 lg:w-64 lg:h-[calc(100vh-80px)] lg:flex flex-col lg:z-35 lg:bg-black/30 lg:backdrop-blur-sm lg:border-r lg:border-white/10">
      {/* Header Fixed - Group Name + Edit */}
      {currentClass && (
        <div className="flex-shrink-0 px-3 py-3 border-b border-white/10">
          <InlineClassEditor 
            classObj={currentClass} 
            isOwner={canManage} 
            onDelete={handleDeleteClass} 
            onUpdate={handleUpdateClass} 
            classIndex={classIndex} 
            classesCount={classes.length} 
          />
        </div>
      )}

      {/* Form Fixed - Daftarkan Nama */}
      {currentClass && (
        <div className="flex-shrink-0 px-3 py-3 border-b border-white/10">
          {(() => {
            const access = myAccessByClass[currentClass.id]
            const request = myRequestByClass[currentClass.id] as ClassRequest | null | undefined
            const isPendingRequest = request?.status === 'pending'
            const isRejectedRequest = request?.status === 'rejected'
            const isLoadingThisClass = !accessDataLoaded && !access && !request

            // Show compact loading hanya untuk class ini
            if (isLoadingThisClass) {
              return (
                <div className="flex items-center gap-2 text-xs text-muted">
                  <div className="animate-spin rounded-full h-3 w-3 border border-lime-500 border-t-transparent" />
                  <span>Memuat...</span>
                </div>
              )
            }

            if (isOwner) {
              if (isPendingRequest || (access && access.status === 'approved')) return null
              return (
                <>
                  <p className="text-muted text-xs mb-2">
                    Daftarkan nama Anda di group ini agar bisa upload foto.
                  </p>
                  <div className="flex flex-col gap-1.5">
                    <input type="text" value={requestForm.student_name} onChange={(e) => setRequestForm({ ...requestForm, student_name: e.target.value })} placeholder="Nama Anda" className="px-2 py-1.5 rounded-lg bg-white/5 border border-white/10 text-app text-xs" />
                    <input type="email" value={requestForm.email} onChange={(e) => setRequestForm({ ...requestForm, email: e.target.value })} placeholder="Email" className="px-2 py-1.5 rounded-lg bg-white/5 border border-white/10 text-app text-xs" />
                    <button type="button" onClick={() => handleRequestAccess(currentClass.id)} disabled={!requestForm.student_name.trim()} className="px-2 py-1.5 rounded-lg bg-lime-600 text-white text-xs font-medium hover:bg-lime-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors touch-manipulation">
                      {requestForm.student_name.trim() ? 'Daftarkan nama' : 'Isi nama terlebih dahulu'}
                    </button>
                  </div>
                </>
              )
            }

            if (isPendingRequest && request) {
              return (
                <>
                  <p className="text-xs text-muted mb-1">Status Pendaftaran:</p>
                  <p className="text-amber-400 text-xs flex items-center gap-1"><Clock className="w-3.5 h-3.5 flex-shrink-0" /> {request.student_name} - menunggu persetujuan</p>
                </>
              )
            }

            if (isRejectedRequest) {
              return (
                <>
                  <p className="text-xs text-muted mb-1">Status Pendaftaran:</p>
                  <p className="text-red-400 text-xs mb-2">Akses ditolak. Anda dapat ajukan ulang.</p>
                  <div className="flex flex-col gap-1.5">
                    <input type="text" value={requestForm.student_name} onChange={(e) => setRequestForm({ ...requestForm, student_name: e.target.value })} placeholder="Nama lengkap" className="px-2 py-1.5 rounded-lg bg-white/5 border border-white/10 text-app text-xs" />
                    <input type="email" value={requestForm.email} onChange={(e) => setRequestForm({ ...requestForm, email: e.target.value })} placeholder="Email" className="px-2 py-1.5 rounded-lg bg-white/5 border border-white/10 text-app text-xs" />
                    <button type="button" onClick={() => handleRequestAccess(currentClass.id)} disabled={!requestForm.student_name.trim()} className="px-2 py-1.5 rounded-lg bg-lime-600 text-white text-xs font-medium hover:bg-lime-500 disabled:opacity-50 transition-colors">
                      Ajukan ulang
                    </button>
                  </div>
                </>
              )
            }

            if (!access) {
              return (
                <>
                  <p className="text-muted text-xs mb-2">
                    Untuk upload foto, isi nama dan email lalu ajukan akses.
                  </p>
                  <div className="flex flex-col gap-1.5">
                    <input type="text" value={requestForm.student_name} onChange={(e) => setRequestForm({ ...requestForm, student_name: e.target.value })} placeholder="Nama lengkap" className="px-2 py-1.5 rounded-lg bg-white/5 border border-white/10 text-app text-xs" />
                    <input type="email" value={requestForm.email} onChange={(e) => setRequestForm({ ...requestForm, email: e.target.value })} placeholder="Email" className="px-2 py-1.5 rounded-lg bg-white/5 border border-white/10 text-app text-xs" />
                    <button type="button" onClick={() => handleRequestAccess(currentClass.id)} disabled={!requestForm.student_name.trim()} className="px-2 py-1.5 rounded-lg bg-lime-600 text-white text-xs font-medium hover:bg-lime-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors touch-manipulation">
                      Ajukan akses
                    </button>
                  </div>
                </>
              )
            }

            if (access?.status === 'approved') {
              return (
                <>
                  <p className="text-xs text-muted mb-1">Status Pendaftaran:</p>
                  <p className="text-xs font-medium text-lime-400">✓ {access.student_name}</p>
                </>
              )
            }

          })()}
        </div>
      )}

      {/* Scrollable Group List */}
      <div className="flex-1 flex flex-col gap-2 px-3 py-2 overflow-y-auto" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        <style>{`div::-webkit-scrollbar { display: none; }`}</style>
        {classes.map((c, idx) => {
          const req = myRequestByClass[c.id] as ClassRequest | undefined
          const hasPendingRequest = req?.status === 'pending'
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => {
                setClassIndex(idx)
                if (isCoverView) setView('classes')
              }}
              className={`p-2 rounded-lg text-left text-sm transition-colors touch-manipulation ${idx === classIndex && !isCoverView
                ? 'bg-lime-600/20 border border-lime-500/50 text-lime-400'
                : 'border border-white/10 text-gray-400 hover:text-white hover:bg-white/5 active:bg-white/10'
                }`}
            >
              <p className="font-medium truncate">{c.name}</p>
              {hasPendingRequest ? (
                <p className="text-xs text-amber-400 flex items-center gap-1"><Clock className="w-3.5 h-3.5 flex-shrink-0" /> menunggu persetujuan</p>
              ) : (
                <p className="text-xs text-muted">{(membersByClass[c.id]?.length ?? 0)} orang</p>
              )}
            </button>
          )
        })}
      </div>

      {/* Add Group Button - Fixed at Bottom */}
      <div className="flex-shrink-0 px-3 py-2 border-t border-white/10">
        {canManage && (
          <div className="flex gap-2">
            {!addingClass ? (
              <button type="button" onClick={() => setAddingClass(true)} className="w-full px-3 py-2 rounded-lg border border-white/10 text-sm text-gray-400 hover:text-white hover:bg-white/5 active:bg-white/10 transition-colors touch-manipulation">
                <Plus className="w-4 h-4 inline mr-1" /> Group
              </button>
            ) : (
              <div className="flex flex-col gap-2 w-full">
                <input type="text" value={newClassName} onChange={(e) => setNewClassName(e.target.value)} placeholder="Nama group" className="px-2 py-1.5 rounded-lg bg-white/5 border border-white/10 text-sm text-app placeholder:text-gray-600" autoFocus />
                <div className="flex gap-2">
                  <button type="button" onClick={handleAddClass} className="flex-1 px-2 py-1.5 rounded-lg bg-lime-600 text-white text-sm font-medium hover:bg-lime-500 transition-colors touch-manipulation">Tambah</button>
                  <button type="button" onClick={() => { setAddingClass(false); setNewClassName('') }} className="flex-1 px-2 py-1.5 rounded-lg border border-white/10 text-sm text-gray-400 hover:text-white hover:bg-white/5 transition-colors touch-manipulation">Batal</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
