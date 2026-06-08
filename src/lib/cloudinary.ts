// src/lib/cloudinary.ts
// Subida de imágenes a Cloudinary desde el servidor

const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME!
const API_KEY    = process.env.CLOUDINARY_API_KEY!
const API_SECRET = process.env.CLOUDINARY_API_SECRET!

function sha1(str: string): string {
  // Node.js crypto
  const crypto = require('crypto') as typeof import('crypto')
  return crypto.createHash('sha1').update(str).digest('hex')
}

export async function uploadToCloudinary(
  base64Data: string,       // base64 sin el prefijo data:...
  mimeType: string,
  folder: string = 'valotourneys/payments'
): Promise<{ url: string; publicId: string }> {
  const timestamp = Math.floor(Date.now() / 1000).toString()

  // Signature: timestamp + folder + api_secret
  const signatureStr = `folder=${folder}&timestamp=${timestamp}${API_SECRET}`
  const signature    = sha1(signatureStr)

  const formData = new FormData()
  formData.append('file', `data:${mimeType};base64,${base64Data}`)
  formData.append('api_key',   API_KEY)
  formData.append('timestamp', timestamp)
  formData.append('signature', signature)
  formData.append('folder',    folder)

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    { method: 'POST', body: formData }
  )

  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error?.message ?? 'Error subiendo imagen a Cloudinary')
  }

  const data = await res.json()
  return { url: data.secure_url, publicId: data.public_id }
}

export async function deleteFromCloudinary(publicId: string): Promise<void> {
  const timestamp    = Math.floor(Date.now() / 1000).toString()
  const signatureStr = `public_id=${publicId}&timestamp=${timestamp}${API_SECRET}`
  const signature    = sha1(signatureStr)

  const formData = new FormData()
  formData.append('public_id', publicId)
  formData.append('api_key',   API_KEY)
  formData.append('timestamp', timestamp)
  formData.append('signature', signature)

  await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/destroy`, {
    method: 'POST',
    body:   formData,
  })
}
