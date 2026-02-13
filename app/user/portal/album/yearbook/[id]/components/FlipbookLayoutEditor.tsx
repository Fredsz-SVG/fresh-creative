'use client'

import React, { useState, useEffect } from 'react'
import { Book, ChevronRight, Play, Layout, Users, MessageSquare, Image as ImageIcon } from 'lucide-react'

type FlipbookViewProps = {
    album: any
    teachers: any[]
    classes: any[]
    membersByClass: Record<string, any[]>
    onPlayVideo?: (url: string) => void
}

export default function FlipbookLayoutEditor({ album, teachers, classes, membersByClass, onPlayVideo }: FlipbookViewProps) {
    const [activeLayout, setActiveLayout] = useState<'cover' | 'sambutan' | 'classes'>('cover')
    const [selectedClassId, setSelectedClassId] = useState<string>('')

    // Initialize selected class when classes are loaded
    useEffect(() => {
        if (classes && classes.length > 0 && !selectedClassId) {
            setSelectedClassId(classes[0].id)
        }
    }, [classes, selectedClassId])

    const currentClass = classes?.find(c => c.id === selectedClassId) || classes?.[0]
    const currentMembers = currentClass ? membersByClass[currentClass.id] || [] : []

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

                    {/* Class Selector for Classes Layout */}
                    {activeLayout === 'classes' && classes && classes.length > 0 && (
                        <div className="flex items-center gap-2">
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

                {/* Content Canvas */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-[#121212] relative pattern-grid">
                    <style jsx>{`
             .pattern-grid {
               background-image: radial-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px);
               background-size: 24px 24px;
             }
           `}</style>

                    {/* Render Layout Content */}
                    {activeLayout === 'cover' && (
                        <div className={`max-w-md mx-auto aspect-[3/4] bg-white text-black shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex flex-col relative group cursor-pointer overflow-hidden rounded-sm transition-transform duration-500 hover:scale-[1.02] ${!album ? 'animate-pulse' : ''}`}
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
                        <div className="max-w-[480px] mx-auto bg-white aspect-[3/4] shadow-[0_20px_50px_rgba(0,0,0,0.5)] p-6 sm:p-8 text-black relative flex flex-col">
                            <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                                <MessageSquare className="w-32 h-32" />
                            </div>

                            <h2 className="text-3xl font-black uppercase border-b-4 border-black pb-4 mb-4 text-center tracking-tight">Sambutan Guru</h2>
                            <p className="text-center text-gray-500 italic mb-8 max-w-xl mx-auto text-sm">Pesan dan kesan dari para guru.</p>

                            <div className="grid grid-cols-4 gap-2">
                                {teachers?.map((teacher, idx) => (
                                    <div key={teacher.id} className="flex flex-col group cursor-pointer"
                                        onClick={() => teacher.video_url && onPlayVideo?.(teacher.video_url)}
                                    >
                                        <div className={`aspect-[3/4] bg-gray-200 overflow-hidden relative shadow-lg ${idx % 4 === 0 ? 'rounded-tl-xl rounded-br-xl' :
                                            idx % 4 === 1 ? 'rounded-t-xl' :
                                                idx % 4 === 2 ? 'rounded-tr-xl rounded-bl-xl' :
                                                    'rounded-xl'
                                            }`}>
                                            <img src={(teacher.photos && teacher.photos.length > 0) ? teacher.photos[0].file_url : (teacher.photo_url || `https://ui-avatars.com/api/?name=${teacher.name}&background=random`)} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500 scale-100 group-hover:scale-110" />
                                            {teacher.video_url && (
                                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20 backdrop-blur-[2px]">
                                                    <div className="w-6 h-6 rounded-full bg-white/90 flex items-center justify-center shadow-xl">
                                                        <Play className="w-2.5 h-2.5 text-black fill-black ml-0.5" />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                        <div className="mt-1.5 text-center">
                                            <h4 className="font-bold text-[8px] uppercase tracking-tight leading-tight">{teacher.name}</h4>
                                            <p className="text-[7px] text-gray-500 font-serif italic mt-0.5 uppercase tracking-wide">{teacher.title || 'Guru'}</p>
                                        </div>
                                    </div>
                                ))}
                                {(!teachers || teachers.length === 0) && (
                                    <div className="col-span-full py-20 text-center border-2 border-dashed border-gray-300 rounded-xl bg-gray-50">
                                        <p className="text-gray-400 font-medium">Belum ada data guru.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {activeLayout === 'classes' && (
                        <div className="max-w-[480px] mx-auto bg-white aspect-[3/4] shadow-[0_20px_50px_rgba(0,0,0,0.5)] p-6 sm:p-8 text-black relative flex flex-col">
                            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                                <Users className="w-40 h-40" />
                            </div>

                            <div className="flex flex-col sm:flex-row sm:items-end justify-between border-b-4 border-black pb-4 mb-6 gap-4">
                                <div>
                                    <span className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-1">Class Of 2024</span>
                                    <h2 className="text-3xl font-black uppercase tracking-tighter leading-none">{currentClass?.name || 'Class Name'}</h2>
                                </div>

                            </div>

                            <div className="grid grid-cols-4 gap-2">
                                {currentMembers.map((member: any, idx: number) => {
                                    // Attempt to get first photo, fallback to placeholder
                                    let photoUrl = `https://ui-avatars.com/api/?name=${member.student_name}&background=random`
                                    if (member.photos && member.photos.length > 0) {
                                        photoUrl = member.photos[0]
                                    } else if (member.file_url) {
                                        photoUrl = member.file_url
                                    }

                                    return (
                                        <div key={member.user_id || member.student_name} className="flex flex-col group cursor-pointer relative"
                                            onClick={() => member.video_url && onPlayVideo?.(member.video_url)}
                                        >
                                            <div className={`aspect-[3/4] bg-gray-100 overflow-hidden relative shadow-sm border border-gray-100 ${idx % 4 === 0 ? 'rounded-tl-xl rounded-br-xl' :
                                                idx % 4 === 1 ? 'rounded-t-xl' :
                                                    idx % 4 === 2 ? 'rounded-tr-xl rounded-bl-xl' :
                                                        'rounded-xl'
                                                }`}>
                                                <img
                                                    src={photoUrl}
                                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                                    loading="lazy"
                                                />
                                                {member.video_url && (
                                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                                        <div className="w-6 h-6 rounded-full bg-white/90 flex items-center justify-center shadow-lg transform scale-0 group-hover:scale-100 transition-transform duration-300 delay-75">
                                                            <Play className="w-2.5 h-2.5 text-lime-600 fill-lime-600 ml-0.5" />
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Video Indicator (always visible but subtle) */}
                                                {member.video_url && (
                                                    <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-lime-500 shadow-sm border border-white z-10 group-hover:opacity-0 transition-opacity"></div>
                                                )}
                                            </div>
                                            <div className="mt-1.5 text-center">
                                                <p className="text-[8px] font-bold uppercase leading-tight line-clamp-2">{member.student_name}</p>
                                            </div>
                                        </div>
                                    )
                                })}

                                {currentMembers.length === 0 && (
                                    <div className="col-span-full py-20 text-center border-2 border-dashed border-gray-300 rounded-xl bg-gray-50">
                                        <p className="text-gray-400 font-medium">Belum ada siswa di kelas ini.</p>
                                        <p className="text-xs text-gray-400 mt-1">Tambahkan siswa melalui menu Kelas</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
