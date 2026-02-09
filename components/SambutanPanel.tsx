'use client'

import React, { useState } from 'react'
import { MessageSquare, Plus, Edit3, Check, X, Trash2, Upload, ImagePlus } from 'lucide-react'

type Teacher = {
  id: string
  name: string
  title?: string
  message?: string
  photo_url?: string
  sort_order?: number
}

type SambutanPanelProps = {
  teachers: Teacher[]
  onAddTeacher: (name: string, title: string) => Promise<void>
  onUpdateTeacher: (id: string, updates: { name?: string; title?: string; message?: string }) => Promise<void>
  onDeleteTeacher: (id: string, name: string) => void
  onUploadPhoto: (id: string, file: File) => Promise<void>
  onDeletePhoto: (id: string) => Promise<void>
  isOwner: boolean
}

export default function SambutanPanel({
  teachers,
  onAddTeacher,
  onUpdateTeacher,
  onDeleteTeacher,
  onUploadPhoto,
  onDeletePhoto,
  isOwner
}: SambutanPanelProps) {
  const [addingTeacher, setAddingTeacher] = useState(false)
  const [newName, setNewName] = useState('')
  const [newTitle, setNewTitle] = useState('')
  const [editingTeacherId, setEditingTeacherId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editTitle, setEditTitle] = useState('')

  const handleAdd = async () => {
    if (!newName.trim()) return
    try {
      await onAddTeacher(newName.trim(), newTitle.trim())
      setNewName('')
      setNewTitle('')
      setAddingTeacher(false)
    } catch (error) {
      console.error('Error adding teacher:', error)
    }
  }

  const handleStartEdit = (teacher: Teacher) => {
    setEditingTeacherId(teacher.id)
    setEditName(teacher.name)
    setEditTitle(teacher.title || '')
  }

  const handleSaveEdit = async (teacherId: string) => {
    try {
      await onUpdateTeacher(teacherId, { name: editName.trim(), title: editTitle.trim() })
      setEditingTeacherId(null)
    } catch (error) {
      console.error('Error updating teacher:', error)
    }
  }

  const handleCancelEdit = () => {
    setEditingTeacherId(null)
    setEditName('')
    setEditTitle('')
  }

  const handlePhotoChange = async (teacherId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      await onUploadPhoto(teacherId, file)
    } catch (error) {
      console.error('Error uploading photo:', error)
    }
    e.target.value = ''
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-shrink-0 px-3 py-3 border-b border-white/10">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-lime-400" />
            <h3 className="text-sm font-bold text-app">Sambutan Guru</h3>
          </div>
          {isOwner && !addingTeacher && (
            <button
              onClick={() => setAddingTeacher(true)}
              className="p-1.5 rounded-lg bg-lime-600/20 text-lime-400 hover:bg-lime-600/30 transition-colors"
              title="Tambah Guru"
            >
              <Plus className="w-4 h-4" />
            </button>
          )}
        </div>
        <p className="text-[10px] text-muted leading-relaxed">
          Daftar guru yang akan tampil di halaman sambutan
        </p>
      </div>

      {/* Scrollable List */}
      <div className="flex-1 overflow-y-auto px-3 py-2">
        {/* Add Teacher Form */}
        {addingTeacher && (
          <div className="mb-3 p-3 rounded-lg bg-white/5 border border-white/10">
            <p className="text-xs font-medium text-app mb-2">Tambah Guru Baru</p>
            <div className="flex flex-col gap-2">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Nama guru"
                className="px-2 py-1.5 rounded-lg bg-white/5 border border-white/10 text-app text-xs"
                autoFocus
              />
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Jabatan (opsional)"
                className="px-2 py-1.5 rounded-lg bg-white/5 border border-white/10 text-app text-xs"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleAdd}
                  disabled={!newName.trim()}
                  className="flex-1 px-3 py-1.5 rounded-lg bg-lime-600 text-white text-xs font-medium hover:bg-lime-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Check className="w-3 h-3 inline mr-1" />
                  Tambah
                </button>
                <button
                  onClick={() => {
                    setAddingTeacher(false)
                    setNewName('')
                    setNewTitle('')
                  }}
                  className="px-3 py-1.5 rounded-lg border border-white/10 text-gray-400 text-xs hover:text-white hover:bg-white/5 transition-colors"
                >
                  <X className="w-3 h-3 inline mr-1" />
                  Batal
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Teachers List */}
        <div className="flex flex-col gap-2">
          {teachers.map((teacher) => {
            const isEditing = editingTeacherId === teacher.id

            return (
              <div
                key={teacher.id}
                className="p-2.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
              >
                {isEditing ? (
                  /* Edit Mode */
                  <div className="flex flex-col gap-2">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder="Nama guru"
                      className="px-2 py-1.5 rounded-lg bg-white/5 border border-white/10 text-app text-xs"
                    />
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      placeholder="Jabatan"
                      className="px-2 py-1.5 rounded-lg bg-white/5 border border-white/10 text-app text-xs"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSaveEdit(teacher.id)}
                        className="flex-1 px-2 py-1.5 rounded-lg bg-lime-600 text-white text-xs font-medium hover:bg-lime-500 transition-colors"
                      >
                        <Check className="w-3 h-3 inline mr-1" />
                        Simpan
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="px-2 py-1.5 rounded-lg border border-white/10 text-gray-400 text-xs hover:text-white hover:bg-white/5 transition-colors"
                      >
                        <X className="w-3 h-3 inline mr-1" />
                        Batal
                      </button>
                    </div>
                  </div>
                ) : (
                  /* View Mode */
                  <div className="flex gap-2">
                    {/* Photo */}
                    <div className="flex-shrink-0 relative w-12 h-15 bg-white/5 rounded overflow-hidden">
                      {teacher.photo_url ? (
                        <img
                          src={teacher.photo_url}
                          alt={teacher.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-600">
                          <MessageSquare className="w-5 h-5" />
                        </div>
                      )}
                      {isOwner && (
                        <label className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition-opacity cursor-pointer flex items-center justify-center">
                          <ImagePlus className="w-4 h-4 text-white" />
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => handlePhotoChange(teacher.id, e)}
                          />
                        </label>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-app truncate">{teacher.name}</p>
                      {teacher.title && (
                        <p className="text-[10px] text-muted truncate">{teacher.title}</p>
                      )}
                      {isOwner && (
                        <div className="flex gap-1 mt-1.5">
                          <button
                            onClick={() => handleStartEdit(teacher)}
                            className="px-2 py-1 rounded text-[10px] bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-colors"
                            title="Edit"
                          >
                            <Edit3 className="w-3 h-3" />
                          </button>
                          {teacher.photo_url && (
                            <button
                              onClick={() => onDeletePhoto(teacher.id)}
                              className="px-2 py-1 rounded text-[10px] bg-orange-500/20 text-orange-400 hover:bg-orange-500/30 transition-colors"
                              title="Hapus Foto"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                          <button
                            onClick={() => onDeleteTeacher(teacher.id, teacher.name)}
                            className="px-2 py-1 rounded text-[10px] bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
                            title="Hapus Guru"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Empty State */}
        {teachers.length === 0 && !addingTeacher && (
          <div className="text-center py-8 border-2 border-dashed border-white/10 rounded-xl">
            <MessageSquare className="w-12 h-12 mx-auto mb-3 text-gray-600" />
            <p className="text-xs font-medium text-app mb-1">Belum ada guru</p>
            <p className="text-[10px] text-muted px-4 leading-relaxed">
              Klik tombol + di atas untuk menambahkan guru
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
