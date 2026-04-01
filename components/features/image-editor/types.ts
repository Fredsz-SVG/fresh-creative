export interface IconOverlay {
  id: string
  type: string
  x: number
  y: number
  size: number
  rotation: number
}

export interface Filters {
  brightness: number
  contrast: number
  saturate: number
  invert: number
  blur: number
  grayscale: number
  sepia: number
  hue: number
  iconOverlays: IconOverlay[]
}

export interface Transform {
  rotate: number
  flipX: number
  flipY: number
}

export type EditorTab = 'adjust' | 'filters' | 'overlays' | 'background' | 'crop' | 'transform'

export type BgRemovalMode = 'remove' | 'custom' | 'gradient'

export interface HistoryEntry {
  filters: Filters
  transform: Transform
  originalImage: string
  hasBackgroundRemoved: boolean
  imageWithoutBackground: string | null
  bgRemovalMode: BgRemovalMode
  selectedGradientColor: string
  customBackgroundImage: string | null
}
