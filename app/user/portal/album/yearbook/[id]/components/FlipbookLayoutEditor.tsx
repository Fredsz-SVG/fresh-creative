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
    onUpdateAlbum?: (updates: { flipbook_bg_cover?: string; flipbook_bg_sambutan?: string; sambutan_font_family?: string; sambutan_title_color?: string; sambutan_text_color?: string }) => Promise<void>
    onUpdateClass?: (classId: string, updates: { flipbook_bg_url?: string; flipbook_font_family?: string; flipbook_title_color?: string; flipbook_text_color?: string }) => Promise<any>
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

export default function FlipbookLayoutEditor({ album, teachers, classes, membersByClass, onPlayVideo, onUpdateAlbum, onUpdateClass }: FlipbookViewProps) {
    const [activeLayout, setActiveLayout] = useState<'cover' | 'sambutan' | 'classes'>('cover')
    const [selectedClassId, setSelectedClassId] = useState<string>('')
    const [tempBackgrounds, setTempBackgrounds] = useState<Record<string, string>>({})

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

    return (
        <div className="flex flex-col lg:flex-row h-full min-h-[80vh] gap-4 max-w-7xl mx-auto px-3 py-3 sm:p-4">
            {/* Layout Sidebar / Selector */}
            <div className="w-full lg:w-64 flex flex-col gap-2 flex-shrink-0">
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
                        <p className="text-sm font-bold">Sampul / Cover</p>
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
            </div>

            {/* Styling Controls Sidebar (Contextual) */}
            {(activeLayout === 'sambutan' || activeLayout === 'classes') && (
                <div className="w-full lg:w-60 flex flex-col gap-4 flex-shrink-0 bg-white/5 rounded-xl border border-white/10 p-3">
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wide">Pengaturan Teks</h3>

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
                <div className="p-3 border-b border-white/10 bg-[#0a0a0b] flex items-center justify-between sticky top-0 z-20">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-red-500"></div>
                        <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                        <span className="ml-2 text-xs font-mono text-gray-500 uppercase tracking-widest hidden sm:inline">
                            FLIPBOOK / {activeLayout === 'cover' ? 'SAMPUL' : activeLayout === 'sambutan' ? 'SAMBUTAN' : 'KELAS'}
                        </span>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Background Upload Button */}
                        <div className="relative">
                            <input
                                type="file"
                                id="bg-upload"
                                className="hidden"
                                accept="image/*"
                                onChange={handleBackgroundChange}
                                disabled={isUploading}
                            />
                            <label
                                htmlFor="bg-upload"
                                className={`flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg cursor-pointer transition-colors text-xs text-gray-300 hover:text-white ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}
                            >
                                <ImagePlus className={`w-3.5 h-3.5 ${isUploading ? 'animate-spin' : ''}`} />
                                <span className="hidden sm:inline">{isUploading ? 'Uploading...' : 'Background'}</span>
                            </label>
                        </div>

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
                    {activeLayout === 'cover' && (
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
