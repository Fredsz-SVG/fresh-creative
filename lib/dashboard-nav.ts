import { Sparkles, type LucideIcon, DollarSign, Library, ShoppingBag, Pencil, Folder } from 'lucide-react'
import type { NavSection } from '@/components/dashboard/DashboardShell'

/** AI Labs: satu item di sidebar, isi fitur di halaman hub (grid kartu seperti Gojek). */
export const AI_LABS_SECTION_USER: NavSection = {
  title: 'AI Labs',
  items: [{ href: '/user/portal/ai-labs', label: 'AI Labs', icon: Sparkles }],
}

export const ALBUMS_SECTION_USER: NavSection = {
  title: 'Album Saya',
  items: [{ href: '/user/portal/albums', label: 'Album', icon: Library }],
}

export const AI_LABS_SECTION_ADMIN: NavSection = {
  title: 'AI Labs',
  items: [{ href: '/admin/ai-labs', label: 'AI Labs', icon: Sparkles }],
}

export const PRICING_SECTION_ADMIN: NavSection = {
  title: 'Pricing',
  items: [
    { href: '/admin/pricingedit', label: 'Pricing Edit', icon: Pencil },
    { href: '/admin/credits', label: 'Credit Settings', icon: DollarSign },
  ],
}


export const ALBUMS_SECTION_ADMIN: NavSection = {
  title: 'Manajemen Album',
  items: [{ href: '/admin/albums', label: 'Album', icon: Library }],
}

export const FILES_SECTION_USER: NavSection = {
  title: 'File Saya',
  items: [{ href: '/user/portal/files', label: 'File Saya', icon: Folder }],
}

export const FILES_SECTION_ADMIN: NavSection = {
  title: 'File Saya',
  items: [{ href: '/admin/files', label: 'File Saya', icon: Folder }],
}

/** Daftar fitur AI Labs untuk halaman hub (grid kartu seperti Gojek). */
export const AI_LABS_FEATURES_USER = [
  { href: '/user/portal/tryon', label: 'Try On', description: 'Virtual try-on baju & celana' },
  { href: '/user/portal/pose', label: 'Pose', description: 'Transfer pose dari referensi' },
  { href: '/user/portal/image-editor', label: 'Image Editor', description: 'Edit & Remove Background' },
  { href: '/user/portal/photogroup', label: 'Photo Group', description: 'Gabungkan beberapa foto jadi satu' },
  { href: '/user/portal/phototovideo', label: 'Photo to Video', description: 'Ubah foto jadi video singkat' },
] as const

export const AI_LABS_FEATURES_ADMIN = [
  { href: '/admin/tryon', label: 'Try On', description: 'Virtual try-on baju & celana' },
  { href: '/admin/pose', label: 'Pose', description: 'Transfer pose dari referensi' },
  { href: '/admin/image-editor', label: 'Image Editor', description: 'Edit & Remove Background' },
  { href: '/admin/photogroup', label: 'Photo Group', description: 'Gabungkan beberapa foto jadi satu' },
  { href: '/admin/phototovideo', label: 'Photo to Video', description: 'Ubah foto jadi video singkat' },
] as const
