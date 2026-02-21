'use client'

import React from 'react'
import ManualFlipbookViewer from './ManualFlipbookViewer'
import LayoutEditor from './FlipbookLayoutEditor'

interface FlipbookViewProps {
  album: { id: string; [key: string]: unknown } | null
  manualPages: unknown[]
  canManage: boolean
  flipbookPreviewMode: boolean
  onPlayVideo: (url: string) => void
  onUpdateAlbum?: (updates: Record<string, unknown>) => void | Promise<void>
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
    <div className="flex flex-col h-full overflow-hidden relative">
      {(flipbookPreviewMode || !canManage) ? (
        <div className="flex-1 flex items-center justify-center p-4">
          <ManualFlipbookViewer pages={manualPages} onPlayVideo={onPlayVideo} />
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
