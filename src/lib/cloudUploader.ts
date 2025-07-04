'use client'

export async function uploadToGoogleDrive(blob: Blob, filename: string, token: string): Promise<void> {
  const metadata = { name: filename }
  const formData = new FormData()
  formData.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }))
  formData.append('file', blob)

  const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: formData
  })

  if (!res.ok) {
    throw new Error(`Google Drive upload failed: ${res.statusText}`)
  }
}

export async function uploadToDropbox(blob: Blob, filename: string, token: string): Promise<void> {
  const res = await fetch('https://content.dropboxapi.com/2/files/upload', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Dropbox-API-Arg': JSON.stringify({ path: `/${filename}`, mode: 'add', autorename: true }),
      'Content-Type': 'application/octet-stream'
    },
    body: blob
  })

  if (!res.ok) {
    throw new Error(`Dropbox upload failed: ${res.statusText}`)
  }
}
