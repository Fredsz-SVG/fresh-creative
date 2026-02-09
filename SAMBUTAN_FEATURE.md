# Fitur Sambutan - Enhanced Profile Card

Fitur sambutan yang telah ditingkatkan untuk menampilkan sambutan dari guru dan staff dengan tampilan seperti profile card dengan dukungan foto, video, dan bio lengkap.

## 📋 Komponen

### 1. **SambutanViewEnhanced.tsx**
Komponen tampilan untuk menampilkan sambutan guru kepada publik dengan desain profile card.

**Fitur:**
- Grid list guru di sidebar kiri
- Detail view besar di sebelah kanan
- Foto profile
- Video link dengan tombol play overlay
- Sambutan/ucapan dengan styling quote
- Bio lengkap
- Responsive design untuk mobile dan desktop

**Props:**
```tsx
type Teacher = {
  id: string
  name: string
  title?: string        // Jabatan (mis: Kepala Sekolah, Guru BK)
  message?: string      // Sambutan/ucapan (max 300 char)
  bio?: string         // Bio/tentang guru (max 500 char)
  photo_url?: string   // URL foto profile
  video_url?: string   // URL video (YouTube, Vimeo, dll)
  sort_order?: number
}
```

**Penggunaan:**
```tsx
import SambutanViewEnhanced from '@/components/SambutanViewEnhanced'

export default function Page() {
  const teachers = [/* ... */]
  
  return <SambutanViewEnhanced teachers={teachers} />
}
```

### 2. **SambutanPanelEnhanced.tsx**
Komponen panel admin untuk mengelola sambutan guru (edit, tambah, hapus, upload foto/video).

**Fitur:**
- Tambah guru baru
- Edit nama, jabatan, sambutan, bio, dan video URL
- Upload/hapus foto
- Indikator visual untuk konten (Sambutan, Bio, Video)
- Form inline untuk efisiensi
- Permissions check (hanya owner yang bisa edit)

**Props:**
```tsx
type SambutanPanelEnhancedProps = {
  teachers: Teacher[]
  onAddTeacher: (name: string, title: string) => Promise<void>
  onUpdateTeacher: (id: string, updates: {
    name?: string
    title?: string
    message?: string
    bio?: string
    video_url?: string
  }) => Promise<void>
  onDeleteTeacher: (id: string, name: string) => void
  onUploadPhoto: (id: string, file: File) => Promise<void>
  onDeletePhoto: (id: string) => Promise<void>
  isOwner: boolean
}
```

**Penggunaan:**
```tsx
import SambutanPanelEnhanced from '@/components/SambutanPanelEnhanced'

export default function AdminPanel() {
  const [teachers, setTeachers] = useState([])
  
  const handleAddTeacher = async (name: string, title: string) => {
    const response = await fetch('/api/albums/[id]/teachers', {
      method: 'POST',
      body: JSON.stringify({ name, title })
    })
    // Update state...
  }
  
  // ... implement other handlers
  
  return (
    <SambutanPanelEnhanced
      teachers={teachers}
      onAddTeacher={handleAddTeacher}
      onUpdateTeacher={handleUpdateTeacher}
      onDeleteTeacher={handleDeleteTeacher}
      onUploadPhoto={handleUploadPhoto}
      onDeletePhoto={handleDeletePhoto}
      isOwner={true}
    />
  )
}
```

## 🗄️ Database Schema

```sql
-- Perbarui tabel album_teachers
ALTER TABLE album_teachers 
ADD COLUMN IF NOT EXISTS video_url TEXT;

ALTER TABLE album_teachers 
ADD COLUMN IF NOT EXISTS bio TEXT;
```

## 📡 API Routes

Gunakan routes yang sudah ada:
- `POST /api/albums/[id]/teachers` - Tambah guru
- `PATCH /api/albums/[id]/teachers/[teacherId]` - Update guru
- `DELETE /api/albums/[id]/teachers/[teacherId]` - Hapus guru
- `POST /api/albums/[id]/teachers/[teacherId]/photo` - Upload foto

**Contoh Update dengan Video & Bio:**
```typescript
const response = await fetch(`/api/albums/${albumId}/teachers/${teacherId}`, {
  method: 'PATCH',
  body: JSON.stringify({
    name: 'Ibu Siti',
    title: 'Guru Bahasa Indonesia',
    message: 'Belajar adalah petualangan yang indah...',
    bio: 'Guru dengan 10 tahun pengalaman mengajar...',
    video_url: 'https://youtube.com/watch?v=...'
  })
})
```

## 🎨 Styling

