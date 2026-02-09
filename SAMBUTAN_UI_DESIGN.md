# 🎨 Sambutan Enhanced - UI/UX Layout

Visual overview dari fitur sambutan yang baru.

## 📱 SambutanViewEnhanced - Public Display

### Desktop View
```
┌─────────────────────────────────────────────────────────────┐
│                    Sambutan Guru & Staff                    │
│              Kata-kata inspiratif dari guru dan staff       │
└─────────────────────────────────────────────────────────────┘

┌──────────────────────────┬─────────────────────────────────┐
│   Daftar Guru & Staff    │      Detail Guru Terpilih       │
│                          │                                 │
│  ┌────────────────────┐  │  ┌────────────────────────────┐ │
│  │ [👤] Nama Guru     │  │  │  ┌──────────────────────┐ │ │
│  │ Jabatan            │  │  │  │                      │ │ │
│  │ ─────────────────  │  │  │  │   FOTO GURU          │ │ │
│  │                    │  │  │  │                      │ │ │
│  │ Ibu Siti           │  │  │  │ ┌────────────────┐  │ │ │
│  │ Kepala Sekolah ✓   │  │  │  │ │  ▶ Play Video │  │ │ │
│  │ ─────────────────  │  │  │  │ └────────────────┘  │ │ │
│  │                    │  │  │  └──────────────────────┘ │ │
│  │ Pak Budi           │  │  │                           │ │
│  │ Wakil Kepala       │  │  │  Ibu Dr. Siti Nurhaliza │ │
│  │ (tidak dipilih)    │  │  │  Kepala Sekolah        │ │
│  │                    │  │  │                           │ │
│  │ Ibu Maya           │  │  │  "Pendidikan adalah      │ │
│  │ Guru BK            │  │  │   investasi terbaik       │ │
│  │                    │  │  │   untuk masa depan      │ │
│  │ ─────────────────  │  │  │                          │ │
│  │ Scroll down ↓      │  │  │  TENTANG:                │ │
│  │                    │  │  │  Kepala sekolah dengan   │ │
│  └────────────────────┘  │  │  pengalaman 15 tahun...  │ │
│                          │  │                           │ │
│                          │  │  [▶ Lihat Video Lengkap] │ │
│                          │  │                           │ │
│                          │  │  ─────────────────────── │ │
│                          │  │  Sambutan                │ │
│                          │  └────────────────────────────┘│
└──────────────────────────┴─────────────────────────────────┘
```

### Mobile View (Single Column)
```
┌──────────────────────┐
│  Sambutan Guru       │
│  Kata-kata inspiratif│
└──────────────────────┘

┌──────────────────────┐
│ [👤] Ibu Siti        │
│ Kepala Sekolah ✓     │
└──────────────────────┘

┌──────────────────────┐
│ [👤] Pak Budi        │
│ Wakil Kepala         │
└──────────────────────┘

┌──────────────────────┐
│ Foto Guru (Full)     │
│  [▶ Play Video]      │
└──────────────────────┘

┌──────────────────────┐
│ Ibu Dr. Siti N.      │
│ Kepala Sekolah       │
│                      │
│ "Pendidikan adalah..." 
│                      │
│ TENTANG:             │
│ Pengalaman 15 tahun..│
│                      │
│ [Play Video]         │
└──────────────────────┘
```

## 🎛️ SambutanPanelEnhanced - Admin Control

### Edit Panel Layout
```
┌────────────────────────────────────┐
│ Sambutan Guru & Staff          [+] │
│ Kelola sambutan guru dengan...     │
└────────────────────────────────────┘

[Browse: Add Teacher Form]
┌────────────────────────────────────┐
│ Tambah Guru Baru                   │
│ Nama guru: [________________]       │
│ Jabatan:   [________________]       │
│                                    │
│ [+ Tambah]  [Batal]                │
└────────────────────────────────────┘

[List View]
┌────────────────────────────────────┐
│  Item 1: Guru Existing              │
│  ┌────┐                             │
│  │ 📷 │ Ibu Siti            [✏][🗑]│
│  │    │ Kepala Sekolah              │
│  │ +  │ [Sambutan] [Bio] [Video]   │
│  └────┘                             │
│  (hover foto untuk upload/delete)  │
└────────────────────────────────────┘

[Edit Mode (Expanded)]
┌────────────────────────────────────┐
│ Edit Guru                           │
│ Nama: [Ibu Siti_________]          │
│ Jabatan: [Kepala Sekolah_]         │
│                                    │
│ Sambutan:                          │
│ [Pendidikan adalah investasi...]   │
│ [                           ] 200/ │
│                                    │
│ Bio/Tentang:                       │
│ [Kepala sekolah dengan             │
│  pengalaman 15 tahun...]           │
│ [                           ] 300/ │
│                                    │
│ Video URL:                         │
│ [https://youtube.com/watch?v=...]  │
│                                    │
│ [Photo Upload Area]                │
│ Hover untuk ganti foto              │
│                                    │
│ [Simpan] [Batal]                   │
└────────────────────────────────────┘
```

