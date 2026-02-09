/**
 * Fetch URL (via proxy jika eksternal), lalu download blob ke device.
 * Untuk video / file non-gambar (tanpa watermark).
 */
function getFetchUrl(url: string): string {
  if (url.startsWith("data:")) return url;
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return `/api/proxy-image?url=${encodeURIComponent(url)}`;
  }
  return url;
}

export function downloadFileToDevice(url: string, filename: string): Promise<void> {
  const fetchUrl = getFetchUrl(url);

  return fetch(fetchUrl)
    .then((res) => {
      if (!res.ok) throw new Error("Gagal mengambil file");
      return res.blob();
    })
    .then((blob) => {
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = filename || "download";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(objectUrl);
    });
}
