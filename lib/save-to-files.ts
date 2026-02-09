import { toast } from 'sonner'

/**
 * Save a generated image/video URL to user's "File Saya"
 * @param url - The URL of the file to save (can be data URL or external URL)
 * @param filename - The filename to save as
 * @param fileType - MIME type of the file (e.g., 'image/png', 'video/mp4')
 * @returns Promise<boolean> - true if successful, false otherwise
 */
export async function saveToMyFiles(
    url: string,
    filename: string,
    fileType: string = 'image/png'
): Promise<boolean> {
    try {
        // Convert URL to Blob
        let blob: Blob

        if (url.startsWith('data:')) {
            // Data URL - convert to blob
            const base64Data = url.split(',')[1]
            const byteCharacters = atob(base64Data)
            const byteNumbers = new Array(byteCharacters.length)
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i)
            }
            const byteArray = new Uint8Array(byteNumbers)
            const mimeType = url.match(/data:([^;]+);/)?.[1] || fileType
            blob = new Blob([byteArray], { type: mimeType })
        } else if (url.startsWith('blob:')) {
            // Blob URL - fetch it
            const response = await fetch(url)
            blob = await response.blob()
        } else {
            // External URL - fetch via proxy to avoid CORS
            const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(url)}`
            const response = await fetch(proxyUrl)
            if (!response.ok) throw new Error('Failed to fetch file')
            blob = await response.blob()
        }

        // Create File from Blob
        const file = new File([blob], filename, { type: blob.type || fileType })

        // Upload to user files
        const formData = new FormData()
        formData.append('file', file)

        const response = await fetch('/api/user/files', {
            method: 'POST',
            body: formData
        })

        if (!response.ok) {
            const data = await response.json()
            throw new Error(data.error || 'Failed to save file')
        }

        toast.success('File berhasil disimpan ke "File Saya"')
        return true
    } catch (error) {
        console.error('Error saving to My Files:', error)
        toast.error(error instanceof Error ? error.message : 'Gagal menyimpan file')
        return false
    }
}