### Component Breakdown

```
SambutanPanelEnhanced
├── Header
│   ├── Title + Icon
│   └── [+ Button] (Add)
│
├── Content Area
│   ├── Add Form (conditional)
│   │   ├── Name Input
│   │   ├── Title Input
│   │   └── [Add] [Cancel]
│   │
│   └── Teachers List
│       ├── Item (View Mode)
       │   ├── Photo Thumbnail (w-12 h-15)
       │   │   └── Hover Overlay
       │   │       ├── Upload Icon (atas)
       │   │       └── Delete Icon (bawah, if photo exists)
       │   ├── Info Container
       │   │   ├── Name + Inline Buttons [Edit] [Delete]
       │   │   ├── Title (if exists)
       │   │   └── Content Badges
       │   │       ├── [Sambutan]
       │   │       ├── [Bio]
       │   │       └── [🎬 Video]
│       │
│       └── Item (Edit Mode)
│           ├── Name Input
│           ├── Title Input
│           ├── Message Textarea
│           ├── Bio Textarea
│           ├── Video URL Input
│           ├── Photo Upload
│           └── [Save] [Cancel]
│
└── Empty State
    └── If no teachers
```

## 🌈 Color Scheme

### Primary Colors
- **Lime:** `#84cc16` (lime-400), `#65a30d` (lime-500), `#4b5320` (lime-600)
- Used for: Accents, buttons, active states

### Text & Background
- **App Text:** Custom dark color for main text
- **Muted:** Custom gray for secondary text
- **White/Alpha:** `white/5`, `white/10` for cards, `white/20` for borders

### State Colors
```
Edit Mode:    Blue (bg-blue-500/20, text-blue-400)
Delete:       Red  (bg-red-500/20, text-red-400)
Content:      Various (green, blue, purple, red)
Loading:      Lime spinner
Success:      Lime highlight
Error:        Red banner
```

## 📐 Layout Grid

### Desktop (lg: 1024px+)
- Sidebar: `lg:col-span-1` (25%)
- Content: `lg:col-span-2` (75%)
- Gap between: 6 units (24px)

### Tablet (md: 640px - 1024px)
- Full width, stacked layout
- Single column

### Mobile (< 640px)
- Full width
- Optimized for touch
- Collapsed controls

## 🎬 Video Integration

### Video Display Modes

**1. YouTube Video**
```
https://youtube.com/watch?v=ID
↓ (converted to)
https://youtube.com/embed/ID
```

**2. Vimeo Video**
```
https://vimeo.com/ID
↓ (direct link to)
Play button overlay
```

**3. Storage/Self-hosted**
```
https://storage.example.com/video.mp4
↓ (direct link to)
Play button overlay
```

### Video Overlay
```
┌──────────────────────────┐
│                          │
│    BACKGROUND IMAGE      │
│                          │
│     ┌─────────────┐     │
│     │   ▶ PLAY   │     │ (lime-500, scale on hover)
│     └─────────────┘     │
│                          │
│  (Black/30 overlay)      │
└──────────────────────────┘
```

## 📊 Component States

### Loading
```
┌──────────────────┐
│  [Spinning icon] │
│   Loading...     │
└──────────────────┘
```

### Empty
```
┌──────────────────────────┐
│                          │
│    [💬 Icon]             │
│   Belum ada guru          │
│                          │
│  Klik tombol + untuk...   │
└──────────────────────────┘
```

### Error
```
┌──────────────────────────┐
│ [!] Gagal memuat data     │
│     sambutan              │
└──────────────────────────┘
```

## ♿ Accessibility

- Button labels untuk screen readers
- Semantic HTML (button, form, etc)
- ARIA labels pada icons
- Color contrast: lime on dark (WCAG AA)
- Tab navigation supported
- Mobile touch targets: min 44px

## 🎯 Interactive Elements

### Hover States
```
Card:
  Default:  bg-white/5 border-white/10
  Hover:    bg-white/10 border-white/20 scale-105

Button:
  Default:  bg-lime-600
  Hover:    bg-lime-500
  Disabled: opacity-50 cursor-not-allowed

Input/Textarea:
  Focus:    border-lime-500 outline-none
```

### Transitions
```
Duration: 150ms-300ms
Easing:   ease-in-out (default)
Properties: colors, background, scale, opacity
```

## 📏 Sizing

### Photos
- List item: 48x60px (3:4 ratio)
- Detail view: aspect-video (16:9 ratio)

### Cards
- List items: full-width (max 320px in sidebar)
- Detail: full-width (max 600px)

### Fonts
- H1 (Sambutan title): text-3xl bold
- H2 (Guru name): text-2xl bold
- H3 (Guru title): text-sm bold
- Body: text-sm
- Small: text-xs

---

**Visual Guide Version:** 1.0  
**Last Updated:** February 9, 2026
