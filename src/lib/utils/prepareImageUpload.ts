const MAX_UPLOAD_BYTES = 2 * 1024 * 1024
const MAX_DIMENSION = 2200

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality))
}

export async function prepareImageUpload(file: File): Promise<File> {
  if (file.size <= MAX_UPLOAD_BYTES && file.type === 'image/webp') return file

  const bitmap = typeof createImageBitmap === 'function'
    ? await createImageBitmap(file).catch(() => null)
    : await loadImage(file)
  if (!bitmap) return file

  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(bitmap.width * scale))
  canvas.height = Math.max(1, Math.round(bitmap.height * scale))
  const context = canvas.getContext('2d')
  if (!context) return file
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  if ('close' in bitmap) bitmap.close()

  const mime = 'image/webp'
  let quality = 0.86
  let blob = await canvasToBlob(canvas, mime, quality)
  if (!blob) blob = await canvasToBlob(canvas, 'image/jpeg', quality)
  while (blob && blob.size > MAX_UPLOAD_BYTES && quality > 0.5) {
    quality -= 0.08
    blob = await canvasToBlob(canvas, blob.type || mime, quality)
  }

  if (!blob || blob.size > MAX_UPLOAD_BYTES) return file
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
