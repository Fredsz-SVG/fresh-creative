'use client'

import { useState, useEffect, useRef } from 'react'
import { Upload, Trash2, Copy, FileIcon, Video, Loader2, Image as ImageIcon, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'
import Image from 'next/image'

type UserAsset = {
    id: string
    file_url: string
    file_name: string
    file_type: string
    size_bytes: number
    created_at: string
}

type FileExplorerProps = {
    initialData?: UserAsset[]
}

export default function FileExplorer({ initialData }: FileExplorerProps) {
    const [files, setFiles] = useState<UserAsset[]>(initialData || [])
    const [loading, setLoading] = useState(!initialData)
    const [uploading, setUploading] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const fetchFiles = async () => {
        try {
            const res = await fetch('/api/user/files')
            if (res.ok) {
                const data = await res.json()
                setFiles(data)
            } else {
                toast.error('Gagal memuat file')
            }
        } catch (e) {
            toast.error('Terjadi kesalahan')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (!initialData) {
            fetchFiles()
        }
    }, [initialData])

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setUploading(true)
        const formData = new FormData()
        formData.append('file', file)

        try {
            const res = await fetch('/api/user/files', {
                method: 'POST',
                body: formData
            })
            if (res.ok) {
                toast.success('File berhasil diupload')
                fetchFiles()
            } else {
                const data = await res.json()
                toast.error(data.error || 'Gagal upload')
            }
        } catch (error) {
            toast.error('Terjadi kesalahan saat upload')
        } finally {
            setUploading(false)
            if (fileInputRef.current) fileInputRef.current.value = ''
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Hapus file ini?')) return

        try {
            const res = await fetch(`/api/user/files/${id}`, {
                method: 'DELETE'
            })
            if (res.ok) {
                toast.success('File dihapus')
                setFiles(prev => prev.filter(f => f.id !== id))
            } else {
                toast.error('Gagal menghapus file')
            }
        } catch (e) {
            toast.error('Gagal menghapus file')
        }
    }

    const copyLink = (url: string) => {
        navigator.clipboard.writeText(url)
        toast.success('Link disalin')
    }

    const formatSize = (bytes: number) => {
        if (bytes === 0) return '0 B'
        const k = 1024
        const sizes = ['B', 'KB', 'MB', 'GB']
        const i = Math.floor(Math.log(bytes) / Math.log(k))
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
    }

    const isImage = (type: string) => type?.startsWith('image/')
    const isVideo = (type: string) => type?.startsWith('video/')

    return (
        <div className="p-0 sm:p-0 md:p-0">
            {/* Header Section matching AlbumsView */}
            <div className="flex flex-col gap-4 mb-5 md:mb-6 md:flex-row md:justify-between md:items-center">
                <div>
                    <h1 className="text-xl font-bold text-app sm:text-2xl">File Saya</h1>
                    <p className="text-muted text-xs mt-0.5 sm:text-sm">Simpan dan kelola aset foto & video Anda</p>
                </div>
                <div>
                    <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        onChange={handleUpload}
                        accept="image/*,video/*"
                    />
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-3 sm:py-2 bg-lime-600 hover:bg-lime-500 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50 touch-manipulation"
                    >
                        {uploading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Upload className="w-4 h-4" />
                        )}
                        Upload File
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
                        <div key={i} className="aspect-square bg-white/[0.02] rounded-xl border border-white/10 animate-pulse relative overflow-hidden">
                            <div className="absolute inset-0 flex items-center justify-center opacity-50">
                                <div className="w-12 h-12 rounded-lg bg-white/5"></div>
                            </div>
                            <div className="absolute bottom-3 left-3 right-3 h-3 bg-white/5 rounded-full opacity-60"></div>
                        </div>
                    ))}
                </div>
            ) : files.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center py-12 sm:py-16 border-2 border-dashed border-white/10 rounded-xl">
                    <FileIcon className="w-12 h-12 mb-3 text-muted opacity-50" />
                    <h3 className="text-base font-semibold text-app sm:text-lg">Belum ada file</h3>
                    <p className="text-muted text-sm mt-2">Upload foto atau video pertama Anda.</p>
                    <button onClick={() => fileInputRef.current?.click()} className="mt-4 text-lime-400 hover:text-lime-300 text-sm font-medium hover:underline">Upload sekarang</button>
                </div>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
                    {files.map((file) => (
                        <div key={file.id} className="group relative aspect-square bg-white/5 rounded-xl border border-white/10 overflow-hidden hover:border-lime-500/50 transition-colors">
                            {isImage(file.file_type) ? (
                                <div className="w-full h-full relative">
                                    <Image
                                        src={file.file_url}
                                        alt={file.file_name}
                                        fill
                                        className="object-cover"
                                        sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 20vw"
                                    />
                                </div>
                            ) : isVideo(file.file_type) ? (
                                <div className="w-full h-full flex flex-col items-center justify-center bg-black/40 text-gray-400">
                                    <Video className="w-8 h-8 mb-2" />
                                    <span className="text-xs px-2 text-center truncate w-full">{file.file_name}</span>
                                </div>
                            ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center bg-black/40 text-gray-400">
                                    <FileIcon className="w-8 h-8 mb-2" />
                                    <span className="text-xs px-2 text-center truncate w-full">{file.file_name}</span>
                                </div>
                            )}

                            {/* Overlay */}
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-2">
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => window.open(file.file_url, '_blank')}
                                        className="p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white"
                                        title="Buka"
                                    >
                                        <ExternalLink className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => copyLink(file.file_url)}
                                        className="p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white"
                                        title="Salin Link"
                                    >
                                        <Copy className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(file.id)}
                                        className="p-2 bg-red-500/20 hover:bg-red-500/40 text-red-400 rounded-lg"
                                        title="Hapus"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                                <p className="text-[10px] text-gray-300 truncate max-w-full px-2 text-center bg-black/50 rounded mt-auto w-full py-1">
                                    {formatSize(file.size_bytes)}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
