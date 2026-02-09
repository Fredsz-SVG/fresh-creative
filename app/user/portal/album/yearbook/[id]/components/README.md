# Yearbook Components Structure

Struktur komponen yearbook yang telah dipisahkan untuk kemudahan maintenance.

## 📁 File Structure

```
app/user/portal/album/yearbook/[id]/
├── components/
│   ├── IconSidebar.tsx       # Sidebar kiri dengan icon navigasi
│   ├── GroupPanel.tsx        # Panel tengah untuk list group
│   ├── CoverView.tsx         # View sampul album
│   ├── ApprovalView.tsx      # View approval requests
│   └── TeamView.tsx          # View team management
├── YearbookClassesViewUI.tsx # Main component (orchestrator)
└── page.tsx                  # Page wrapper
```

## 🧩 Component Descriptions

### 1. **IconSidebar.tsx**
**Purpose:** Sidebar navigasi icon di sisi kiri (64px width)

**Features:**
- Sampul Album icon
- Groups icon
- Approval icon (dengan notification badge)
- Team icon (untuk admin/owner)

**Props:**
- `isCoverView`: boolean - status apakah sedang di cover view
- `sidebarMode`: string - mode aktif ('classes' | 'approval' | 'team')
- `setSidebarMode`: function - set mode aktif
- `setView`: function - set view (cover/classes)
- `canManage`: boolean - user bisa manage atau tidak
- `requestsByClass`: object - data requests untuk badge notification

---

### 2. **GroupPanel.tsx**
**Purpose:** Panel tengah yang menampilkan list group (256px width)

**Features:**
- Editor inline untuk nama group
- Form pendaftaran member
- List semua group dengan status
- Button add group baru

**Props:**
- `currentClass`: object - group yang sedang aktif
- `classes`: array - list semua group
- `canManage`: boolean - permission management
- `classIndex`: number - index group aktif
- `setClassIndex`: function - set index aktif
- `handleDeleteClass`: function - hapus group
- `handleUpdateClass`: function - update group
- `myAccessByClass`: object - data akses user per class
- `myRequestByClass`: object - data request user per class
- `membersByClass`: object - data member per class
- `addingClass`: boolean - status adding
- `setAddingClass`: function - toggle adding
- `newClassName`: string - nama group baru
- `setNewClassName`: function - set nama baru
- `handleAddClass`: function - tambah group
- `requestForm`: object - form data request
- `setRequestForm`: function - set form data
- `handleRequestAccess`: function - submit request
- `isOwner`: boolean - user owner atau bukan
- `accessDataLoaded`: boolean - status loading data
- `isCoverView`: boolean - status cover view
- `setView`: function - set view

---

### 3. **CoverView.tsx**
**Purpose:** Tampilan sampul album dengan opsi upload

**Features:**
- Display cover image dengan aspect ratio 3:4
- Upload & delete cover image
- Upload & delete cover video
- Video play button overlay
- Preview dan crop position untuk cover

**Props:**
- `album`: object - data album
- `isOwner`: boolean - owner permission
- `uploadingCover`: boolean - status upload cover
- `coverUploadInputRef`: ref - ref untuk input file cover
- `setCoverPreview`: function - set preview data
- `setCoverPosition`: function - set crop position
- `handleDeleteCover`: function - delete cover image
- `coverVideoInputRef`: ref - ref untuk input file video
- `uploadingCoverVideo`: boolean - status upload video
- `handleUploadCoverVideo`: function - upload video handler
- `handleDeleteCoverVideo`: function - delete video handler
- `onPlayVideo`: function - play video handler

---

### 4. **ApprovalView.tsx**
**Purpose:** Halaman approval untuk manage request akses

**Features:**
- List request per group
- Approve/reject buttons
- Empty state
- Group name headers

**Props:**
- `requestsByClass`: object - data request per class
- `classes`: array - list group
- `handleApproveReject`: function - handle approve/reject action

---

### 5. **TeamView.tsx**
**Purpose:** Halaman team management

**Features:**
- List team members
- Role badges (Owner/Admin/Member)
- Promote/demote admin
- Remove member
- Empty state

**Props:**
- `members`: array - list team members
- `isOwner`: boolean - user is owner
- `canManage`: boolean - user can manage
- `handleUpdateRole`: function - update member role
- `handleRemoveMember`: function - remove member

---

## 🔄 Data Flow

```
page.tsx
  └─> YearbookClassesViewUI.tsx (Main Orchestrator)
       ├─> IconSidebar.tsx (Navigation)
       ├─> GroupPanel.tsx (Conditional - when sidebarMode === 'classes')
       └─> Content Area:
            ├─> CoverView.tsx (when isCoverView)
            ├─> ApprovalView.tsx (when sidebarMode === 'approval')
            ├─> TeamView.tsx (when sidebarMode === 'team')
            └─> Classes Content (list/grid view - when sidebarMode === 'classes')
```

## 💡 Benefits of This Structure

1. **Separation of Concerns**: Setiap view memiliki file tersendiri
2. **Easier Maintenance**: Update satu view tidak affect yang lain
3. **Better Testing**: Komponen lebih mudah di-test secara terpisah
4. **Cleaner Code**: File lebih kecil dan fokus
5. **Reusability**: Komponen bisa di-reuse di tempat lain
6. **Type Safety**: Props interface jelas per komponen

## 🛠️ Development Tips

- **Adding New View**: Buat file baru di `/components` dan import di main file
- **Modifying View**: Edit file component yang sesuai tanpa touch yang lain
- **Debugging**: Cek per component untuk isolate issue
- **Styling**: Semua menggunakan Tailwind CSS utility classes

## 📝 Notes

- Main component `YearbookClassesViewUI.tsx` masih berisi:
  - State management
  - API calls
  - Mobile views (belum di-extract)
  - Classes list/grid view (belum di-extract)
  
- Future improvement bisa extract mobile views dan classes content juga

---

**Last Updated:** February 7, 2026
**Version:** 1.0.0
