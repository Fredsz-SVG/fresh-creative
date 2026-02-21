'use client'

import React from 'react'
import { Plus } from 'lucide-react'

interface ClassesEmptyViewProps {
  canManage: boolean
  addingClass: boolean
  setAddingClass: (v: boolean) => void
  newClassName: string
  setNewClassName: (v: string) => void
  onAddClass: () => void
}

export default function ClassesEmptyView({
  canManage,
  addingClass,
  setAddingClass,
  newClassName,
  setNewClassName,
  onAddClass,
}: ClassesEmptyViewProps) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-[50vh] px-4 py-8">
      <div className="flex flex-col items-center justify-center text-center border-2 border-dashed border-white/10 rounded-xl py-16 px-8 max-w-md w-full">
        <p className="text-app font-medium text-lg mb-3">Belum ada kelas</p>
        {canManage && (
          <>
            <p className="text-sm text-gray-400 leading-relaxed lg:hidden mb-4">
              Buka icon menu → + Nama kelas
            </p>
            <p className="text-sm text-gray-400 leading-relaxed hidden lg:block mb-4">
              Gunakan tombol + Nama kelas di daftar kiri
            </p>
            {!addingClass ? (
              <button
                type="button"
                onClick={() => setAddingClass(true)}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-lime-600 text-white text-sm font-medium hover:bg-lime-500 active:scale-95 transition-all"
              >
                <Plus className="w-4 h-4" /> Nama kelas
              </button>
            ) : (
              <div className="w-full max-w-xs flex flex-col gap-2 text-left">
                <input
                  type="text"
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)}
                  placeholder="Nama kelas"
                  className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-app text-sm placeholder:text-gray-500 w-full"
                  autoFocus
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={onAddClass}
                    className="flex-1 px-4 py-2 rounded-lg bg-lime-600 text-white text-sm font-medium hover:bg-lime-500"
                  >
                    Tambah
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAddingClass(false)
                      setNewClassName('')
                    }}
                    className="flex-1 px-4 py-2 rounded-lg border border-white/10 text-gray-400 hover:text-white text-sm"
                  >
                    Batal
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
