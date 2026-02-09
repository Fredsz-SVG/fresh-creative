# 📺 Panduan Implementasi Fitur Sambutan Enhanced

Panduan langkah demi langkah untuk mengintegrasikan fitur sambutan guru dengan profile card di aplikasi Anda.

## 🚀 Quick Start (5 Menit)

### Step 1: Run Migration
Jalankan migrasi untuk menambahkan field `video_url` dan `bio` ke database:

```bash
# Gunakan Supabase CLI
supabase migration up

# Atau manual via SQL:
# ALTER TABLE album_teachers ADD COLUMN video_url TEXT;
# ALTER TABLE album_teachers ADD COLUMN bio TEXT;
```

### Step 2: Choose Your Integration Style

Ada 3 cara mengintegrasikan, pilih sesuai kebutuhan:

#### **Option A: All-in-One Component** (Recommended)
Gunakan `SambutanIntegration` yang menggabungkan view dan edit dengan toggle.

```tsx
// app/admin/albums/[id]/sambutan/page.tsx
import SambutanIntegration from '@/components/SambutanIntegration'

export default function SambutanPage({ params }) {
  return (
    <SambutanIntegration 
      albumId={params.id}
      isOwner={true}
      initialMode="view"
    />
  )
}
```

#### **Option B: Separate View & Edit**
Gunakan `SambutanViewEnhanced` untuk publik dan `SambutanPanelEnhanced` untuk admin terpisah.

```tsx
// app/admin/albums/[id]/sambutan/view/page.tsx
import SambutanViewEnhanced from '@/components/SambutanViewEnhanced'

export default async function SambutanViewPage({ params }) {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/albums/${params.id}/teachers`
  )
  const teachers = await response.json()
  
  return <SambutanViewEnhanced teachers={teachers} />
}
```

```tsx
// app/admin/albums/[id]/sambutan/edit/page.tsx
'use client'

import SambutanPanelEnhanced from '@/components/SambutanPanelEnhanced'
import { useState } from 'react'

export default function SambutanEditPage({ params }) {
  const [teachers, setTeachers] = useState([])
  // ... implement handlers (sama seperti di SambutanIntegration.tsx)
  
  return (
    <SambutanPanelEnhanced
      teachers={teachers}
      onAddTeacher={handleAddTeacher}
      // ... other props
    />
  )
}
```

#### **Option C: Custom Integration**
Import hanya komponen yang perlu dan customize sesuai kebutuhan.

```tsx
'use client'

import SambutanViewEnhanced from '@/components/SambutanViewEnhanced'
import { useTeachers } from '@/hooks/useTeachers'

export default function CustomSambutanPage({ params }) {
  const { teachers, loading } = useTeachers(params.id)
  
  if (loading) return <div>Loading...</div>
  
  return (
    <div className="my-custom-layout">
      <h1>Sambutan Guru</h1>
      <SambutanViewEnhanced teachers={teachers} />
    </div>
  )
}
```

## 📝 Contoh Implementasi Lengkap

### 1. Halaman Public (View Only)

```tsx
// app/albums/[id]/sambutan/page.tsx
import SambutanViewEnhanced from '@/components/SambutanViewEnhanced'
import { db } from '@/lib/supabase-server'

export default async function SambutanPublicPage({ params }) {
  const { data: teachers } = await db
    .from('album_teachers')
    .select('*')
    .eq('album_id', params.id)
    .order('sort_order')

  return <SambutanViewEnhanced teachers={teachers || []} />
}
```

### 2. Halaman Admin (Edit & View)

```tsx
// app/admin/albums/[id]/sambutan/page.tsx
'use client'

import { useState, useCallback, useEffect } from 'react'
import SambutanPanelEnhanced from '@/components/SambutanPanelEnhanced'

