'use client'

import React from 'react'
import ManualFlipbookViewer from './ManualFlipbookViewer'
import LayoutEditor from './FlipbookLayoutEditor'

interface FlipbookViewProps {
  album: { id: string;[key: string]: unknown } | null
  manualPages: any[]
  canManage: boolean
  flipbookPreviewMode: boolean
  onPlayVideo: (url: string) => void
  onUpdateAlbum?: any
}

export default function FlipbookView({
  album,
  manualPages,
  canManage,
  flipbookPreviewMode,
  onPlayVideo,
  onUpdateAlbum,
}: FlipbookViewProps) {
  return (
    <div className="flex flex-col h-full relative bg-slate-100 dark:bg-slate-950">
      {(flipbookPreviewMode || !canManage) ? (
        <div className="flex-1 min-h-0 flex flex-col p-0">
          <ManualFlipbookViewer pages={manualPages} onPlayVideo={onPlayVideo} className="w-full h-full" albumId={album?.id} isEditorView />
        </div>
      ) : (
        <LayoutEditor
          album={album}
          onPlayVideo={onPlayVideo}
          onUpdateAlbum={onUpdateAlbum}
          canManage={canManage}
        />
      )}
    </div>
  )
}
