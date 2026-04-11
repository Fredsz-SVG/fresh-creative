/** Composite foreground (PNG with alpha) onto a solid color or a background image. */

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Gagal memuat gambar'))
    img.src = src
  })
}

export async function compositeForegroundOnSolid(foregroundDataUrl: string, colorHex: string): Promise<string> {
  const fg = await loadImage(foregroundDataUrl)
  const w = fg.naturalWidth
  const h = fg.naturalHeight
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas tidak tersedia')
  ctx.fillStyle = colorHex
  ctx.fillRect(0, 0, w, h)
  ctx.drawImage(fg, 0, 0)
  return canvas.toDataURL('image/png')
}

/** Background image scaled to cover the same size as the foreground canvas. */
export async function compositeForegroundOnImageBg(foregroundDataUrl: string, backgroundDataUrl: string): Promise<string> {
  const [fg, bg] = await Promise.all([loadImage(foregroundDataUrl), loadImage(backgroundDataUrl)])
  const w = fg.naturalWidth
  const h = fg.naturalHeight
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas tidak tersedia')
  const scale = Math.max(w / bg.naturalWidth, h / bg.naturalHeight)
  const bw = bg.naturalWidth * scale
  const bh = bg.naturalHeight * scale
  const bx = (w - bw) / 2
  const by = (h - bh) / 2
  ctx.drawImage(bg, bx, by, bw, bh)
  ctx.drawImage(fg, 0, 0)
  return canvas.toDataURL('image/png')
}