export default function AdminSambutanPage({ params }) {
  const [teachers, setTeachers] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  // Fetch data
  useEffect(() => {
    const fetchTeachers = async () => {
      try {
        const response = await fetch(`/api/albums/${params.id}/teachers`)
        const data = await response.json()
        setTeachers(Array.isArray(data) ? data : data.data || [])
      } catch (error) {
        console.error('Error fetching teachers:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchTeachers()
  }, [params.id])

  // Handlers
  const handleAddTeacher = useCallback(
    async (name: string, title: string) => {
      const response = await fetch(`/api/albums/${params.id}/teachers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, title })
      })

      if (response.ok) {
        const newTeacher = await response.json()
        setTeachers([...teachers, newTeacher])
      }
    },
    [params.id, teachers]
  )

  const handleUpdateTeacher = useCallback(
    async (id: string, updates: any) => {
      const response = await fetch(
        `/api/albums/${params.id}/teachers/${id}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates)
        }
      )

      if (response.ok) {
        const updated = await response.json()
        setTeachers(teachers.map(t => t.id === id ? { ...t, ...updated } : t))
      }
    },
    [params.id, teachers]
  )

  const handleDeleteTeacher = useCallback(
    async (id: string, name: string) => {
      if (!window.confirm(`Hapus "${name}"?`)) return

      const response = await fetch(
        `/api/albums/${params.id}/teachers/${id}`,
        { method: 'DELETE' }
      )

      if (response.ok) {
        setTeachers(teachers.filter(t => t.id !== id))
      }
    },
    [params.id, teachers]
  )

  const handleUploadPhoto = useCallback(
    async (id: string, file: File) => {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch(
        `/api/albums/${params.id}/teachers/${id}/photo`,
        { method: 'POST', body: formData }
      )

      if (response.ok) {
        const { photo_url } = await response.json()
        setTeachers(teachers.map(t =>
          t.id === id ? { ...t, photo_url } : t
        ))
      }
    },
    [params.id, teachers]
  )

  const handleDeletePhoto = useCallback(
    async (id: string) => {
      const response = await fetch(
        `/api/albums/${params.id}/teachers/${id}/photo`,
        { method: 'DELETE' }
      )

      if (response.ok) {
        setTeachers(teachers.map(t =>
          t.id === id ? { ...t, photo_url: undefined } : t
        ))
      }
    },
    [params.id, teachers]
  )

  if (isLoading) {
    return <div className="flex justify-center py-20">
      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-lime-500"></div>
    </div>
  }

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

## 🔄 API Requirements

Pastikan API routes mendukung field baru:

```typescript
// app/api/albums/[id]/teachers/[teacherId]/route.ts
export async function PATCH(request: NextRequest) {
  const { id: albumId, teacherId } = await params
  const body = await request.json()
  
  const { data, error } = await supabase
    .from('album_teachers')
    .update({
      name: body.name,
      title: body.title,
      message: body.message,
      bio: body.bio,              // ← NEW
      video_url: body.video_url   // ← NEW
    })
    .eq('id', teacherId)
    .eq('album_id', albumId)
    .select()
    .single()
  
  return NextResponse.json(data)
}
```

## 🎨 Styling Customization

Jika ingin mengubah styling, edit warna di komponen:

```tsx
// Ubah theme colors
<div className="bg-lime-600/20 border border-lime-500">
  {/* Ganti lime-600 dengan warna pilihan Anda */}
</div>
```

**Warna default yang digunakan:**
- Primary: `lime-400`, `lime-500`, `lime-600`
- Text: `text-app` (custom)
- Secondary: `text-muted` (custom)
- Borders: `border-white/10` hingga `border-white/20`

## 📱 Responsive Behavior

| Device | Layout |
|--------|--------|
| Mobile (< 640px) | Full-width list, stacked |
| Tablet (640px - 1024px) | 2-column list |
| Desktop (> 1024px) | Sidebar + Detail view |

## ✨ Data Flow

```
┌─────────────────────┐
│  API /teachers      │
│  Fetch all teachers │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  State: teachers[]  │
│  Manage via hooks   │
└──────────┬──────────┘
           │
    ┌──────┴──────┐
    │             │
    ▼             ▼
┌────────────┐  ┌──────────────┐
│  ViewMode  │  │  EditMode    │
│ SambutanV. │  │ SambutanP.   │
└────────────┘  └──────────────┘
```

## 🔒 Security Notes

- ✅ All CRUD operations check ownership via `isOwner` prop
- ✅ Photo uploads rejected if not owner
- ✅ Video URLs validated (only accepting HTTP/HTTPS)
- ✅ Bio/message limited to max 300-500 chars
- ✅ Delete operations require confirmation

## 🐛 Troubleshooting

**Teachers tidak muncul:**
- Check API response: `fetch('/api/albums/[id]/teachers')`
- Verify data structure matches `Teacher` type

**Upload foto gagal:**
- Pastikan storage bucket public accessible
- Check file size limit
- Verify API endpoint: `/api/albums/[id]/teachers/[id]/photo`

**Video tidak tampil:**
- Verify URL format: harus valid HTTP/HTTPS
- YouTube: gunakan `embed` URL atau watch URL
- Vimeo: gunakan direktlink embed

**Styling kelihatan aneh:**
- Pastikan Tailwind CSS terupdate
- Check custom colors di `tailwind.config.js`:
  - `app` color class
  - `muted` color class

## 📞 Support

Jika ada pertanyaan atau issue, check:
1. Console browser (F12) untuk error messages
2. API response structure
3. Database schema migration status
4. Component props validation

---

**Happy coding! 🚀**
