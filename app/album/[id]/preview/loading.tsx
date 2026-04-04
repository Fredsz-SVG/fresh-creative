'use client'

import React from 'react'
import { Loader2 } from 'lucide-react'

export default function PreviewLoading() {
  return (
    <div className="min-h-[100dvh] bg-amber-300 flex flex-col items-center justify-center p-4">
      <div className="bg-white border-4 border-slate-900 shadow-[8px_8px_0_0_#0f172a] rounded-2xl p-8 max-w-sm w-full flex flex-col items-center">
        <Loader2 className="w-12 h-12 animate-spin text-indigo-600 mb-4" />
        <p className="text-slate-900 font-black uppercase tracking-widest text-sm text-center">
          Memuat Card...
        </p>
      </div>
    </div>
  )
}