Komponen menggunakan Tailwind CSS dengan tema:
- **Primary Color:** Lime (lime-400, lime-500, lime-600)
- **Text Color:** app (custom color untuk text utama)
- **Secondary Text:** muted (custom color untuk text sekunder)
- **Backgrounds:** white/5 hingga white/10 dengan border white/10-white/20

## 🔗 Integration Guide

### Menggunakan SambutanViewEnhanced

1. **View/Display Mode** (untuk publik):
```tsx
// app/admin/sambutan/page.tsx
import SambutanViewEnhanced from '@/components/SambutanViewEnhanced'

export default async function SambutanPage({ params }) {
  const { id: albumId } = params
  
  // Fetch dari API
  const response = await fetch(`/api/albums/${albumId}/teachers`)
  const teachers = await response.json()
  
  return <SambutanViewEnhanced teachers={teachers} />
}
```

### Menggunakan SambutanPanelEnhanced

2. **Edit Mode** (untuk admin):
```tsx
// app/admin/albums/[id]/sambutan/page.tsx
'use client'

import { useState, useCallback } from 'react'
import SambutanPanelEnhanced from '@/components/SambutanPanelEnhanced'

export default function AdminSambutanPage({ params }) {
  const { id: albumId } = params
  const [teachers, setTeachers] = useState([])
  const isOwner = true // Check ownership
  
  const handleAddTeacher = useCallback(async (name: string, title: string) => {
    const response = await fetch(`/api/albums/${albumId}/teachers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, title })
    })
    
    if (response.ok) {
      const newTeacher = await response.json()
      setTeachers([...teachers, newTeacher])
    }
  }, [albumId, teachers])
  
  const handleUpdateTeacher = useCallback(async (
    teacherId: string, 
    updates: any
  ) => {
    const response = await fetch(
      `/api/albums/${albumId}/teachers/${teacherId}`, 
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      }
    )
    
    if (response.ok) {
      setTeachers(teachers.map(t => 
        t.id === teacherId ? { ...t, ...updates } : t
      ))
    }
  }, [albumId, teachers])
  
  // ... implement other handlers
  
  return (
    <SambutanPanelEnhanced
      teachers={teachers}
      onAddTeacher={handleAddTeacher}
      onUpdateTeacher={handleUpdateTeacher}
      onDeleteTeacher={handleDeleteTeacher}
      onUploadPhoto={handleUploadPhoto}
      onDeletePhoto={handleDeletePhoto}
      isOwner={isOwner}
    />
  )
}
```

## 📝 Contoh Data

```typescript
const teacherExample: Teacher = {
  id: 'uuid-1234',
  name: 'Ibu Dr. Siti Nurhaliza',
  title: 'Kepala Sekolah',
  message: 'Pendidikan adalah investasi terbaik untuk masa depan. Mari bersama membangun generasi yang cerdas dan berkarakter.',
  bio: 'Kepala sekolah dengan pengalaman 15 tahun di bidang pendidikan. Berdedikasi untuk meningkatkan kualitas pembelajaran dan mengembangkan potensi setiap siswa.',
  photo_url: 'https://storage.example.com/teachers/ibu-siti.jpg',
  video_url: 'https://youtube.com/watch?v=dQw4w9WgXcQ',
  sort_order: 1
}
```

## 🎯 Features Checklist

- ✅ Tampilan profile card yang menarik
- ✅ Support foto dengan upload
- ✅ Support video link (YouTube, Vimeo, dll)
- ✅ Sambutan/ucapan dengan quote styling
- ✅ Bio lengkap
- ✅ Admin panel untuk mengelola
- ✅ Responsive design (mobile & desktop)
- ✅ Indikator konten yang tersedia
- ✅ Form inline editing yang efisien
- ✅ Delete dan edit functionality

## 🚀 Next Steps

1. **Run Migration**: Jalankan migrasi untuk menambah field video_url dan bio
   ```bash
   psql -U postgres -h localhost -d fresh_creative -f supabase/migrations/15_add_video_to_teachers.sql
   ```

2. **Update API Routes**: Pastikan API routes mendukung field baru (bio, video_url)

3. **Deploy Components**: Copy komponen ke project dan import sesuai kebutuhan

4. **Test Integration**: Test di staging environment sebelum production

## 📱 Responsive Grid

**Mobile:** 1 kolom (full-width)  
**Tablet:** 2 kolom  
**Desktop:** 3 kolom list sidebar + detail view besar  

## ⌨️ Keyboard Shortcuts

- N: Tambah guru baru (jika fokus di panel)
- Esc: Tutup modal/form edit
- Enter: Simpan perubahan (jika dalam edit mode)

---

**Last Updated:** February 9, 2026  
**Version:** 1.0
