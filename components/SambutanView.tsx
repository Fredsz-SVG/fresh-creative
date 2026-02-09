'use client'

import React from 'react'
import { MessageSquare } from 'lucide-react'

type Teacher = {
  id: string
  name: string
  title?: string
  message?: string
  photo_url?: string
  sort_order?: number
}

type SambutanViewProps = {
  teachers: Teacher[]
}

export default function SambutanView({ teachers }: SambutanViewProps) {
  return (
    <div className="max-w-4xl mx-auto p-4">
      {/* Header */}
      <div className="mb-8 text-center">
        <h2 className="text-2xl font-bold text-app mb-2 flex items-center justify-center gap-2">
          <MessageSquare className="w-6 h-6 text-lime-400" />
          Sambutan
        </h2>
        <p className="text-sm text-muted">Kata sambutan dari guru dan staff</p>
      </div>

      {/* Teachers Grid */}
      {teachers.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {teachers.map((teacher) => (
            <div
              key={teacher.id}
              className="p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:scale-105 transition-all"
            >
              {/* Photo */}
              {teacher.photo_url && (
                <div className="w-full aspect-[4/5] bg-white/5 rounded-lg overflow-hidden mb-3">
                  <img
                    src={teacher.photo_url}
                    alt={teacher.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              {/* Name & Title */}
              <div className="text-center">
                <h3 className="text-sm font-bold text-app mb-1">{teacher.name}</h3>
                {teacher.title && (
                  <p className="text-xs text-lime-400 mb-2">{teacher.title}</p>
                )}
                {teacher.message && (
                  <p className="text-xs text-muted leading-relaxed">{teacher.message}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Empty State */
        <div className="text-center py-16 border-2 border-dashed border-white/10 rounded-xl">
          <MessageSquare className="w-16 h-16 mx-auto mb-4 text-gray-600" />
          <p className="text-app font-medium mb-1">Belum ada sambutan</p>
          <p className="text-sm text-muted">Admin belum menambahkan sambutan guru</p>
        </div>
      )}
    </div>
  )
}
