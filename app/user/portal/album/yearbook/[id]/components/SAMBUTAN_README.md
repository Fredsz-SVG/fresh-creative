# Fitur Sambutan Guru - Yearbook Album

Fitur untuk menampilkan sambutan dari guru-guru. Owner album dan admin web dapat mendaftarkan lebih dari 1 guru.

## 📁 Components

### 1. **SambutanPanel.tsx**
Panel sidebar untuk manage list guru (khusus owner/admin)

**Features:**
- ✅ List semua guru yang terdaftar
- ✅ Tambah guru baru (nama + jabatan)
- ✅ Edit nama dan jabatan guru
- ✅ Upload foto guru (aspect 4:5)
- ✅ Hapus foto guru
- ✅ Hapus guru dari list
- ✅ Sort order otomatis

**Props:**
```tsx
{
  teachers: Teacher[]
  onAddTeacher: (name, title) => Promise<void>
  onUpdateTeacher: (id, updates) => Promise<void>
  onDeleteTeacher: (id, name) => void
  onUploadPhoto: (id, file) => Promise<void>
  onDeletePhoto: (id) => Promise<void>
  isOwner: boolean
}
```

### 2. **SambutanView.tsx**
View untuk menampilkan sambutan guru (public view)

**Features:**
- ✅ Grid layout (responsive: 1 col mobile, 2 col tablet, 3 col desktop)
- ✅ Card untuk setiap guru
- ✅ Foto guru (aspect 4:5)
- ✅ Nama + jabatan
- ✅ Pesan sambutan (jika ada)
- ✅ Hover effect (scale + background)
- ✅ Empty state jika belum ada guru

### 3. **IconSidebar.tsx** (Updated)
Ditambahkan icon "Sambutan" untuk navigation

**Changes:**
- ✅ Import `MessageSquare` icon
- ✅ Tambah button "Sambutan" (hanya untuk canManage)
- ✅ Positioned antara "Groups" dan "Approval"
- ✅ Active state dengan bg-lime-600/20

## 🗄️ Data Structure

```typescript
type Teacher = {
  id: string                // UUID
  name: string              // Nama guru (required)
  title?: string            // Jabatan (opsional)
  message?: string          // Pesan sambutan (opsional)
  photo_url?: string        // URL foto guru (opsional)
  sort_order?: number       // Urutan tampil
}
```

## 🔗 API Endpoints (To Be Implemented)

### GET `/api/albums/[id]/teachers`
Fetch list guru untuk album tertentu

**Response:**
```json
[
  {
    "id": "uuid",
    "album_id": "uuid",
    "name": "Budi Santoso, S.Pd",
    "title": "Kepala Sekolah",
    "message": "Selamat atas kelulusan...",
    "photo_url": "https://...",
    "sort_order": 1
  }
]
```

### POST `/api/albums/[id]/teachers`
Tambah guru baru

**Request Body:**
```json
{
  "name": "Ahmad Hidayat",
  "title": "Wakil Kepala Sekolah"
}
```

### PATCH `/api/albums/[id]/teachers/[teacherId]`
Update data guru

**Request Body:**
```json
{
  "name": "Ahmad Hidayat, S.Pd",
  "title": "Wakil Kepala Sekolah",
  "message": "Selamat kepada seluruh siswa..."
}
```

### DELETE `/api/albums/[id]/teachers/[teacherId]`
Hapus guru dari list

### POST `/api/albums/[id]/teachers/[teacherId]/photo`
Upload foto guru

**Request:** multipart/form-data dengan field `file`

**Response:**
```json
{
  "photo_url": "https://storage/.../teacher-photo.jpg"
}
```

### DELETE `/api/albums/[id]/teachers/[teacherId]/photo`
Hapus foto guru

## 🗃️ Database Schema (Suggestion)

