'use client'

import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { Upload, Download, Loader2, X, Scissors, Crop, RotateCw, RotateCcw, FlipHorizontal, FlipVertical, Palette, Sliders, Undo2, Redo2, Wand2, Save } from 'lucide-react'
import Cropper from 'cropperjs'
import 'cropperjs/dist/cropper.css'
import { saveToMyFiles } from '@/lib/save-to-files'

interface IconOverlay {
  id: string
  type: string
  x: number // percentage (0-100)
  y: number // percentage (0-100)
  size: number // percentage (0-200)
  rotation: number // degrees (0-360)
}

interface Filters {
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

interface Transform {
  rotate: number
  flipX: number
  flipY: number
}

export default function AiGenerate() {
  const [originalImage, setOriginalImage] = useState<string | null>(null)
  const [customBackgroundImage, setCustomBackgroundImage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  // Removed showEditor - always show editor when image is uploaded
  const [activeTab, setActiveTab] = useState<'adjust' | 'filters' | 'overlays' | 'background' | 'crop' | 'transform'>('adjust')
  const [isRemovingBackground, setIsRemovingBackground] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const backgroundInputRef = useRef<HTMLInputElement>(null)
  const imageRef = useRef<HTMLImageElement>(null)
  const cropperRef = useRef<Cropper | null>(null)
  const cropperImageRef = useRef<HTMLImageElement>(null)

  // Editor states untuk Cropper.js
  const [showCropEditor, setShowCropEditor] = useState(false)

  // Background removal states
  const [bgRemovalMode, setBgRemovalMode] = useState<'remove' | 'custom' | 'gradient'>('remove')
  const [selectedGradientColor, setSelectedGradientColor] = useState<string>('rainbow')
  const [hasBackgroundRemoved, setHasBackgroundRemoved] = useState(false)
  const [imageWithoutBackground, setImageWithoutBackground] = useState<string | null>(null)

  // Crop aspect ratio state
  const [cropAspectRatio, setCropAspectRatio] = useState<number | undefined>(undefined)

  // Image dimensions untuk menghitung ukuran overlay yang konsisten
  const [imageNaturalSize, setImageNaturalSize] = useState({ width: 0, height: 0 })
  const [imageDisplaySize, setImageDisplaySize] = useState({ width: 0, height: 0 })

  // Filter states (dari Photo-Editor-Project)
  const [filters, setFilters] = useState<Filters>({
    brightness: 100,
    contrast: 100,
    saturate: 100,
    invert: 0,
    blur: 0,
    grayscale: 0,
    sepia: 0,
    hue: 0,
    iconOverlays: []
  })

  // Selected overlay for editing
  const [selectedOverlayId, setSelectedOverlayId] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [hasMoved, setHasMoved] = useState(false)
  const justFinishedDragRef = useRef(false)
  const draggingOverlayIdRef = useRef<string | null>(null)
  const previewContainerRef = useRef<HTMLDivElement>(null)
  const rafIdRef = useRef<number | null>(null)

  // Confirmation dialog untuk pindah tab dari overlays
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [pendingTab, setPendingTab] = useState<'adjust' | 'filters' | 'overlays' | 'background' | 'crop' | 'transform' | null>(null)

  type HistoryEntry = {
    filters: Filters
    transform: Transform
    originalImage: string
    hasBackgroundRemoved: boolean
    imageWithoutBackground: string | null
    bgRemovalMode: 'remove' | 'gradient' | 'custom'
    selectedGradientColor: string
    customBackgroundImage: string | null
  }

  // State untuk menyimpan kondisi sebelum masuk tab overlays (untuk undo)
  const stateBeforeOverlaysRef = useRef<HistoryEntry | null>(null)

  const [transform, setTransform] = useState<Transform>({
    rotate: 0,
    flipX: 1,
    flipY: 1
  })

  const [activeFilter, setActiveFilter] = useState<string>('brightness')
  const [sliderValue, setSliderValue] = useState<number>(100)

  // History untuk undo/redo - simpan semua state penting agar crop/sticker/remove-bg bisa undo/redo
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [historyIndex, setHistoryIndex] = useState<number>(-1)
  const historyIndexRef = useRef<number>(-1)
  const isUndoRedoRef = useRef(false)

  useEffect(() => {
    historyIndexRef.current = historyIndex
  }, [historyIndex])

  const snapshotState = useCallback(
    (override?: Partial<HistoryEntry>): HistoryEntry | null => {
      if (!originalImage) return null
      return {
        filters: JSON.parse(JSON.stringify(filters)),
        transform: { ...transform },
        originalImage,
        hasBackgroundRemoved,
        imageWithoutBackground,
        bgRemovalMode,
        selectedGradientColor,
        customBackgroundImage,
        ...override,
      }
    },
    [
      originalImage,
      filters,
      transform,
      hasBackgroundRemoved,
      imageWithoutBackground,
      bgRemovalMode,
      selectedGradientColor,
      customBackgroundImage,
    ]
  )

  const pushHistory = useCallback(
    (entry: HistoryEntry) => {
      setHistory((prev) => {
        const idx = historyIndexRef.current
        const newHistory = prev.slice(0, idx + 1)
        newHistory.push(entry)
        if (newHistory.length > 30) newHistory.shift()
        return newHistory
      })
      setHistoryIndex((prevIdx) => {
        const next = prevIdx + 1
        return next >= 30 ? 29 : next
      })
    },
    []
  )

  // Update slider value when active filter changes
  useEffect(() => {
    const value = filters[activeFilter as keyof Filters]
    // Only set slider value if it's a number (not iconOverlays which is array)
    if (typeof value === 'number') {
      setSliderValue(value as number)
    } else {
      // For non-number filters, set slider to 0
      setSliderValue(0)
    }
  }, [activeFilter, filters])

  // Save state to history - termasuk originalImage & state penting lainnya
  const saveToHistory = useCallback(() => {
    const snap = snapshotState()
    if (!snap) return
    pushHistory(snap)
  }, [pushHistory, snapshotState])

  // Undo - mengembalikan filters, transform, DAN originalImage
  // Mengembalikan semua perubahan: crop, stiker yang sudah diterapkan, background removal, dll
  const handleUndo = useCallback(() => {
    if (historyIndex > 0 && history.length > 0) {
      isUndoRedoRef.current = true
      const prevState = history[historyIndex - 1]

      // Kembalikan semua state dengan benar - pastikan menggunakan state dari history
      // Ini akan mengembalikan gambar ke kondisi sebelum perubahan terakhir:
      // - Sebelum crop diterapkan
      // - Sebelum stiker diterapkan (jika sebelumnya tidak ada stiker, kembali ke foto awal)
      // - Sebelum background removal
      // - Sebelum perubahan filter/transform
      setFilters(prevState.filters)
      setTransform(prevState.transform)
      setOriginalImage(prevState.originalImage) // Kembalikan gambar sebelum perubahan
      setHasBackgroundRemoved(prevState.hasBackgroundRemoved)
      setImageWithoutBackground(prevState.imageWithoutBackground)
      setBgRemovalMode(prevState.bgRemovalMode)
      setSelectedGradientColor(prevState.selectedGradientColor)
      setCustomBackgroundImage(prevState.customBackgroundImage)
      setHistoryIndex(prev => prev - 1)

      // Tutup crop editor jika sedang terbuka
      if (showCropEditor) {
        setShowCropEditor(false)
        // Destroy cropper jika ada
        if (cropperRef.current) {
          cropperRef.current.destroy()
          cropperRef.current = null
        }
      }

      setTimeout(() => {
        isUndoRedoRef.current = false
      }, 200)
    }
  }, [historyIndex, history, showCropEditor])

  // Redo - mengembalikan filters, transform, DAN originalImage
  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      isUndoRedoRef.current = true
      const nextState = history[historyIndex + 1]
      setFilters(nextState.filters)
      setTransform(nextState.transform)
      setOriginalImage(nextState.originalImage) // Kembalikan gambar juga
      setHasBackgroundRemoved(nextState.hasBackgroundRemoved)
      setImageWithoutBackground(nextState.imageWithoutBackground)
      setBgRemovalMode(nextState.bgRemovalMode)
      setSelectedGradientColor(nextState.selectedGradientColor)
      setCustomBackgroundImage(nextState.customBackgroundImage)
      setHistoryIndex(historyIndex + 1)
      setTimeout(() => {
        isUndoRedoRef.current = false
      }, 100)
    }
  }, [historyIndex, history])

  // Initialize history ONLY on first image load (jangan reset history saat crop/sticker/remove-bg)
  useEffect(() => {
    if (!originalImage) return
    if (historyIndex !== -1) return
    const initial = snapshotState()
    if (!initial) return
    setHistory([initial])
    setHistoryIndex(0)
    isUndoRedoRef.current = false
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [originalImage])

  // Save to history whenever filters or transform change (debounced)
  // Note: originalImage changes dari crop/applyOverlays disimpan manual, tidak via useEffect ini
  // PENTING: Jangan simpan history saat iconOverlays berubah - hanya simpan saat diterapkan
  useEffect(() => {
    if (!originalImage || historyIndex < 0 || isUndoRedoRef.current) return

    // Skip jika hanya iconOverlays yang berubah - jangan simpan ke history
    // IconOverlays hanya akan disimpan saat diterapkan (applyOverlaysToImage)
    const currentState = { filters, transform, originalImage }
    const lastHistoryState = history[historyIndex]

    // Buat copy filters tanpa iconOverlays untuk perbandingan
    const currentFiltersWithoutOverlays = { ...filters, iconOverlays: [] }
    const lastFiltersWithoutOverlays = lastHistoryState ? { ...lastHistoryState.filters, iconOverlays: [] } : null

    // Only save if state actually changed (tapi jangan cek originalImage karena bisa berubah dari undo/redo)
    // Jangan simpan jika hanya iconOverlays yang berubah
    if (lastHistoryState &&
      JSON.stringify(currentFiltersWithoutOverlays) === JSON.stringify(lastFiltersWithoutOverlays) &&
      JSON.stringify(currentState.transform) === JSON.stringify(lastHistoryState.transform) &&
      currentState.originalImage === lastHistoryState.originalImage) {
      return
    }

    // Debounce: save after 300ms of no changes
    const timeoutId = setTimeout(() => {
      if (!isUndoRedoRef.current) {
        saveToHistory()
      }
    }, 300)

    return () => clearTimeout(timeoutId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, transform])

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setError('Silakan upload file gambar yang valid')
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('Ukuran gambar maksimal 10MB')
      return
    }

    setError(null)
    const reader = new FileReader()
    reader.onloadend = () => {
      setOriginalImage(reader.result as string)
      resetAllFilters()
      setHasBackgroundRemoved(false)
      setImageWithoutBackground(null)
    }
    reader.readAsDataURL(file)
  }

  const handleBackgroundImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setError('Silakan upload file gambar yang valid untuk background')
      return
    }

    setError(null)
    const reader = new FileReader()
    reader.onloadend = () => {
      setCustomBackgroundImage(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  // Cache untuk background removal (untuk optimasi)
  const backgroundRemovalCache = useRef<Map<string, string>>(new Map())

  // Helper: Apply transform to image and return new image data URL
  const applyTransformToImage = useCallback((imageSrc: string, currentTransform: Transform): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => {
        const radians = (currentTransform.rotate * Math.PI) / 180
        const cos = Math.abs(Math.cos(radians))
        const sin = Math.abs(Math.sin(radians))
        const newWidth = img.width * cos + img.height * sin
        const newHeight = img.width * sin + img.height * cos

        const canvas = document.createElement('canvas')
        canvas.width = newWidth
        canvas.height = newHeight
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Canvas context tidak tersedia'))
          return
        }

        ctx.save()
        ctx.translate(canvas.width / 2, canvas.height / 2)
        ctx.rotate((currentTransform.rotate * Math.PI) / 180)
        ctx.scale(currentTransform.flipX, currentTransform.flipY)
        ctx.drawImage(img, -img.width / 2, -img.height / 2)
        ctx.restore()

        resolve(canvas.toDataURL('image/png'))
      }
      img.onerror = reject
      img.src = imageSrc
    })
  }, [])

  // Background Removal menggunakan @imgly/background-removal dengan optimasi
  // Transform akan diterapkan setelah background removal
  const removeBackground = useCallback(async (imageSrc: string): Promise<string> => {
    if (backgroundRemovalCache.current.has(imageSrc)) {
      const cached = backgroundRemovalCache.current.get(imageSrc)!
      try {
        await fetch(cached, { method: 'HEAD' })
        return cached
      } catch {
        backgroundRemovalCache.current.delete(imageSrc)
      }
    }

    // Suppress WebAssembly threading warnings by temporarily overriding console.warn
    const originalWarn = console.warn.bind(console)
    const suppressedWarnings: string[] = [
      'env.wasm.numThreads',
      'WebAssembly multi-threading',
      'crossOriginIsolated',
      'Falling back to single-threading'
    ]

    console.warn = (...args: any[]) => {
      const message = String(args.join(' '))
      // Suppress only WebAssembly threading related warnings
      if (!suppressedWarnings.some(warning => message.includes(warning))) {
        originalWarn(...args)
      }
    }

    try {
      const { removeBackground: removeBg } = await import('@imgly/background-removal')

      let blob: Blob
      if (imageSrc.startsWith('data:')) {
        const base64Data = imageSrc.split(',')[1]
        const byteCharacters = atob(base64Data)
        const byteNumbers = new Array(byteCharacters.length)
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i)
        }
        const byteArray = new Uint8Array(byteNumbers)
        const mimeType = imageSrc.match(/data:([^;]+);/)?.[1] || 'image/png'
        blob = new Blob([byteArray], { type: mimeType })
      } else {
        const response = await fetch(imageSrc)
        blob = await response.blob()
      }

      // Optimize image size for better quality while maintaining reasonable speed
      let processedBlob = blob
      const img = new Image()
      const imgUrl = imageSrc.startsWith('data:')
        ? imageSrc
        : URL.createObjectURL(blob)

      await new Promise((resolve, reject) => {
        img.onload = () => {
          // Use higher resolution for better quality
          // 1200px provides good quality while still being reasonably fast
          const maxDimension = 1200

          let width = img.width
          let height = img.height

          // Always resize if larger than max dimension for speed
          if (width > maxDimension || height > maxDimension) {
            const ratio = Math.min(maxDimension / width, maxDimension / height)
            width = Math.floor(width * ratio)
            height = Math.floor(height * ratio)

            const canvas = document.createElement('canvas')
            canvas.width = width
            canvas.height = height
            const ctx = canvas.getContext('2d')!
            ctx.imageSmoothingEnabled = true
            ctx.imageSmoothingQuality = 'high'
            ctx.drawImage(img, 0, 0, width, height)

            canvas.toBlob((blob) => {
              if (blob) {
                processedBlob = blob
                if (!imageSrc.startsWith('data:')) {
                  URL.revokeObjectURL(imgUrl)
                }
                resolve(null)
              } else {
                reject(new Error('Failed to resize image'))
              }
            }, 'image/jpeg', 0.92) // Better quality
          } else {
            // Image is already small enough, use as is
            if (!imageSrc.startsWith('data:')) {
              URL.revokeObjectURL(imgUrl)
            }
            resolve(null)
          }
        }
        img.onerror = reject
        img.src = imgUrl
      })

      // Use better model for improved quality
      // isnet_fp16 provides good balance between quality and speed
      let blobResult: Blob
      try {
        blobResult = await removeBg(processedBlob, {
          model: 'isnet_fp16', // Good balance - better quality than quint8, faster than isnet
          output: {
            format: 'image/png',
            quality: 0.92 // Better quality
          }
        })
      } catch (fp16Error) {
        // Fallback to isnet_quint8 if fp16 fails
        try {
          console.warn('isnet_fp16 model failed, trying isnet_quint8:', fp16Error)
          blobResult = await removeBg(processedBlob, {
            model: 'isnet_quint8', // Faster but lower quality
            output: {
              format: 'image/png',
              quality: 0.92
            }
          })
        } catch (quint8Error) {
          // Final fallback to isnet (best quality but slowest)
          console.warn('isnet_quint8 model failed, trying isnet:', quint8Error)
          blobResult = await removeBg(processedBlob, {
            model: 'isnet', // Best quality but slowest
            output: {
              format: 'image/png',
              quality: 0.92
            }
          })
        }
      }
      const resultUrl = URL.createObjectURL(blobResult)

      // Restore original console.warn
      console.warn = originalWarn

      // Apply transform to the result if transform exists (before caching)
      let finalResult = resultUrl
      if (transform.rotate !== 0 || transform.flipX !== 1 || transform.flipY !== 1) {
        finalResult = await applyTransformToImage(resultUrl, transform)
        // Clean up old URL
        URL.revokeObjectURL(resultUrl)
      }

      // Cache the final result (with transform applied if any)
      if (backgroundRemovalCache.current.size >= 5) {
        const firstKey = backgroundRemovalCache.current.keys().next().value
        const oldUrl = backgroundRemovalCache.current.get(firstKey)
        if (oldUrl) URL.revokeObjectURL(oldUrl)
        backgroundRemovalCache.current.delete(firstKey)
      }
      backgroundRemovalCache.current.set(imageSrc, finalResult)

      return finalResult
    } catch (err: any) {
      // Restore original console.warn in case of error
      console.warn = originalWarn
      console.error('Background removal error:', err)
      throw new Error('Gagal menghapus background. Pastikan library @imgly/background-removal sudah terinstall.')
    }
  }, [transform, applyTransformToImage])

  // Create gradient background colors
  const getGradientColors = (gradientType: string): string[] => {
    switch (gradientType) {
      case 'rainbow':
        return ['#ff0000', '#ff7f00', '#ffff00', '#00ff00', '#0000ff', '#4b0082', '#9400d3']
      case 'sunset':
        return ['#ff6b6b', '#ffa500', '#ff1493']
      case 'ocean':
        return ['#00c9ff', '#0099cc', '#0066cc']
      case 'forest':
        return ['#90ee90', '#228b22', '#006400']
      case 'purple':
        return ['#9370db', '#8a2be2', '#4b0082']
      default:
        return ['#ff0000', '#0000ff']
    }
  }

  // Apply custom background - dengan transform (rotate, flip)
  const applyBackground = useCallback(async (imageSrc: string, bgType: string, gradientType?: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => {
        // Calculate canvas size after rotation
        const radians = (transform.rotate * Math.PI) / 180
        const cos = Math.abs(Math.cos(radians))
        const sin = Math.abs(Math.sin(radians))
        const newWidth = img.width * cos + img.height * sin
        const newHeight = img.width * sin + img.height * cos

        const canvas = document.createElement('canvas')
        canvas.width = newWidth
        canvas.height = newHeight
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Canvas context tidak tersedia'))
          return
        }

        // Draw background first (before transform)
        if (bgType === 'custom' && customBackgroundImage) {
          const bgImg = new Image()
          bgImg.crossOrigin = 'anonymous'
          bgImg.onload = () => {
            // Draw background to fill entire canvas
            ctx.drawImage(bgImg, 0, 0, canvas.width, canvas.height)

            // Apply transform and draw image
            ctx.save()
            ctx.translate(canvas.width / 2, canvas.height / 2)
            ctx.rotate((transform.rotate * Math.PI) / 180)
            ctx.scale(transform.flipX, transform.flipY)
            ctx.drawImage(img, -img.width / 2, -img.height / 2)
            ctx.restore()

            resolve(canvas.toDataURL('image/jpeg', 0.9))
          }
          bgImg.onerror = reject
          bgImg.src = customBackgroundImage
          return
        } else if (bgType === 'gradient' && gradientType) {
          // Draw gradient background
          const colors = getGradientColors(gradientType)
          const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height)
          colors.forEach((color, index) => {
            gradient.addColorStop(index / (colors.length - 1), color)
          })
          ctx.fillStyle = gradient
          ctx.fillRect(0, 0, canvas.width, canvas.height)

          // Apply transform and draw image on top
          ctx.save()
          ctx.translate(canvas.width / 2, canvas.height / 2)
          ctx.rotate((transform.rotate * Math.PI) / 180)
          ctx.scale(transform.flipX, transform.flipY)
          ctx.drawImage(img, -img.width / 2, -img.height / 2)
          ctx.restore()

          resolve(canvas.toDataURL('image/jpeg', 0.9))
          return
        }

        // No background (transparent) - still apply transform
        ctx.save()
        ctx.translate(canvas.width / 2, canvas.height / 2)
        ctx.rotate((transform.rotate * Math.PI) / 180)
        ctx.scale(transform.flipX, transform.flipY)
        ctx.drawImage(img, -img.width / 2, -img.height / 2)
        ctx.restore()
        resolve(canvas.toDataURL('image/png'))
      }
      img.onerror = reject
      img.src = imageSrc
    })
  }, [transform, customBackgroundImage])

  // Apply filters menggunakan CSS filter untuk preview
  const applyFilters = () => {
    if (!imageRef.current) return

    const filterString = `
      brightness(${filters.brightness}%) 
      contrast(${filters.contrast}%) 
      saturate(${filters.saturate}%) 
      invert(${filters.invert}%) 
      blur(${filters.blur}px)
      grayscale(${filters.grayscale}%)
      sepia(${filters.sepia}%)
      hue-rotate(${filters.hue}deg)
    `.replace(/\s+/g, ' ').trim()

    imageRef.current.style.filter = filterString
    imageRef.current.style.transform = `rotate(${transform.rotate}deg) scale(${transform.flipX}, ${transform.flipY})`
  }

  // Apply filter changes - langsung terapkan tanpa delay
  const handleFilterChange = (filterName: string, value: number) => {
    setFilters(prev => ({
      ...prev,
      [filterName]: value
    }))
    setSliderValue(value)
    // History will be saved automatically via useEffect
  }

  // Apply transformations
  const handleTransform = (type: string) => {
    switch (type) {
      case 'rotate_left':
        setTransform(prev => ({
          ...prev,
          rotate: prev.rotate - 90
        }))
        break
      case 'rotate_right':
        setTransform(prev => ({
          ...prev,
          rotate: prev.rotate + 90
        }))
        break
      case 'flip_x':
        setTransform(prev => ({
          ...prev,
          flipX: prev.flipX === 1 ? -1 : 1
        }))
        break
      case 'flip_y':
        setTransform(prev => ({
          ...prev,
          flipY: prev.flipY === 1 ? -1 : 1
        }))
        break
    }
    // History will be saved automatically via useEffect
  }

  // Add icon overlay
  const addIconOverlay = (overlayType: string) => {
    const newOverlay: IconOverlay = {
      id: `overlay-${Date.now()}`,
      type: overlayType,
      x: 50, // center
      y: 30, // top-middle
      size: 100, // default size
      rotation: 0 // default rotation
    }
    setFilters(prev => ({
      ...prev,
      iconOverlays: [...prev.iconOverlays, newOverlay]
    }))
    setSelectedOverlayId(newOverlay.id)
    // History will be saved automatically via useEffect
  }

  // Remove icon overlay
  const removeIconOverlay = (id: string) => {
    setFilters(prev => ({
      ...prev,
      iconOverlays: prev.iconOverlays.filter(overlay => overlay.id !== id)
    }))
    if (selectedOverlayId === id) {
      setSelectedOverlayId(null)
    }
    // History will be saved automatically via useEffect
  }

  // Update overlay position
  const updateOverlayPosition = (id: string, x: number, y: number) => {
    setFilters(prev => ({
      ...prev,
      iconOverlays: prev.iconOverlays.map(overlay =>
        overlay.id === id ? { ...overlay, x, y } : overlay
      )
    }))
    // History will be saved automatically via useEffect (debounced)
  }

  // Update overlay size
  const updateOverlaySize = (id: string, size: number) => {
    setFilters(prev => ({
      ...prev,
      iconOverlays: prev.iconOverlays.map(overlay =>
        overlay.id === id ? { ...overlay, size } : overlay
      )
    }))
    // History will be saved automatically via useEffect (debounced)
  }

  // Update overlay rotation
  const updateOverlayRotation = (id: string, rotation: number) => {
    setFilters(prev => ({
      ...prev,
      iconOverlays: prev.iconOverlays.map(overlay =>
        overlay.id === id ? { ...overlay, rotation } : overlay
      )
    }))
    // History will be saved automatically via useEffect (debounced)
  }

  // Handle drag start (for both mouse and touch)
  const handleDragStart = (e: React.MouseEvent | React.TouchEvent, overlayId: string) => {
    // Don't call preventDefault for touch events here - React's onTouchStart is passive
    // preventDefault is handled in handleTouchMove with { passive: false }
    if (e.type === 'mousedown') {
      e.preventDefault()
    }
    e.stopPropagation()

    // Track initial position to detect if it's a click or drag
    const clientX = 'touches' in e ? e.touches[0]?.clientX : e.clientX
    const clientY = 'touches' in e ? e.touches[0]?.clientY : e.clientY
    setDragStart({ x: clientX, y: clientY })
    setHasMoved(false)
    setIsDragging(true)
    draggingOverlayIdRef.current = overlayId // Set the dragging overlay ID
    justFinishedDragRef.current = false // Reset flag
    // Set selection immediately - always select on click/drag start
    setSelectedOverlayId(overlayId)
  }

  // Mouse and touch move handler for dragging (optimized with requestAnimationFrame)
  useEffect(() => {
    let lastUpdateTime = 0
    const throttleDelay = 16 // ~60fps

    const updatePosition = (clientX: number, clientY: number) => {
      const now = Date.now()
      if (now - lastUpdateTime < throttleDelay) {
        return
      }
      lastUpdateTime = now

      if (isDragging && draggingOverlayIdRef.current && previewContainerRef.current && imageRef.current) {
        const overlayId = draggingOverlayIdRef.current
        // Check if user has moved (to distinguish click from drag)
        const moveThreshold = 3 // pixels - lower threshold for better detection
        const deltaX = Math.abs(clientX - dragStart.x)
        const deltaY = Math.abs(clientY - dragStart.y)

        if (deltaX > moveThreshold || deltaY > moveThreshold) {
          setHasMoved(true)
          // Set selection when user actually drags (not just a click)
          setSelectedOverlayId(overlayId)
        }

        // Get image bounding rect (actual displayed image, not container)
        const imageRect = imageRef.current.getBoundingClientRect()
        const containerRect = previewContainerRef.current.getBoundingClientRect()

        // Calculate position relative to image, not container
        // Image is centered in container with object-contain
        const imageLeft = imageRect.left - containerRect.left
        const imageTop = imageRect.top - containerRect.top

        // Position relative to container
        const posX = clientX - containerRect.left
        const posY = clientY - containerRect.top

        // Position relative to image
        const relativeX = posX - imageLeft
        const relativeY = posY - imageTop

        // Convert to percentage of image dimensions
        const x = (relativeX / imageRect.width) * 100
        const y = (relativeY / imageRect.height) * 100

        const clampedX = Math.max(0, Math.min(100, x))
        const clampedY = Math.max(0, Math.min(100, y))

        if (rafIdRef.current !== null) {
          cancelAnimationFrame(rafIdRef.current)
        }

        rafIdRef.current = requestAnimationFrame(() => {
          updateOverlayPosition(overlayId, clampedX, clampedY)
        })
      }
    }

    const handleMouseMove = (e: MouseEvent) => {
      updatePosition(e.clientX, e.clientY)
    }

    const handleTouchMove = (e: TouchEvent) => {
      // Prevent scrolling while dragging - this is already handled by passive: false
      if (e.touches.length > 0) {
        const touch = e.touches[0]
        updatePosition(touch.clientX, touch.clientY)
      }
    }

    const handleMouseUp = () => {
      if (isDragging && draggingOverlayIdRef.current) {
        const overlayId = draggingOverlayIdRef.current
        // If no movement, it was a click - keep it selected (don't toggle)
        if (!hasMoved) {
          // Always select on click - don't toggle, so user can click again to drag
          setSelectedOverlayId(overlayId)
          // Prevent onClick from toggling again
          justFinishedDragRef.current = true
          setTimeout(() => {
            justFinishedDragRef.current = false
          }, 50)
        } else {
          // If there was movement, mark that we finished dragging
          justFinishedDragRef.current = true
          setTimeout(() => {
            justFinishedDragRef.current = false
          }, 100)
        }
        setIsDragging(false)
        setHasMoved(false)
        draggingOverlayIdRef.current = null
        // History will be saved automatically via useEffect (debounced)
      }
    }

    const handleTouchEnd = () => {
      if (isDragging && draggingOverlayIdRef.current) {
        const overlayId = draggingOverlayIdRef.current
        // If no movement, it was a click - keep it selected (don't toggle)
        if (!hasMoved) {
          // Always select on click - don't toggle, so user can click again to drag
          setSelectedOverlayId(overlayId)
          // Prevent onClick from toggling again
          justFinishedDragRef.current = true
          setTimeout(() => {
            justFinishedDragRef.current = false
          }, 50)
        } else {
          // If there was movement, mark that we finished dragging
          justFinishedDragRef.current = true
          setTimeout(() => {
            justFinishedDragRef.current = false
          }, 100)
        }
        setIsDragging(false)
        setHasMoved(false)
        draggingOverlayIdRef.current = null
        // History will be saved automatically via useEffect (debounced)
      }
    }

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
      window.addEventListener('touchmove', handleTouchMove, { passive: false })
      window.addEventListener('touchend', handleTouchEnd)
      window.addEventListener('touchcancel', handleTouchEnd)
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
      window.removeEventListener('touchmove', handleTouchMove)
      window.removeEventListener('touchend', handleTouchEnd)
      window.removeEventListener('touchcancel', handleTouchEnd)
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current)
        rafIdRef.current = null
      }
    }
  }, [isDragging, selectedOverlayId, dragStart, hasMoved])

  // Initialize Cropper.js
  useEffect(() => {
    if (showCropEditor && originalImage && cropperImageRef.current && !cropperRef.current) {
      cropperRef.current = new Cropper(cropperImageRef.current, {
        aspectRatio: cropAspectRatio,
        viewMode: 0, // Allow free crop
        dragMode: 'move',
        autoCropArea: 0.9,
        restore: false,
        guides: true,
        center: true,
        highlight: false,
        cropBoxMovable: true,
        cropBoxResizable: true,
        toggleDragModeOnDblclick: false,
        responsive: true,
        checkOrientation: false,
        ready: function () {
          // Ensure image is centered and fits container
          const containerData = this.cropper.getContainerData()
          const imageData = this.cropper.getImageData()

          // Center the crop box
          const cropBoxWidth = Math.min(containerData.width * 0.9, imageData.naturalWidth)
          const cropBoxHeight = Math.min(containerData.height * 0.9, imageData.naturalHeight)

          this.cropper.setCropBoxData({
            left: (containerData.width - cropBoxWidth) / 2,
            top: (containerData.height - cropBoxHeight) / 2,
            width: cropBoxWidth,
            height: cropBoxHeight,
          })
        }
      })
    }

    // Update aspect ratio if cropper is already initialized
    if (cropperRef.current && showCropEditor) {
      cropperRef.current.setAspectRatio(cropAspectRatio)
    }

    return () => {
      if (cropperRef.current) {
        cropperRef.current.destroy()
        cropperRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showCropEditor, originalImage, cropAspectRatio])

  // Close crop editor and destroy cropper
  const closeCropEditor = useCallback(() => {
    if (cropperRef.current) {
      cropperRef.current.destroy()
      cropperRef.current = null
    }
    setShowCropEditor(false)
    // Tidak perlu pindah tab di sini, biarkan applyCrop yang mengatur
  }, [])

  // Apply crop menggunakan Cropper.js - simpan ke history
  const applyCrop = useCallback(() => {
    if (!cropperRef.current || !originalImage) return

    const canvas = cropperRef.current.getCroppedCanvas()
    if (!canvas) return

    const croppedImage = canvas.toDataURL('image/jpeg', 0.9)

    // Set flag untuk mencegah useEffect menyimpan history otomatis
    isUndoRedoRef.current = true

    // Update originalImage dengan gambar yang sudah di-crop
    setOriginalImage(croppedImage)

    // Push snapshot SETELAH crop (biar redo bisa mengembalikan hasil crop)
    const after = snapshotState({ originalImage: croppedImage })
    if (after) pushHistory(after)

    // Tutup crop editor dan pindah ke tab adjust (tidak menampilkan "Start Cropping")
    closeCropEditor()
    setActiveTab('adjust')

    // Reset flag setelah semua perubahan selesai
    setTimeout(() => {
      isUndoRedoRef.current = false
    }, 200)
  }, [originalImage, closeCropEditor, pushHistory, snapshotState])

  // Start crop mode
  const startCrop = () => {
    setShowCropEditor(true)
    setActiveTab('crop')
    // Reset aspect ratio to undefined (free) if not set
    if (cropAspectRatio === undefined && cropperRef.current) {
      cropperRef.current.setAspectRatio(undefined)
    }
  }

  // Reset all filters
  const resetAllFilters = () => {
    const resetState: HistoryEntry = {
      filters: {
        brightness: 100,
        contrast: 100,
        saturate: 100,
        invert: 0,
        blur: 0,
        grayscale: 0,
        sepia: 0,
        hue: 0,
        iconOverlays: [],
      },
      transform: {
        rotate: 0,
        flipX: 1,
        flipY: 1,
      },
      originalImage: originalImage || '', // Tetap gunakan gambar yang ada
      hasBackgroundRemoved: false,
      imageWithoutBackground: null,
      bgRemovalMode: 'remove',
      selectedGradientColor: 'rainbow',
      customBackgroundImage: null,
    }

    setFilters(resetState.filters)
    setTransform(resetState.transform)
    setActiveFilter('brightness')
    setSliderValue(100)
    setShowCropEditor(false)
    setSelectedOverlayId(null)

    // Reset history hanya jika ada gambar
    if (originalImage) {
      setHistory([resetState])
      setHistoryIndex(0)
    }

    if (cropperRef.current) {
      cropperRef.current.destroy()
      cropperRef.current = null
    }
  }

  // Get emoji for overlay type - optimized with useMemo
  const emojiMap = useMemo(() => ({
    'love': '💕',
    'love-love': '💖',
    'congratulation': '🎉',
    'happy-birthday': '🎂',
    'thank-you': '🙏',
    'best-wishes': '✨',
    'merry-christmas': '🎄',
    'happy-new-year': '🎊',
    'good-luck': '🍀',
    'well-done': '👏'
  }), [])

  const getEmojiForType = useCallback((type: string): string => {
    return emojiMap[type as keyof typeof emojiMap] || ''
  }, [emojiMap])

  // Generate final image dengan semua filter, transformasi, dan stiker untuk download
  const generateFinalImage = useCallback((): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (!originalImage) {
        reject(new Error('No image'))
        return
      }

      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => {
        try {
          // Step 1: Apply filters to temporary canvas
          const tempCanvas = document.createElement('canvas')
          tempCanvas.width = img.naturalWidth
          tempCanvas.height = img.naturalHeight
          const tempCtx = tempCanvas.getContext('2d')
          if (!tempCtx) {
            reject(new Error('Canvas context tidak tersedia'))
            return
          }

          // Apply CSS filters
          tempCtx.filter = `
            brightness(${filters.brightness}%) 
            contrast(${filters.contrast}%) 
            saturate(${filters.saturate}%) 
            invert(${filters.invert}%) 
            blur(${filters.blur}px)
            grayscale(${filters.grayscale}%)
            sepia(${filters.sepia}%)
            hue-rotate(${filters.hue}deg)
          `.replace(/\s+/g, ' ').trim()

          tempCtx.drawImage(img, 0, 0)

          // Step 2: Calculate canvas size after rotation
          const radians = (transform.rotate * Math.PI) / 180
          const cos = Math.abs(Math.cos(radians))
          const sin = Math.abs(Math.sin(radians))
          const newWidth = tempCanvas.width * cos + tempCanvas.height * sin
          const newHeight = tempCanvas.width * sin + tempCanvas.height * cos

          // Step 3: Create final canvas
          const canvas = document.createElement('canvas')
          canvas.width = newWidth
          canvas.height = newHeight
          const ctx = canvas.getContext('2d')
          if (!ctx) {
            reject(new Error('Canvas context tidak tersedia'))
            return
          }

          // Step 4: Apply transformations and draw filtered image
          ctx.translate(canvas.width / 2, canvas.height / 2)
          ctx.rotate((transform.rotate * Math.PI) / 180)
          ctx.scale(transform.flipX, transform.flipY)
          ctx.drawImage(
            tempCanvas,
            -tempCanvas.width / 2,
            -tempCanvas.height / 2,
            tempCanvas.width,
            tempCanvas.height
          )

          // Step 5: Reset transform untuk icon overlays
          ctx.setTransform(1, 0, 0, 1, 0, 0)

          // Step 6: Apply icon overlays
          const originalMinSize = Math.min(tempCanvas.width, tempCanvas.height)

          filters.iconOverlays.forEach(overlay => {
            const imgX = (tempCanvas.width * overlay.x) / 100
            const imgY = (tempCanvas.height * overlay.y) / 100
            const imgCenterX = tempCanvas.width / 2
            const imgCenterY = tempCanvas.height / 2
            let relX = imgX - imgCenterX
            let relY = imgY - imgCenterY
            const rotatedX = relX * Math.cos(radians) - relY * Math.sin(radians)
            const rotatedY = relX * Math.sin(radians) + relY * Math.cos(radians)
            const flippedX = rotatedX * transform.flipX
            const flippedY = rotatedY * transform.flipY
            const canvasCenterX = canvas.width / 2
            const canvasCenterY = canvas.height / 2
            const finalX = canvasCenterX + flippedX
            const finalY = canvasCenterY + flippedY
            const overlaySizeFromOriginal = originalMinSize * (overlay.size / 100)
            const overlaySizeInCanvas = overlaySizeFromOriginal

            const emoji = getEmojiForType(overlay.type)
            if (emoji) {
              const emojiSize = Math.max(200, overlaySizeInCanvas * 3)
              const emojiCanvas = document.createElement('canvas')
              emojiCanvas.width = emojiSize
              emojiCanvas.height = emojiSize
              const emojiCtx = emojiCanvas.getContext('2d', { willReadFrequently: true })

              if (emojiCtx) {
                emojiCtx.clearRect(0, 0, emojiCanvas.width, emojiCanvas.height)
                // NOTE: Emoji glyph biasanya terlihat lebih kecil dari font-size.
                // Naikkan factor agar ukuran saat "Apply" match dengan preview DOM.
                const fontSize = emojiSize * 0.98
                emojiCtx.font = `${fontSize}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", "Android Emoji", "EmojiSymbols", "EmojiOne Mozilla", "Twemoji Mozilla", "Segoe UI Symbol", Arial, sans-serif`
                // Center emoji secara akurat (menghindari geser ke atas/bawah saat Apply)
                // karena glyph emoji tidak selalu center terhadap baseline.
                emojiCtx.textAlign = 'left'
                emojiCtx.textBaseline = 'alphabetic'

                try {
                  const m = emojiCtx.measureText(emoji)
                  const boxW = (m.actualBoundingBoxLeft || 0) + (m.actualBoundingBoxRight || 0) || m.width
                  const boxH = (m.actualBoundingBoxAscent || 0) + (m.actualBoundingBoxDescent || 0) || fontSize
                  const x = (emojiCanvas.width - boxW) / 2 + (m.actualBoundingBoxLeft || 0)
                  const y = (emojiCanvas.height - boxH) / 2 + (m.actualBoundingBoxAscent || 0)
                  emojiCtx.fillText(emoji, x, y)

                  ctx.save()
                  ctx.shadowColor = 'rgba(0, 0, 0, 0.8)'
                  ctx.shadowBlur = 15
                  ctx.shadowOffsetX = 4
                  ctx.shadowOffsetY = 4

                  const overlayRotation = (overlay.rotation || 0) * Math.PI / 180
                  ctx.translate(finalX, finalY)
                  ctx.rotate(overlayRotation)

                  ctx.drawImage(
                    emojiCanvas,
                    -overlaySizeInCanvas / 2,
                    -overlaySizeInCanvas / 2,
                    overlaySizeInCanvas,
                    overlaySizeInCanvas
                  )

                  ctx.restore()
                } catch (error) {
                  console.error('Error drawing emoji overlay:', error)
                }
              }
            }
          })

          const finalImage = canvas.toDataURL('image/jpeg', 0.9)
          resolve(finalImage)
        } catch (error) {
          reject(error)
        }
      }
      img.onerror = () => reject(new Error('Failed to load image'))
      img.src = originalImage
    })
  }, [originalImage, filters, transform])

  // Merge overlays ke gambar secara permanen (tanpa filter/transform untuk base image)
  const mergeOverlaysToImage = useCallback((): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (!originalImage || filters.iconOverlays.length === 0) {
        reject(new Error('No image or overlays'))
        return
      }

      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => {
        try {
          // Buat canvas dengan ukuran gambar asli (tanpa transform)
          const canvas = document.createElement('canvas')
          canvas.width = img.naturalWidth
          canvas.height = img.naturalHeight
          const ctx = canvas.getContext('2d')
          if (!ctx) {
            reject(new Error('Canvas context tidak tersedia'))
            return
          }

          // Draw gambar asli
          ctx.drawImage(img, 0, 0)

          // Apply icon overlays langsung ke gambar (tanpa filter/transform)
          // Gunakan perhitungan yang SAMA PERSIS seperti di preview untuk konsistensi 1:1
          // Di preview: naturalMin = Math.min(imageNaturalSize.width, imageNaturalSize.height)
          // overlay.size adalah persentase dari naturalMin
          // PENTING: Gunakan imageNaturalSize yang SAMA dengan preview untuk konsistensi 1:1
          // img.naturalWidth/Height seharusnya sama dengan imageNaturalSize, tapi gunakan imageNaturalSize untuk konsistensi
          let naturalMin: number
          if (imageNaturalSize.width > 0 && imageNaturalSize.height > 0) {
            // Gunakan imageNaturalSize yang sama dengan preview untuk konsistensi 1:1
            naturalMin = Math.min(imageNaturalSize.width, imageNaturalSize.height)
          } else {
            // Fallback: gunakan img.naturalWidth/Height (seharusnya sama dengan imageNaturalSize)
            naturalMin = Math.min(img.naturalWidth, img.naturalHeight)
          }

          filters.iconOverlays.forEach(overlay => {
            const imgX = (img.naturalWidth * overlay.x) / 100
            const imgY = (img.naturalHeight * overlay.y) / 100
            // Perhitungan ukuran SAMA PERSIS seperti di preview: naturalMin * (overlay.size / 100)
            // Ini memastikan ukuran 1:1 antara preview dan saat diterapkan
            // overlay.size sudah dalam persentase dari naturalMin (dari Math.min(imageNaturalSize))
            // PENTING: naturalMin harus sama dengan yang digunakan di preview
            const overlaySizeFromOriginal = naturalMin * (overlay.size / 100)

            const emoji = getEmojiForType(overlay.type)
            if (emoji) {
              const emojiSize = Math.max(200, overlaySizeFromOriginal * 3)
              const emojiCanvas = document.createElement('canvas')
              emojiCanvas.width = emojiSize
              emojiCanvas.height = emojiSize
              const emojiCtx = emojiCanvas.getContext('2d', { willReadFrequently: true })

              if (emojiCtx) {
                emojiCtx.clearRect(0, 0, emojiCanvas.width, emojiCanvas.height)
                // NOTE: Emoji glyph biasanya terlihat lebih kecil dari font-size.
                // Naikkan factor agar ukuran saat "Apply" match dengan preview DOM.
                const fontSize = emojiSize * 0.98
                emojiCtx.font = `${fontSize}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", "Android Emoji", "EmojiSymbols", "EmojiOne Mozilla", "Twemoji Mozilla", "Segoe UI Symbol", Arial, sans-serif`
                // Center emoji secara akurat (menghindari geser ke atas/bawah saat Apply)
                // karena glyph emoji tidak selalu center terhadap baseline.
                emojiCtx.textAlign = 'left'
                emojiCtx.textBaseline = 'alphabetic'

                try {
                  const m = emojiCtx.measureText(emoji)
                  const boxW = (m.actualBoundingBoxLeft || 0) + (m.actualBoundingBoxRight || 0) || m.width
                  const boxH = (m.actualBoundingBoxAscent || 0) + (m.actualBoundingBoxDescent || 0) || fontSize
                  const x = (emojiCanvas.width - boxW) / 2 + (m.actualBoundingBoxLeft || 0)
                  const y = (emojiCanvas.height - boxH) / 2 + (m.actualBoundingBoxAscent || 0)
                  emojiCtx.fillText(emoji, x, y)

                  ctx.save()
                  ctx.shadowColor = 'rgba(0, 0, 0, 0.8)'
                  ctx.shadowBlur = 15
                  ctx.shadowOffsetX = 4
                  ctx.shadowOffsetY = 4

                  const overlayRotation = (overlay.rotation || 0) * Math.PI / 180
                  ctx.translate(imgX, imgY)
                  ctx.rotate(overlayRotation)

                  ctx.drawImage(
                    emojiCanvas,
                    -overlaySizeFromOriginal / 2,
                    -overlaySizeFromOriginal / 2,
                    overlaySizeFromOriginal,
                    overlaySizeFromOriginal
                  )

                  ctx.restore()
                } catch (error) {
                  console.error('Error drawing emoji overlay:', error)
                }
              }
            }
          })

          const mergedImage = canvas.toDataURL('image/jpeg', 0.9)
          resolve(mergedImage)
        } catch (error) {
          reject(error)
        }
      }
      img.onerror = () => reject(new Error('Failed to load image'))
      img.src = originalImage
    })
  }, [originalImage, filters.iconOverlays, getEmojiForType, imageNaturalSize])

  // Apply overlays to image (untuk konfirmasi dialog) - gabungkan stiker ke gambar secara permanen
  const applyOverlaysToImage = useCallback(async () => {
    if (filters.iconOverlays.length === 0) {
      setSelectedOverlayId(null)
      return
    }

    if (!originalImage) return

    // Flag untuk mencegah debounce history saat proses apply
    isUndoRedoRef.current = true

    try {
      // Sekarang baru gabungkan stiker ke gambar secara permanen
      const mergedImage = await mergeOverlaysToImage()

      // Update originalImage dengan gambar yang sudah digabungkan stiker
      setOriginalImage(mergedImage)

      // Hapus stiker dari overlay karena sudah digabung ke gambar
      setFilters(prev => ({ ...prev, iconOverlays: [] }))
      setSelectedOverlayId(null)

      // Reset state sebelum overlays setelah stiker diterapkan
      stateBeforeOverlaysRef.current = null

      // Push snapshot SETELAH stiker diterapkan (biar redo juga bisa)
      const after = snapshotState({
        originalImage: mergedImage,
        filters: { ...filters, iconOverlays: [] } as any,
      })
      if (after) pushHistory(after)

      // Reset flag setelah semua perubahan selesai
      setTimeout(() => {
        isUndoRedoRef.current = false
      }, 200)
    } catch (error) {
      console.error('Error merging overlays:', error)
      setError('Gagal menerapkan stiker')
      isUndoRedoRef.current = false
    }
  }, [mergeOverlaysToImage, filters, originalImage, pushHistory, snapshotState])

  const handleDownload = useCallback(async () => {
    if (!originalImage) return

    try {
      const finalImage = await generateFinalImage()
      const link = document.createElement('a')
      link.href = finalImage
      link.download = `edited-image-${Date.now()}.jpg`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (error) {
      console.error('Error generating final image:', error)
      setError('Gagal mengunduh gambar')
    }
  }, [originalImage, generateFinalImage])

  const handleSave = useCallback(async () => {
    if (!originalImage) return

    setIsSaving(true)
    try {
      const finalImage = await generateFinalImage()
      await saveToMyFiles(
        finalImage,
        `edited-image-${Date.now()}.jpg`,
        'image/jpeg'
      )
    } catch (error) {
      console.error('Error saving image:', error)
      setError('Gagal menyimpan gambar')
    } finally {
      setIsSaving(false)
    }
  }, [originalImage, generateFinalImage])

  const resetImage = useCallback(() => {
    setOriginalImage(null)
    setError(null)
    closeCropEditor()
    setCustomBackgroundImage(null)
    resetAllFilters()
    setHasBackgroundRemoved(false)
    setImageWithoutBackground(null)
    setCropAspectRatio(undefined)
    setSelectedGradientColor('rainbow')
    setBgRemovalMode('remove')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [closeCropEditor])

  // Update image natural size dan display size untuk menghitung ukuran overlay yang konsisten
  useEffect(() => {
    if (imageRef.current && originalImage) {
      const updateSize = () => {
        if (imageRef.current && imageRef.current.complete) {
          // Get natural size of image (sama seperti di save)
          setImageNaturalSize({
            width: imageRef.current.naturalWidth,
            height: imageRef.current.naturalHeight
          })
          // Get displayed size untuk menghitung skala
          const rect = imageRef.current.getBoundingClientRect()
          setImageDisplaySize({ width: rect.width, height: rect.height })
        }
      }

      const handleResize = () => {
        if (imageRef.current) {
          const rect = imageRef.current.getBoundingClientRect()
          setImageDisplaySize({ width: rect.width, height: rect.height })
        }
      }

      // Small delay to ensure image is loaded
      const timer = setTimeout(() => {
        if (imageRef.current) {
          if (imageRef.current.complete) {
            updateSize()
          } else {
            imageRef.current.addEventListener('load', updateSize, { once: true })
          }
        }
      }, 100)

      window.addEventListener('resize', handleResize)

      return () => {
        clearTimeout(timer)
        window.removeEventListener('resize', handleResize)
        if (imageRef.current) {
          imageRef.current.removeEventListener('load', updateSize)
        }
      }
    }
  }, [originalImage])

  // Apply filters when they change
  useEffect(() => {
    if (originalImage) {
      applyFilters()
    }
  }, [filters, transform, originalImage])

  const getSliderMax = (filterName: string): number => {
    switch (filterName) {
      case 'brightness':
      case 'contrast':
      case 'saturate':
        return 200
      case 'hue':
        return 360
      default:
        return 100
    }
  }

  return (
    <section id="image-editor" className="py-4 md:py-6">
      <div className="max-w-7xl mx-auto">
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-3 sm:mb-4 text-center">
          Edit foto, hapus background, dan tambahkan efek.
        </p>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          {originalImage ? (
            <>
              {/* Top Bar */}
              <div className="flex justify-between items-center p-3 md:p-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-base md:text-lg font-semibold text-gray-900 dark:text-white">
                  Photo Editor
                </h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleUndo}
                    disabled={historyIndex <= 0}
                    className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Undo"
                  >
                    <Undo2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleRedo}
                    disabled={historyIndex >= history.length - 1}
                    className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Redo"
                  >
                    <Redo2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm flex items-center gap-2"
                    title="Simpan ke File Saya"
                  >
                    {isSaving ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    <span className="hidden sm:inline">Simpan</span>
                  </button>
                  <button
                    onClick={handleDownload}
                    className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    <span className="hidden sm:inline">Download</span>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      resetImage()
                    }}
                    className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                    title="Hapus foto"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Image Preview - Full Width (ukuran konsisten) */}
              <div className="relative bg-gray-100 dark:bg-gray-900 flex items-center justify-center w-full" style={{ minHeight: '50vh', maxHeight: '70vh', height: '50vh' }}>
                {showCropEditor ? (
                  <div className="relative w-full h-full flex items-center justify-center p-4" style={{ width: '100%', height: '100%' }}>
                    <div className="w-full h-full" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <img
                        ref={cropperImageRef}
                        src={originalImage || ''}
                        alt="Crop"
                        style={{
                          display: 'block',
                          maxWidth: '100%',
                          maxHeight: '100%',
                          width: 'auto',
                          height: 'auto'
                        }}
                      />
                    </div>
                  </div>
                ) : originalImage ? (
                  <div
                    ref={previewContainerRef}
                    onClick={(e) => {
                      // Hide overlay selection when clicking on empty area
                      if (e.target === e.currentTarget || (e.target as HTMLElement).tagName === 'IMG') {
                        setSelectedOverlayId(null)
                      }
                    }}
                    className="relative w-full h-full flex items-center justify-center p-4 overflow-hidden"
                  >
                    <img
                      ref={imageRef}
                      src={originalImage || ''}
                      alt="Editing"
                      className="max-w-full max-h-full object-contain transition-all duration-300"
                    />
                    {/* Icon Overlays Preview - Draggable */}
                    {filters.iconOverlays.map((overlay) => {
                      let left = `${overlay.x}%`
                      let top = `${overlay.y}%`

                      if (imageRef.current && previewContainerRef.current) {
                        const imageRect = imageRef.current.getBoundingClientRect()
                        const containerRect = previewContainerRef.current.getBoundingClientRect()

                        const imageLeft = imageRect.left - containerRect.left
                        const imageTop = imageRect.top - containerRect.top

                        const overlayX = (imageRect.width * overlay.x) / 100
                        const overlayY = (imageRect.height * overlay.y) / 100

                        const containerX = imageLeft + overlayX
                        const containerY = imageTop + overlayY

                        left = `${(containerX / containerRect.width) * 100}%`
                        top = `${(containerY / containerRect.height) * 100}%`
                      }

                      return (
                        <div
                          key={overlay.id}
                          onMouseDown={(e) => {
                            e.stopPropagation()
                            handleDragStart(e, overlay.id)
                          }}
                          onTouchStart={(e) => {
                            // Don't call preventDefault here - React's onTouchStart is passive
                            // Scrolling prevention is handled in handleTouchMove with { passive: false }
                            e.stopPropagation()
                            handleDragStart(e, overlay.id)
                          }}
                          onClick={(e) => {
                            e.stopPropagation()
                            // Only handle click if we didn't just finish a drag
                            // Click selection is handled in handleMouseUp/handleTouchEnd for better control
                            if (!justFinishedDragRef.current) {
                              // Always select on click - don't toggle, so user can click again to drag
                              setSelectedOverlayId(overlay.id)
                            }
                          }}
                          className={`absolute select-none cursor-move transition-all touch-none ${selectedOverlayId === overlay.id ? 'border-2 border-dashed border-primary' : ''
                            }`}
                          style={{
                            left,
                            top,
                            transform: `translate(-50%, -50%) rotate(${overlay.rotation || 0}deg)`,
                            fontSize: (() => {
                              if (imageNaturalSize.width > 0 && imageNaturalSize.height > 0 && imageDisplaySize.width > 0 && imageDisplaySize.height > 0) {
                                const naturalMin = Math.min(imageNaturalSize.width, imageNaturalSize.height)
                                const displayMin = Math.min(imageDisplaySize.width, imageDisplaySize.height)
                                const scale = displayMin / naturalMin

                                const naturalOverlaySize = naturalMin * (overlay.size / 100)
                                const displayedOverlaySize = naturalOverlaySize * scale

                                return `${displayedOverlaySize}px`
                              }
                              return `${overlay.size * 0.4}vw`
                            })(),
                            lineHeight: '1',
                            filter: 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.8)) drop-shadow(0 2px 4px rgba(0, 0, 0, 0.6))',
                            zIndex: selectedOverlayId === overlay.id ? 20 : 10,
                            userSelect: 'none'
                          }}
                          title={`${overlay.type} - Click to select, drag to move`}
                        >
                          {getEmojiForType(overlay.type)}
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full h-full flex flex-col items-center justify-center p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:border-primary transition-colors"
                  >
                    <Upload className="w-12 h-12 md:w-16 md:h-16 mx-auto mb-3 md:mb-4 text-gray-400" />
                    <p className="text-sm md:text-base text-gray-600 dark:text-gray-400 mb-1">
                      Klik untuk upload foto
                    </p>
                    <p className="text-xs md:text-sm text-gray-500 dark:text-gray-500">
                      PNG, JPG maksimal 10MB
                    </p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </div>
                )}
              </div>

              {/* Bottom Toolbar - PicsArt Style */}
              <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                {/* Tab Navigation */}
                <div className="flex overflow-x-auto border-b border-gray-200 dark:border-gray-700 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                  {[
                    { id: 'adjust', label: 'Adjust', icon: Sliders },
                    { id: 'transform', label: 'Transform', icon: RotateCw },
                    { id: 'overlays', label: 'Stickers', icon: Scissors },
                    { id: 'background', label: 'Remove BG', icon: Wand2 },
                    { id: 'crop', label: 'Crop', icon: Crop }
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => {
                        // Jika pindah dari tab overlays ke tab lain, tampilkan konfirmasi
                        if (activeTab === 'overlays' && tab.id !== 'overlays' && filters.iconOverlays.length > 0) {
                          setPendingTab(tab.id as any)
                          setShowConfirmDialog(true)
                          return
                        }

                        // PENTING: Simpan state sebelum masuk tab overlays (untuk undo)
                        // Ini memastikan undo bisa mengembalikan ke kondisi sebelum ada overlay
                        if (tab.id === 'overlays' && activeTab !== 'overlays' && !stateBeforeOverlaysRef.current) {
                          const snap = snapshotState()
                          if (snap) stateBeforeOverlaysRef.current = snap
                        }

                        // Jika pindah dari tab crop ke tab lain, tutup crop editor
                        if (activeTab === 'crop' && tab.id !== 'crop' && showCropEditor) {
                          closeCropEditor()
                        }
                        setActiveTab(tab.id as any)
                        if (tab.id === 'crop' && !showCropEditor) {
                          startCrop()
                        }
                      }}
                      className={`flex-shrink-0 px-1.5 sm:px-2 md:px-2.5 py-1.5 sm:py-2 md:py-2.5 text-[10px] sm:text-xs md:text-sm font-medium transition-colors border-b-2 ${activeTab === tab.id
                        ? 'border-primary text-primary'
                        : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                        }`}
                    >
                      <tab.icon className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 mx-auto mb-0.5 sm:mb-1" />
                      <span className="block text-[10px] sm:text-xs">{tab.label}</span>
                    </button>
                  ))}
                </div>

                {/* Tab Content - Ukuran konsisten */}
                <div className="p-1.5 sm:p-2 md:p-2.5 h-[140px] sm:h-[160px] md:h-[180px] overflow-y-auto">
                  {/* Adjust Tab */}
                  {activeTab === 'adjust' && (
                    <div className="space-y-1.5 sm:space-y-2 md:space-y-2.5 h-full">
                      <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-1.5 sm:p-2 md:p-2.5">
                        <div className="flex justify-between items-center mb-1.5 sm:mb-2">
                          <span className="text-[10px] sm:text-xs md:text-sm font-medium text-gray-700 dark:text-gray-300 capitalize">
                            {activeFilter.replace('_', ' ')}
                          </span>
                          <span className="text-[10px] sm:text-xs md:text-sm text-gray-600 dark:text-gray-400">
                            {activeFilter === 'hue' ? `${sliderValue}°` : `${sliderValue}%`}
                          </span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max={getSliderMax(activeFilter)}
                          value={sliderValue}
                          onChange={(e) => {
                            const value = Number(e.target.value)
                            setSliderValue(value)
                            handleFilterChange(activeFilter, value)
                          }}
                          className="w-full h-1.5 sm:h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-primary"
                        />
                      </div>
                      <div className="flex overflow-x-auto gap-1 sm:gap-1.5 pb-1.5 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                        {[
                          { id: 'brightness', label: 'Brightness' },
                          { id: 'contrast', label: 'Contrast' },
                          { id: 'saturate', label: 'Saturation' },
                          { id: 'invert', label: 'Invert' },
                          { id: 'blur', label: 'Blur' },
                          { id: 'grayscale', label: 'Grayscale' },
                          { id: 'sepia', label: 'Sepia' },
                          { id: 'hue', label: 'Hue' }
                        ].map((filter) => (
                          <button
                            key={filter.id}
                            onClick={() => {
                              setActiveFilter(filter.id)
                              const value = filters[filter.id as keyof Filters]
                              if (typeof value === 'number') {
                                setSliderValue(value as number)
                              } else {
                                setSliderValue(0)
                              }
                            }}
                            className={`flex-shrink-0 px-1.5 sm:px-2 md:px-2.5 py-1 sm:py-1.5 rounded-lg text-[10px] sm:text-xs md:text-sm transition-all ${activeFilter === filter.id
                              ? 'bg-primary text-white'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                              }`}
                          >
                            {filter.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Transform Tab */}
                  {activeTab === 'transform' && (
                    <div className="grid grid-cols-2 gap-1.5 sm:gap-2 h-full">
                      <button
                        onClick={() => handleTransform('rotate_left')}
                        className="flex flex-col items-center justify-center gap-0.5 sm:gap-1 px-1.5 sm:px-2 md:px-2.5 py-1.5 sm:py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
                      >
                        <RotateCcw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        <span className="text-[9px] sm:text-[10px]">Rotate Left</span>
                      </button>
                      <button
                        onClick={() => handleTransform('rotate_right')}
                        className="flex flex-col items-center justify-center gap-0.5 sm:gap-1 px-1.5 sm:px-2 md:px-2.5 py-1.5 sm:py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
                      >
                        <RotateCw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        <span className="text-[9px] sm:text-[10px]">Rotate Right</span>
                      </button>
                      <button
                        onClick={() => handleTransform('flip_x')}
                        className="flex flex-col items-center justify-center gap-0.5 sm:gap-1 px-1.5 sm:px-2 md:px-2.5 py-1.5 sm:py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
                      >
                        <FlipHorizontal className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        <span className="text-[9px] sm:text-[10px]">Flip H</span>
                      </button>
                      <button
                        onClick={() => handleTransform('flip_y')}
                        className="flex flex-col items-center justify-center gap-0.5 sm:gap-1 px-1.5 sm:px-2 md:px-2.5 py-1.5 sm:py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
                      >
                        <FlipVertical className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        <span className="text-[9px] sm:text-[10px]">Flip V</span>
                      </button>
                    </div>
                  )}

                  {/* Overlays Tab */}
                  {activeTab === 'overlays' && (
                    <div className="h-full flex flex-col">
                      <div className="flex overflow-x-auto gap-1.5 sm:gap-2 scrollbar-hide pb-1.5 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                        {[
                          { id: 'love', label: 'Love', emoji: '💕' },
                          { id: 'love-love', label: 'Love', emoji: '💖' },
                          { id: 'congratulation', label: 'Congrats', emoji: '🎉' },
                          { id: 'happy-birthday', label: 'Birthday', emoji: '🎂' },
                          { id: 'thank-you', label: 'Thank', emoji: '🙏' },
                          { id: 'best-wishes', label: 'Wishes', emoji: '✨' },
                          { id: 'merry-christmas', label: 'Xmas', emoji: '🎄' },
                          { id: 'happy-new-year', label: 'New Year', emoji: '🎊' },
                          { id: 'good-luck', label: 'Luck', emoji: '🍀' },
                          { id: 'well-done', label: 'Done', emoji: '👏' }
                        ].map((effect) => (
                          <button
                            key={effect.id}
                            onClick={() => addIconOverlay(effect.id)}
                            className="flex-shrink-0 w-10 h-10 sm:w-11 sm:h-11 md:w-12 md:h-12 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-all flex flex-col items-center justify-center"
                            title={`Add ${effect.label}`}
                          >
                            <span className="text-lg sm:text-xl">{effect.emoji}</span>
                          </button>
                        ))}
                      </div>

                      {/* Selected Overlay Controls - Compact */}
                      {selectedOverlayId && filters.iconOverlays.find(o => o.id === selectedOverlayId) && (
                        <div className="mt-1.5 sm:mt-2 space-y-1 sm:space-y-1.5 bg-gray-50 dark:bg-gray-900/50 rounded-lg p-1.5 sm:p-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[9px] sm:text-[10px] font-medium text-gray-700 dark:text-gray-300">
                              Edit
                            </span>
                            <button
                              onClick={() => removeIconOverlay(selectedOverlayId)}
                              className="px-1.5 py-0.5 bg-red-500 text-white rounded text-[8px] sm:text-[9px] hover:bg-red-600"
                            >
                              Hapus
                            </button>
                          </div>
                          <div className="grid grid-cols-2 gap-1.5">
                            <div>
                              <div className="flex justify-between items-center mb-0.5">
                                <span className="text-[8px] sm:text-[9px] text-gray-600 dark:text-gray-400">Size</span>
                                <span className="text-[8px] sm:text-[9px] font-medium text-gray-900 dark:text-gray-100">
                                  {filters.iconOverlays.find(o => o.id === selectedOverlayId)?.size || 100}%
                                </span>
                              </div>
                              <input
                                type="range"
                                min="10"
                                max="200"
                                value={filters.iconOverlays.find(o => o.id === selectedOverlayId)?.size || 100}
                                onChange={(e) => {
                                  if (selectedOverlayId) {
                                    updateOverlaySize(selectedOverlayId, Number(e.target.value))
                                  }
                                }}
                                className="w-full h-1 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-primary"
                              />
                            </div>
                            <div>
                              <div className="flex justify-between items-center mb-0.5">
                                <span className="text-[8px] sm:text-[9px] text-gray-600 dark:text-gray-400">Rotate</span>
                                <span className="text-[8px] sm:text-[9px] font-medium text-gray-900 dark:text-gray-100">
                                  {filters.iconOverlays.find(o => o.id === selectedOverlayId)?.rotation || 0}°
                                </span>
                              </div>
                              <input
                                type="range"
                                min="0"
                                max="360"
                                value={filters.iconOverlays.find(o => o.id === selectedOverlayId)?.rotation || 0}
                                onChange={(e) => {
                                  if (selectedOverlayId) {
                                    updateOverlayRotation(selectedOverlayId, Number(e.target.value))
                                  }
                                }}
                                className="w-full h-1 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-primary"
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Background Removal Tab */}
                  {activeTab === 'background' && (
                    <div className="py-1.5 sm:py-2 md:py-2.5 space-y-2 sm:space-y-2.5 md:space-y-3 h-full overflow-y-auto">
                      {/* Mode Selection - hanya tampilkan gradient/custom setelah background di-remove */}
                      {hasBackgroundRemoved && (
                        <div className="flex gap-1.5 sm:gap-2 overflow-x-auto pb-1.5 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                          <button
                            onClick={() => setBgRemovalMode('remove')}
                            className={`flex-shrink-0 px-2 sm:px-2.5 md:px-3 py-1 sm:py-1.5 rounded-lg text-[10px] sm:text-xs md:text-sm transition-all ${bgRemovalMode === 'remove'
                              ? 'bg-purple-500 text-white'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                              }`}
                          >
                            Remove BG
                          </button>
                          <button
                            onClick={() => setBgRemovalMode('gradient')}
                            className={`flex-shrink-0 px-2 sm:px-2.5 md:px-3 py-1 sm:py-1.5 rounded-lg text-[10px] sm:text-xs md:text-sm transition-all ${bgRemovalMode === 'gradient'
                              ? 'bg-purple-500 text-white'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                              }`}
                          >
                            Gradient
                          </button>
                          <button
                            onClick={() => setBgRemovalMode('custom')}
                            className={`flex-shrink-0 px-2 sm:px-2.5 md:px-3 py-1 sm:py-1.5 rounded-lg text-[10px] sm:text-xs md:text-sm transition-all ${bgRemovalMode === 'custom'
                              ? 'bg-purple-500 text-white'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                              }`}
                          >
                            Custom BG
                          </button>
                        </div>
                      )}

                      {/* Remove Background Mode - tampilkan jika belum remove atau mode remove aktif */}
                      {(!hasBackgroundRemoved || bgRemovalMode === 'remove') && (
                        <div className="space-y-2 sm:space-y-2.5 text-center">
                          {!hasBackgroundRemoved ? (
                            <>
                              <p className="text-[10px] sm:text-xs md:text-sm text-gray-600 dark:text-gray-400 px-2 sm:px-3">
                                Hapus background dari foto Anda secara otomatis menggunakan AI
                              </p>
                              <button
                                onClick={async () => {
                                  if (!originalImage) return
                                  isUndoRedoRef.current = true
                                  setIsRemovingBackground(true)
                                  setError(null)
                                  try {
                                    const result = await removeBackground(originalImage)

                                    // Transform sudah diterapkan ke gambar secara permanen
                                    // Reset transform karena sudah permanen di gambar
                                    setTransform({
                                      rotate: 0,
                                      flipX: 1,
                                      flipY: 1
                                    })

                                    // Reset filters
                                    setFilters({
                                      brightness: 100,
                                      contrast: 100,
                                      saturate: 100,
                                      invert: 0,
                                      blur: 0,
                                      grayscale: 0,
                                      sepia: 0,
                                      hue: 0,
                                      iconOverlays: []
                                    })

                                    // Set gambar baru (sudah dengan transform permanen)
                                    setOriginalImage(result)
                                    setImageWithoutBackground(result)
                                    setHasBackgroundRemoved(true)
                                    setBgRemovalMode('remove')

                                    // Update preview
                                    setTimeout(() => {
                                      if (imageRef.current) {
                                        imageRef.current.style.transform = 'rotate(0deg) scale(1, 1)'
                                      }
                                      applyFilters()
                                      // Push snapshot SETELAH remove-bg (redo support)
                                      const after = snapshotState({
                                        originalImage: result,
                                        hasBackgroundRemoved: true,
                                        imageWithoutBackground: result,
                                        bgRemovalMode: 'remove',
                                        customBackgroundImage: null,
                                      })
                                      if (after) pushHistory(after)
                                      isUndoRedoRef.current = false
                                    }, 100)
                                  } catch (err: any) {
                                    setError(err.message || 'Gagal menghapus background')
                                    isUndoRedoRef.current = false
                                  } finally {
                                    setIsRemovingBackground(false)
                                  }
                                }}
                                disabled={isRemovingBackground || !originalImage}
                                className="px-3 sm:px-4 md:px-5 py-1.5 sm:py-2 rounded-lg transition-all text-[10px] sm:text-xs md:text-sm font-medium bg-purple-500 text-white hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 sm:gap-2 mx-auto"
                              >
                                {isRemovingBackground ? (
                                  <>
                                    <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" />
                                    <span>Memproses...</span>
                                  </>
                                ) : (
                                  <>
                                    <Wand2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                    <span>Remove Background</span>
                                  </>
                                )}
                              </button>
                              {isRemovingBackground && (
                                <p className="text-[9px] sm:text-[10px] text-gray-500 dark:text-gray-400">
                                  Proses ini mungkin memakan waktu beberapa detik
                                </p>
                              )}
                            </>
                          ) : (
                            <p className="text-[10px] sm:text-xs md:text-sm text-gray-600 dark:text-gray-400 px-2 sm:px-3">
                              Background sudah dihapus. Pilih gradient atau custom background di atas.
                            </p>
                          )}
                        </div>
                      )}

                      {/* Gradient Background Mode */}
                      {bgRemovalMode === 'gradient' && (
                        <div className="space-y-2 sm:space-y-2.5">
                          <p className="text-[10px] sm:text-xs md:text-sm text-gray-600 dark:text-gray-400 text-center">
                            Pilih warna gradient untuk background
                          </p>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 sm:gap-2">
                            {[
                              { id: 'rainbow', label: 'Pelangi', colors: ['#ff0000', '#ff7f00', '#ffff00', '#00ff00', '#0000ff', '#4b0082', '#9400d3'] },
                              { id: 'sunset', label: 'Sunset', colors: ['#ff6b6b', '#ffa500', '#ff1493'] },
                              { id: 'ocean', label: 'Ocean', colors: ['#00c9ff', '#0099cc', '#0066cc'] },
                              { id: 'forest', label: 'Forest', colors: ['#90ee90', '#228b22', '#006400'] },
                              { id: 'purple', label: 'Purple', colors: ['#9370db', '#8a2be2', '#4b0082'] }
                            ].map((gradient) => (
                              <button
                                key={gradient.id}
                                onClick={async () => {
                                  if (!imageWithoutBackground) return
                                  isUndoRedoRef.current = true
                                  setSelectedGradientColor(gradient.id)
                                  setIsRemovingBackground(true)
                                  setError(null)
                                  try {
                                    // Gunakan image tanpa background yang sudah ada, tidak perlu remove lagi
                                    const result = await applyBackground(imageWithoutBackground, 'gradient', gradient.id)

                                    // Reset transform TERLEBIH DAHULU sebelum setOriginalImage
                                    // Ini memastikan preview tidak menggunakan CSS transform
                                    setTransform({
                                      rotate: 0,
                                      flipX: 1,
                                      flipY: 1
                                    })

                                    // Reset filters
                                    setFilters({
                                      brightness: 100,
                                      contrast: 100,
                                      saturate: 100,
                                      invert: 0,
                                      blur: 0,
                                      grayscale: 0,
                                      sepia: 0,
                                      hue: 0,
                                      iconOverlays: []
                                    })

                                    // Set gambar baru setelah transform di-reset
                                    setOriginalImage(result)
                                    setHasBackgroundRemoved(true)
                                    setImageWithoutBackground(imageWithoutBackground)
                                    setBgRemovalMode('gradient')

                                    // Update preview setelah semua state ter-update
                                    setTimeout(() => {
                                      // Pastikan transform CSS di-reset
                                      if (imageRef.current) {
                                        imageRef.current.style.transform = 'rotate(0deg) scale(1, 1)'
                                      }
                                      // Panggil applyFilters untuk update preview
                                      applyFilters()
                                      // Push snapshot SETELAH apply gradient (redo support)
                                      const after = snapshotState({
                                        originalImage: result,
                                        hasBackgroundRemoved: true,
                                        imageWithoutBackground: imageWithoutBackground,
                                        bgRemovalMode: 'gradient',
                                        selectedGradientColor: gradient.id,
                                      })
                                      if (after) pushHistory(after)
                                      isUndoRedoRef.current = false
                                    }, 100)
                                  } catch (err: any) {
                                    setError(err.message || 'Gagal memproses background')
                                    isUndoRedoRef.current = false
                                  } finally {
                                    setIsRemovingBackground(false)
                                  }
                                }}
                                disabled={isRemovingBackground || !imageWithoutBackground}
                                className={`p-1.5 sm:p-2 rounded-lg border-2 transition-all ${selectedGradientColor === gradient.id
                                  ? 'border-purple-500 ring-2 ring-purple-200 dark:ring-purple-800'
                                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                              >
                                <div className="flex flex-col items-center gap-1">
                                  <div
                                    className="w-full h-6 sm:h-7 md:h-8 rounded"
                                    style={{
                                      background: `linear-gradient(135deg, ${gradient.colors.join(', ')})`
                                    }}
                                  />
                                  <span className="text-[9px] sm:text-[10px] md:text-xs text-gray-700 dark:text-gray-300">{gradient.label}</span>
                                </div>
                              </button>
                            ))}
                          </div>
                          {isRemovingBackground && (
                            <div className="text-center">
                              <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin mx-auto mb-1 text-purple-500" />
                              <p className="text-[9px] sm:text-[10px] text-gray-500 dark:text-gray-400">
                                Memproses...
                              </p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Custom Background Mode */}
                      {bgRemovalMode === 'custom' && (
                        <div className="space-y-2 sm:space-y-2.5">
                          <p className="text-[10px] sm:text-xs md:text-sm text-gray-600 dark:text-gray-400 text-center">
                            Upload gambar untuk background custom
                          </p>
                          <div className="space-y-1.5 sm:space-y-2">
                            <button
                              onClick={() => backgroundInputRef.current?.click()}
                              className="w-full px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-[10px] sm:text-xs md:text-sm flex items-center justify-center gap-1.5 sm:gap-2"
                            >
                              <Upload className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                              <span>Upload Background</span>
                            </button>
                            <input
                              ref={backgroundInputRef}
                              type="file"
                              accept="image/*"
                              onChange={handleBackgroundImageUpload}
                              className="hidden"
                            />
                            {customBackgroundImage && (
                              <div className="relative">
                                <img
                                  src={customBackgroundImage}
                                  alt="Custom background"
                                  className="w-full h-16 sm:h-18 md:h-20 object-cover rounded-lg"
                                />
                                <button
                                  onClick={() => setCustomBackgroundImage(null)}
                                  className="absolute top-0.5 right-0.5 p-0.5 sm:p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                                >
                                  <X className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                                </button>
                              </div>
                            )}
                            {customBackgroundImage && (
                              <button
                                onClick={async () => {
                                  if (!imageWithoutBackground || !customBackgroundImage) return
                                  isUndoRedoRef.current = true
                                  setIsRemovingBackground(true)
                                  setError(null)
                                  try {
                                    // Gunakan image tanpa background yang sudah ada, tidak perlu remove lagi
                                    const result = await applyBackground(imageWithoutBackground, 'custom')

                                    // Reset transform TERLEBIH DAHULU sebelum setOriginalImage
                                    // Ini memastikan preview tidak menggunakan CSS transform
                                    setTransform({
                                      rotate: 0,
                                      flipX: 1,
                                      flipY: 1
                                    })

                                    // Reset filters
                                    setFilters({
                                      brightness: 100,
                                      contrast: 100,
                                      saturate: 100,
                                      invert: 0,
                                      blur: 0,
                                      grayscale: 0,
                                      sepia: 0,
                                      hue: 0,
                                      iconOverlays: []
                                    })

                                    // Set gambar baru setelah transform di-reset
                                    setOriginalImage(result)
                                    setHasBackgroundRemoved(true)
                                    setImageWithoutBackground(imageWithoutBackground)
                                    setBgRemovalMode('custom')

                                    // Update preview setelah semua state ter-update
                                    setTimeout(() => {
                                      // Pastikan transform CSS di-reset
                                      if (imageRef.current) {
                                        imageRef.current.style.transform = 'rotate(0deg) scale(1, 1)'
                                      }
                                      // Panggil applyFilters untuk update preview
                                      applyFilters()
                                      // Push snapshot SETELAH apply custom BG (redo support)
                                      const after = snapshotState({
                                        originalImage: result,
                                        hasBackgroundRemoved: true,
                                        imageWithoutBackground: imageWithoutBackground,
                                        bgRemovalMode: 'custom',
                                        customBackgroundImage,
                                      })
                                      if (after) pushHistory(after)
                                      isUndoRedoRef.current = false
                                    }, 100)
                                  } catch (err: any) {
                                    setError(err.message || 'Gagal memproses background')
                                    isUndoRedoRef.current = false
                                  } finally {
                                    setIsRemovingBackground(false)
                                  }
                                }}
                                disabled={isRemovingBackground || !imageWithoutBackground || !customBackgroundImage}
                                className="w-full px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg bg-purple-500 text-white hover:bg-purple-600 transition-colors text-[10px] sm:text-xs md:text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 sm:gap-2"
                              >
                                {isRemovingBackground ? (
                                  <>
                                    <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" />
                                    <span>Memproses...</span>
                                  </>
                                ) : (
                                  <>
                                    <Wand2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                    <span>Apply Custom Background</span>
                                  </>
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Crop Tab */}
                  {activeTab === 'crop' && (
                    <div className="py-1.5 sm:py-2 md:py-2.5 space-y-2 sm:space-y-2.5">
                      <div className="space-y-2 sm:space-y-2.5">
                        {/* Aspect Ratio Selection */}
                        <div className="space-y-1.5 sm:space-y-2">
                          <p className="text-[10px] sm:text-xs md:text-sm text-gray-600 dark:text-gray-400 text-center font-medium">
                            Ubah Rasio Aspek
                          </p>
                          <div className="flex overflow-x-auto gap-1.5 sm:gap-2 pb-1.5 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                            {[
                              { label: 'Free', value: undefined, icon: '📐' },
                              { label: '1:1', value: 1, icon: '⬜' },
                              { label: '4:3', value: 4 / 3, icon: '📺' },
                              { label: '3:4', value: 3 / 4, icon: '📱' },
                              { label: '16:9', value: 16 / 9, icon: '🖥️' },
                              { label: '9:16', value: 9 / 16, icon: '📱' },
                              { label: '4:5', value: 4 / 5, icon: '📷' },
                              { label: '5:4', value: 5 / 4, icon: '🖼️' },
                              { label: '21:9', value: 21 / 9, icon: '📺' }
                            ].map((ratio) => (
                              <button
                                key={ratio.label}
                                onClick={() => {
                                  setCropAspectRatio(ratio.value)
                                  if (!showCropEditor) {
                                    startCrop()
                                  } else if (cropperRef.current) {
                                    cropperRef.current.setAspectRatio(ratio.value)
                                  }
                                }}
                                className={`flex-shrink-0 px-2 sm:px-2.5 py-1.5 sm:py-2 rounded-lg border-2 transition-all ${cropAspectRatio === ratio.value
                                  ? 'border-blue-500 ring-2 ring-blue-200 dark:ring-blue-800 bg-blue-50 dark:bg-blue-900/20'
                                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-800'
                                  }`}
                              >
                                <div className="flex flex-col items-center gap-0.5 sm:gap-1">
                                  <span className="text-sm sm:text-base">{ratio.icon}</span>
                                  <span className="text-[9px] sm:text-[10px] font-medium text-gray-700 dark:text-gray-300">{ratio.label}</span>
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="flex gap-1.5 sm:gap-2 justify-center">
                          <button
                            onClick={closeCropEditor}
                            className="px-3 sm:px-4 md:px-5 py-1.5 sm:py-2 rounded-lg transition-all text-[10px] sm:text-xs md:text-sm font-medium bg-gray-500 text-white hover:bg-gray-600"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={applyCrop}
                            className="px-3 sm:px-4 md:px-5 py-1.5 sm:py-2 rounded-lg transition-all text-[10px] sm:text-xs md:text-sm font-medium bg-green-500 text-white hover:bg-green-600"
                          >
                            Apply Crop
                          </button>
                        </div>
                        <p className="text-[9px] sm:text-[10px] text-gray-600 dark:text-gray-400 text-center">
                          Drag the corners to adjust the crop area
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Top Bar - Empty State */}
              <div className="flex justify-between items-center p-3 md:p-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-base md:text-lg font-semibold text-gray-900 dark:text-white">
                  Photo Editor
                </h3>
              </div>

              {/* Image Preview - Upload Area (ukuran konsisten dengan preview) */}
              <div className="relative bg-gray-100 dark:bg-gray-900 flex items-center justify-center w-full" style={{ minHeight: '50vh', maxHeight: '70vh', height: '50vh' }}>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full h-full flex flex-col items-center justify-center p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:border-primary transition-colors"
                >
                  <Upload className="w-12 h-12 md:w-16 md:h-16 mx-auto mb-3 md:mb-4 text-gray-400" />
                  <p className="text-sm md:text-base text-gray-600 dark:text-gray-400 mb-1">
                    Klik untuk upload foto
                  </p>
                  <p className="text-xs md:text-sm text-gray-500 dark:text-gray-500">
                    PNG, JPG maksimal 10MB
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </div>
              </div>

              {/* Bottom Toolbar - Empty State */}
              <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 min-h-[140px] sm:min-h-[160px] md:min-h-[180px]">
                {/* Tab Navigation */}
                <div className="flex overflow-x-auto border-b border-gray-200 dark:border-gray-700 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                  {[
                    { id: 'adjust', label: 'Adjust', icon: Sliders },
                    { id: 'transform', label: 'Transform', icon: RotateCw },
                    { id: 'overlays', label: 'Stickers', icon: Scissors },
                    { id: 'background', label: 'Remove BG', icon: Wand2 },
                    { id: 'crop', label: 'Crop', icon: Crop }
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      disabled={!originalImage}
                      onClick={() => {
                        if (!originalImage) return
                        // Jika pindah dari tab overlays ke tab lain, tampilkan konfirmasi
                        if (activeTab === 'overlays' && tab.id !== 'overlays' && filters.iconOverlays.length > 0) {
                          setPendingTab(tab.id as any)
                          setShowConfirmDialog(true)
                          return
                        }
                        if (activeTab === 'crop' && tab.id !== 'crop' && showCropEditor) {
                          closeCropEditor()
                        }
                        setActiveTab(tab.id as any)
                        if (tab.id === 'crop' && !showCropEditor) {
                          startCrop()
                        }
                      }}
                      className={`flex-shrink-0 px-2 sm:px-3 md:px-4 py-2 sm:py-2.5 md:py-3 text-xs sm:text-sm font-medium transition-colors border-b-2 ${activeTab === tab.id
                        ? 'border-primary text-primary'
                        : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                        } ${!originalImage ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <tab.icon className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 mx-auto mb-0.5 sm:mb-1" />
                      <span className="block text-[10px] sm:text-xs">{tab.label}</span>
                    </button>
                  ))}
                </div>

                {/* Tab Content - Empty State */}
                <div className="p-1.5 sm:p-2 md:p-2.5 max-h-[28vh] min-h-[100px] sm:min-h-[120px] md:min-h-[140px] overflow-y-auto">
                  <div className="text-center py-2 sm:py-3 md:py-4 text-gray-500 dark:text-gray-400 min-h-[80px] sm:min-h-[100px] md:min-h-[120px] flex items-center justify-center">
                    <p className="text-[10px] sm:text-xs md:text-sm">Upload foto terlebih dahulu untuk mulai editing</p>
                  </div>
                </div>
              </div>
            </>
          )}

          {error && (
            <div className="mt-3 md:mt-4 p-2 md:p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-xs md:text-sm whitespace-pre-line">
              {error}
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Dialog untuk pindah tab dari overlays */}
      {showConfirmDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 md:p-6 max-w-sm w-full shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Terapkan Stiker?
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Stiker yang sudah ditambahkan akan diterapkan ke foto. Lanjutkan?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  // Terapkan stiker ke gambar
                  applyOverlaysToImage()
                  setShowConfirmDialog(false)
                  if (pendingTab) {
                    if (pendingTab === 'crop' && !showCropEditor) {
                      startCrop()
                    }
                    setActiveTab(pendingTab)
                    setPendingTab(null)
                  }
                }}
                className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm font-medium"
              >
                Terapkan
              </button>
              <button
                onClick={() => {
                  // Batal, tetap di tab overlays
                  setShowConfirmDialog(false)
                  setPendingTab(null)
                }}
                className="flex-1 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors text-sm font-medium"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
