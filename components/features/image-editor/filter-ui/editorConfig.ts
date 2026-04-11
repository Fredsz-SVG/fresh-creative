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
  {
    titleKey: 'socialMedia',
    descriptionKey: 'socialMedia',
    icon: Social,
    groups: [
      {
        titleKey: 'linkedIn',
        items: [
          { titleKey: 'profilePhoto', width: 400, height: 400, descriptionKey: 'liProfilePhotoSize', disableManualResize: false },
          { titleKey: 'profileCoverPhoto', width: 1584, height: 396, descriptionKey: 'liProfileCoverPhotoSize' },
          { titleKey: 'blogPostPhoto', width: 1200, height: 627, descriptionKey: 'liBlogPostPhotoSize' },
          { titleKey: 'companyLogo', width: 300, height: 300, descriptionKey: 'liCompanyLogoSize' },
          { titleKey: 'companyPageCover', width: 1128, height: 191, descriptionKey: 'liCompanyPageCoverSize' },
        ],
      },
      {
        titleKey: 'x',
        items: [
          { titleKey: 'profilePhoto', width: 400, height: 400, descriptionKey: 'twProfilePhotoSize' },
          { titleKey: 'headerPhoto', width: 1500, height: 500, descriptionKey: 'twHeaderPhotoSize' },
          { titleKey: 'inStreamPhoto', width: 1600, height: 1900, descriptionKey: 'twInStreamPhotoSize' },
        ],
      },
      {
        titleKey: 'instagram',
        items: [
          { titleKey: 'profilePhoto', width: 320, height: 320, descriptionKey: 'igProfilePhotoSize' },
          { titleKey: 'feedPortraitPhoto', width: 1080, height: 1350, descriptionKey: 'igFeedPortraitPhotoSize' },
          { titleKey: 'feedLandscapePhoto', width: 1080, height: 566, descriptionKey: 'igFeedLandscapePhotoSize' },
          { titleKey: 'feedSquarePhoto', width: 1080, height: 1080, descriptionKey: 'igFeedSquarePhotoSize' },
          { titleKey: 'storyPhoto', width: 1080, height: 1920, descriptionKey: 'igStoryPhotoSize' },
        ],
      },
      {
        titleKey: 'facebook',
        items: [
          { titleKey: 'profilePhoto', width: 170, height: 170, descriptionKey: 'fbProfilePhotoSize' },
          { titleKey: 'profileCoverPhoto', width: 851, height: 315, descriptionKey: 'fbProfileCoverPhotoSize' },
          { titleKey: 'eventCoverPhoto', width: 1200, height: 628, descriptionKey: 'fbEventCoverPhotoSize' },
          { titleKey: 'timelinePhoto', width: 1200, height: 630, descriptionKey: 'fbTimelinePhotoSize' },
          { titleKey: 'storyPhoto', width: 1080, height: 1920, descriptionKey: 'fbStoryPhotoSize' },
        ],
      },
    ],
  },
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


