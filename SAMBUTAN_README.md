# 🎓 SAMBUTAN GURU - Complete Feature Guide

Enhanced teacher greetings feature dengan profile card design, video support, dan rich content management.

## 📚 Documentation Index

Quick links ke semua dokumentasi:

1. **[SAMBUTAN_QUICKSTART.md](SAMBUTAN_QUICKSTART.md)** ⭐ START HERE
   - Overview fitur
   - File structure
   - Quick implementation
   - Checklist

2. **[SAMBUTAN_FEATURE.md](SAMBUTAN_FEATURE.md)**
   - Detailed feature documentation
   - Component API reference
   - Database schema
   - Integration examples

3. **[SAMBUTAN_IMPLEMENTATION.md](SAMBUTAN_IMPLEMENTATION.md)**
   - Step-by-step implementation
   - 3 integration options
   - Full code examples
   - Troubleshooting

4. **[SAMBUTAN_UI_DESIGN.md](SAMBUTAN_UI_DESIGN.md)**
   - Visual layout guide
   - Color scheme
   - Component breakdown
   - Responsive behavior

## 🚀 5-Minute Quick Start

### 1. Copy Components
```bash
# Sudah ada di:
components/
├── SambutanViewEnhanced.tsx      # Public view
├── SambutanPanelEnhanced.tsx     # Admin panel
└── SambutanIntegration.tsx       # All-in-one
```

### 2. Run Database Migration
```bash
# Jalankan di Supabase SQL Editor:
ALTER TABLE album_teachers 
ADD COLUMN IF NOT EXISTS video_url TEXT;

ALTER TABLE album_teachers 
ADD COLUMN IF NOT EXISTS bio TEXT;
```

### 3. Import & Use
```tsx
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

### 4. That's It! ✅
Semua CRUD operations sudah built-in.

## 🎯 Key Features

✅ **Profile Card Design**
- Modern cards dengan gradient borders
- Sidebar + detail view layout
- Responsive untuk mobile/tablet/desktop

✅ **Video Support**
- Play button overlay
- Support YouTube, Vimeo, custom URLs
- Direct link ke video

✅ **Rich Content**
- Photo dengan upload capability
- Sambutan/greeting message
- Bio/tentang guru
- Jabatan/title

✅ **Admin Controls**
- Add, edit, delete guru
- Photo upload/delete
- Video URL management
- Confirmation dialogs

✅ **User Experience**
- Toggle view/edit mode
- Inline editing forms
- Content indicators (badges)
- Error handling
- Loading states

## 📊 Component Architecture

```
┌──────────────────────────────────┐
│   SambutanIntegration            │ ← Main integration
├──────────────────────────────────┤
│  - Fetch from API                │
│  - State management              │
│  - Toggle view/edit mode         │
│  - All handlers                  │
└──────┬──────────────┬────────────┘
       │              │
       ▼              ▼
