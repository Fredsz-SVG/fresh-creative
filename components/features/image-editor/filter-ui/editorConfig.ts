'use client'

// Ported from addyosmani/filter to match UI exactly.
// Source: https://github.com/addyosmani/filter

import { TABS } from 'react-filerobot-image-editor'
import Social from '@scaleflex/icons/social'

type CropPreset = {
  titleKey: string
  descriptionKey: string
  ratio?: number
  icon?: unknown
  groups?: Array<{
    titleKey: string
    items: Array<{
      titleKey: string
      width: number
      height: number
      descriptionKey: string
      disableManualResize?: boolean
    }>
  }>
}

type EditorConfig = Record<string, unknown>

/** Single flat surface like the reference (#1e1e1e); subtle steps for hover/selection only. */
const BG = '#1e1e1e'
const BG_HOVER = '#252525'
const BG_ACTIVE = '#2a2a2a'
const BORDER = '#2f2f2f'

const cropPresets: CropPreset[] = [
  { titleKey: 'square', descriptionKey: '1:1', ratio: 1 },
  { titleKey: 'portrait', descriptionKey: '3:4', ratio: 3 / 4 },
]

export function createEditorConfig(imageUrl: string): EditorConfig {
  return {
    source: imageUrl,
    defaultSavedImageType: 'png',
    defaultSavedImageName: 'edited-image',
    previewBgColor: BG,
    theme: {
      palette: {
        'txt-primary': '#e8e8e8',
        'txt-primary-invert': '#1e1e1e',
        'txt-secondary': '#b0b0b0',
        'txt-secondary-invert': '#4d4d4d',
        'txt-placeholder': '#888888',
        'accent-primary': '#2196f3',
        'accent-primary-hover': '#42a5f5',
        'accent-primary-active': '#90caf9',
        'accent-primary-disabled': '#546e7a',
        'bg-primary': BG,
        'bg-primary-hover': BG_HOVER,
        'bg-primary-active': BG_ACTIVE,
        'bg-primary-0-5-opacity': 'rgba(30, 30, 30, 0.92)',
        'bg-secondary': BG,
        'bg-stateless': BG,
        'icon-primary': '#ffffff',
        'icons-primary-opacity-0-6': 'rgba(255, 255, 255, 0.55)',
        'icons-secondary': '#c4c4c4',
        'icons-placeholder': '#888888',
        'btn-primary-text': '#ffffff',
        'btn-disabled-text': '#666666',
        'link-primary': '#64b5f6',
        'link-hover': '#90caf9',
        'link-active': '#42a5f5',
        'borders-primary': BORDER,
        'borders-secondary': BORDER,
        'borders-strong': '#3d3d3d',
        'borders-invert': '#e0e0e0',
        'border-active-bottom': '#2196f3',
        'active-secondary': BG_ACTIVE,
        'active-secondary-hover': BG_HOVER,
        'active-secondary-active': BG_ACTIVE,
      },
      typography: { fontFamily: 'Inter, system-ui, sans-serif' },
    },
    annotationsCommon: { fill: '#2196f3' },
    Text: {
      text: 'Add text...',
      fonts: [
        { label: 'Arial', value: 'Arial' },
        { label: 'Helvetica', value: 'Helvetica' },
        { label: 'Inter', value: 'Inter' },
        { label: 'Times New Roman', value: 'Times New Roman' },
        { label: 'Courier New', value: 'Courier New' },
        { label: 'Georgia', value: 'Georgia' },
        { label: 'Verdana', value: 'Verdana' },
        { label: 'Geneva', value: 'Geneva' },
        { label: 'Trebuchet MS', value: 'Trebuchet MS' },
        { label: 'Arial Black', value: 'Arial Black' },
        { label: 'Impact', value: 'Impact' },
        { label: 'Comic Sans MS', value: 'Comic Sans MS' },
        { label: 'Lucida Console', value: 'Lucida Console' },
        { label: 'Tahoma', value: 'Tahoma' },
        { label: 'Palatino Linotype', value: 'Palatino Linotype' },
        { label: 'Book Antiqua', value: 'Book Antiqua' },
        { label: 'Arial Narrow', value: 'Arial Narrow' },
        { label: 'Century Gothic', value: 'Century Gothic' },
        { label: 'Lucida Sans Unicode', value: 'Lucida Sans Unicode' },
        { label: 'Garamond', value: 'Garamond' },
      ],
    },
    translations: {
      profile: 'Profile',
      coverPhoto: 'Cover Photo',
      facebook: 'Facebook',
      socialMedia: 'Social Media',
      classicTv: 'Classic TV',
      wide: 'Widescreen',
      square: 'Square',
      portrait: 'Portrait',
      // AI tab label (native sidebar slot — same column as Adjust / Finetune / …)
      aiTab: 'Remove BG',
      removeBgTool: 'Remove BG',
      removeBgHint: 'Memakai kredit; gambar di editor akan diganti hasilnya.',
      removeBgRun: 'Remove BG',
      removeBgRunning: 'Memproses…',
      removeBgReplaceTitle: 'Ganti Background',
      removeBgUploadBg: 'Upload Gambar',
      removeBgSolidHint: 'Atau pilih warna solid:',
      removeBgTransparent: 'Tanpa BG (transparan)',
      removeBgAlreadyDone: 'Sudah di-remove. Pakai opsi di bawah untuk ganti BG.',
      // Reset & Close button share the same 'discardChangesWarningHint' key.
      // Use a neutral message that fits both contexts.
      // Titles already differ: reset uses t("warning"), close uses t("discardChanges").
      discardChangesWarningHint:
        'Semua perubahan yang belum disimpan akan hilang. Apakah kamu yakin?',
      changesLoseWarningHint:
        'Semua perubahan yang belum disimpan akan hilang. Apakah kamu yakin?',
      // Title for the Close/X button confirmation modal
      discardChanges: 'Buang Perubahan',
      // Title for the Reset button confirmation modal
      warning: 'Peringatan — Reset',
      // Shared button labels
      confirm: 'Ya, Lanjutkan',
      cancel: 'Batal',
    },
    Crop: {
      presetsItems: cropPresets,
      autoResize: true,
    },
    defaultTabId: TABS.ADJUST,
    defaultToolId: 'Crop',
    observePluginContainerSize: false,
    showCanvasOnly: false,
    /** Jangan reset seluruh state saat `source` berubah (Remove BG / ganti BG) — agar undo/redo tetap masuk akal. */
    resetOnSourceChange: false,
    /** Shows the AI tab in the left sidebar; we replace its tool with Remove BG (see remove-bg-filerobot-tools). */
    useAiTab: true,
  }
}


