/** Jika URL eksternal, pakai proxy agar canvas tidak kena CORS. */
export function getImageSrcForCanvas(imageSrc: string): string {
  if (imageSrc.startsWith("data:")) return imageSrc;
  if (imageSrc.startsWith("http://") || imageSrc.startsWith("https://")) {
    return `/api/proxy-image?url=${encodeURIComponent(imageSrc)}`;
  }
  return imageSrc;
}

/** Download image to device. */
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

/**
 * @deprecated Use `downloadImage` instead. Kept for backward compatibility.
 */
export const downloadImageWithWatermark = downloadImage;

