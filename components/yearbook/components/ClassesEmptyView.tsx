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
      <div className="flex flex-col items-center justify-center text-center max-w-md w-full rounded-2xl border-2 border-slate-900 dark:border-slate-700 bg-white dark:bg-slate-900 px-8 py-14 shadow-[2px_2px_0_0_rgba(15,23,42,0.18)] dark:shadow-[2px_2px_0_0_rgba(51,65,85,0.55)]">
        <p className="text-slate-900 dark:text-white font-black text-lg mb-2 uppercase tracking-tight">Belum ada kelas</p>
        {canManage && (
          <>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed lg:hidden mb-5 font-bold">
              Buka icon menu → + Nama kelas
            </p>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed hidden lg:block mb-5 font-bold">
              Gunakan tombol + Nama kelas di daftar kiri
            </p>
            {!addingClass ? (
              <button
                type="button"
                onClick={() => setAddingClass(true)}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-300 text-slate-900 text-sm font-black hover:bg-amber-400 active:translate-x-0.5 active:translate-y-0.5 transition-all border-2 border-slate-900 dark:border-slate-700 shadow-[2px_2px_0_0_rgba(15,23,42,0.18)] dark:shadow-[2px_2px_0_0_rgba(51,65,85,0.55)]"
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
                  className="px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border-2 border-slate-900 dark:border-slate-700 text-slate-900 dark:text-white text-sm placeholder:text-slate-400 w-full shadow-[2px_2px_0_0_rgba(15,23,42,0.12)] dark:shadow-[2px_2px_0_0_rgba(51,65,85,0.5)] focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  autoFocus
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={onAddClass}
                    className="flex-1 px-4 py-2 rounded-xl bg-indigo-500 text-white text-sm font-black hover:bg-indigo-600 active:translate-x-0.5 active:translate-y-0.5 transition-all border-2 border-slate-900 dark:border-slate-700 shadow-[2px_2px_0_0_rgba(15,23,42,0.18)] dark:shadow-[2px_2px_0_0_rgba(51,65,85,0.55)]"
                  >
                    Tambah
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAddingClass(false)
                      setNewClassName('')
                    }}
                    className="flex-1 px-4 py-2 rounded-xl border-2 border-slate-900 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white bg-white dark:bg-slate-800 text-sm font-black active:translate-x-0.5 active:translate-y-0.5 transition-all shadow-[2px_2px_0_0_rgba(15,23,42,0.12)] dark:shadow-[2px_2px_0_0_rgba(51,65,85,0.5)]"
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
