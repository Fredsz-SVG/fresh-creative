'use client'

import { MessageSquare } from 'lucide-react'

type Teacher = {
  id: string
  name: string
  title?: string
  message?: string
  photo_url?: string
  sort_order?: number
}

interface SambutanViewProps {
  teachers: Teacher[]
}

export default function SambutanView({ teachers }: SambutanViewProps) {
  if (teachers.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center">
          <MessageSquare className="w-16 h-16 mx-auto text-muted/30 mb-4" />
          <p className="text-muted text-sm">Belum ada sambutan dari guru.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-app mb-2">Sambutan</h2>
          <p className="text-muted text-sm">Kata sambutan dari para guru</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {teachers.map((teacher) => (
            <div
              key={teacher.id}
              className="bg-white/5 border border-white/10 rounded-xl overflow-hidden hover:bg-white/10 transition-all hover:scale-105"
            >
              {teacher.photo_url && (
                <div className="relative w-full aspect-[4/5] bg-white/5">
                  <img
                    src={teacher.photo_url}
                    alt={teacher.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              
              <div className="p-4">
                <h3 className="text-lg font-bold text-app mb-1">{teacher.name}</h3>
                {teacher.title && (
                  <p className="text-xs text-lime-400 mb-3">{teacher.title}</p>
                )}
                {teacher.message && (
                  <p className="text-sm text-muted leading-relaxed">{teacher.message}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
