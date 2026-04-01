'use client'

import React, { useEffect, useRef, useState } from 'react'
import { Check, Edit3, Minus, Plus, Trash2 } from 'lucide-react'

type AlbumClass = {
  id: string
  name: string
  sort_order?: number
}

type InlineClassEditorProps = {
  classObj: AlbumClass
  isOwner: boolean
  onDelete?: (classId: string, className: string) => void
  onUpdate?: (classId: string, updates: { name: string; sort_order: number }) => Promise<void>
  classIndex: number
  classesCount: number
  center?: boolean
  mainHeader?: boolean
}

export default function InlineClassEditor(p: InlineClassEditorProps) {
  const classObj = p.classObj
  const isOwner = p.isOwner
  const onDelete = p.onDelete
  const onUpdate = p.onUpdate
  const classIndex = p.classIndex
  const classesCount = p.classesCount
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(classObj?.name ?? '')
  const [order, setOrder] = useState<number>(typeof classIndex === 'number' ? classIndex : (classObj?.sort_order ?? 0))
  const nameRef = useRef<HTMLInputElement | null>(null)
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setName(classObj?.name ?? '')
    setOrder(typeof classIndex === 'number' ? classIndex : (classObj?.sort_order ?? 0))
  }, [classObj, classIndex])

  useEffect(() => {
    if (editing && nameRef.current) nameRef.current.focus()
  }, [editing])

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    }
  }, [])

  const saveChanges = (nameVal: string, orderVal: number) => {
    if (!onUpdate) return
    onUpdate(classObj.id, { name: nameVal.trim(), sort_order: Number(orderVal) }).catch((e: unknown) => {
      console.error('Error saving class:', e)
    })
  }

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value)
  }

  const handleOrderChange = (newOrder: number, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }
    setOrder(newOrder)
    saveChanges(name, newOrder)
  }

  const handleSaveName = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    if (!name.trim()) {
      alert('Nama kelas tidak boleh kosong')
      return
    }
    saveChanges(name, order)
    setEditing(false)
  }

  const handleCancel = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    setEditing(false)
    setName(classObj.name)
    setOrder(classObj.sort_order ?? 0)
  }

  return (
    <div className={`w-full ${p.center ? 'flex justify-center' : ''}`}>
      {!editing ? (
        <div className={`w-full p-4 bg-white dark:bg-slate-900 border-2 border-slate-900 dark:border-slate-700 rounded-2xl shadow-[2px_2px_0_0_#0f172a] dark:shadow-[2px_2px_0_0_#334155] ${p.center ? 'flex justify-center' : ''}`}>
          <div className={`flex items-center gap-3 w-full ${p.center ? 'justify-center border-b-4 border-slate-900/5 dark:border-slate-600/30 pb-2' : ''}`}>
            <h2 className={`${p.mainHeader ? 'text-4xl lg:text-5xl' : 'text-sm lg:text-base'} font-black text-slate-900 dark:text-white flex-1 break-words uppercase tracking-tight ${p.center ? 'text-center' : 'text-left'}`}>{classObj.name}</h2>
            {isOwner && (
              <div className="flex gap-2 flex-shrink-0">
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setEditing(true)
                  }}
                  className={`${p.mainHeader ? 'w-10 h-10 lg:w-12 lg:h-12 rounded-xl lg:rounded-2xl' : 'w-8 h-8 lg:w-9 lg:h-9 rounded-xl'} flex items-center justify-center bg-white dark:bg-slate-800 border-2 border-slate-900 dark:border-slate-600 text-slate-900 dark:text-white hover:bg-amber-300 dark:hover:bg-slate-700 hover:shadow-[3px_3px_0_0_#0f172a] dark:hover:shadow-[3px_3px_0_0_#334155] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all`}
                  title="Edit kelas"
                >
                  <Edit3 className={p.mainHeader ? 'w-4 h-4 lg:w-5 lg:h-5' : 'w-4 h-4'} strokeWidth={2.5} />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    onDelete && onDelete(classObj.id, classObj.name)
                  }}
                  className={`${p.mainHeader ? 'w-10 h-10 lg:w-12 lg:h-12 rounded-xl lg:rounded-2xl' : 'w-8 h-8 lg:w-9 lg:h-9 rounded-xl'} flex items-center justify-center bg-white dark:bg-slate-800 border-2 border-slate-900 dark:border-slate-600 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/50 hover:shadow-[3px_3px_0_0_#0f172a] dark:hover:shadow-[3px_3px_0_0_#334155] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all`}
                  title="Hapus kelas"
                >
                  <Trash2 className={p.mainHeader ? 'w-4 h-4 lg:w-5 lg:h-5' : 'w-4 h-4'} strokeWidth={2.5} />
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4 w-full bg-amber-50 dark:bg-amber-950/30 p-4 rounded-[24px] border-2 border-slate-900 dark:border-slate-700 shadow-[2px_2px_0_0_#0f172a] dark:shadow-[2px_2px_0_0_#334155] animate-in zoom-in-95 duration-200">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5 w-full">
              <label className="text-[10px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-widest pl-1">Nama Kelas</label>
              <input
                ref={nameRef}
                value={name}
                onChange={handleNameChange}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveName()
                  else if (e.key === 'Escape') handleCancel()
                }}
                placeholder="Nama kelas..."
                className="w-full px-4 py-2 rounded-xl text-sm bg-white dark:bg-slate-800 border-2 border-slate-900 dark:border-slate-600 text-slate-900 dark:text-white font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/10 transition-all placeholder:text-slate-300 dark:placeholder:text-slate-500"
              />
            </div>

            <div className="flex flex-col gap-1.5 w-full">
              <label className="text-[10px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-widest pl-1">Urutan Kelas</label>
              <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 border-2 border-slate-900 dark:border-slate-600 rounded-xl p-1 shadow-[2px_2px_0_0_#0f172a] dark:shadow-[2px_2px_0_0_#334155] w-fit">
                <button
                  type="button"
                  onClick={(e) => handleOrderChange(Math.max(0, (order ?? 0) - 1), e)}
                  disabled={order === 0}
                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-900 dark:text-white disabled:opacity-20"
                >
                  <Minus className="w-4 h-4" strokeWidth={3} />
                </button>
                <div className="px-2 text-center min-w-[40px]">
                  <span className="text-sm font-black text-indigo-600 dark:text-indigo-400">{(order ?? 0) + 1}</span>
                  <span className="text-[10px] text-slate-300 dark:text-slate-500 font-black tracking-tighter">/{classesCount}</span>
                </div>
                <button
                  type="button"
                  onClick={(e) => handleOrderChange(Math.min((classesCount || 1) - 1, (order ?? 0) + 1), e)}
                  disabled={order >= (classesCount || 1) - 1}
                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-900 dark:text-white disabled:opacity-20"
                >
                  <Plus className="w-4 h-4" strokeWidth={3} />
                </button>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleSaveName}
              className="flex-1 py-3 rounded-xl bg-indigo-500 text-white border-2 border-slate-900 dark:border-slate-600 font-black text-[10px] uppercase tracking-widest shadow-[2px_2px_0_0_#0f172a] dark:shadow-[2px_2px_0_0_#334155] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all"
            >
              Simpan
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="flex-1 py-3 rounded-xl bg-white dark:bg-slate-800 text-slate-400 dark:text-slate-500 border-2 border-slate-900 dark:border-slate-600 font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 dark:hover:bg-slate-700 transition-all shadow-[2px_2px_0_0_#0f172a] dark:shadow-[2px_2px_0_0_#334155] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
            >
              Batal
            </button>
          </div>
          <p className="text-[8px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-tight text-center">Tekan Enter untuk simpan</p>
        </div>
      )}
    </div>
  )
}