┌─────────────────┐  ┌──────────────────────┐
│SambutanView     │  │SambutanPanel         │
│Enhanced         │  │Enhanced              │
├─────────────────┤  ├──────────────────────┤
│ - Display list  │  │ - Add new            │
│ - Show detail   │  │ - Edit info          │
│ - Video player  │  │ - Upload photo       │
│ - Quote style   │  │ - Delete             │
│ - Bio section   │  │ - Video URL          │
└─────────────────┘  └──────────────────────┘
```

## 📱 Device Support

| Device | Grid | Layout |
|--------|------|--------|
| Mobile | 1 | Full-width, stacked |
| Tablet | 2 | 2-column list |
| Desktop | 3 | Sidebar + detail |

## 🔗 Database Schema

```sql
CREATE TABLE album_teachers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  album_id UUID NOT NULL REFERENCES albums(id),
  name VARCHAR(255) NOT NULL,
  title VARCHAR(255),
  message TEXT,
  bio TEXT,                  -- ← NEW
  photo_url TEXT,
  video_url TEXT,            -- ← NEW
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);
```

## 🎨 Styling

**Colors:**
- Primary: Lime (`lime-400`, `lime-500`, `lime-600`)
- Background: `white/5` - `white/10`
- Border: `white/10` - `white/20`

**Fonts:**
- Heading: Bold (text-2xl/3xl)
- Body: Regular (text-sm)
- Small: Muted (text-xs)

## 👥 Type Definition

```typescript
type Teacher = {
  id: string
  name: string
  title?: string          // Jabatan
  message?: string        // Sambutan (max 300)
  bio?: string           // Bio (max 500)
  photo_url?: string     // Foto
  video_url?: string     // Video link
  sort_order?: number
}
```

## 📡 API Routes Needed

Ensure these endpoints exist:
- `GET /api/albums/[id]/teachers` - List teachers
- `POST /api/albums/[id]/teachers` - Add teacher
- `PATCH /api/albums/[id]/teachers/[teacherId]` - Update teacher
- `DELETE /api/albums/[id]/teachers/[teacherId]` - Delete teacher
- `POST /api/albums/[id]/teachers/[teacherId]/photo` - Upload photo
- `DELETE /api/albums/[id]/teachers/[teacherId]/photo` - Delete photo

## 📋 Implementation Variants

### Option A: All-in-One (Recommended)
```tsx
<SambutanIntegration albumId={id} isOwner={true} initialMode="view" />
```
✅ Simplest  
✅ Toggle view/edit  
✅ All features included

### Option B: Public Only
```tsx
<SambutanViewEnhanced teachers={teachers} />
```
✅ Lightweight  
✅ No admin needed  
✅ Fastest load

### Option C: Admin Panel
```tsx
<SambutanPanelEnhanced 
  teachers={teachers}
  onAddTeacher={...}
  ... other props
/>
```
✅ Admin-only interface  
✅ Full control  
✅ Custom layout

### Option D: Custom Integration
Use both components separately with custom logic.

## 🔐 Security

- ✅ Ownership validation
- ✅ Delete confirmation
- ✅ Photo upload validation
- ✅ Video URL validation
- ✅ Character limits
- ✅ RLS Policies

## 🐛 Common Issues & Solutions

**Teachers tidak muncul:**
- Check API response structure
- Verify albumId correct
- Check network tab untuk errors

**Upload foto gagal:**
- Verify storage bucket public
- Check file size
- Confirm API endpoint exists

**Video tidak muncul:**
- Verify URL format valid
- Try different video platform
- Check CORS settings

See **SAMBUTAN_IMPLEMENTATION.md** untuk detail troubleshooting.

## 🎓 Learning Path

1. **Start:** Read [SAMBUTAN_QUICKSTART.md](SAMBUTAN_QUICKSTART.md)
2. **Understand:** Check [SAMBUTAN_FEATURE.md](SAMBUTAN_FEATURE.md)
3. **Implement:** Follow [SAMBUTAN_IMPLEMENTATION.md](SAMBUTAN_IMPLEMENTATION.md)
4. **Design:** Reference [SAMBUTAN_UI_DESIGN.md](SAMBUTAN_UI_DESIGN.md)
5. **Deploy:** Use provided examples

## 🚀 Next Steps

- [ ] Read quickstart guide
- [ ] Run database migration
- [ ] Copy components to project
- [ ] Update API routes
- [ ] Implement in pages
- [ ] Test functionality
- [ ] Deploy to staging
- [ ] Go live!

## 📞 Support

**Questions?** Check documentation in this order:
1. SAMBUTAN_QUICKSTART.md
2. SAMBUTAN_IMPLEMENTATION.md  
3. Code comments in components
4. Component files themselves

## 👨‍💻 Component Files

```
components/
├── SambutanViewEnhanced.tsx
│   └── Display component dengan sidebar + detail view
│
├── SambutanPanelEnhanced.tsx
│   └── Admin panel untuk CRUD operations
│
└── SambutanIntegration.tsx
    └── Full integration component dengan toggle mode
```

## 📦 Dependencies

- React 18+
- Next.js 13+ (App Router)
- TypeScript
- Lucide Icons (untuk icons)
- Tailwind CSS

**No additional packages needed!**

## 🎉 Ready to Use!

Semua files sudah tersedia di project:
- ✅ Components created
- ✅ Database migration ready
- ✅ Documentation complete
- ✅ Examples provided
- ✅ Integration guide included

**Start with:** [SAMBUTAN_QUICKSTART.md](SAMBUTAN_QUICKSTART.md)

---

**Created:** February 9, 2026  
**Version:** 1.0  
**Status:** ✅ Production Ready
