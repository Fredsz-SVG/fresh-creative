# 📋 Sambutan Feature - Developer Checklist

Quick reference untuk implementasi dan troubleshooting.

## ✅ Pre-Implementation Checklist

- [ ] Read SAMBUTAN_QUICKSTART.md
- [ ] Understand the 4 components created
- [ ] Check database schema requirements
- [ ] Verify API endpoints exist
- [ ] Test environment ready

## 📦 Installation Steps

### Step 1: Database Migration
```sql
-- Run in Supabase SQL Editor
ALTER TABLE album_teachers 
ADD COLUMN IF NOT EXISTS video_url TEXT;

ALTER TABLE album_teachers 
ADD COLUMN IF NOT EXISTS bio TEXT;
```

**Verification:**
- [ ] Check `album_teachers` has `video_url` column
- [ ] Check `album_teachers` has `bio` column
- [ ] Test insert new teacher

### Step 2: Component files
```
✅ components/SambutanViewEnhanced.tsx (150 lines)
✅ components/SambutanPanelEnhanced.tsx (350 lines)
✅ components/SambutanIntegration.tsx (300 lines)
```

**Verification:**
- [ ] All 3 files exist in `components/`
- [ ] No TypeScript errors
- [ ] All imports resolve

### Step 3: Storage Bucket
Verify Supabase storage bucket exists and is configured:

```
Bucket: album-photos (created in migration 02_yearbook_schema.sql)
Path: teachers/{teacherId}/{timestamp}.{ext}
```

**Verification:**
- [ ] Go to Supabase Dashboard → Storage
- [ ] Check `album-photos` bucket exists
- [ ] Verify bucket is **public** (for photo URLs)
- [ ] Test upload via API endpoint

### Step 4: API Routes
Verify these routes handle new fields:
```
✅ GET /api/albums/[id]/teachers
✅ POST /api/albums/[id]/teachers
✅ PATCH /api/albums/[id]/teachers/[teacherId]
✅ DELETE /api/albums/[id]/teachers/[teacherId]
✅ POST /api/albums/[id]/teachers/[teacherId]/photo
✅ DELETE /api/albums/[id]/teachers/[teacherId]/photo
```

**Verification Checklist:**
- [ ] POST creates with title, name, message, bio, video_url
- [ ] PATCH updates all fields
- [ ] PATCH returns updated teacher object
- [ ] DELETE removes completely
- [ ] Returns proper error codes

### Step 5: Integration
Choose implementation variant:

#### Variant A: All-in-One
```tsx
import SambutanIntegration from '@/components/SambutanIntegration'

export default function Page({ params }) {
  return (
    <SambutanIntegration 
      albumId={params.id}
      isOwner={true}
      initialMode="view"
    />
  )
}
```
- [ ] Component renders without errors
- [ ] Toggle view/edit works
- [ ] Can fetch teachers
- [ ] All buttons functional

#### Variant B: View Only
```tsx
import SambutanViewEnhanced from '@/components/SambutanViewEnhanced'

export default function Page() {
  return <SambutanViewEnhanced teachers={teachers} />
}
```
- [ ] List displays correctly
- [ ] Clicking items shows detail
- [ ] Video overlay appears
- [ ] Mobile responsive

#### Variant C: Admin Panel Only
```tsx
import SambutanPanelEnhanced from '@/components/SambutanPanelEnhanced'

export default function AdminPage() {
  return <SambutanPanelEnhanced {...props} />
}
```
- [ ] Add teacher works
- [ ] Edit opens form
- [ ] Save updates database
- [ ] Delete removes teacher
- [ ] Photo upload works

## 🧪 Testing Checklist

### Create Operation
```
[ ] Can add new teacher
[ ] Name is required
[ ] Title is optional
[ ] Returns teacher object with ID
[ ] Can immediately edit
[ ] Shows in list
```

### Read Operation
```
[ ] List fetches all teachers
[ ] Detail shows all fields
[ ] Photo displays correctly
[ ] Video link works
[ ] Bio text shows
[ ] Empty state when no teachers
```

### Update Operation
```
[ ] Can edit name
[ ] Can edit title
[ ] Can edit message (sambutan)
[ ] Can edit bio
[ ] Can add/change video URL
[ ] Can upload photo
[ ] Changes save to DB
[ ] List updates immediately
```

### Delete Operation
```
[ ] Can delete teacher
[ ] Asks for confirmation
[ ] Removes from list
[ ] Removes from DB
[ ] Can delete photo separately
[ ] Empty state shows if all deleted
```

### Media Handling
```
[ ] Photo upload works
[ ] Supports JPG, PNG, WebP
[ ] Shows preview after upload
[ ] Delete photo removes image
[ ] Video URL validates as HTTP/HTTPS
[ ] Play button shows for video
[ ] External links open new tab
```

## 🎨 UI/UX Testing

### Layout
```
[ ] Desktop: sidebar + detail layout
[ ] Tablet: 2-column grid
[ ] Mobile: single column, stacked
[ ] Scroll doesn't break layout
[ ] No overflow issues
```

### Components
```
[ ] List items are clickable
[ ] Edit button opens form
[ ] Delete button shows confirmation
[ ] Save button submits correctly
[ ] Cancel button closes form
[ ] Add button opens form
```

### Styling
```
[ ] Colors are correct (lime theme)
[ ] Text is readable
[ ] Borders visible
[ ] Hover effects work
[ ] Focus states visible
[ ] Loading spinner shows
[ ] Error messages display
```