```sql
CREATE TABLE album_teachers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  album_id UUID NOT NULL REFERENCES albums(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  title VARCHAR(255),
  message TEXT,
  photo_url TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

-- Index untuk performa
CREATE INDEX idx_album_teachers_album_id ON album_teachers(album_id);
CREATE INDEX idx_album_teachers_sort_order ON album_teachers(album_id, sort_order);

-- RLS Policy
ALTER TABLE album_teachers ENABLE ROW LEVEL SECURITY;

-- Public read
CREATE POLICY "Anyone can view teachers"
  ON album_teachers FOR SELECT
  TO authenticated, anon
  USING (true);

-- Owner/admin can manage
CREATE POLICY "Album owners can manage teachers"
  ON album_teachers FOR ALL
  TO authenticated
  USING (
    album_id IN (
      SELECT id FROM albums 
      WHERE created_by = auth.uid() 
      OR id IN (
        SELECT album_id FROM album_members 
        WHERE user_id = auth.uid() 
        AND role IN ('admin', 'owner')
      )
    )
  );
```

## 🎨 UI/UX

### Sidebar Panel (256px width)
```
┌─────────────────────────┐
│ Sambutan Guru           │
│ Daftar guru yang...     │
├─────────────────────────┤
│ ┌─────────────────────┐ │
│ │ [Photo 4:5]         │ │
│ │                     │ │
│ │ Budi Santoso        │ │
│ │ Kepala Sekolah      │ │
│ │ [Edit] [Delete]     │ │
│ │ [Upload] [Hapus]    │ │
│ └─────────────────────┘ │
│ ┌─────────────────────┐ │
│ │ Ahmad Hidayat       │ │
│ │ Wakil Kepala...     │ │
│ └─────────────────────┘ │
├─────────────────────────┤
│ [+ Tambah Guru]         │
└─────────────────────────┘
```

### Main Content View
```
┌───────────────────────────────────────┐
│           Sambutan                    │
│     Kata sambutan dari para guru      │
├───────────────────────────────────────┤
│  ┌────┐  ┌────┐  ┌────┐              │
│  │Foto│  │Foto│  │Foto│              │
│  │ 4:5│  │ 4:5│  │ 4:5│              │
│  │Nama│  │Nama│  │Nama│              │
│  │Jab.│  │Jab.│  │Jab.│              │
│  └────┘  └────┘  └────┘              │
└───────────────────────────────────────┘
```

## 🚀 Integration Steps

1. **Update YearbookClassesViewUI.tsx:**
   - Import SambutanPanel & SambutanView
   - Add state: `teachers`, `setTeachers`
   - Add handlers: onAddTeacher, onUpdateTeacher, dll
   - Conditional render: `{sidebarMode === 'sambutan' && <SambutanPanel />}`

2. **Create API Routes:**
   - `/api/albums/[id]/teachers/route.ts` (GET, POST)
   - `/api/albums/[id]/teachers/[teacherId]/route.ts` (PATCH, DELETE)
   - `/api/albums/[id]/teachers/[teacherId]/photo/route.ts` (POST, DELETE)

3. **Database Migration:**
   - Create `album_teachers` table
   - Add RLS policies
   - Add indexes

4. **File Upload:**
   - Use existing Supabase storage
   - Bucket: `album-teacher-photos`
   - Path: `{album_id}/{teacher_id}/{filename}`
   - Resize to max 800x1000 (aspect 4:5)

## 📝 Usage Example

```tsx
// In YearbookClassesViewUI.tsx
const [teachers, setTeachers] = useState<Teacher[]>([])

const handleAddTeacher = async (name: string, title: string) => {
  const res = await fetch(`/api/albums/${id}/teachers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, title }),
  })
  const newTeacher = await res.json()
  setTeachers(prev => [...prev, newTeacher])
}

// Render
{sidebarMode === 'sambutan' && !isCoverView && (
  <SambutanPanel
    teachers={teachers}
    onAddTeacher={handleAddTeacher}
    // ... other handlers
    isOwner={isOwner}
  />
)}

{sidebarMode === 'sambutan' && !isCoverView && (
  <SambutanView teachers={teachers} />
)}
```

## ✨ Features Summary

✅ **Multiple Teachers** - Tidak terbatas 1 orang
✅ **Photo Upload** - Support foto guru
✅ **Title/Position** - Jabatan guru
✅ **Message** - Pesan sambutan
✅ **Edit & Delete** - Full CRUD operations
✅ **Responsive** - Mobile-first design
✅ **Permission** - Hanya owner/admin yang bisa manage

---

**Version:** 1.0.0  
**Created:** February 9, 2026
