'use client'

import { useEffect, useState } from 'react'
import { AlertCircle, CheckCircle2, Info, Loader2, TriangleAlert } from 'lucide-react'
import { AppToast, subscribeToToasts } from '@/lib/toast'

const BASE_CLASS =
  'w-full border-4 border-slate-900 dark:border-slate-700 rounded-2xl md:rounded-3xl shadow-[2px_2px_0_0_#0f172a] dark:shadow-[2px_2px_0_0_#334155] md:shadow-[4px_4px_0_0_#0f172a] dark:md:shadow-[4px_4px_0_0_#334155] px-4 py-3 md:px-6 md:py-4 font-black text-xs md:text-sm animate-bounce-subtle'

function toastColorClass(type: AppToast['type']) {
  if (type === 'success') return 'bg-emerald-400 dark:bg-emerald-600 text-slate-900 dark:text-white'
  if (type === 'error') return 'bg-red-400 dark:bg-red-600 text-white'
  if (type === 'info') return 'bg-sky-400 dark:bg-sky-600 text-slate-900 dark:text-white'
  if (type === 'warning') return 'bg-amber-300 dark:bg-amber-600 text-slate-900 dark:text-white'
  return 'bg-amber-300 dark:bg-amber-600 text-slate-900 dark:text-white'
}

function ToastIcon({ type }: { type: AppToast['type'] }) {
  if (type === 'success') return <CheckCircle2 className="w-4 h-4 md:w-5 md:h-5" />
  if (type === 'error') return <AlertCircle className="w-4 h-4 md:w-5 md:h-5" />
  if (type === 'info') return <Info className="w-4 h-4 md:w-5 md:h-5" />
  if (type === 'warning') return <TriangleAlert className="w-4 h-4 md:w-5 md:h-5" />
  return <Loader2 className="w-4 h-4 md:w-5 md:h-5 animate-spin" />
}

export function AppToaster() {
  const [items, setItems] = useState<AppToast[]>([])

  useEffect(() => {
    return subscribeToToasts(setItems)
  }, [])

  if (items.length === 0) return null

  return (
    <div className="fixed bottom-4 md:bottom-8 left-1/2 -translate-x-1/2 z-[300] w-full max-w-[90%] md:max-w-md space-y-2">
      {items.map((item) => (
        <div key={item.id} className={`${BASE_CLASS} ${toastColorClass(item.type)}`}>
          <div className="flex items-center gap-2 md:gap-3">
            <ToastIcon type={item.type} />
            <span>{item.message}</span>
          </div>
        </div>
      ))}
    </div>
  )
}
