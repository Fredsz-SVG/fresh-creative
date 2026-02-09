const WATERMARK_TEXT = "Fresh Creative";
const WATERMARK_OPACITY = 0.18;
const WATERMARK_SPACING = 140;
const WATERMARK_FONT = "20px system-ui, sans-serif";

/** Jika URL eksternal, pakai proxy agar canvas tidak kena CORS. */
export function getImageSrcForCanvas(imageSrc: string): string {
  if (imageSrc.startsWith("data:")) return imageSrc;
  if (imageSrc.startsWith("http://") || imageSrc.startsWith("https://")) {
    return `/api/proxy-image?url=${encodeURIComponent(imageSrc)}`;
  }
  return imageSrc;
}

/** Gambar ke canvas, tambah watermark berulang (tiled), lalu download ke device. */
export function downloadImageWithWatermark(
  imageSrc: string,
  filename: string,
  options?: { format?: "image/jpeg" | "image/png"; quality?: number }
): Promise<void> {
  // If we want to remove watermark globally, we could just point to downloadImage here.
  // But let's keep this as legacy and use downloadImage in components.
  // Actually, simplest way for USER REQUEST "hilangkan watermarknya" across the board:
  // Just make this function bypass the watermark logic!
  // But name is confusing.
  // Let's implement downloadImage and export it.

  return downloadImage(imageSrc, filename);
}

/** Download image without watermark */
export async function downloadImage(imageSrc: string, filename: string): Promise<void> {
  const srcToLoad = getImageSrcForCanvas(imageSrc);

  try {
    const res = await fetch(srcToLoad);
    if (!res.ok) throw new Error("Failed to load image");

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (e) {
    console.error("Download failed, opening in new tab", e);
    window.open(srcToLoad, '_blank');
  }
}
