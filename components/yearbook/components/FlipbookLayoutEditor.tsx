'use client'

import React, { useState, useEffect } from 'react'
import { Play, Image as ImageIcon, ImagePlus, Trash2, Loader2, BookOpen, BookMarked } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { apiUrl } from '../../../lib/api-url'
import { fetchWithAuth } from '../../../lib/api-client'

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
    const [mobileTab, setMobileTab] = useState<'pages' | 'hotspots'>('pages')
    const [uploadingCover, setUploadingCover] = useState(false)
    const [uploadingBackCover, setUploadingBackCover] = useState(false)

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
            const res = await fetchWithAuth(`/api/albums/${album.id}/flipbook`, {
                method: 'POST',
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

    // Upload Cover (page_number = 0, always first)
    const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file || !album?.id) return

        setUploadingCover(true)
        const toastId = toast.loading('Mengunggah cover...')

        try {
            const fileExt = file.name.split('.').pop()
            const fileName = `cover-${Date.now()}.${fileExt}`
            const filePath = `albums/${album.id}/flipbook/pages/${fileName}`

            const { error: uploadError } = await supabase.storage
                .from('album-photos')
                .upload(filePath, file)
            if (uploadError) throw uploadError

            const { data: { publicUrl } } = supabase.storage.from('album-photos').getPublicUrl(filePath)

            // Check if cover (page_number=1) already exists
            const existingCover = manualPages.find(p => p.page_number === 1)
            if (existingCover) {
                // Update existing cover
                const { error: updateErr } = await supabase
                    .from('manual_flipbook_pages')
                    .update({ image_url: publicUrl })
                    .eq('id', existingCover.id)
                if (updateErr) throw updateErr
            } else {
                // Shift all existing pages +1 then insert cover at page_number 1
                for (const p of manualPages.sort((a, b) => b.page_number - a.page_number)) {
                    await supabase
                        .from('manual_flipbook_pages')
                        .update({ page_number: p.page_number + 1 })
                        .eq('id', p.id)
                }
                const { error: insertErr } = await supabase
                    .from('manual_flipbook_pages')
                    .insert({ album_id: album.id, page_number: 1, image_url: publicUrl })
                if (insertErr) throw insertErr
            }

            await fetchManualPages()
            toast.success('Cover berhasil diunggah!', { id: toastId })
        } catch (error: any) {
            console.error('Cover upload error:', error)
            toast.error('Gagal mengunggah cover: ' + error.message, { id: toastId })
        } finally {
            setUploadingCover(false)
            if (e.target) e.target.value = ''
        }
    }

    // Upload Back Cover (always last page)
    const handleBackCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file || !album?.id) return

        setUploadingBackCover(true)
        const toastId = toast.loading('Mengunggah back cover...')

        try {
            const fileExt = file.name.split('.').pop()
            const fileName = `backcover-${Date.now()}.${fileExt}`
            const filePath = `albums/${album.id}/flipbook/pages/${fileName}`

            const { error: uploadError } = await supabase.storage
                .from('album-photos')
                .upload(filePath, file)
            if (uploadError) throw uploadError

            const { data: { publicUrl } } = supabase.storage.from('album-photos').getPublicUrl(filePath)

            const lastPageNumber = manualPages.length > 0
                ? Math.max(...manualPages.map(p => p.page_number)) + 1
                : 1

            const { error: insertErr } = await supabase
                .from('manual_flipbook_pages')
                .insert({ album_id: album.id, page_number: lastPageNumber, image_url: publicUrl })
            if (insertErr) throw insertErr

            await fetchManualPages()
            toast.success('Back cover berhasil diunggah!', { id: toastId })
        } catch (error: any) {
            console.error('Back cover upload error:', error)
            toast.error('Gagal mengunggah back cover: ' + error.message, { id: toastId })
        } finally {
            setUploadingBackCover(false)
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
        <div className="flex flex-col lg:flex-row min-h-[calc(100vh-140px)] lg:h-[calc(100vh-80px)] gap-4 lg:gap-6 w-full max-w-7xl mx-auto px-4 py-4 lg:py-6 overflow-x-hidden">
            {/* Mobile Tabs Toggle - Only show when we have pages */}
            {manualPages.length > 0 && (
                <div className="flex lg:hidden w-full bg-slate-100 p-1.5 rounded-xl border-4 border-slate-900 order-2 flex-shrink-0">
                    <button
                        onClick={() => setMobileTab('pages')}
                        className={`flex-1 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${mobileTab === 'pages' ? 'bg-white border-2 border-slate-900 shadow-[2px_2px_0_0_#0f172a] text-slate-900' : 'text-slate-500 border-2 border-transparent hover:text-slate-700'}`}
                    >
                        Pages
                    </button>
                    <button
                        onClick={() => setMobileTab('hotspots')}
                        className={`flex-1 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${mobileTab === 'hotspots' ? 'bg-white border-2 border-slate-900 shadow-[2px_2px_0_0_#0f172a] text-slate-900' : 'text-slate-500 border-2 border-transparent hover:text-slate-700'}`}
                    >
                        Hotspots
                    </button>
                </div>
            )}

            {/* Layout Sidebar / Selector */}
            <div className={`${mobileTab === 'pages' || manualPages.length === 0 ? 'flex' : 'hidden'} lg:flex flex-col w-full lg:w-72 gap-4 lg:gap-6 flex-shrink-0 order-3 lg:order-1 lg:h-full`}>
                {canManage && (
                    <div className="order-0 w-full bg-white rounded-2xl border-4 border-slate-900 p-4 shadow-[4px_4px_0_0_#0f172a]">
                        {/* Cover & Back Cover Upload */}
                        <div className="flex gap-2 mb-3">
                            <div className="flex-1">
                                <input
                                    type="file"
                                    id="cover-upload"
                                    className="hidden"
                                    accept="image/*"
                                    onChange={handleCoverUpload}
                                    disabled={uploadingCover}
                                />
                                <label
                                    htmlFor="cover-upload"
                                    className={`flex items-center justify-center gap-2 w-full p-3 border-4 border-dashed border-slate-200 rounded-xl cursor-pointer hover:bg-emerald-50 hover:border-emerald-400 transition-all group ${uploadingCover ? 'opacity-50 pointer-events-none' : 'active:translate-x-0.5 active:translate-y-0.5'}`}
                                >
                                    <div className="w-8 h-8 rounded-lg bg-emerald-400 border-2 border-slate-900 flex items-center justify-center group-hover:rotate-3 transition-transform shadow-[2px_2px_0_0_#0f172a] flex-shrink-0">
                                        {uploadingCover ? <Loader2 className="w-4 h-4 text-white animate-spin" /> : <BookOpen className="w-4 h-4 text-white" />}
                                    </div>
                                    <span className="text-[9px] font-black text-slate-900 uppercase tracking-widest leading-tight">
                                        {uploadingCover ? 'Uploading...' : 'Cover'}
                                    </span>
                                </label>
                            </div>
                            <div className="flex-1">
                                <input
                                    type="file"
                                    id="backcover-upload"
                                    className="hidden"
                                    accept="image/*"
                                    onChange={handleBackCoverUpload}
                                    disabled={uploadingBackCover}
                                />
                                <label
                                    htmlFor="backcover-upload"
                                    className={`flex items-center justify-center gap-2 w-full p-3 border-4 border-dashed border-slate-200 rounded-xl cursor-pointer hover:bg-orange-50 hover:border-orange-400 transition-all group ${uploadingBackCover ? 'opacity-50 pointer-events-none' : 'active:translate-x-0.5 active:translate-y-0.5'}`}
                                >
                                    <div className="w-8 h-8 rounded-lg bg-orange-400 border-2 border-slate-900 flex items-center justify-center group-hover:rotate-3 transition-transform shadow-[2px_2px_0_0_#0f172a] flex-shrink-0">
                                        {uploadingBackCover ? <Loader2 className="w-4 h-4 text-white animate-spin" /> : <BookMarked className="w-4 h-4 text-white" />}
                                    </div>
                                    <span className="text-[9px] font-black text-slate-900 uppercase tracking-widest leading-tight">
                                        {uploadingBackCover ? 'Uploading...' : 'Back Cover'}
                                    </span>
                                </label>
                            </div>
                        </div>

                        {/* PDF Upload */}
                        <div className="mb-0">
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
                                className={`flex flex-row items-center justify-start gap-4 p-4 border-4 border-dashed border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 hover:border-indigo-400 transition-all group ${uploadingPdf ? 'opacity-50 pointer-events-none' : 'active:translate-x-0.5 active:translate-y-0.5'}`}
                            >
                                <div className="w-10 h-10 rounded-xl bg-indigo-400 border-2 border-slate-900 flex items-center justify-center group-hover:rotate-3 transition-transform shadow-[2px_2px_0_0_#0f172a] flex-shrink-0">
                                    <ImagePlus className="w-5 h-5 text-white" />
                                </div>
                                <div className="text-left flex-1">
                                    <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest leading-tight">
                                        {uploadingPdf ? 'Memproses PDF...' : 'Upload PDF Baru'}
                                    </p>
                                    <p className="text-[9px] font-bold text-slate-400 mt-0.5 uppercase tracking-tight">Maks 50MB</p>
                                </div>
                            </label>
                        </div>
                    </div>
                )}

                <div className="w-full bg-white rounded-2xl border-4 border-slate-900 p-4 shadow-[4px_4px_0_0_#0f172a] h-[300px] lg:h-auto lg:flex-1 flex flex-col min-h-0">
                    <div className="flex items-center justify-between mb-3 lg:mb-4">
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                            Pages
                            <span className="bg-slate-900 text-white px-1.5 py-0.5 rounded-lg text-[9px]">{manualPages.length}</span>
                        </h3>
                        {manualPages.length > 0 && (
                            <button
                                onClick={() => setDeleteAllPagesConfirm(true)}
                                disabled={isDeletingAll}
                                className="text-[9px] font-black text-red-500 hover:text-white hover:bg-red-500 border-2 border-red-500 px-2 py-1 rounded-lg transition-all flex items-center gap-1 active:translate-x-0.5 active:translate-y-0.5"
                                title="Hapus Semua Halaman"
                            >
                                <Trash2 className="w-3 h-3" strokeWidth={3} />
                                <span className="hidden sm:inline">{isDeletingAll ? 'CLEANING...' : 'CLEAN ALL'}</span>
                                <span className="sm:hidden">{isDeletingAll ? '...' : 'CLR'}</span>
                            </button>
                        )}
                    </div>

                    <div className="flex flex-row lg:flex-col overflow-x-auto lg:overflow-y-auto min-h-0 gap-3 pb-2 lg:pb-0 lg:space-y-3 pr-1 snap-x snap-mandatory lg:snap-none hide-scrollbar">
                        {manualPages.map((page) => (
                            <button
                                key={page.id}
                                onClick={() => setSelectedManualPageId(page.id)}
                                className={`flex-shrink-0 w-[45%] lg:w-full flex flex-col lg:flex-row gap-2 lg:gap-3 p-2 rounded-xl border-4 transition-all text-left group snap-start lg:snap-align-none ${selectedManualPageId === page.id
                                    ? 'bg-amber-400 border-slate-900 shadow-[3px_3px_0_0_#0f172a]'
                                    : 'bg-white border-slate-100 hover:bg-slate-50'}`}
                            >
                                <div className="w-full lg:w-16 aspect-[3/4] lg:h-20 bg-white rounded-lg overflow-hidden flex-shrink-0 border-2 border-slate-900 relative shadow-[2px_2px_0_0_#0f172a] group-hover:shadow-none group-hover:translate-x-0.5 group-hover:translate-y-0.5 transition-all">
                                    <img src={page.image_url} className="w-full h-full object-cover" alt={`Page ${page.page_number}`} />
                                    <div className="absolute top-0 right-0 bg-slate-900 px-1.5 text-[8px] font-black text-white rounded-bl-lg">
                                        {page.page_number}
                                    </div>
                                </div>
                                <div className="flex-1 min-w-0 flex flex-col justify-center">
                                    <p className={`text-[10px] sm:text-[10px] font-black uppercase tracking-widest ${selectedManualPageId === page.id ? 'text-slate-900' : 'text-slate-900'}`}>
                                        Hal {page.page_number}
                                    </p>
                                    <p className={`text-[9px] font-bold uppercase tracking-tight mt-0.5 ${selectedManualPageId === page.id ? 'text-slate-900/60' : 'text-slate-400'}`}>
                                        {page.flipbook_video_hotspots?.length || 0} Hotspot
                                    </p>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Hotspot Configuration Sidebar */}
            <div className={`${mobileTab === 'hotspots' ? 'flex' : 'hidden'} lg:flex w-full lg:w-72 flex-col gap-4 flex-shrink-0 bg-white rounded-2xl border-4 border-slate-900 p-4 order-4 lg:order-3 h-auto lg:h-full shadow-[4px_4px_0_0_#0f172a]`}>
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">
                    {canManage ? 'Hotspot Editor' : 'Hotspots'}
                </h3>
                <div className="p-3 bg-slate-50 border-4 border-slate-900 rounded-xl mb-2">
                    <p className="text-[10px] font-bold text-slate-500 uppercase leading-relaxed">
                        {canManage
                            ? 'Klik pada halaman di area preview untuk menambahkan area interaktif (video popup).'
                            : 'Klik icon play pada halaman untuk menonton video terkait.'}
                    </p>
                </div>

                {selectedPage?.flipbook_video_hotspots && selectedPage.flipbook_video_hotspots.length > 0 ? (
                    <div className="flex-1 overflow-y-auto min-h-0 no-scrollbar pr-1 space-y-4">
                        {selectedPage.flipbook_video_hotspots.map((h, i) => (
                            <div key={h.id} className={`p-4 bg-white border-4 border-slate-900 rounded-2xl space-y-4 shadow-[4px_4px_0_0_#0f172a] ${!canManage ? 'opacity-80' : ''}`}>
                                <div className="flex items-center justify-between gap-2">
                                    {canManage ? (
                                        <input
                                            type="text"
                                            defaultValue={h.label || `Hotspot #${i + 1}`}
                                            onBlur={(e) => handleSaveHotspot(h.id, { label: e.target.value })}
                                            className="bg-transparent border-b-2 border-slate-100 hover:border-indigo-400 focus:border-indigo-400 focus:outline-none text-[10px] font-black uppercase tracking-widest text-slate-900 w-full transition-all"
                                            placeholder="NAMA HOTSPOT"
                                        />
                                    ) : (
                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-900 truncate max-w-[140px]">{h.label || `Hotspot #${i + 1}`}</span>
                                    )}
                                    {canManage && (
                                        <button
                                            onClick={() => setDeleteHotspotConfirm(h.id)}
                                            className="p-1.5 bg-red-50 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-all border-2 border-transparent hover:border-slate-900 active:translate-x-0.5 active:translate-y-0.5"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" strokeWidth={3} />
                                        </button>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                        {canManage ? 'URL Video (Youtube/MP4)' : 'Link Video'}
                                    </label>
                                    <div className="flex flex-col gap-2">
                                        {canManage ? (
                                            <>
                                                <input
                                                    type="text"
                                                    defaultValue={h.video_url}
                                                    placeholder="HTTPS://YOUTUBE.COM/WATCH?V=..."
                                                    onBlur={(e) => handleSaveHotspot(h.id, { video_url: e.target.value })}
                                                    className="w-full bg-slate-50 border-4 border-slate-900 rounded-xl px-3 py-2 text-[10px] font-black text-slate-900 focus:bg-white focus:outline-none placeholder:text-slate-300 font-mono"
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
                                                        className={`flex items-center justify-center gap-2 px-3 py-2 bg-slate-100 hover:bg-emerald-400 border-4 border-slate-900 rounded-xl cursor-pointer transition-all text-[9px] font-black uppercase tracking-widest text-slate-900 shadow-[2px_2px_0_0_#0f172a] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 ${uploadingHotspotId === h.id ? 'opacity-50 pointer-events-none' : ''}`}
                                                    >
                                                        {uploadingHotspotId === h.id ? <Loader2 className="w-3 h-3 animate-spin" strokeWidth={3} /> : <Play className="w-3 h-3" strokeWidth={3} />}
                                                        <span>{uploadingHotspotId === h.id ? 'Uploading...' : 'Upload Video File'}</span>
                                                    </label>
                                                </div>
                                            </>
                                        ) : (
                                            <p className="text-[10px] font-mono text-slate-400 italic truncate bg-slate-50 p-2 rounded-lg border-2 border-slate-100">
                                                {h.video_url || 'Belum ada URL'}
                                            </p>
                                        )}
                                    </div>
                                </div>
                                {!canManage && h.video_url && (
                                    <button
                                        onClick={() => onPlayVideo?.(h.video_url)}
                                        className="w-full py-2 bg-indigo-400 text-white border-4 border-slate-900 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-[4px_4px_0_0_#0f172a] hover:shadow-none hover:translate-x-1 hover:translate-y-1 active:translate-x-1.5 active:translate-y-1.5 transition-all"
                                    >
                                        Play Video
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-slate-50 border-4 border-dashed border-slate-200 rounded-2xl">
                        <Play className="w-10 h-10 mb-3 text-slate-200" strokeWidth={3} />
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Belum ada hotspot di halaman ini.</p>
                    </div>
                )}
            </div>

            {/* Main Preview Area */}
            <div className={`flex-1 min-w-0 bg-white rounded-2xl border-4 border-slate-900 overflow-hidden relative flex flex-col h-[60vh] sm:h-[60vh] lg:h-full order-1 lg:order-2 shadow-[8px_8px_0_0_#0f172a] shrink-0 ${manualPages.length === 0 ? 'hidden lg:flex' : ''}`}>
                <div className="flex-1 relative overflow-auto p-4 sm:p-12 flex items-center justify-center no-scrollbar bg-slate-50 min-h-[300px]">
                    {selectedPage ? (
                        <div
                            className={`relative shadow-[12px_12px_0_0_#0f172a] border-4 border-slate-900 group ${isPageReady ? 'transition-opacity duration-700 opacity-100' : 'opacity-0'}`}
                            onMouseDown={handleMouseDown}
                            onMouseMove={handleMouseMove}
                            onMouseUp={handleMouseUp}
                            onTouchStart={handleTouchStart}
                            onTouchMove={handleTouchMove}
                            onTouchEnd={handleMouseUp}
                            style={{
                                width: '100%',
                                maxWidth: '320px',
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
                                    className={`absolute group/hotspot transition-all duration-200 border-4 ${canManage ? 'border-amber-400/50 bg-amber-400/10 hover:bg-amber-400/20' : 'border-transparent'}`}
                                    style={{
                                        left: `${h.x}%`,
                                        top: `${h.y}%`,
                                        width: `${h.width}%`,
                                        height: `${h.height}%`
                                    }}
                                >
                                    {canManage && (
                                        <div className="absolute -top-6 left-0 bg-amber-400 border-2 border-slate-900 text-slate-900 text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 opacity-0 group-hover/hotspot:opacity-100 transition-opacity whitespace-nowrap shadow-[2px_2px_0_0_#0f172a]">
                                            {h.label || `Hotspot #${i + 1}`}
                                        </div>
                                    )}
                                    {!canManage && h.video_url && (
                                        <button
                                            onClick={() => onPlayVideo?.(h.video_url)}
                                            className="absolute inset-0 flex items-center justify-center bg-white/20 opacity-0 hover:opacity-100 transition-opacity w-full h-full min-w-[24px] min-h-[24px]"
                                        >
                                            <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-indigo-400 border-2 sm:border-4 border-slate-900 flex items-center justify-center text-white shadow-[2px_2px_0_0_#0f172a] sm:shadow-[4px_4px_0_0_#0f172a] transform hover:scale-110 active:scale-95 transition-all">
                                                <Play className="w-4 h-4 sm:w-6 sm:h-6 fill-current ml-0.5 sm:ml-1" />
                                            </div>
                                        </button>
                                    )}
                                </div>
                            ))}

                            {/* Drawing Preview */}
                            {drawingHotspot && (
                                <div
                                    className="absolute border-4 border-dashed border-emerald-400 bg-emerald-400/20 pointer-events-none z-50"
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
                        <div className="text-center py-20 bg-white border-4 border-dashed border-slate-200 rounded-2xl p-12">
                            <ImageIcon className="w-16 h-16 mx-auto mb-4 text-slate-200" strokeWidth={3} />
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Pilih atau upload halaman PDF untuk memulai.</p>
                        </div>
                    )}
                </div>
            </div>
            {/* Hotspot Delete Confirmation Modal */}
            {deleteHotspotConfirm && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
                    <div className="bg-white border-4 border-slate-900 rounded-[32px] p-8 max-w-md w-full shadow-[12px_12px_0_0_#0f172a] animate-in zoom-in-95 duration-200">
                        <div className="w-16 h-16 bg-red-100 border-4 border-slate-900 rounded-2xl flex items-center justify-center mb-6">
                            <Trash2 className="w-8 h-8 text-red-500" strokeWidth={3} />
                        </div>
                        <h3 className="text-xl font-black text-slate-900 mb-2 uppercase tracking-tight">Hapus Hotspot</h3>
                        <p className="text-xs font-bold text-slate-400 mb-8 uppercase tracking-wide leading-relaxed">
                            Apakah Anda yakin ingin menghapus hotspot ini secara permanen?
                        </p>
                        <div className="flex gap-4">
                            <button
                                onClick={() => setDeleteHotspotConfirm(null)}
                                className="flex-1 py-4 px-6 bg-slate-100 text-slate-900 border-4 border-slate-900 font-black rounded-2xl uppercase tracking-widest text-xs hover:bg-slate-200 transition-all active:translate-x-1 active:translate-y-1"
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
                                className="flex-1 py-4 px-6 bg-red-500 text-white border-4 border-slate-900 font-black rounded-2xl uppercase tracking-widest text-xs shadow-[4px_4px_0_0_#0f172a] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all"
                            >
                                Ya, Hapus
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete All Pages Confirmation Modal */}
            {deleteAllPagesConfirm && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
                    <div className="bg-white border-4 border-slate-900 rounded-[32px] p-8 max-w-md w-full shadow-[12px_12px_0_0_#0f172a] animate-in zoom-in-95 duration-200">
                        <div className="w-16 h-16 bg-red-100 border-4 border-slate-900 rounded-2xl flex items-center justify-center mb-6">
                            <Trash2 className="w-8 h-8 text-red-500" strokeWidth={3} />
                        </div>
                        <h3 className="text-xl font-black text-slate-900 mb-2 uppercase tracking-tight">Hapus Semua Halaman</h3>
                        <div className="space-y-4 mb-8">
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wide leading-relaxed">
                                Apakah Anda yakin ingin menghapus <strong className="text-red-500">SEMUA</strong> halaman flipbook?
                            </p>
                            <div className="bg-red-50 border-2 border-red-200 p-3 rounded-xl">
                                <p className="text-[10px] font-black text-red-500 uppercase tracking-tighter leading-tight">
                                    Tindakan ini akan menghapus semua gambar halaman dan hotspot secara permanen. Tindakan ini tidak dapat dibatalkan.
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-4">
                            <button
                                onClick={() => setDeleteAllPagesConfirm(false)}
                                className="flex-1 py-4 px-6 bg-slate-100 text-slate-900 border-4 border-slate-900 font-black rounded-2xl uppercase tracking-widest text-xs hover:bg-slate-200 transition-all active:translate-x-1 active:translate-y-1"
                            >
                                Batal
                            </button>
                            <button
                                onClick={() => {
                                    handleDeleteAllPages()
                                    setDeleteAllPagesConfirm(false)
                                }}
                                className="flex-1 py-4 px-6 bg-red-500 text-white border-4 border-slate-900 font-black rounded-2xl uppercase tracking-widest text-xs shadow-[4px_4px_0_0_#0f172a] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all"
                            >
                                {isDeletingAll ? 'CLEANING...' : 'Ya, Hapus Semua'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
