'use client'

import React, { useState, useEffect } from 'react'
import { Play, Image as ImageIcon, ImagePlus, Trash2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

type FlipbookViewProps = {
    album: any
    onPlayVideo?: (url: string) => void
    onUpdateAlbum?: (updates: { flipbook_mode?: 'manual' }) => Promise<void>
    canManage?: boolean
}

type ManualFlipbookPage = {
    id: string
    page_number: number
    image_url: string
    width?: number
    height?: number
    flipbook_video_hotspots?: VideoHotspot[]
}

type VideoHotspot = {
    id: string
    page_id: string
    video_url: string
    label?: string
    x: number
    y: number
    width: number
    height: number
}

export default function FlipbookLayoutEditor({ album, onPlayVideo, onUpdateAlbum, canManage = false }: FlipbookViewProps) {
    // Manual Mode is now the only mode
    const isManualMode = true
    const [manualPages, setManualPages] = useState<ManualFlipbookPage[]>([])
    const [uploadingPdf, setUploadingPdf] = useState(false)
    const [selectedManualPageId, setSelectedManualPageId] = useState<string | null>(null)
    const [drawingHotspot, setDrawingHotspot] = useState<{ startX: number; startY: number; currentX: number; currentY: number } | null>(null)
    const [deleteHotspotConfirm, setDeleteHotspotConfirm] = useState<string | null>(null)
    const [uploadingHotspotId, setUploadingHotspotId] = useState<string | null>(null)
    const [deleteAllPagesConfirm, setDeleteAllPagesConfirm] = useState(false)
    const [isDeletingAll, setIsDeletingAll] = useState(false)
    const [isPageReady, setIsPageReady] = useState(false)
    const [lastSelectedId, setLastSelectedId] = useState<string | null>(null)

    // Sync state to prevent 1-frame flash when switching pages
    if (selectedManualPageId !== lastSelectedId) {
        setIsPageReady(false)
        setLastSelectedId(selectedManualPageId)
    }

    useEffect(() => {
        if (!selectedManualPageId) return

        setIsPageReady(false)
        const timer = setTimeout(() => {
            setIsPageReady(true)
        }, 300)
        return () => clearTimeout(timer)
    }, [selectedManualPageId])

    const fetchManualPages = async () => {
        if (!album?.id) return
        const { data: pages, error } = await supabase
            .from('manual_flipbook_pages')
            .select('*, flipbook_video_hotspots(*)')
            .eq('album_id', album.id)
            .order('page_number', { ascending: true })

        if (error) {
            console.error('Error fetching manual pages:', error)
            return
        }
        if (pages) {
            setManualPages(pages)
            if (pages.length > 0 && !selectedManualPageId) {
                setSelectedManualPageId(pages[0].id)
            }
        }
    }

    // Initial Fetch
    useEffect(() => {
        if (album?.id) {
            fetchManualPages()
        }
    }, [album?.id])

    // Realtime Subscription
    useEffect(() => {
        if (!album?.id) return

        const channel = supabase
            .channel(`flipbook-hotspots-${album.id}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'flipbook_video_hotspots'
                },
                (payload) => {
                    const { eventType, new: newRecord, old: oldRecord } = payload as any

                    if (eventType === 'INSERT') {
                        setManualPages(prev => prev.map(page => {
                            if (page.id === newRecord.page_id) {
                                // Prevent duplicates if already added via local state
                                if (page.flipbook_video_hotspots?.some(h => h.id === newRecord.id)) {
                                    return page
                                }
                                return {
                                    ...page,
                                    flipbook_video_hotspots: [...(page.flipbook_video_hotspots || []), newRecord]
                                }
                            }
                            return page
                        }))
                    } else if (eventType === 'UPDATE') {
                        setManualPages(prev => prev.map(page => ({
                            ...page,
                            flipbook_video_hotspots: page.flipbook_video_hotspots?.map(h =>
                                h.id === newRecord.id ? { ...h, ...newRecord } : h
                            )
                        })))
                    } else if (eventType === 'DELETE') {
                        setManualPages(prev => prev.map(page => ({
                            ...page,
                            flipbook_video_hotspots: page.flipbook_video_hotspots?.filter(h => h.id !== oldRecord.id)
                        })))
                    }
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [album?.id])

    const handleDeleteAllPages = async () => {
        if (!manualPages.length) return

        setIsDeletingAll(true)
        const toastId = toast.loading('Sedang membersihkan storage & database...')

        try {
            const res = await fetch(`/api/albums/${album.id}/flipbook`, {
                method: 'POST',
                credentials: 'include'
            })

            if (!res.ok) {
                const error = await res.json().catch(() => ({}))
                throw new Error(error.error || 'Gagal membersihkan flipbook')
            }

            setManualPages([])
            setSelectedManualPageId(null)
            toast.success('Flipbook berhasil dibersihkan total!', { id: toastId })

        } catch (error: any) {
            console.error('Error cleaning flipbook:', error)
            toast.error('Gagal membersihkan flipbook: ' + error.message, { id: toastId })
        } finally {
            setIsDeletingAll(false)
        }
    }

    const handleSaveHotspot = async (hotspotId: string, updates: Partial<VideoHotspot>) => {
        const { error } = await supabase
            .from('flipbook_video_hotspots')
            .update(updates)
            .eq('id', hotspotId)

        if (!error) {
            setManualPages(prev => prev.map(p => ({
                ...p,
                flipbook_video_hotspots: p.flipbook_video_hotspots?.map(h => h.id === hotspotId ? { ...h, ...updates } : h)
            })))
            toast.success('Hotspot berhasil disimpan')
        } else {
            toast.error('Gagal menyimpan hotspot')
        }
    }

    const handleDeleteHotspot = async (hotspotId: string) => {
        const { error } = await supabase
            .from('flipbook_video_hotspots')
            .delete()
            .eq('id', hotspotId)

        if (!error) {
            setManualPages(prev => prev.map(p => ({
                ...p,
                flipbook_video_hotspots: p.flipbook_video_hotspots?.filter(h => h.id !== hotspotId)
            })))
            toast.success('Hotspot dihapus')
        }
    }

    const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!isManualMode || !selectedManualPageId || !canManage) return

        const rect = e.currentTarget.getBoundingClientRect()
        const x = ((e.clientX - rect.left) / rect.width) * 100
        const y = ((e.clientY - rect.top) / rect.height) * 100

        setDrawingHotspot({
            startX: x,
            startY: y,
            currentX: x,
            currentY: y
        })
    }

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!drawingHotspot) return

        const rect = e.currentTarget.getBoundingClientRect()
        const x = ((e.clientX - rect.left) / rect.width) * 100
        const y = ((e.clientY - rect.top) / rect.height) * 100

        setDrawingHotspot(prev => prev ? {
            ...prev,
            currentX: x,
            currentY: y
        } : null)
    }

    const handleMouseUp = async () => {
        if (!drawingHotspot || !selectedManualPageId) return

        const { startX, startY, currentX, currentY } = drawingHotspot
        const x = Math.min(startX, currentX)
        const y = Math.min(startY, currentY)
        const width = Math.abs(currentX - startX)
        const height = Math.abs(currentY - startY)

        setDrawingHotspot(null)

        if (width < 1 || height < 1) return

        const { data, error } = await supabase
            .from('flipbook_video_hotspots')
            .insert({
                page_id: selectedManualPageId,
                video_url: '',
                label: `Hotspot #${(manualPages.find(p => p.id === selectedManualPageId)?.flipbook_video_hotspots?.length || 0) + 1}`,
                x: x,
                y: y,
                width: width,
                height: height
            })
            .select()
            .single()

        if (data && !error) {
            setManualPages(prev => prev.map(p =>
                p.id === selectedManualPageId
                    ? { ...p, flipbook_video_hotspots: [...(p.flipbook_video_hotspots || []), data] }
                    : p
            ))
        }
    }

    const handleHotspotVideoUpload = async (hotspotId: string, e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file || !album?.id) return

        setUploadingHotspotId(hotspotId)
        const toastId = toast.loading('Mengunggah video...')

        try {
            const fileExt = file.name.split('.').pop()
            const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`
            const filePath = `albums/${album.id}/flipbook/hotspots/${fileName}`

            const { data, error: uploadError } = await supabase.storage
                .from('album-photos')
                .upload(filePath, file)

            if (uploadError) throw uploadError

            const { data: { publicUrl } } = supabase.storage
                .from('album-photos')
                .getPublicUrl(filePath)

            const { error: updateError } = await supabase
                .from('flipbook_video_hotspots')
                .update({ video_url: publicUrl })
                .eq('id', hotspotId)

            if (updateError) throw updateError

            setManualPages(prev => prev.map(p => ({
                ...p,
                flipbook_video_hotspots: p.flipbook_video_hotspots?.map(h =>
                    h.id === hotspotId ? { ...h, video_url: publicUrl } : h
                )
            })))

            toast.success('Video berhasil diunggah!', { id: toastId })
        } catch (error: any) {
            console.error('Error uploading hotspot video:', error)
            toast.error('Gagal mengunggah video: ' + error.message, { id: toastId })
        } finally {
            setUploadingHotspotId(null)
            if (e.target) e.target.value = ''
        }
    }

    const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file || !album?.id) return

        try {
            setUploadingPdf(true)
            const toastId = toast.loading('Memproses PDF... (Ini mungkin memakan waktu)')

            const pdfjsLib = await new Promise<any>((resolve, reject) => {
                if ((window as any).pdfjsLib) {
                    resolve((window as any).pdfjsLib);
                    return;
                }
                const script = document.createElement('script');
                script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
                script.onload = () => {
                    const lib = (window as any)['pdfjs-dist/build/pdf'];
                    lib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
                    resolve(lib);
                };
                script.onerror = (err) => reject(new Error('Gagal memuat PDF library dari CDN'));
                document.head.appendChild(script);
            });

            const arrayBuffer = await file.arrayBuffer()
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
            const numPages = pdf.numPages
            const newPages = []

            for (let i = 1; i <= numPages; i++) {
                toast.loading(`Memproses halaman ${i} dari ${numPages}...`, { id: toastId })
                const page = await pdf.getPage(i)
                const viewport = page.getViewport({ scale: 1.5 })
                const canvas = document.createElement('canvas')
                const context = canvas.getContext('2d')
                canvas.height = viewport.height
                canvas.width = viewport.width

                if (context) {
                    await page.render({ canvasContext: context, viewport }).promise
                    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.8))

                    if (blob) {
                        const fileName = `page-${i}-${Date.now()}.jpg`
                        const filePath = `albums/${album.id}/flipbook/pages/${fileName}`
                        const { error: uploadError } = await supabase.storage
                            .from('album-photos')
                            .upload(filePath, blob)

                        if (!uploadError) {
                            const { data: { publicUrl } } = supabase.storage.from('album-photos').getPublicUrl(filePath)

                            const { data: pageData, error: dbError } = await supabase
                                .from('manual_flipbook_pages')
                                .insert({
                                    album_id: album.id,
                                    page_number: i,
                                    image_url: publicUrl,
                                    width: Math.round(viewport.width),
                                    height: Math.round(viewport.height)
                                })
                                .select()
                                .single()

                            if (dbError) {
                                console.error('Database Error during PDF upload:', dbError)
                                throw new Error(`Gagal menyimpan halaman ${i}: ${dbError.message}`)
                            }

                            if (pageData) {
                                newPages.push({ ...pageData, flipbook_video_hotspots: [] })
                            }
                        }
                    }
                }
            }

            if (newPages.length > 0) {
                setManualPages(prev => [...prev, ...newPages])
                fetchManualPages()
                toast.success(`Berhasil mengunggah ${newPages.length} halaman!`, { id: toastId })
            } else {
                toast.error('Gagal memproses halaman PDF', { id: toastId })
            }

        } catch (error: any) {
            console.error('PDF Upload Error:', error)
            toast.error('Gagal memproses PDF: ' + error.message)
        } finally {
            setUploadingPdf(false)
            if (e.target) e.target.value = ''
        }
    }

    const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
        if (!isManualMode || !selectedManualPageId || !canManage) return

        const rect = e.currentTarget.getBoundingClientRect()
        const touch = e.touches[0]
        const x = ((touch.clientX - rect.left) / rect.width) * 100
        const y = ((touch.clientY - rect.top) / rect.height) * 100

        setDrawingHotspot({
            startX: x,
            startY: y,
            currentX: x,
            currentY: y
        })
    }

    const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
        if (!drawingHotspot) return

        const rect = e.currentTarget.getBoundingClientRect()
        const touch = e.touches[0]
        const x = ((touch.clientX - rect.left) / rect.width) * 100
        const y = ((touch.clientY - rect.top) / rect.height) * 100

        setDrawingHotspot(prev => prev ? {
            ...prev,
            currentX: x,
            currentY: y
        } : null)
    }

    const selectedPage = manualPages.find(p => p.id === selectedManualPageId)

    return (
        <div className="flex flex-col lg:flex-row min-h-[calc(100vh-80px)] lg:h-[calc(100vh-80px)] gap-4 max-w-7xl mx-auto px-3 py-3 sm:p-4 overflow-y-auto lg:overflow-hidden">
            {/* Layout Sidebar / Selector */}
            <div className="contents lg:flex lg:flex-col w-full lg:w-64 lg:gap-4 lg:flex-shrink-0 lg:bg-white/5 lg:rounded-xl lg:border lg:border-white/10 lg:p-3 lg:order-1 lg:h-full">
                {canManage && (
                    <div className="order-0 w-full bg-white/5 rounded-xl border border-white/10 p-3 lg:p-0 lg:bg-transparent lg:border-0 lg:w-auto">
                        <div className="mb-0 lg:mb-4">
                            <input
                                type="file"
                                id="pdf-upload"
                                className="hidden"
                                accept="application/pdf"
                                onChange={handlePdfUpload}
                                disabled={uploadingPdf}
                            />
                            <label
                                htmlFor="pdf-upload"
                                className={`flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed border-white/20 rounded-xl cursor-pointer hover:bg-white/5 hover:border-lime-500/50 transition-all group ${uploadingPdf ? 'opacity-50 pointer-events-none' : ''}`}
                            >
                                <div className="w-10 h-10 rounded-full bg-lime-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <ImagePlus className="w-5 h-5 text-lime-400" />
                                </div>
                                <div className="text-center">
                                    <p className="text-sm font-bold text-white group-hover:text-lime-400 transition-colors">
                                        {uploadingPdf ? 'Memproses PDF...' : 'Upload PDF'}
                                    </p>
                                    <p className="text-[10px] text-gray-500 mt-1">Maks 50MB</p>
                                </div>
                            </label>
                        </div>
                    </div>
                )}

                <div className="order-1 w-full bg-white/5 rounded-xl border border-white/10 p-3 lg:p-0 lg:bg-transparent lg:border-0 lg:w-auto h-64 lg:h-auto lg:flex-1 flex flex-col min-h-0">
                    <div className="flex items-center justify-between px-2 mb-2">
                        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wide flex items-center gap-2">
                            Pages
                            <span className="text-xs bg-white/10 px-1.5 py-0.5 rounded text-gray-300 font-normal">{manualPages.length}</span>
                        </h3>
                        {manualPages.length > 0 && (
                            <button
                                onClick={() => setDeleteAllPagesConfirm(true)}
                                disabled={isDeletingAll}
                                className="text-[10px] text-red-400 hover:text-red-300 hover:bg-red-500/10 px-2 py-1 rounded transition-colors flex items-center gap-1"
                                title="Hapus Semua Halaman"
                            >
                                <Trash2 className="w-3 h-3" />
                                {isDeletingAll ? 'Cleaning...' : 'Clean All'}
                            </button>
                        )}
                    </div>

                    <div className="flex-1 overflow-y-auto min-h-0 space-y-2 pr-1 no-scrollbar">
                        {manualPages.map((page) => (
                            <button
                                key={page.id}
                                onClick={() => setSelectedManualPageId(page.id)}
                                className={`w-full flex gap-3 p-2 rounded-lg border transition-all text-left group ${selectedManualPageId === page.id
                                    ? 'bg-lime-500/10 border-lime-500/30 ring-1 ring-lime-500/20'
                                    : 'bg-white/5 border-white/5 hover:bg-white/10'}`}
                            >
                                <div className="w-12 h-16 bg-gray-900 rounded-sm overflow-hidden flex-shrink-0 border border-white/10 relative">
                                    <img src={page.image_url} className="w-full h-full object-cover" alt={`Page ${page.page_number}`} />
                                    <div className="absolute top-0 right-0 bg-black/60 px-1 text-[8px] text-white backdrop-blur-sm rounded-bl">
                                        {page.page_number}
                                    </div>
                                </div>
                                <div className="flex-1 min-w-0 flex flex-col justify-center">
                                    <p className={`text-xs font-bold ${selectedManualPageId === page.id ? 'text-lime-400' : 'text-gray-300'}`}>
                                        Halaman {page.page_number}
                                    </p>
                                    <p className="text-[10px] text-gray-500 truncate">
                                        {page.flipbook_video_hotspots?.length || 0} Hotspots
                                    </p>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Hotspot Configuration Sidebar */}
            <div className="w-full lg:w-64 flex flex-col gap-4 flex-shrink-0 bg-white/5 rounded-xl border border-white/10 p-3 order-3 lg:order-3 h-96 lg:h-full">
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wide">
                    {canManage ? 'Hotspot Editor' : 'Hotspots'}
                </h3>
                <p className="text-[10px] text-gray-500 bg-white/5 p-2 rounded">
                    {canManage
                        ? 'Klik pada halaman di area preview untuk menambahkan area interaktif (video popup).'
                        : 'Klik icon play pada halaman untuk menonton video terkait.'}
                </p>

                {selectedPage?.flipbook_video_hotspots && selectedPage.flipbook_video_hotspots.length > 0 ? (
                    <div className="flex-1 overflow-y-auto min-h-0 no-scrollbar pr-1 space-y-3">
                        {selectedPage.flipbook_video_hotspots.map((h, i) => (
                            <div key={h.id} className={`p-3 bg-white/5 border border-white/10 rounded-lg space-y-3 ${!canManage ? 'opacity-80' : ''}`}>
                                <div className="flex items-center justify-between gap-2">
                                    {canManage ? (
                                        <input
                                            type="text"
                                            defaultValue={h.label || `Hotspot #${i + 1}`}
                                            onBlur={(e) => handleSaveHotspot(h.id, { label: e.target.value })}
                                            className="bg-transparent border-b border-transparent hover:border-white/20 focus:border-lime-500 focus:outline-none text-xs font-bold text-gray-200 w-full"
                                            placeholder="Nama Hotspot"
                                        />
                                    ) : (
                                        <span className="text-xs font-bold text-gray-300 truncate max-w-[100px]">{h.label || `Hotspot #${i + 1}`}</span>
                                    )}
                                    {canManage && (
                                        <button
                                            onClick={() => setDeleteHotspotConfirm(h.id)}
                                            className="text-[10px] text-red-400 hover:text-red-300"
                                        >
                                            Hapus
                                        </button>
                                    )}
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] text-gray-500 uppercase tracking-tight">
                                        {canManage ? 'URL Video (Youtube/MP4)' : 'Link Video'}
                                    </label>
                                    <div className="flex flex-col gap-2">
                                        {canManage ? (
                                            <>
                                                <input
                                                    type="text"
                                                    defaultValue={h.video_url}
                                                    placeholder="https://youtube.com/watch?v=..."
                                                    onBlur={(e) => handleSaveHotspot(h.id, { video_url: e.target.value })}
                                                    className="w-full bg-black/40 border border-white/10 rounded px-2 py-1 text-[10px] text-white focus:border-lime-500 focus:outline-none"
                                                />
                                                <div className="relative">
                                                    <input
                                                        type="file"
                                                        id={`video-upload-${h.id}`}
                                                        className="hidden"
                                                        accept="video/*"
                                                        onChange={(e) => handleHotspotVideoUpload(h.id, e)}
                                                        disabled={!!uploadingHotspotId}
                                                    />
                                                    <label
                                                        htmlFor={`video-upload-${h.id}`}
                                                        className={`flex items-center justify-center gap-2 px-2 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded cursor-pointer transition-colors text-[10px] text-gray-300 hover:text-white w-full ${uploadingHotspotId === h.id ? 'opacity-50 pointer-events-none' : ''}`}
                                                    >
                                                        <Play className={`w-3 h-3 ${uploadingHotspotId === h.id ? 'animate-spin' : ''}`} />
                                                        <span>{uploadingHotspotId === h.id ? 'Uploading...' : 'Upload Video File'}</span>
                                                    </label>
                                                </div>
                                            </>
                                        ) : (
                                            <p className="text-[10px] text-gray-400 italic truncate">
                                                {h.video_url || 'Belum ada URL'}
                                            </p>
                                        )}
                                    </div>
                                </div>
                                {!canManage && h.video_url && (
                                    <button
                                        onClick={() => onPlayVideo?.(h.video_url)}
                                        className="w-full py-1 bg-lime-500/10 hover:bg-lime-500/20 text-lime-400 text-[10px] font-bold rounded transition-colors"
                                    >
                                        Play Video
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-8 opacity-40">
                        <Play className="w-8 h-8 mb-2" />
                        <p className="text-xs">Belum ada hotspot di halaman ini.</p>
                    </div>
                )}
            </div>

            {/* Main Preview Area */}
            <div className="flex-1 min-w-0 bg-black/20 rounded-xl border border-white/10 overflow-hidden relative flex flex-col h-[50vh] lg:h-full order-2 lg:order-2">
                <div className="flex-1 relative overflow-auto p-4 sm:p-8 flex items-center justify-center no-scrollbar">
                    {selectedPage ? (
                        <div
                            className={`relative shadow-2xl group ${isPageReady ? 'transition-opacity duration-700 opacity-100' : 'opacity-0'}`}
                            onMouseDown={handleMouseDown}
                            onMouseMove={handleMouseMove}
                            onMouseUp={handleMouseUp}
                            onTouchStart={handleTouchStart}
                            onTouchMove={handleTouchMove}
                            onTouchEnd={handleMouseUp}
                            style={{
                                width: '100%',
                                maxWidth: '280px',
                                maxHeight: '90%',
                                aspectRatio: selectedPage.width && selectedPage.height ? `${selectedPage.width}/${selectedPage.height}` : 'auto',
                                touchAction: 'none'
                            }}
                        >
                            <img
                                src={selectedPage.image_url}
                                className="w-full h-full object-contain select-none pointer-events-none"
                                alt={`Page ${selectedPage.page_number}`}
                            />

                            {/* Hotspot overlays */}
                            {selectedPage.flipbook_video_hotspots?.map((h, i) => (
                                <div
                                    key={h.id}
                                    className={`absolute group/hotspot transition-all duration-200 border-2 ${canManage ? 'border-lime-500/50 bg-lime-500/10 hover:bg-lime-500/20' : 'border-transparent'}`}
                                    style={{
                                        left: `${h.x}%`,
                                        top: `${h.y}%`,
                                        width: `${h.width}%`,
                                        height: `${h.height}%`
                                    }}
                                >
                                    {canManage && (
                                        <div className="absolute top-0 right-0 bg-lime-500 text-black text-[8px] font-bold px-1 py-0.5 opacity-0 group-hover/hotspot:opacity-100 transition-opacity">
                                            {h.label || `Hotspot #${i + 1}`}
                                        </div>
                                    )}
                                    {!canManage && h.video_url && (
                                        <button
                                            onClick={() => onPlayVideo?.(h.video_url)}
                                            className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 hover:opacity-100 transition-opacity rounded-sm"
                                        >
                                            <div className="w-8 h-8 rounded-full bg-lime-500 flex items-center justify-center text-black shadow-lg">
                                                <Play className="w-4 h-4 fill-current ml-0.5" />
                                            </div>
                                        </button>
                                    )}
                                </div>
                            ))}

                            {/* Drawing Preview */}
                            {drawingHotspot && (
                                <div
                                    className="absolute border-2 border-dashed border-lime-400 bg-lime-400/20 pointer-events-none z-50"
                                    style={{
                                        left: `${Math.min(drawingHotspot.startX, drawingHotspot.currentX)}%`,
                                        top: `${Math.min(drawingHotspot.startY, drawingHotspot.currentY)}%`,
                                        width: `${Math.abs(drawingHotspot.currentX - drawingHotspot.startX)}%`,
                                        height: `${Math.abs(drawingHotspot.currentY - drawingHotspot.startY)}%`
                                    }}
                                />
                            )}
                        </div>
                    ) : (
                        <div className="text-center py-20 opacity-40">
                            <ImageIcon className="w-16 h-16 mx-auto mb-4" />
                            <p className="text-sm">Pilih atau upload halaman PDF untuk memulai.</p>
                        </div>
                    )}
                </div>
            </div>
            {/* Hotspot Delete Confirmation Modal */}
            {deleteHotspotConfirm && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
                    <div className="bg-gray-900 border border-red-500/20 rounded-xl p-4 sm:p-6 max-w-md w-full shadow-2xl">
                        <h3 className="text-lg font-bold text-red-400 mb-2">Hapus Hotspot</h3>
                        <p className="text-sm text-gray-400 mb-4">
                            Apakah Anda yakin ingin menghapus hotspot ini?
                        </p>
                        <div className="flex gap-2 justify-end">
                            <button
                                onClick={() => setDeleteHotspotConfirm(null)}
                                className="px-4 py-2 rounded-lg bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white transition-colors text-sm font-medium"
                            >
                                Batal
                            </button>
                            <button
                                onClick={() => {
                                    if (deleteHotspotConfirm) {
                                        handleDeleteHotspot(deleteHotspotConfirm)
                                        setDeleteHotspotConfirm(null)
                                    }
                                }}
                                className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-500 transition-colors text-sm font-medium"
                            >
                                Ya, Hapus
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete All Pages Confirmation Modal */}
            {deleteAllPagesConfirm && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
                    <div className="bg-gray-900 border border-red-500/20 rounded-xl p-4 sm:p-6 max-w-md w-full shadow-2xl">
                        <h3 className="text-lg font-bold text-red-400 mb-2">Hapus Semua Halaman</h3>
                        <p className="text-sm text-gray-400 mb-4">
                            Apakah Anda yakin ingin menghapus <strong>SEMUA</strong> halaman flipbook?
                            <br /><br />
                            Tindakan ini akan menghapus semua gambar halaman dan hotspot secara permanen. Tindakan ini tidak dapat dibatalkan.
                        </p>
                        <div className="flex gap-2 justify-end">
                            <button
                                onClick={() => setDeleteAllPagesConfirm(false)}
                                className="px-4 py-2 rounded-lg bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white transition-colors text-sm font-medium"
                            >
                                Batal
                            </button>
                            <button
                                onClick={() => {
                                    handleDeleteAllPages()
                                    setDeleteAllPagesConfirm(false)
                                }}
                                className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-500 transition-colors text-sm font-medium"
                            >
                                {isDeletingAll ? 'Cleaning...' : 'Ya, Hapus Semua'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
