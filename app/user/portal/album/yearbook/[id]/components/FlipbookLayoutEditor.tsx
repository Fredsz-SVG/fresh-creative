'use client'

import React, { useState, useEffect } from 'react'
import { Book, ChevronRight, Play, Layout, Users, MessageSquare, Image as ImageIcon, Instagram, ImagePlus } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

type FlipbookViewProps = {
    album: any
    teachers: any[]
    classes: any[]
    membersByClass: Record<string, any[]>
    onPlayVideo?: (url: string) => void
    onUpdateAlbum?: (updates: { flipbook_bg_cover?: string; flipbook_bg_sambutan?: string; sambutan_font_family?: string; sambutan_title_color?: string; sambutan_text_color?: string; flipbook_mode?: 'auto' | 'manual' }) => Promise<void>
    onUpdateClass?: (classId: string, updates: { flipbook_bg_url?: string; flipbook_font_family?: string; flipbook_title_color?: string; flipbook_text_color?: string }) => Promise<any>
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

const AVAILABLE_FONTS = [
    { label: 'Inter (Modern)', value: 'Inter' },
    { label: 'Playfair Display (Classic)', value: 'Playfair Display' },
    { label: 'Montserrat (Geometric)', value: 'Montserrat' },
    { label: 'Lato (Friendly)', value: 'Lato' },
    { label: 'Merriweather (Elegant)', value: 'Merriweather' },
    { label: 'Roboto (Neutral)', value: 'Roboto' },
    { label: 'Oswald (Bold)', value: 'Oswald' },
    { label: 'Dancing Script (Cursive)', value: 'Dancing Script' },
]

// Helper to load Google Fonts dynamically
const GoogleFontsLoader = ({ fonts }: { fonts: string[] }) => {
    useEffect(() => {
        if (fonts.length === 0) return
        const link = document.createElement('link')
        link.href = `https://fonts.googleapis.com/css2?family=${fonts.map(f => f.replace(/ /g, '+')).join('&family=')}&display=swap`
        link.rel = 'stylesheet'
        document.head.appendChild(link)
        return () => {
            document.head.removeChild(link)
        }
    }, [fonts])
    return null
}

export default function FlipbookLayoutEditor({ album, teachers, classes, membersByClass, onPlayVideo, onUpdateAlbum, onUpdateClass, canManage = false }: FlipbookViewProps) {
    const [activeLayout, setActiveLayout] = useState<'cover' | 'sambutan' | 'classes'>('cover')
    const [selectedClassId, setSelectedClassId] = useState<string>('')
    const [tempBackgrounds, setTempBackgrounds] = useState<Record<string, string>>({})

    // Manual Mode State
    const [isManualMode, setIsManualMode] = useState(album?.flipbook_mode === 'manual')
    const [manualPages, setManualPages] = useState<ManualFlipbookPage[]>([])
    const [uploadingPdf, setUploadingPdf] = useState(false)
    const [selectedManualPageId, setSelectedManualPageId] = useState<string | null>(null)
    const [drawingHotspot, setDrawingHotspot] = useState<{ startX: number; startY: number; currentX: number; currentY: number } | null>(null)
    const [uploadingHotspotId, setUploadingHotspotId] = useState<string | null>(null)

    // Load Manual Pages
    useEffect(() => {
        if (album?.id && isManualMode) {
            fetchManualPages()
        }
    }, [album?.id, isManualMode])

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

    const toggleMode = async (mode: 'auto' | 'manual') => {
        setIsManualMode(mode === 'manual')
        if (onUpdateAlbum) {
            await onUpdateAlbum({ flipbook_mode: mode })
        }
    }

    // Initialize selected class when classes are loaded
    useEffect(() => {
        if (classes && classes.length > 0 && !selectedClassId) {
            setSelectedClassId(classes[0].id)
        }
    }, [classes, selectedClassId])

    const currentClass = classes?.find(c => c.id === selectedClassId) || classes?.[0]
    const currentMembers = React.useMemo(() => {
        return currentClass ? membersByClass[currentClass.id] || [] : []
    }, [currentClass, membersByClass])

    // Collect used fonts to load
    const usedFonts = React.useMemo(() => {
        const fonts = new Set<string>()
        if (album?.sambutan_font_family) fonts.add(album.sambutan_font_family)
        classes?.forEach(c => {
            if (c.flipbook_font_family) fonts.add(c.flipbook_font_family)
        })
        return Array.from(fonts)
    }, [album, classes])

    // Helper to get current background key
    const getBackgroundKey = () => {
        if (activeLayout === 'cover') return 'cover'
        if (activeLayout === 'sambutan') return 'sambutan'
        if (activeLayout === 'classes' && selectedClassId) return `class_${selectedClassId}`
        return ''
    }

    const [isUploading, setIsUploading] = useState(false)

    const handleBackgroundChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        if (!album?.id) return

        setIsUploading(true)
        const toastId = toast.loading('Mengunggah background...')

        try {
            // 1. Local Preview
            const url = URL.createObjectURL(file)
            const key = getBackgroundKey()
            if (key) {
                setTempBackgrounds(prev => ({ ...prev, [key]: url }))
            }

            // 2. Upload to Storage
            const fileExt = file.name.split('.').pop()
            const fileName = `flipbook-bg-${album.id}-${key}-${Date.now()}.${fileExt}`
            const filePath = `${fileName}`

            const { error: uploadError } = await supabase.storage
                .from('album-photos')
                .upload(filePath, file)

            if (uploadError) {
                toast.error('Gagal mengunggah gambar ke storage: ' + uploadError.message, { id: toastId })
                setIsUploading(false)
                return
            }

            const { data: { publicUrl } } = supabase.storage
                .from('album-photos')
                .getPublicUrl(filePath)

            // 3. Save to DB
            let saveResult = null
            if (activeLayout === 'cover') {
                saveResult = await onUpdateAlbum?.({ flipbook_bg_cover: publicUrl })
            } else if (activeLayout === 'sambutan') {
                saveResult = await onUpdateAlbum?.({ flipbook_bg_sambutan: publicUrl })
            } else if (activeLayout === 'classes' && selectedClassId) {
                // @ts-ignore
                saveResult = await onUpdateClass?.(selectedClassId, { flipbook_bg_url: publicUrl })
            }

            if (saveResult) {
                toast.success('Background berhasil diperbarui!', { id: toastId })
            } else {
                toast.error('Gagal menyimpan ke database.', { id: toastId })
            }
        } catch (error: any) {
            console.error('Error handling background change:', error)
            toast.error('Terjadi kesalahan: ' + (error.message || 'Unknown error'), { id: toastId })
        } finally {
            setIsUploading(false)
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

        // Calculate dimensions
        const x = Math.min(startX, currentX)
        const y = Math.min(startY, currentY)
        const width = Math.abs(currentX - startX)
        const height = Math.abs(currentY - startY)

        // Finalize drawing state
        setDrawingHotspot(null)

        // Minimum size check (e.g. 1% width/height) to avoid accidental tiny hotspots
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
            toast.success('Hotspot area ditambahkan! Masukkan URL video di sidebar.')
        } else if (error) {
            console.error('Error saving hotspot:', error)
            toast.error('Gagal menyimpan hotspot')
        }
    }

    const handleHotspotVideoUpload = async (hotspotId: string, e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file || !album?.id) return

        setUploadingHotspotId(hotspotId)
        const toastId = toast.loading('Mengunggah video...')

        try {
            const fileExt = file.name.split('.').pop()
            const fileName = `hotspot_${hotspotId}_${Math.random()}.${fileExt}`
            const filePath = `albums/${album.id}/hotspots/${fileName}`

            const { data, error: uploadError } = await supabase.storage
                .from('album-photos')
                .upload(filePath, file)

            if (uploadError) throw uploadError

            const { data: { publicUrl } } = supabase.storage
                .from('album-photos')
                .getPublicUrl(filePath)

            // Update database
            const { error: updateError } = await supabase
                .from('flipbook_video_hotspots')
                .update({ video_url: publicUrl })
                .eq('id', hotspotId)

            if (updateError) throw updateError

            // Update local state
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

            // Load pdfjs from CDN to bypass bundler/canvas dependency issues
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
                        const fileName = `manual-page-${album.id}-${Date.now()}-${i}.jpg`
                        const { error: uploadError } = await supabase.storage
                            .from('album-photos')
                            .upload(fileName, blob)

                        if (!uploadError) {
                            const { data: { publicUrl } } = supabase.storage.from('album-photos').getPublicUrl(fileName)

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

    const selectedPage = manualPages.find(p => p.id === selectedManualPageId)

    return (
        <div className="flex flex-col lg:flex-row h-full min-h-[80vh] gap-4 max-w-7xl mx-auto px-3 py-3 sm:p-4">
            {/* Layout Sidebar / Selector */}
            <div className="w-full lg:w-64 flex flex-col gap-2 flex-shrink-0">
                {canManage && (
                    <div className="flex items-center gap-2 p-1 bg-white/5 rounded-lg mb-4 border border-white/10">
                        <button
                            onClick={() => toggleMode('auto')}
                            className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${!isManualMode ? 'bg-lime-500 text-black shadow-lg' : 'text-gray-400 hover:text-white'}`}
                        >
                            Automatic
                        </button>
                        <button
                            onClick={() => toggleMode('manual')}
                            className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${isManualMode ? 'bg-lime-500 text-black shadow-lg' : 'text-gray-400 hover:text-white'}`}
                        >
                            Manual PDF
                        </button>
                    </div>
                )}

                {!isManualMode ? (
                    <>
                        <h3 className="text-sm font-bold text-gray-400 mb-2 uppercase tracking-wide px-2">Layout Editor</h3>

                        <button
                            onClick={() => setActiveLayout('cover')}
                            className={`flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${activeLayout === 'cover'
                                ? 'bg-lime-500/20 border-lime-500/40 text-lime-400'
                                : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10 hover:text-white'}`}
                        >
                            <div className="p-2 rounded-lg bg-white/5 border border-white/5">
                                <Layout className="w-5 h-5" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold">Sampul</p>
                                <p className="text-[10px] opacity-60 truncate">Halaman depan interaktif</p>
                            </div>
                            {activeLayout === 'cover' && <div className="w-1.5 h-1.5 rounded-full bg-lime-400 shadow-[0_0_8px_rgba(132,204,22,0.5)]" />}
                        </button>

                        <button
                            onClick={() => setActiveLayout('sambutan')}
                            className={`flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${activeLayout === 'sambutan'
                                ? 'bg-lime-500/20 border-lime-500/40 text-lime-400'
                                : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10 hover:text-white'}`}
                        >
                            <div className="p-2 rounded-lg bg-white/5 border border-white/5">
                                <MessageSquare className="w-5 h-5" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold">Sambutan</p>
                                <p className="text-[10px] opacity-60 truncate">Daftar guru & staff</p>
                            </div>
                            {activeLayout === 'sambutan' && <div className="w-1.5 h-1.5 rounded-full bg-lime-400 shadow-[0_0_8px_rgba(132,204,22,0.5)]" />}
                        </button>

                        <button
                            onClick={() => setActiveLayout('classes')}
                            className={`flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${activeLayout === 'classes'
                                ? 'bg-lime-500/20 border-lime-500/40 text-lime-400'
                                : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10 hover:text-white'}`}
                        >
                            <div className="p-2 rounded-lg bg-white/5 border border-white/5">
                                <Users className="w-5 h-5" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold">Kelas</p>
                                <p className="text-[10px] opacity-60 truncate">Grid foto siswa</p>
                            </div>
                            {activeLayout === 'classes' && <div className="w-1.5 h-1.5 rounded-full bg-lime-400 shadow-[0_0_8px_rgba(132,204,22,0.5)]" />}
                        </button>
                    </>
                ) : (
                    <>
                        {canManage && (
                            <div className="mb-4">
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
                        )}

                        <h3 className="text-sm font-bold text-gray-400 mb-2 uppercase tracking-wide px-2 flex items-center justify-between">
                            Pages
                            <span className="text-xs bg-white/10 px-1.5 py-0.5 rounded text-white">{manualPages.length}</span>
                        </h3>

                        <div className="max-h-[420px] overflow-y-auto min-h-0 space-y-2 pr-1 no-scrollbar">
                            {manualPages.map((page) => (
                                <button
                                    key={page.id}
                                    onClick={() => setSelectedManualPageId(page.id)}
                                    className={`w-full flex gap-3 p-2 rounded-lg border transition-all text-left group ${selectedManualPageId === page.id
                                        ? 'bg-lime-500/10 border-lime-500/30 ring-1 ring-lime-500/20'
                                        : 'bg-white/5 border-white/5 hover:bg-white/10'}`}
                                >
                                    <div className="w-12 h-16 bg-gray-900 rounded-sm overflow-hidden flex-shrink-0 border border-white/10 relative">
                                        <img src={page.image_url} className="w-full h-full object-cover" />
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
                    </>
                )}
            </div>

            {/* Styling Controls Sidebar (Contextual) / Hotspot Sidebar */}
            {isManualMode ? (
                // Hotspot Configuration Sidebar
                <div className="w-full lg:w-64 flex flex-col gap-4 flex-shrink-0 bg-white/5 rounded-xl border border-white/10 p-3">
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wide">
                        {canManage ? 'Hotspot Editor' : 'Hotspots'}
                    </h3>
                    <p className="text-[10px] text-gray-500 bg-white/5 p-2 rounded">
                        {canManage
                            ? 'Klik pada halaman di area preview untuk menambahkan area interaktif (video popup).'
                            : 'Klik icon play pada halaman untuk menonton video terkait.'}
                    </p>

                    {selectedPage?.flipbook_video_hotspots && selectedPage.flipbook_video_hotspots.length > 0 ? (
                        <div className="max-h-[400px] overflow-y-auto no-scrollbar pr-1 space-y-3">
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
                                                onClick={() => handleDeleteHotspot(h.id)}
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
            ) : canManage && (activeLayout === 'sambutan' || activeLayout === 'classes') && (
                <div className="w-full lg:w-60 flex flex-col gap-4 flex-shrink-0 bg-white/5 rounded-xl border border-white/10 p-3">
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wide">Pengaturan Layout</h3>

                    {/* Background Settings (Moved from Toolbar) */}
                    <div className="space-y-2 pb-4 border-b border-white/10">
                        <label className="text-xs text-gray-400">Background Image</label>
                        <div className="relative">
                            <input
                                type="file"
                                id="bg-upload-sidebar"
                                className="hidden"
                                accept="image/*"
                                onChange={handleBackgroundChange}
                                disabled={isUploading}
                            />
                            <label
                                htmlFor="bg-upload-sidebar"
                                className={`flex items-center justify-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg cursor-pointer transition-colors text-xs text-gray-300 hover:text-white w-full ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}
                            >
                                <ImagePlus className={`w-3.5 h-3.5 ${isUploading ? 'animate-spin' : ''}`} />
                                <span>{isUploading ? 'Uploading...' : 'Ganti Background'}</span>
                            </label>
                        </div>
                    </div>

                    {activeLayout === 'sambutan' && (
                        <>
                            <div className="space-y-2">
                                <label className="text-xs text-gray-400">Jenis Font</label>
                                <select
                                    value={album?.sambutan_font_family || 'Inter'}
                                    onChange={(e) => onUpdateAlbum?.({ sambutan_font_family: e.target.value })}
                                    className="w-full bg-black/20 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-lime-500"
                                >
                                    {AVAILABLE_FONTS.map(f => <option key={f.value} value={f.value} className="text-black">{f.label}</option>)}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs text-gray-400">Warna Judul</label>
                                <div className="flex gap-2 items-center">
                                    <input
                                        type="color"
                                        value={album?.sambutan_title_color || '#000000'}
                                        onChange={(e) => onUpdateAlbum?.({ sambutan_title_color: e.target.value })}
                                        className="w-8 h-8 rounded cursor-pointer bg-transparent border-0 p-0"
                                    />
                                    <span className="text-xs text-gray-500 font-mono">{album?.sambutan_title_color || '#000000'}</span>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs text-gray-400">Warna Teks</label>
                                <div className="flex gap-2 items-center">
                                    <input
                                        type="color"
                                        value={album?.sambutan_text_color || '#000000'}
                                        onChange={(e) => onUpdateAlbum?.({ sambutan_text_color: e.target.value })}
                                        className="w-8 h-8 rounded cursor-pointer bg-transparent border-0 p-0"
                                    />
                                    <span className="text-xs text-gray-500 font-mono">{album?.sambutan_text_color || '#000000'}</span>
                                </div>
                            </div>
                        </>
                    )}

                    {activeLayout === 'classes' && currentClass && (
                        <>
                            <div className="p-2 bg-yellow-500/10 border border-yellow-500/20 rounded-lg mb-2">
                                <p className="text-[10px] text-yellow-500">Pengaturan ini khusus untuk kelas <strong>{currentClass.name}</strong></p>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs text-gray-400">Jenis Font</label>
                                <select
                                    value={currentClass.flipbook_font_family || 'Inter'}
                                    onChange={(e) => onUpdateClass?.(currentClass.id, { flipbook_font_family: e.target.value })}
                                    className="w-full bg-black/20 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-lime-500"
                                >
                                    {AVAILABLE_FONTS.map(f => <option key={f.value} value={f.value} className="text-black">{f.label}</option>)}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs text-gray-400">Warna Nama Kelas</label>
                                <div className="flex gap-2 items-center">
                                    <input
                                        type="color"
                                        value={currentClass.flipbook_title_color || '#000000'}
                                        onChange={(e) => onUpdateClass?.(currentClass.id, { flipbook_title_color: e.target.value })}
                                        className="w-8 h-8 rounded cursor-pointer bg-transparent border-0 p-0"
                                    />
                                    <span className="text-xs text-gray-500 font-mono">{currentClass.flipbook_title_color || '#000000'}</span>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs text-gray-400">Warna Nama Siswa</label>
                                <div className="flex gap-2 items-center">
                                    <input
                                        type="color"
                                        value={currentClass.flipbook_text_color || '#000000'}
                                        onChange={(e) => onUpdateClass?.(currentClass.id, { flipbook_text_color: e.target.value })}
                                        className="w-8 h-8 rounded cursor-pointer bg-transparent border-0 p-0"
                                    />
                                    <span className="text-xs text-gray-500 font-mono">{currentClass.flipbook_text_color || '#000000'}</span>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* Main Preview Area */}
            <div className="flex-1 bg-[#1a1a1c] rounded-2xl border border-white/10 overflow-hidden flex flex-col relative shadow-2xl">
                {/* Toolbar */}
                <div className="h-14 px-4 border-b border-white/10 bg-[#0a0a0b] flex items-center justify-between sticky top-0 z-20">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-red-500"></div>
                        <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                        <span className="ml-2 text-sm font-mono text-gray-500 uppercase tracking-widest hidden sm:inline">
                            FLIPBOOK / {activeLayout === 'cover' ? 'SAMPUL' : activeLayout === 'sambutan' ? 'SAMBUTAN' : 'KELAS'}
                        </span>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Background Upload Button Removed from here */}

                        {/* Class Selector for Classes Layout */}
                        {activeLayout === 'classes' && classes && classes.length > 0 && (
                            <div className="flex items-center gap-2 border-l border-white/10 pl-3">
                                <span className="text-xs text-gray-500 hidden sm:inline">Pilih Kelas:</span>
                                <select
                                    value={selectedClassId}
                                    onChange={(e) => setSelectedClassId(e.target.value)}
                                    className="bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-lime-500 focus:bg-white/10 transition-colors"
                                >
                                    {classes.map(c => <option key={c.id} value={c.id} className="bg-[#1a1a1c]">{c.name}</option>)}
                                </select>
                            </div>
                        )}
                    </div>
                </div>

                {/* Content Canvas */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-[#121212] relative pattern-grid">
                    <style jsx>{`
             .pattern-grid {
               background-image: radial-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px);
               background-size: 24px 24px;
             }
           `}</style>

                    <GoogleFontsLoader fonts={usedFonts} />
                    {/* Render Layout Content */}
                    {isManualMode ? (
                        <div
                            className="max-w-[480px] mx-auto aspect-[210/297] bg-white text-black shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex flex-col relative group cursor-crosshair overflow-hidden rounded-sm transition-all duration-300 select-none"
                            onMouseDown={handleMouseDown}
                            onMouseMove={handleMouseMove}
                            onMouseUp={handleMouseUp}
                        >
                            {selectedPage ? (
                                <>
                                    <img
                                        src={selectedPage.image_url}
                                        className="w-full h-full object-contain pointer-events-none select-none"
                                        alt={`Page ${selectedPage.page_number}`}
                                        draggable="false"
                                    />

                                    {/* Render Drawing Preview */}
                                    {drawingHotspot && (
                                        <div
                                            className="absolute border-2 border-dashed border-lime-500 bg-lime-500/10 pointer-events-none"
                                            style={{
                                                left: `${Math.min(drawingHotspot.startX, drawingHotspot.currentX)}%`,
                                                top: `${Math.min(drawingHotspot.startY, drawingHotspot.currentY)}%`,
                                                width: `${Math.abs(drawingHotspot.currentX - drawingHotspot.startX)}%`,
                                                height: `${Math.abs(drawingHotspot.currentY - drawingHotspot.startY)}%`,
                                                zIndex: 40
                                            }}
                                        />
                                    )}

                                    {/* Render Hotspots */}
                                    {selectedPage.flipbook_video_hotspots?.map((h, i) => (
                                        <div
                                            key={h.id}
                                            className="absolute border-2 border-lime-500 bg-lime-500/20 group/hotspot flex items-center justify-center hover:bg-lime-500/40 transition-colors"
                                            style={{
                                                left: `${h.x}%`,
                                                top: `${h.y}%`,
                                                width: `${h.width}%`,
                                                height: `${h.height}%`,
                                            }}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (h.video_url) {
                                                    onPlayVideo?.(h.video_url);
                                                } else {
                                                    toast.info('Masukkan URL video di sidebar untuk hotspot ini');
                                                }
                                            }}
                                        >
                                            <div className="bg-lime-500 p-1 rounded-full text-black opacity-0 group/icon group-hover/hotspot:opacity-100 transition-opacity flex items-center justify-center shadow-lg">
                                                <Play className="w-4 h-4" />
                                            </div>
                                            {!h.video_url && (
                                                <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 border border-white rounded-full flex items-center justify-center">
                                                    <span className="text-[6px] text-white">!</span>
                                                </div>
                                            )}
                                        </div>
                                    ))}

                                    <div className="absolute top-2 left-2 bg-black/60 text-white text-[10px] px-2 py-1 rounded backdrop-blur-md font-bold">
                                        Halaman {selectedPage.page_number}
                                    </div>
                                    {canManage && (
                                        <div className="absolute bottom-2 inset-x-0 text-center opacity-0 group-hover:opacity-100 transition-opacity">
                                            <span className="bg-black/80 text-white text-[8px] px-2 py-0.5 rounded backdrop-blur-md uppercase tracking-widest">
                                                Click to Add Hotspot
                                            </span>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="flex-1 flex flex-col items-center justify-center text-gray-400 gap-4">
                                    <ImagePlus className="w-16 h-16 opacity-10" />
                                    <div className="text-center">
                                        <p className="text-sm font-bold opacity-40 uppercase tracking-widest">Pilih Halaman</p>
                                        <p className="text-[10px] opacity-30 mt-1">Gunakan sidebar untuk navigasi</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : activeLayout === 'cover' && (
                        <div className={`max-w-[480px] mx-auto aspect-[210/297] bg-white bg-cover bg-center text-black shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex flex-col relative group cursor-pointer overflow-hidden rounded-sm transition-transform duration-500 hover:scale-[1.02] ${!album ? 'animate-pulse' : ''}`}
                            style={{ backgroundImage: (tempBackgrounds['cover'] || album?.flipbook_bg_cover) ? `url('${tempBackgrounds['cover'] || album?.flipbook_bg_cover}')` : undefined }}
                            onClick={() => album?.cover_video_url && onPlayVideo?.(album.cover_video_url)}
                        >
                            {/* Use album cover */}
                            {album?.cover_image_url ? (
                                <img src={album.cover_image_url} className="w-full h-full object-cover" />
                            ) : (
                                <div className="flex-1 flex flex-col items-center justify-center bg-gray-100 text-gray-400 gap-2">
                                    <ImageIcon className="w-12 h-12 opacity-20" />
                                    <span className="text-xs uppercase tracking-widest font-bold opacity-40">Cover Image</span>
                                </div>
                            )}

                            {/* Play Button Overlay if video exists */}
                            {album?.cover_video_url && (
                                <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition-colors">
                                    <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center shadow-2xl transform group-hover:scale-110 transition-all duration-300">
                                        <Play className="w-7 h-7 text-white fill-white ml-1" />
                                    </div>
                                </div>
                            )}

                            {/* Title Overlay */}
                            <div className="absolute inset-x-0 bottom-0 p-8 bg-gradient-to-t from-black/90 via-black/50 to-transparent text-white pt-24">
                                <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tight leading-none mb-2">{album?.name || 'Yearbook'}</h1>
                                <p className="opacity-80 text-sm font-medium tracking-wide uppercase text-lime-400">{album?.description || 'School Memory'}</p>
                                {album?.cover_video_url && (
                                    <p className="mt-4 text-[10px] uppercase tracking-widest opacity-60 border-t border-white/20 pt-4 flex items-center gap-2">
                                        <Play className="w-3 h-3" /> Click Image to Play Video
                                    </p>
                                )}
                            </div>
                        </div>
                    )}

                    {activeLayout === 'sambutan' && (
                        <div className="flex flex-col gap-8">
                            {(!teachers || teachers.length === 0) ? (
                                <div className="max-w-[480px] mx-auto bg-white bg-cover bg-center aspect-[210/297] shadow-[0_20px_50px_rgba(0,0,0,0.5)] p-6 sm:p-8 text-black relative flex flex-col transition-all duration-300"
                                    style={{ backgroundImage: (tempBackgrounds['sambutan'] || album?.flipbook_bg_sambutan) ? `url('${tempBackgrounds['sambutan'] || album?.flipbook_bg_sambutan}')` : undefined }}
                                >
                                    <div className="col-span-full py-20 text-center border-2 border-dashed border-gray-300 rounded-xl bg-gray-50 flex-1 flex flex-col items-center justify-center">
                                        <p className="text-gray-400 font-medium">Belum ada data guru.</p>
                                    </div>
                                </div>
                            ) : (
                                Array.from({ length: Math.ceil(teachers.length / 9) }).map((_, pageIdx) => {
                                    const pageTeachers = teachers.slice(pageIdx * 9, (pageIdx + 1) * 9)
                                    return (
                                        <div key={pageIdx} className="max-w-[480px] mx-auto bg-white bg-cover bg-center aspect-[210/297] shadow-[0_20px_50px_rgba(0,0,0,0.5)] p-6 sm:p-8 text-black relative flex flex-col transition-all duration-300"
                                            style={{ backgroundImage: (tempBackgrounds['sambutan'] || album?.flipbook_bg_sambutan) ? `url('${tempBackgrounds['sambutan'] || album?.flipbook_bg_sambutan}')` : undefined }}
                                        >
                                            <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                                            </div>

                                            <h2
                                                className="text-3xl font-black uppercase border-b-4 border-black pb-4 mb-8 text-center tracking-tight"
                                                style={{
                                                    fontFamily: album?.sambutan_font_family || 'Inter',
                                                    color: album?.sambutan_title_color || '#000000',
                                                    borderColor: album?.sambutan_title_color || '#000000'
                                                }}
                                            >
                                                Sambutan {Math.ceil(teachers.length / 9) > 1 ? `(${pageIdx + 1})` : ''}
                                            </h2>

                                            <div className="grid grid-cols-3 gap-3">
                                                {pageTeachers.map((teacher) => (
                                                    <div key={teacher.id} className="flex flex-col relative">
                                                        <div
                                                            className="aspect-[3/4] bg-gray-100 overflow-hidden relative shadow-sm border border-gray-100 rounded-xl cursor-pointer group"
                                                            onClick={() => teacher.video_url && onPlayVideo?.(teacher.video_url)}
                                                        >
                                                            <img
                                                                src={(teacher.photos && teacher.photos.length > 0) ? teacher.photos[0].file_url : (teacher.photo_url || `https://ui-avatars.com/api/?name=${teacher.name}&background=random`)}
                                                                className="w-full h-full object-cover"
                                                                loading="lazy"
                                                            />
                                                            {teacher.video_url && (
                                                                <div className="absolute inset-0 bg-transparent flex items-center justify-center cursor-pointer">
                                                                </div>
                                                            )}

                                                            {/* Video Indicator (always visible but subtle) */}
                                                            {teacher.video_url && (
                                                                <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-lime-500 shadow-sm border border-white z-10 group-hover:opacity-0 transition-opacity"></div>
                                                            )}
                                                        </div>
                                                        <div className="mt-2 text-center space-y-1">
                                                            <div className="px-2 py-1.5 border border-black/10 rounded-lg bg-white/60 backdrop-blur-sm shadow-sm">
                                                                <p
                                                                    className="text-[10px] font-bold uppercase leading-tight line-clamp-2"
                                                                    style={{
                                                                        fontFamily: album?.sambutan_font_family || 'Inter',
                                                                        color: album?.sambutan_text_color || '#111827'
                                                                    }}
                                                                >
                                                                    {teacher.name}
                                                                </p>
                                                            </div>

                                                            <div className="px-2 py-1.5 border border-black/10 rounded-lg bg-white/60 backdrop-blur-sm shadow-sm space-y-0.5">
                                                                <p className="text-[8px] text-lime-700 font-serif italic uppercase tracking-wide bg-lime-500/10 rounded px-1 py-0.5 inline-block mb-1">{teacher.title || 'Guru'}</p>

                                                                {teacher.message && (
                                                                    <p
                                                                        className="text-[8px] italic leading-snug px-1 border-t border-black/5 pt-1 mt-1"
                                                                        style={{ color: (album?.sambutan_text_color) ? `${album.sambutan_text_color}99` : '#6b7280' }}
                                                                    >
                                                                        "{teacher.message}"
                                                                    </p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>

                                            {/* Page Number */}
                                            <div className="absolute bottom-4 left-0 right-0 text-center opacity-40 text-[10px]">
                                                {pageIdx + 1}
                                            </div>
                                        </div>
                                    )
                                })
                            )}
                        </div>
                    )}

                    {activeLayout === 'classes' && (
                        <div className="flex flex-col gap-8">
                            {currentMembers.length === 0 ? (
                                <div className="max-w-[480px] mx-auto bg-white bg-cover bg-center aspect-[210/297] shadow-[0_20px_50px_rgba(0,0,0,0.5)] p-6 sm:p-8 text-black relative flex flex-col transition-all duration-300"
                                    style={{ backgroundImage: ((selectedClassId && tempBackgrounds[`class_${selectedClassId}`]) || currentClass?.flipbook_bg_url) ? `url('${(selectedClassId && tempBackgrounds[`class_${selectedClassId}`]) || currentClass?.flipbook_bg_url}')` : undefined }}
                                >
                                    <div className="col-span-full py-20 text-center border-2 border-dashed border-gray-300 rounded-xl bg-gray-50 flex-1 flex flex-col items-center justify-center">
                                        <p className="text-gray-400 font-medium">Belum ada siswa di kelas ini.</p>
                                        <p className="text-xs text-gray-400 mt-1">Tambahkan siswa melalui menu Kelas</p>
                                    </div>
                                </div>
                            ) : (
                                Array.from({ length: Math.ceil(currentMembers.length / 9) }).map((_, pageIdx) => {
                                    const pageMembers = currentMembers.slice(pageIdx * 9, (pageIdx + 1) * 9)
                                    return (
                                        <div key={pageIdx} className="max-w-[480px] mx-auto bg-white bg-cover bg-center aspect-[210/297] shadow-[0_20px_50px_rgba(0,0,0,0.5)] p-6 sm:p-8 text-black relative flex flex-col transition-all duration-300"
                                            style={{ backgroundImage: ((selectedClassId && tempBackgrounds[`class_${selectedClassId}`]) || currentClass?.flipbook_bg_url) ? `url('${(selectedClassId && tempBackgrounds[`class_${selectedClassId}`]) || currentClass?.flipbook_bg_url}')` : undefined }}
                                        >
                                            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                                                <Users className="w-40 h-40" />
                                            </div>

                                            {/* Batch Photo Header - Only on First Page */}
                                            {pageIdx === 0 && currentClass?.batch_photo_url && (
                                                <div className="w-full aspect-video bg-gray-100 rounded-xl overflow-hidden mb-6 shadow-sm border border-gray-200">
                                                    <img src={currentClass.batch_photo_url} className="w-full h-full object-cover" alt="Foto Angkatan" />
                                                </div>
                                            )}

                                            <div className="flex flex-col sm:flex-row sm:items-end justify-between border-b-4 border-black pb-4 mb-6 gap-4">
                                                <div>
                                                    <span
                                                        className="text-xs font-bold uppercase tracking-widest block mb-1 opacity-60"
                                                        style={{ fontFamily: currentClass?.flipbook_font_family || 'Inter', color: currentClass?.flipbook_title_color || '#000000' }}
                                                    >
                                                        Class Of {new Date().getFullYear()}
                                                    </span>
                                                    <h2
                                                        className="text-3xl font-black uppercase tracking-tighter leading-none"
                                                        style={{ fontFamily: currentClass?.flipbook_font_family || 'Inter', color: currentClass?.flipbook_title_color || '#000000' }}
                                                    >
                                                        {currentClass?.name || 'Class Name'} {Math.ceil(currentMembers.length / 9) > 1 ? `(${pageIdx + 1})` : ''}
                                                    </h2>
                                                </div>

                                            </div>

                                            <div className="grid grid-cols-3 gap-3">
                                                {pageMembers.map((member: any) => {
                                                    // Attempt to get first photo, fallback to placeholder
                                                    let photoUrl = `https://ui-avatars.com/api/?name=${member.student_name}&background=random`
                                                    if (member.photos && member.photos.length > 0) {
                                                        photoUrl = member.photos[0]
                                                    } else if (member.file_url) {
                                                        photoUrl = member.file_url
                                                    }

                                                    return (
                                                        <div key={member.user_id || member.student_name} className="flex flex-col relative">
                                                            <div
                                                                className="aspect-[3/4] bg-gray-100 overflow-hidden relative shadow-sm border border-gray-100 rounded-xl cursor-pointer group"
                                                                onClick={() => member.video_url && onPlayVideo?.(member.video_url)}
                                                            >
                                                                <img
                                                                    src={photoUrl}
                                                                    className="w-full h-full object-cover"
                                                                    loading="lazy"
                                                                />
                                                                {member.video_url && (
                                                                    <div className="absolute inset-0 bg-transparent flex items-center justify-center cursor-pointer">
                                                                    </div>
                                                                )}

                                                                {/* Video Indicator (always visible but subtle) */}
                                                                {member.video_url && (
                                                                    <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-lime-500 shadow-sm border border-white z-10 group-hover:opacity-0 transition-opacity"></div>
                                                                )}
                                                            </div>
                                                            <div className="mt-2 text-center space-y-1 w-full">
                                                                <div className="px-2 py-1.5 border border-black/10 rounded-lg bg-white/60 backdrop-blur-sm shadow-sm">
                                                                    <p
                                                                        className="text-[10px] font-bold uppercase leading-tight line-clamp-2"
                                                                        style={{
                                                                            fontFamily: currentClass?.flipbook_font_family || 'Inter',
                                                                            color: currentClass?.flipbook_text_color || '#111827'
                                                                        }}
                                                                    >
                                                                        {member.student_name}
                                                                    </p>
                                                                </div>

                                                                <div
                                                                    className="px-2 py-1.5 border border-black/10 rounded-lg bg-white/60 backdrop-blur-sm shadow-sm space-y-1 w-full flex flex-col items-center cursor-pointer hover:bg-white/80 transition-colors"
                                                                    onClick={(e) => {
                                                                        if (member.instagram) {
                                                                            e.stopPropagation()
                                                                            window.open(`https://instagram.com/${member.instagram.replace('@', '')}`, '_blank')
                                                                        }
                                                                    }}
                                                                >
                                                                    {member.date_of_birth && (
                                                                        <p className="text-[8px] text-gray-600 leading-tight font-medium">{member.date_of_birth}</p>
                                                                    )}

                                                                    {member.instagram && (
                                                                        <div className="flex items-center justify-center gap-1 text-blue-600 hover:text-blue-700">
                                                                            <Instagram className="w-2.5 h-2.5" />
                                                                            <span className="text-[8px] font-semibold truncate max-w-[80px]">@{member.instagram.replace('@', '')}</span>
                                                                        </div>
                                                                    )}

                                                                    {member.message && (
                                                                        <p className="text-[8px] text-gray-500 italic leading-snug px-1 border-t border-black/5 pt-1 mt-1">"{member.message}"</p>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )
                                                })}
                                            </div>

                                            {/* Page Number */}
                                            <div className="absolute bottom-4 left-0 right-0 text-center opacity-40 text-[10px]">
                                                {pageIdx + 1}
                                            </div>
                                        </div>
                                    )
                                })
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
