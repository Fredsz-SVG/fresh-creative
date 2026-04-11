'use client'

import * as ReactGlobal from 'react'
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import FilerobotImageEditor, { TABS, TOOLS } from 'react-filerobot-image-editor'
import { TOOLS_ITEMS } from 'react-filerobot-image-editor/lib/components/tools/tools.constants'
import { clsx } from 'clsx'
import { Upload, X, Wand2, Loader2 } from 'lucide-react'
import { fetchWithAuth } from '@/lib/api-client'
import { asObject, asString } from '@/components/yearbook/utils/response-narrowing'
import { createEditorConfig } from './filter-ui/editorConfig'
import { buildRemoveBgObjectRemovalTool } from './remove-bg-filerobot-tools'
import { compositeForegroundOnImageBg, compositeForegroundOnSolid } from './composite-bg'

// Some builds of react-filerobot-image-editor/konva expect global React.
if (typeof window !== 'undefined') {
  ;(window as any).React = (window as any).React ?? ReactGlobal

  // Suppress Filerobot's internal styled-components passing 'active' boolean onto DOM elements
  const originalConsoleError = console.error
  console.error = (...args: any[]) => {
    const isIgnoredWarning = args.some(
      (arg) => {
        const str = typeof arg === 'string' ? arg : (arg instanceof Error ? arg.message : '')
        return (
          str.includes('for a non-boolean attribute `active`') ||
          str.includes('React does not recognize the `disableHover` prop') ||
          str.includes('React does not recognize the `isCollapsed` prop') ||
          str.includes('React does not recognize the `noWrap` prop') ||
          str.includes('React does not recognize the `watermarkTool` prop')
        )
      }
    )
    if (isIgnoredWarning) return
    originalConsoleError.apply(console, args)
  }

  // Force Filerobot to render standard Tabs instead of Hamburger Menu Drawer for mobile
  // by overriding window.matchMedia just for its internal mobile breakpoints (max-width: 760px).
  // We'll style it to act as a bottom navbar using CSS below.
  const originalMatchMedia = window.matchMedia
  window.matchMedia = (query) => {
    if (query.includes('max-width: 760px') || query.includes('max-width: 768px')) {
      return {
        ...originalMatchMedia(query),
        matches: false, // Force desktop layout internally so TabsNavbar mounts
      } as MediaQueryList
    }
    return originalMatchMedia(query)
  }
}

function createDownloadLink(dataUrl: string, filename: string) {
  const link = document.createElement('a')
  link.download = filename
  link.href = dataUrl
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const res = await fetch(dataUrl)
  return await res.blob()
}

async function blobToDataUrl(blob: Blob): Promise<string> {
  return await new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Gagal membaca hasil gambar.'))
    reader.onload = () => resolve(String(reader.result || ''))
    reader.readAsDataURL(blob)
  })
}

function validateImageFile(file: File): void {
  if (!file.type.startsWith('image/')) {
    throw new Error('Please select a valid image file')
  }
  const maxSize = 10 * 1024 * 1024 // 10MB
  if (file.size > maxSize) {
    throw new Error('Image size must be less than 10MB')
  }
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
  if (!allowedTypes.includes(file.type)) {
    throw new Error('Please select a JPEG, PNG, GIF, or WebP image')
  }
}

// ============== UI Components from Github (Button, LoadingSpinner) ==============

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary'
}