### Responsive
```
[ ] Works on iPhone 12/13
[ ] Works on iPad
[ ] Works on Desktop (1920px)
[ ] Touch targets are >= 44px
[ ] Images scale correctly
[ ] Text doesn't overflow
```

## 🔒 Security Checklist

```
[ ] Only owner can edit
[ ] Ownership check before operations
[ ] Delete requires confirmation
[ ] Photo upload validates file type
[ ] Video URL starts with http/https
[ ] Text length limits enforced
[ ] XSS prevention via React
[ ] CSRF protection (if using forms)
```

## 🐛 Debugging Checklist

### No Teachers Showing
```
[ ] Check API response: GET /api/albums/[id]/teachers
[ ] Verify albumId is correct
[ ] Check teachers count in DB
[ ] Verify RLS policies allow SELECT
[ ] Check browser console for errors
[ ] Check network tab for 404/500
```

### Photo Not Uploading
```
[ ] Check storage bucket exists
[ ] Verify bucket is public
[ ] Check file size (limit?)
[ ] Verify file type (image only)
[ ] Check POST /api/albums/[id]/teachers/[id]/photo
[ ] Verify FormData structure
[ ] Check upload path in API
```

### Video Not Playing
```
[ ] Check video URL format
[ ] Try different video service (YouTube, Vimeo)
[ ] Verify URL is public (not private)
[ ] Check for CORS issues
[ ] Verify play button appears
[ ] Check console for errors
```

### Form Not Submitting
```
[ ] Check for validation errors
[ ] Verify API endpoint exists
[ ] Check for network errors
[ ] Verify user authentication
[ ] Check console for JS errors
[ ] Verify form data structure
[ ] Check API response
```

## 📊 Data Structure Validation

### Teacher Object
```tsx
✅ {
  id: string (UUID)
  album_id: string (UUID)
  name: string (required, max 255)
  title?: string (optional, max 255)
  message?: string (optional, max 500)
  bio?: string (optional, max 800)
  photo_url?: string (optional, valid URL)
  video_url?: string (optional, valid HTTP/HTTPS)
  sort_order?: number (default 0)
  created_at: timestamp
  updated_at: timestamp
  created_by: string (UUID)
}
```

Validation:
- [ ] ID is valid UUID
- [ ] album_id exists in albums table
- [ ] Name is not empty
- [ ] Name length <= 255 chars
- [ ] Title length <= 255 chars
- [ ] Message length <= 500 chars
- [ ] Bio length <= 800 chars
- [ ] photo_url is valid URL
- [ ] video_url is valid URL
- [ ] sort_order is number

## 🚀 Deployment Checklist

### Pre-Production
```
[ ] All components tested
[ ] Database migration applied
[ ] API routes working
[ ] No console errors
[ ] No CSS issues
[ ] Images load correctly
[ ] Videos play correctly
[ ] Mobile responsive
```

### Staging
```
[ ] Deploy to staging environment
[ ] Test all CRUD operations
[ ] Test on real database
[ ] Test on real storage
[ ] Performance acceptable
[ ] No timeout issues
[ ] Error handling works
[ ] User permissions work
```

### Production
```
[ ] Final review complete
[ ] Backup database
[ ] Have rollback plan
[ ] Monitor errors
[ ] Check performance
[ ] Verify all features work
[ ] User training complete
[ ] Documentation updated
```

## 📞 Troubleshooting Quick Links

| Issue | Solution |
|-------|----------|
| Teachers not showing | See "No Teachers Showing" section |
| Photo won't upload | See "Photo Not Uploading" section |
| Video not playing | See "Video Not Playing" section |
| Form won't submit | See "Form Not Submitting" section |
| Styling looks off | Check Tailwind config, check custom colors |
| TypeScript errors | Verify type imports, check node_modules |
| API call fails | Check network tab, verify endpoint exists |

## 🎯 Feature Completeness

### Core Features
```
[✅] Display sambutan guru
[✅] Admin can add guru
[✅] Admin can edit guru
[✅] Admin can delete guru
[✅] Upload guru photo
[✅] Add video link
[✅] Rich bio/message
[✅] Responsive design
```

### Advanced Features
```
[✅] View/edit toggle
[✅] Error handling
[✅] Loading states
[✅] Confirmation dialogs
[✅] Content indicators (badges)
[✅] Photo preview
[✅] Video overlay
[✅] Multi-device support
```

## 📚 Documentation Status

```
[✅] SAMBUTAN_README.md (index)
[✅] SAMBUTAN_QUICKSTART.md (quick start)
[✅] SAMBUTAN_FEATURE.md (detailed)
[✅] SAMBUTAN_IMPLEMENTATION.md (how-to)
[✅] SAMBUTAN_UI_DESIGN.md (visual guide)
[✅] This file (checklist)
```

## 🎓 Training & Handoff

```
[ ] User trained on feature
[ ] Admin trained on adding teachers
[ ] User knows how to upload photos
[ ] User knows how to add videos
[ ] User knows how edit/delete
[ ] Documented in FAQ/Help
[ ] Help desk briefed
```

---

**Last Updated:** February 9, 2026
**Version:** 1.0
**Status:** ✅ Complete

**Next Step:** Start with [SAMBUTAN_QUICKSTART.md](SAMBUTAN_QUICKSTART.md)
