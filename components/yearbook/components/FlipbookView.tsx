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
  // Keep editor mounted so switching preview <-> editor feels instant.
  // Previously the editor unmounted in preview mode, causing refetch and blank flash.
  const showPreview = flipbookPreviewMode || !canManage
  const showEditor = canManage

  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden relative bg-white dark:bg-slate-950">
      <div className={`${showPreview ? 'flex' : 'hidden'} flex-1 min-h-0 flex-col p-0`}>
          <ManualFlipbookViewer pages={manualPages} onPlayVideo={onPlayVideo} className="w-full h-full" albumId={album?.id} isEditorView isVisible={showPreview} />
      </div>
      <div className={`${showEditor && !flipbookPreviewMode ? 'flex' : 'hidden'} flex-1 min-h-0`}>
        <LayoutEditor
          album={album}
          onPlayVideo={onPlayVideo}
          onUpdateAlbum={onUpdateAlbum}
          canManage={canManage}
        />
      </div>
    </div>
  )
}