const Button: React.FC<ButtonProps> = ({ variant = 'primary', children, className, ...props }) => {
  return (
    <button
      className={clsx(
        'inline-flex items-center px-4 py-2 rounded-lg font-medium transition-colors',
        {
          'bg-blue-600 hover:bg-blue-700 text-white': variant === 'primary',
          'bg-gray-700 hover:bg-gray-600 text-gray-200': variant === 'secondary',
        },
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}

const LoadingSpinner: React.FC = () => {
  return (
    <div className="flex items-center justify-center p-4">
      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
      <span className="ml-3 text-gray-400">Processing image...</span>
    </div>
  )
}

// ============== Filerobot editor: Remove BG uses native AI tab + tools override ==============

interface EditorProps {
  imageUrl: string
  onClose: () => void
  onSave: (editedImageUrl: string) => void
  handleRemoveBg: () => Promise<void>
  removeBgState: 'idle' | 'removing' | 'error'
  creditsPerRemoveBg: number | null
  hasRemovedBg: boolean
  onRequestBgUpload: () => void
  onPickSolidColor: (hex: string) => void
  onRestoreTransparent: () => void
}

const ImageEditor: React.FC<EditorProps> = ({
  imageUrl,
  onClose,
  onSave,
  handleRemoveBg,
  removeBgState,
  creditsPerRemoveBg,
  hasRemovedBg,
  onRequestBgUpload,
  onPickSolidColor,
  onRestoreTransparent,
}) => {
  const tools = useMemo(() => {
    return {
      ...TOOLS_ITEMS,
      [TOOLS.OBJECT_REMOVAL]: buildRemoveBgObjectRemovalTool({
        onRemoveBg: handleRemoveBg,
        removeBgState,
        creditsPerUse: creditsPerRemoveBg,
        hasRemovedBg,
        onRequestBgUpload,
        onPickSolidColor,
        onRestoreTransparent,
      }),
    }
  }, [
    handleRemoveBg,
    removeBgState,
    creditsPerRemoveBg,
    hasRemovedBg,
    onRequestBgUpload,
    onPickSolidColor,
    onRestoreTransparent,
  ])

  const config = useMemo(() => {
    return {
      ...createEditorConfig(imageUrl),
      tools,
    }
  }, [imageUrl, tools])

  return (
    <div className="relative flex flex-col w-full h-full min-h-[100dvh] overflow-auto overscroll-none">
      <div className="flex-1 min-h-0 flex flex-col">
        <FilerobotImageEditor
          // tools override is supported at runtime but omitted from package typings.
          {...(config as any)}
          onSave={(editedImageObject: any) => {
            onSave(String(editedImageObject?.imageBase64 || ''))
          }}
          onClose={onClose}
          defaultTabId={TABS.ADJUST}
          defaultToolId={TOOLS.CROP}
          savingPixelRatio={2}
          previewPixelRatio={2}
        />
      </div>

            <style jsx global>{`
          :root {
            color-scheme: dark;
          }
          .filerobot-image-editor-root,
          .FIE_root {
            height: 100% !important;
            min-height: 0 !important;
            box-shadow: none !important;
          }
          .FIE_tabs_navbar {
            box-shadow: none !important;
          }
          
          /* Forced Mobile Bottom Navbar Override */
                      @media (max-width: 768px) {
              .FIE_main-container {
                flex-direction: column-reverse !important;
              }
              .FIE_tabs_navbar {
                display: flex !important;
                flex-direction: row !important;
                width: 100% !important;
                min-width: 100% !important;
                height: 72px !important;
                overflow-x: auto !important;
                overflow-y: hidden !important;
                padding: 8px !important;
                border-top: 1px solid #3f3f46 !important;
                z-index: 100 !important;
                align-items: center !important;
                justify-content: flex-start !important;
                gap: 16px !important;
                /* Hide standard scrollbar across browsers */
                -ms-overflow-style: none !important;
                scrollbar-width: none !important;
              }
              .FIE_tabs_navbar::-webkit-scrollbar {
                display: none !important;
              }
              .FIE_tabs_navbar > div, .FIE_tabs_navbar > span, .FIE_tabs_navbar > button {
                flex-shrink: 0 !important;
                min-width: 64px !important;
                display: flex !important;
                flex-direction: column !important;
                align-items: center !important;
                justify-content: center !important;
                padding: 4px 8px !important;
              }
              .FIE_editor-content {
                width: 100% !important;
                height: calc(100dvh - 72px - 56px) !important; /* Adjust based on topbar and bottom nav */
              }
                            [data-testid="FIE-tab-label"] {
                font-size: 11px !important;
                margin-top: 4px !important;
                text-align: center !important;
              }
              
              /* Hide any hamburger menu buttons or toggle buttons inside Filerobot on mobile */
              [data-testid="FIE-tabs-drawer-menu-button"],
              .FIE_tabs-drawer,
              [data-testid="FIE-topbar-menu-button"],
              .FIE_topbar-menu-button,
              .SfxButton-link-basic-secondary:has(svg title:contains('Menu')),
              button:has(svg title:contains('Menu')),
              button[title="Menu"],
              button[aria-label="Menu"] {
                display: none !important;
              }
            }
        .FIE_topbar {
          box-shadow: none !important;
          border-bottom: 1px solid #2f2f2f !important;
        }
        /* Remove BG panel: buka height cap & reset padding bawaan FIE agar layout kita tidak terpotong. */
        .FIE_tool-options-wrapper:has([data-testid='FIE-remove-bg-options']) {
          max-height: none !important;
          overflow: visible !important;
          padding: 0 !important;
          margin: 0 !important;
        }
        /* Wrapper luar juga jangan overflow hidden supaya tidak butuh scroll. */
        .FIE_tools-bar-wrapper:has([data-testid='FIE-remove-bg-options']) {
          overflow: visible !important;
        }
        /* Item tool tidak di-render (null) — strip carousel tetap ada wrapper kosong; sembunyikan. */
        .FIE_tools-bar-wrapper:has([data-testid='FIE-remove-bg-options']) .FIE_tools-bar {
          display: none !important;
        }
        /*
          Library: getCursorStyle() → toolId === ObjectRemoval ⇒ cursor "none" (mode brush + kursor custom).
          Remove BG tidak pakai brush — pakai kursor biasa di canvas.
        */
        .FIE_root:has([data-testid='FIE-remove-bg-options']) .FIE_canvas-node {
          cursor: default !important;
        }
        /* Kurangi kilatan putih saat ganti source (loader Filerobot default rgba putih). */
        .FIE_root .FIE_spinner-wrapper {
          background: rgba(15, 15, 15, 0.35) !important;
        }

        /* ━━━ Crop-presets dropdown patch (portal, di luar .FIE_root) ━━━
         * SfxMenu-root: width 195px fixed + overflow-x:hidden → konten accordion terpotong.
         * ─────────────────────────────────────────────────────────── */

        /* Menu wrapper — perlebar & izinkan konten penuh */
        .FIE_crop-presets-menu.SfxMenu-root {
          width: auto !important;
          min-width: 240px !important;
          max-width: none !important;
          max-height: none !important;
          overflow: visible !important;
          background-color: #1c1c1c !important;
          box-shadow: 0 4px 20px rgba(0,0,0,0.55) !important;
          border-radius: 8px !important;
          padding: 4px 0 !important;
        }

        /* StyledMenu inner container (bg dari BackgroundStateless) */
        .FIE_crop-presets-menu > div {
          background-color: transparent !important;
        }

        /* Setiap menu item */
        .FIE_crop-presets-menu .SfxMenuItem-root {
          background-color: transparent !important;
          color: #e0e0e0 !important;
          white-space: nowrap;
          min-width: 0;
          box-sizing: border-box;
        }
        .FIE_crop-presets-menu .SfxMenuItem-root:hover {
          background-color: rgba(255,255,255,0.08) !important;
        }
        .FIE_crop-presets-menu .SfxMenuItem-root.active,
        .FIE_crop-presets-menu .SfxMenuItem-root[class*='active'] {
          background-color: rgba(33,150,243,0.15) !important;
        }

        /* Label teks di dalam item */
        .FIE_crop-presets-menu .SfxMenuItem-Label,
        .FIE_crop-presets-menu .SfxMenuItemLabel-root,
        .FIE_crop-presets-menu span {
          color: #e0e0e0 !important;
          white-space: nowrap;
        }

        /* Accordion (Social Media groups) */
        .FIE_crop-presets-menu .SfxAccordion-root {
          width: 100% !important;
          overflow: visible !important;
        }

        /* Accordion header (judul grup, e.g. "LinkedIn") */
        .FIE_crop-presets-menu .SfxAccordionHeader-root {
          width: 100% !important;
          padding: 6px 16px !important;
          box-sizing: border-box;
          color: #9ca3af !important;
        }
        .FIE_crop-presets-menu .SfxAccordionHeader-root:hover {
          background-color: rgba(255,255,255,0.06) !important;
        }
        .FIE_crop-presets-menu .SfxAccordionHeader-label {
          color: #9ca3af !important;
          white-space: nowrap;
        }
        .FIE_crop-presets-menu .SfxAccordionHeader-icon {
          color: #6b7280 !important;
        }
        .FIE_crop-presets-menu .SfxAccordionHeader-wrapper {
          color: #9ca3af !important;
        }

        /* Accordion details (expanded list items) */
        .FIE_crop-presets-menu .SfxAccordionDetails-root {
          margin: 0 !important;
          overflow: visible !important;
        }

        /* Nested accordion item (item di dalam grup) */
        .FIE_crop-presets-menu .SfxMenuItem-root[class*='isAccordion'],
        .FIE_crop-presets-menu [class*='FIE_crop-preset'] {
          padding-left: 24px !important;
        }

        /* ━━━ Save-modal patch (portal ke body, di luar .FIE_root) ━━━
         * SfxModal-Container di-render lewat portal — CSS .FIE_root tidak berlaku.
         * Override langsung lewat class Scaleflex UI.
         * ─────────────────────────────────────────────────────────── */

        /* Overlay backdrop */
        .SfxModal-Overlay {
          background-color: rgba(0, 0, 0, 0.65) !important;
        }

        /* Kotak putih modal → gelap */
        .SfxModal-Container {
          background-color: #1c1c1c !important;
          box-shadow: 0 8px 32px rgba(0,0,0,0.6) !important;
          color: #e8e8e8 !important;
        }

        /* Header / title area */
        .SfxModalTitle-root {
          background-color: #161616 !important;
          border-bottom-color: #2f2f2f !important;
          color: #e8e8e8 !important;
        }
        .SfxModalTitle-LabelPrimary,
        .SfxModalTitle-LabelSecondary {
          color: #e8e8e8 !important;
        }
        .SfxModalTitle-Close {
          color: #9ca3af !important;
        }
        .SfxModalTitle-Close:hover {
          color: #e8e8e8 !important;
        }

        /* Body area (semua teks & label di dalam modal) */
        .SfxModal-Container label,
        .SfxModal-Container .SfxLabel-root,
        .SfxModal-Container span {
          color: #9ca3af !important;
        }

        /* Input fields di modal (nama file, dll) */
        .SfxModal-Container .SfxInput-root,
        .SfxModal-Container .SfxInputGroup-root {
          background-color: transparent !important;
          border-color: rgba(255,255,255,0.12) !important;
          color: #e8e8e8 !important;
        }
        .SfxModal-Container .SfxInput-root:hover {
          background-color: rgba(255,255,255,0.05) !important;
          border-color: rgba(255,255,255,0.22) !important;
        }
        .SfxModal-Container .SfxInput-root:focus-within {
          border-color: #2196f3 !important;
          box-shadow: 0 0 0 2px rgba(33,150,243,0.18) !important;
        }
        .SfxModal-Container .SfxInput-Base {
          color: #e8e8e8 !important;
          -webkit-text-fill-color: #e8e8e8 !important;
          background-color: transparent !important;
          caret-color: #e8e8e8 !important;
        }
        .SfxModal-Container .SfxInput-Base::placeholder {
          color: rgba(255,255,255,0.25) !important;
          -webkit-text-fill-color: rgba(255,255,255,0.25) !important;
        }
        .SfxModal-Container .SfxInput-Icon {
          color: rgba(255,255,255,0.35) !important;
        }

        /* Select dropdown (pilih format file) */
        .SfxModal-Container .SfxSelectGroup-root,
        .SfxModal-Container .SfxSelect-root,
        .SfxModal-Container [class*='SfxSelect'] {
          background-color: transparent !important;
          border-color: rgba(255,255,255,0.12) !important;
          color: #e8e8e8 !important;
        }
        /* Dropdown list items */
        .SfxMenuItem-root {
          background-color: #1c1c1c !important;
          color: #e8e8e8 !important;
        }
        .SfxMenuItem-root:hover {
          background-color: #2a2a2a !important;
        }

        /* Tombol Save & Cancel di dalam modal */
        .SfxModalActions-root .SfxButton-root {
          color: #e8e8e8 !important;
        }
        /* Tombol primary (Save) */
        .SfxModalActions-root .SfxButton-root[color='primary'],
        .SfxModal-Container .SfxButton-root[color='primary'] {
          background-color: #1976d2 !important;
          color: #ffffff !important;
          border: none !important;
        }
        .SfxModalActions-root .SfxButton-root[color='primary']:hover {
          background-color: #1565c0 !important;
        }
        /* Tombol secondary (Cancel) */
        .SfxModalActions-root .SfxButton-root[color='secondary'],
        .SfxModal-Container .SfxButton-root[color='secondary'] {
          background-color: transparent !important;
          border-color: rgba(255,255,255,0.15) !important;
          color: #e8e8e8 !important;
        }
        .SfxModalActions-root .SfxButton-root[color='secondary']:hover {
          background-color: rgba(255,255,255,0.07) !important;
        }

        /* Slider quality di modal */
        .SfxModal-Container .FIE_save-quality-wrapper label,
        .SfxModal-Container .FIE_save-quality-wrapper span {
          color: #9ca3af !important;
        }

        /* ━━━ Scaleflex UI — dark-theme patch (semua bg transparan) ━━━
         * Biarkan warna dasar Filerobot yang menentukan bg sidebar;
         * kita hanya pastikan teks & border input tetap kontras.
         * ─────────────────────────────────────────────────────────── */

        /* Panel & area tool — transparan agar menyatu dengan bg Filerobot */
        .FIE_root .FIE_tool-options-wrapper,
        .FIE_root .FIE_tools-bar-wrapper,
        .FIE_root .FIE_resize-tool-options,
        .FIE_root [class*='FIE_'][class*='-option'],
        .FIE_root [class*='FIE_'][class*='-options'] {
          background-color: transparent !important;
        }

        /* ── InputGroup & Input wrapper ── */
        .FIE_root .SfxInputGroup-root,
        .FIE_root .SfxInput-root {
          background-color: transparent !important;
          border-color: rgba(255,255,255,0.12) !important;
          color: #e8e8e8 !important;
        }
        .FIE_root .SfxInput-root:hover {
          background-color: rgba(255,255,255,0.05) !important;
          border-color: rgba(255,255,255,0.22) !important;
        }
        .FIE_root .SfxInput-root:focus-within {
          background-color: rgba(255,255,255,0.06) !important;
          border-color: #2196f3 !important;
          box-shadow: 0 0 0 2px rgba(33,150,243,0.18) !important;
        }

        /* ── Input Base ── */
        .FIE_root .SfxInput-Base {
          color: #e8e8e8 !important;
          -webkit-text-fill-color: #e8e8e8 !important;
          background-color: transparent !important;
          caret-color: #e8e8e8 !important;
        }
        .FIE_root .SfxInput-Base::placeholder {
          color: rgba(255,255,255,0.25) !important;
          -webkit-text-fill-color: rgba(255,255,255,0.25) !important;
        }
        .FIE_root .SfxInput-Base::-webkit-inner-spin-button,
        .FIE_root .SfxInput-Base::-webkit-outer-spin-button {
          -webkit-appearance: none;
        }

        /* ── Label & teks samping input ("Width", "Height", "px") ── */
        .FIE_root .SfxInputGroup-root span,
        .FIE_root .SfxInput-root span,
        .FIE_root .SfxLabel-root,
        .FIE_root label {
          color: rgba(255,255,255,0.45) !important;
        }

        /* ── Icon akhir ("px") ── */
        .FIE_root .SfxInput-Icon {
          color: rgba(255,255,255,0.35) !important;
        }

        /* ── Gembok / Ratio-lock & Reset button ── */
        .FIE_root .FIE_resize-ratio-locker.SfxIconButton-root,
        .FIE_root .FIE_resize-reset-button.SfxIconButton-root {
          background-color: transparent !important;
          border: none !important;
          box-shadow: none !important;
        }
        .FIE_root .FIE_resize-ratio-locker.SfxIconButton-root:hover,
        .FIE_root .FIE_resize-reset-button.SfxIconButton-root:hover {
          background-color: rgba(255,255,255,0.08) !important;
        }

        /* ── SfxButton di panel tool ── */
        .FIE_root .FIE_tool-options-wrapper .SfxButton-root {
          background-color: transparent !important;
          color: #e8e8e8 !important;
          border-color: rgba(255,255,255,0.12) !important;
        }
        .FIE_root .FIE_tool-options-wrapper .SfxButton-root:hover {
          background-color: rgba(255,255,255,0.07) !important;
          border-color: rgba(255,255,255,0.22) !important;
        }
        /* Fix for Crop tool dropdowns (like Social Media) closing on hover & scrollbar issues */
        .FIE_tool-options-wrapper,
        .FIE_tools-bar-wrapper,
        .FIE_tabs-drawer {
          overflow: visible !important;
        }

        .FIE_crop-preset-groups,
        .SfxMenu-root,
        [data-testid='FIE-crop-presets-groups-folder'] {
          overflow: visible !important;
        }

        /* Prevent text from being cut off in the dropdown */
        .SfxMenuItem-root,
        .SfxMenuItem-subList {
          white-space: nowrap !important;
          min-width: max-content !important;
        }

        /* Make sure the submenu popup doesn't get clipped and doesn't scroll inside the sidebar */
        .SfxMenu-root {
          max-height: none !important;
          height: auto !important;
        }
      `}</style>
    </div>
  )
}

// ============== Main Default Component ==============

export default function ImageEditorFilerobot() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [editedImage, setEditedImage] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [creditsPerRemoveBg, setCreditsPerRemoveBg] = useState<number | null>(null)
  const [removeBgState, setRemoveBgState] = useState<'idle' | 'removing' | 'error'>('idle')
  /** Setelah Remove BG sukses — tampilkan opsi upload / warna solid. */
  const [hasRemovedBg, setHasRemovedBg] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const replaceBgInputRef = useRef<HTMLInputElement>(null)
  /**
   * Hanya naik saat user upload gambar BARU dari disk — jangan pakai `key={selectedImage}`:
   * tiap ganti blob (Remove BG / solid / upload BG) memicu remount dan menghapus undo/redo Filerobot.
   */
  const [editorSessionKey, setEditorSessionKey] = useState(0)
  /** Potongan PNG transparan hasil Remove BG — dipakai untuk ganti BG solid/upload & kembali transparan. */
  const [transparentCutoutUrl, setTransparentCutoutUrl] = useState<string | null>(null)

  // Fetch Pricing for "Remove BG"
  useEffect(() => {
    let cancelled = false
    const loadPricing = async () => {
      try {
        const res = await fetchWithAuth('/api/admin/ai-edit')
        if (!res.ok) return
        const data = await res.json()
        if (!Array.isArray(data)) return
        const item = data.find((p: any) => p.feature_slug === 'image_remove_bg')
        if (!item || cancelled) return
        if (typeof item.credits_per_use === 'number') {
          setCreditsPerRemoveBg(item.credits_per_use)
        }
      } catch {
        // ignore
      }
    }
    loadPricing()
    return () => { cancelled = true }
  }, [])

  // Lock scrolling when editor is active
  useEffect(() => {
    if (typeof document === 'undefined') return
    if (!selectedImage) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [selectedImage])

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    setError(null)
    const file = event.target.files?.[0]
    if (!file) return

    try {
      validateImageFile(file)
      setIsProcessing(true)

      const image = new Image()
      const imageUrl = URL.createObjectURL(file)
      await new Promise((resolve, reject) => {
        image.onload = resolve
        image.onerror = () => reject(new Error('Failed to load image'))
        image.src = imageUrl
      })
      URL.revokeObjectURL(imageUrl)

      // Convert standard file to data URL for Selected Image (Filerobot consumes Data URLs or pure URLs)
      const reader = new FileReader()
      reader.onload = (e) => {
        if (e.target?.result) {
          setHasRemovedBg(false)
          setTransparentCutoutUrl(null)
          setEditorSessionKey((k) => k + 1)
          setSelectedImage(e.target.result as string)
        }
      }
      reader.readAsDataURL(file)
    } catch (err) {
      console.error('Error processing image:', err)
      alert(err instanceof Error ? err.message : 'Failed to process image')
    } finally {
      setIsProcessing(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleSave = (editedImageUrl: string) => {
    setEditedImage(editedImageUrl)
    setHasRemovedBg(false)
    setTransparentCutoutUrl(null)
    setSelectedImage(null)
  }

  const handleDownload = () => {
    if (editedImage) {
      createDownloadLink(editedImage, 'edited-image.png')
    }
  }

  const handleClose = () => {
    setHasRemovedBg(false)
    setTransparentCutoutUrl(null)
    setSelectedImage(null)
  }

  const handleReset = () => {
    setEditedImage(null)
    setHasRemovedBg(false)
    setTransparentCutoutUrl(null)
    setSelectedImage(null)
  }

  const handleReplaceBgFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (event.target) event.target.value = ''
    if (!file || !transparentCutoutUrl) return
    try {
      validateImageFile(file)
      const reader = new FileReader()
      reader.onload = async () => {
        const bgUrl = String(reader.result || '')
        const fg = transparentCutoutUrl
        try {
          const out = await compositeForegroundOnImageBg(fg, bgUrl)
          setSelectedImage(out)
        } catch (err) {
          alert(err instanceof Error ? err.message : 'Gagal menggabungkan background')
        }
      }
      reader.readAsDataURL(file)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'File tidak valid')
    }
  }

  const handlePickSolidColor = useCallback(
    async (hex: string) => {
      if (!transparentCutoutUrl) return
      try {
        const out = await compositeForegroundOnSolid(transparentCutoutUrl, hex)
        setSelectedImage(out)
      } catch (e) {
        alert(e instanceof Error ? e.message : 'Gagal menerapkan warna')
      }
    },
    [transparentCutoutUrl],
  )

  const handleRestoreTransparent = useCallback(() => {
    if (transparentCutoutUrl) setSelectedImage(transparentCutoutUrl)
  }, [transparentCutoutUrl])

  // ============== Remove BG Server Action ==============
  const handleRemoveBg = useCallback(async () => {
    if (!selectedImage) return
    if (hasRemovedBg) return
    setError(null)
    setRemoveBgState('removing')
    try {
      const creditRes = await fetchWithAuth('/api/admin/ai-edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feature_slug: 'image_remove_bg' }),
      })
      const creditData = asObject(await creditRes.json().catch(() => ({})))
      if (!creditRes.ok || creditData.ok === false) {
        if (creditRes.status === 402) {
          setError('Credit kamu tidak cukup untuk Remove Background. Silakan top up credit terlebih dahulu.')
        } else {
          setError(asString(creditData.error) || 'Gagal memotong credit untuk Remove Background.')
        }
        setRemoveBgState('error')
        return
      }

      const blob = await dataUrlToBlob(selectedImage)
      const { removeBackground } = await import('@imgly/background-removal')
      const outBlob = await removeBackground(blob, {
        output: { format: 'image/png' },
      })
      const outUrl = await blobToDataUrl(outBlob)
      setTransparentCutoutUrl(outUrl)
      setSelectedImage(outUrl)
      setHasRemovedBg(true)
      setRemoveBgState('idle')
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('credits-updated'))
      }
    } catch (e) {
      setRemoveBgState('error')
      setError(e instanceof Error ? e.message : String(e))
      alert('Error saat Remove BG: ' + (e instanceof Error ? e.message : String(e)))
    }
  }, [selectedImage, hasRemovedBg])

  return (
    <div className="min-h-screen bg-white relative w-full">
      {error && selectedImage && (
        <div className="fixed top-20 inset-x-0 z-[100] p-3 text-center bg-red-600 text-white font-bold text-xs uppercase tracking-widest shadow-xl">
          {error}
        </div>
      )}

      {/* Exactly GitHub Landing Page layout */}
      {!selectedImage && !editedImage && (
        <div className="flex flex-col items-center justify-center p-8 text-black dark:text-gray-900 bg-white">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Filter</h1>
          <div className="text-center max-w-2xl mb-12">
            <p className="text-xl text-gray-600 mb-6">
              A powerful, web-based image editor with an intuitive interface for quick edits and filters. Local and privacy-friendly.
            </p>
            
            <div className="inline-block">
              {isProcessing ? (
                <LoadingSpinner />
              ) : (
                <>
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={handleFileChange}
                  />
                  <Button onClick={() => fileInputRef.current?.click()}>
                    <Upload className="w-5 h-5 mr-2" />
                    Upload Image
                  </Button>
                </>
              )}
            </div>
            
            {error && (
              <p className="mt-4 text-red-500 font-medium text-sm">{error}</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-4xl">
            <div className="flex flex-col items-center p-4 bg-gray-50 rounded-lg">
              <img src="/img/editing@1x.webp" alt="Intuitive Editing" className="w-full h-64 object-cover rounded-lg mb-4" />
              <span className="text-lg font-semibold text-gray-800 mb-2">🖌️ Intuitive Editing</span>
              <p className="text-gray-600 text-center">Easy-to-use interface for basic and advanced modifications</p>
            </div>
            <div className="flex flex-col items-center p-4 bg-gray-50 rounded-lg">
              <img src="/img/filters@1x.webp" alt="Fab Filters" className="w-full h-64 object-cover rounded-lg mb-4" />
              <span className="text-lg font-semibold text-gray-800 mb-2">⚡ Fab Filters</span>
              <p className="text-gray-600 text-center">Full of beautiful filters to make your photos stand out</p>
            </div>
            <div className="flex flex-col items-center p-4 bg-gray-50 rounded-lg">
              <img src="/img/tools@1x.webp" alt="Rich Tools" className="w-full h-64 object-cover rounded-lg mb-4" />
              <span className="text-lg font-semibold text-gray-800 mb-2">🎨 Rich Tools</span>
              <p className="text-gray-600 text-center">Crop, rotate, adjust, and more</p>
            </div>
            <div className="flex flex-col items-center p-4 bg-gray-50 rounded-lg">
              <img src="/img/mobile@1x.webp" alt="Mobile-Optimized" className="w-full h-64 object-cover rounded-lg mb-4" />
              <span className="text-lg font-semibold text-gray-800 mb-2">📱 Mobile-Optimized</span>
              <p className="text-gray-600 text-center">Fully responsive design that works on all devices</p>
            </div>
            <div className="flex flex-col items-center p-4 bg-gray-50 rounded-lg">
              <img src="/img/tune@1x.webp" alt="Fine-tuning" className="w-full h-64 object-cover rounded-lg mb-4" />
              <span className="text-lg font-semibold text-gray-800 mb-2">💄 Fine-tuning</span>
              <p className="text-gray-600 text-center">Brightness, Contrast, HSV and more.</p>
            </div>
            <div className="flex flex-col items-center p-4 bg-gray-50 rounded-lg">
              <img src="/img/crops@1x.webp" alt="Preset Crops" className="w-full h-64 object-cover rounded-lg mb-4" />
              <span className="text-lg font-semibold text-gray-800 mb-2">🎯 Preset Crops</span>
              <p className="text-gray-600 text-center">Common aspect ratios for social media and web</p>
            </div>
          </div>
        </div>
      )}

      {selectedImage && (
        <div className="fixed inset-0 z-50">
          <input
            ref={replaceBgInputRef}
            type="file"
            className="hidden"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={handleReplaceBgFileChange}
          />
          <ImageEditor
            key={editorSessionKey}
            imageUrl={selectedImage}
            onClose={handleClose}
            onSave={handleSave}
            handleRemoveBg={handleRemoveBg}
            removeBgState={removeBgState}
            creditsPerRemoveBg={creditsPerRemoveBg}
            hasRemovedBg={hasRemovedBg}
            onRequestBgUpload={() => replaceBgInputRef.current?.click()}
            onPickSolidColor={handlePickSolidColor}
            onRestoreTransparent={handleRestoreTransparent}
          />
        </div>
      )}

      {editedImage && !selectedImage && (
        <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-white text-gray-900">
          <div className="relative w-full max-w-2xl">
            <img src={editedImage} alt="Edited" className="w-full rounded-lg shadow-xl" />
            <div className="absolute top-4 right-4">
              <Button variant="secondary" onClick={handleReset}>
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>
          <div className="mt-6 flex flex-col items-center justify-center gap-4">
            <Button onClick={handleDownload} className="text-lg px-6 py-3">
              Download Image
            </Button>
            <Button variant="secondary" onClick={() => fileInputRef.current?.click()}>
              Upload Another Image
            </Button>
            <input 
              ref={fileInputRef} 
              type="file" 
              className="hidden" 
              accept="image/*" 
              onChange={handleFileChange} 
            />
          </div>
        </div>
      )}

      <footer className="absolute bottom-0 w-full py-4 text-center text-gray-500 text-sm">
        Powered by <a href="https://github.com/scaleflex/filerobot-image-editor" className="text-blue-500 hover:text-blue-600" target="_blank" rel="noopener noreferrer">Filerobot</a>
      </footer>
    </div>
  )
}






















