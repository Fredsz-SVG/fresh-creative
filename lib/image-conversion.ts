/**
 * Converts a File object (image) to a WebP Blob using the browser's Canvas API.
 * @param file The original image File object.
 * @param quality The quality of the WebP image (0-1).
 * @returns A promise that resolves to a WebP Blob.
 */
export async function convertToWebP(file: File, quality = 0.8): Promise<Blob> {
  // If the file is already a WebP, we might still want to re-compress it, 
  // but usually we can skip if quality is high.
  // For simplicity, we always convert.

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Failed to get canvas context"));
          return;
        }
        ctx.drawImage(img, 0, 0);
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error("Failed to convert image to WebP"));
            }
          },
          "image/webp",
          quality
        );
      };
      img.onerror = () => reject(new Error("Failed to load image into element"));
      img.src = event.target?.result as string;
    };
    reader.onerror = () => reject(new Error("Failed to read file into data URL"));
    reader.readAsDataURL(file);
  });
}
