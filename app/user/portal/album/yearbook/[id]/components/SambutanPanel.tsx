'use client'

import { Plus, X, Edit3, Trash2, Check } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'

type Teacher = {
  id: string
  name: string
  title?: string
  message?: string
  photo_url?: string
  sort_order?: number
}

interface SambutanPanelProps {
  teachers: Teacher[]
  onAddTeacher: (name: string, title: string) => Promise<void>
  onUpdateTeacher: (teacherId: string, updates: { name?: string; title?: string; message?: string }) => Promise<void>
  onDeleteTeacher: (teacherId: string, teacherName: string) => void
  onUploadPhoto: (teacherId: string, file: File) => Promise<void>
  onDeletePhoto: (teacherId: string) => Promise<void>
  isOwner: boolean
}

export default function SambutanPanel({
  teachers,
  onAddTeacher,
  onUpdateTeacher,
  onDeleteTeacher,
  onUploadPhoto,
  onDeletePhoto,
  isOwner,
}: SambutanPanelProps) {
  const [addingTeacher, setAddingTeacher] = useState(false)
  const [newTeacherName, setNewTeacherName] = useState('')
  const [newTeacherTitle, setNewTeacherTitle] = useState('')
  const [editingTeacherId, setEditingTeacherId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editTitle, setEditTitle] = useState('')

  const handleAddTeacher = async () => {
    if (!newTeacherName.trim()) return
    await onAddTeacher(newTeacherName.trim(), newTeacherTitle.trim())
    setNewTeacherName('')
    setNewTeacherTitle('')
    setAddingTeacher(false)
  }

  const handleStartEdit = (teacher: Teacher) => {
    setEditingTeacherId(teacher.id)
    setEditName(teacher.name)
    setEditTitle(teacher.title || '')
  }

  const handleSaveEdit = async () => {
    if (!editingTeacherId || !editName.trim()) return
    await onUpdateTeacher(editingTeacherId, {
      name: editName.trim(),
      title: editTitle.trim() || undefined,
    })
    setEditingTeacherId(null)
  }

  const handleCancelEdit = () => {
    setEditingTeacherId(null)
    setEditName('')
    setEditTitle('')
  }

  return (
    <div className="hidden lg:fixed lg:left-16 lg:top-12 lg:w-64 lg:h-[calc(100vh-48px)] lg:flex flex-col lg:z-35 lg:bg-black/30 lg:backdrop-blur-sm lg:border-r lg:border-white/10">
      {/* Header */}
      <div className="flex-shrink-0 px-3 py-3 border-b border-white/10">
        <h3 className="text-sm font-semibold text-app">Sambutan Guru</h3>
        <p className="text-[10px] text-muted/70 mt-0.5">Daftar guru yang memberikan sambutan</p>
      </div>

      {/* List Guru - Scrollable */}
      <div className="flex-1 overflow-y-auto">
        {teachers.length === 0 ? (
          <div className="p-4 text-center text-muted text-xs">
            <p>Belum ada guru terdaftar.</p>
            <p className="mt-1">Klik tombol + untuk menambah.</p>
          </div>
        ) : (
          <div className="p-2 space-y-2">
            {teachers.map((teacher) => (
              <div
                key={teacher.id}
                className="p-3 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
              >
                {editingTeacherId === teacher.id ? (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder="Nama guru"
                      className="w-full px-2 py-1.5 rounded-lg bg-white/5 border border-white/10 text-app text-xs"
                    />
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      placeholder="Jabatan (opsional)"
                      className="w-full px-2 py-1.5 rounded-lg bg-white/5 border border-white/10 text-app text-xs"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={handleSaveEdit}
                        className="flex-1 px-2 py-1.5 rounded-lg bg-lime-600 text-white text-xs font-medium hover:bg-lime-500"
                      >
                        <Check className="w-3.5 h-3.5 mx-auto" />
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="flex-1 px-2 py-1.5 rounded-lg border border-white/10 text-gray-400 hover:text-white text-xs"
                      >
                        <X className="w-3.5 h-3.5 mx-auto" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-app truncate">{teacher.name}</p>
                        {teacher.title && (
                          <p className="text-[10px] text-muted/70 truncate">{teacher.title}</p>
                        )}
                      </div>
                      {isOwner && (
                        <div className="flex gap-1 flex-shrink-0">
                          <button
                            onClick={() => handleStartEdit(teacher)}
                            className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-white/5"
                            title="Edit"
                          >
                            <Edit3 className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => onDeleteTeacher(teacher.id, teacher.name)}
                            className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-red-500/10 text-red-400"
                            title="Hapus"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                    
                    {teacher.photo_url && (
                      <div className="relative w-full aspect-[4/5] rounded-lg overflow-hidden bg-white/5 mb-2">
                        <img
                          src={teacher.photo_url}
                          alt={teacher.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}

                    {isOwner && (
                      <div className="flex gap-1">
                        <label className="flex-1 px-2 py-1.5 rounded-lg bg-blue-500/10 text-blue-400 text-[10px] font-medium text-center cursor-pointer hover:bg-blue-500/20 transition-colors">
                          {teacher.photo_url ? 'Ubah Foto' : 'Upload Foto'}
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0]
                              if (file) onUploadPhoto(teacher.id, file)
                              e.target.value = ''
                            }}
                          />
                        </label>
                        {teacher.photo_url && (
                          <button
                            onClick={() => onDeletePhoto(teacher.id)}
                            className="flex-1 px-2 py-1.5 rounded-lg bg-red-500/10 text-red-400 text-[10px] font-medium hover:bg-red-500/20 transition-colors"
                          >
                            Hapus Foto
                          </button>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Teacher Form */}
      {isOwner && (
        <div className="flex-shrink-0 p-3 border-t border-white/10">
          {addingTeacher ? (
            <div className="space-y-2">
              <input
                type="text"
                value={newTeacherName}
                onChange={(e) => setNewTeacherName(e.target.value)}
                placeholder="Nama guru"
                className="w-full px-2 py-1.5 rounded-lg bg-white/5 border border-white/10 text-app text-xs"
              />
              <input
                type="text"
                value={newTeacherTitle}
                onChange={(e) => setNewTeacherTitle(e.target.value)}
                placeholder="Jabatan (opsional)"
                className="w-full px-2 py-1.5 rounded-lg bg-white/5 border border-white/10 text-app text-xs"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleAddTeacher}
                  disabled={!newTeacherName.trim()}
                  className="flex-1 px-2 py-1.5 rounded-lg bg-lime-600 text-white text-xs font-medium hover:bg-lime-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Tambah
                </button>
                <button
                  onClick={() => {
                    setAddingTeacher(false)
                    setNewTeacherName('')
                    setNewTeacherTitle('')
                  }}
                  className="flex-1 px-2 py-1.5 rounded-lg border border-white/10 text-gray-400 hover:text-white text-xs"
                >
                  Batal
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setAddingTeacher(true)}
              className="w-full px-3 py-2 rounded-lg bg-lime-600/20 text-lime-400 hover:bg-lime-600/30 text-xs font-medium border border-lime-500/20 transition-colors flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Tambah Guru
            </button>
          )}
        </div>
      )}
    </div>
  )
}
