// Target hasil ~2 MB (cepat dibuka tamu); server menerima sampai 4 MB (routes/upload.js).
const TARGET_BYTES = 2 * 1024 * 1024
const SERVER_MAX_BYTES = 4 * 1024 * 1024
const MAX_DIMENSION = 2200

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality))
}

/**
 * Perkecil + kompres foto sebelum diunggah. Safari (iPhone) tidak bisa membuat WebP lewat canvas:
 * toBlob('image/webp') diam-diam mengembalikan PNG besar → dulu file asli (>2 MB) terkirim dan ditolak.
 * Sekarang: pakai WebP hanya bila benar-benar didukung, selain itu JPEG; turunkan kualitas lalu ukuran.
 */
export async function prepareImageUpload(file: File): Promise<File> {
  if (file.size <= TARGET_BYTES && file.type === 'image/webp') return file

  const bitmap = typeof createImageBitmap === 'function'
    ? await createImageBitmap(file).catch(() => loadImage(file))
    : await loadImage(file)
  if (!bitmap) return file
  const sourceWidth = bitmap.width
  const sourceHeight = bitmap.height

  let dimension = Math.min(MAX_DIMENSION, Math.max(sourceWidth, sourceHeight))
  let blob: Blob | null = null
  for (let attempt = 0; attempt < 4; attempt++) {
    const scale = Math.min(1, dimension / Math.max(sourceWidth, sourceHeight))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(sourceWidth * scale))
    canvas.height = Math.max(1, Math.round(sourceHeight * scale))
    const context = canvas.getContext('2d')
    if (!context) break
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)

    let mime = 'image/webp'
    let quality = 0.86
    blob = await canvasToBlob(canvas, mime, quality)
    if (!blob || blob.type !== 'image/webp') {
      mime = 'image/jpeg'
      blob = await canvasToBlob(canvas, mime, quality)
    }
    while (blob && blob.size > TARGET_BYTES && quality > 0.55) {
      quality -= 0.08
      blob = await canvasToBlob(canvas, mime, quality)
    }
    if (blob && blob.size <= TARGET_BYTES) break
    dimension = Math.round(dimension * 0.75)
  }
  if ('close' in bitmap) bitmap.close()

  if (!blob || blob.size > SERVER_MAX_BYTES) return file
  const extension = blob.type === 'image/webp' ? 'webp' : 'jpg'
  const baseName = file.name.replace(/\.[^.]+$/, '') || 'photo'
  return new File([blob], `${baseName}.${extension}`, { type: blob.type, lastModified: Date.now() })
}

function loadImage(file: File): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const image = new Image()
    const url = URL.createObjectURL(file)
    image.onload = () => {
      URL.revokeObjectURL(url)
      resolve(image)
    }
    image.onerror = () => {
      URL.revokeObjectURL(url)
      resolve(null)
    }
    image.src = url
  })
}
