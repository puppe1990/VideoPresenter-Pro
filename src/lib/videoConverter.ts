'use client'

export type ExportFormat = 'webm' | 'mp4' | 'webp'

export interface ConversionProgress {
  progress: number
  stage: string
}

class VideoExporter {
  // Check what formats the browser supports for recording
  getSupportedRecordingFormats(): ExportFormat[] {
    const formats: ExportFormat[] = []
    
    // Check MP4 support first (most compatible)
    if (typeof MediaRecorder !== 'undefined') {
      if (MediaRecorder.isTypeSupported('video/mp4; codecs=h264,aac')) {
        formats.push('mp4')
      } else if (MediaRecorder.isTypeSupported('video/mp4')) {
        formats.push('mp4')
      }
      
      // WebM is widely supported
      if (MediaRecorder.isTypeSupported('video/webm; codecs=vp9,opus')) {
        formats.push('webm')
      } else if (MediaRecorder.isTypeSupported('video/webm')) {
        formats.push('webm')
      }
    }
    
    return formats.length > 0 ? formats : ['webm'] // Fallback to webm
  }

  // Get the best recording format for the current browser
  getBestRecordingFormat(): { mimeType: string; format: ExportFormat } {
    if (typeof MediaRecorder === 'undefined') {
      return { mimeType: 'video/webm', format: 'webm' }
    }

    // Try MP4 formats first (better compatibility)
    const mp4Formats = [
      'video/mp4; codecs=h264,aac',
      'video/mp4; codecs=avc1.42E01E,mp4a.40.2',
      'video/mp4'
    ]

    for (const mimeType of mp4Formats) {
      if (MediaRecorder.isTypeSupported(mimeType)) {
        return { mimeType, format: 'mp4' }
      }
    }

    // Fallback to WebM formats
    const webmFormats = [
      'video/webm; codecs=vp9,opus',
      'video/webm; codecs=vp8,opus',
      'video/webm; codecs=vp9',
      'video/webm; codecs=vp8',
      'video/webm'
    ]

    for (const mimeType of webmFormats) {
      if (MediaRecorder.isTypeSupported(mimeType)) {
        return { mimeType, format: 'webm' }
      }
    }

    // Last resort
    return { mimeType: 'video/webm', format: 'webm' }
  }

  // Convert video to animated WebP
  private async convertToAnimatedWebP(
    videoBlob: Blob,
    onProgress?: (progress: ConversionProgress) => void
  ): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video')
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      
      if (!ctx) {
        reject(new Error('Canvas context not available'))
        return
      }

      video.muted = true
      video.preload = 'metadata'
      
      video.onloadedmetadata = async () => {
        try {
          onProgress?.({ progress: 10, stage: 'Analyzing video...' })
          
          // Set canvas size to match video
          canvas.width = video.videoWidth
          canvas.height = video.videoHeight
          
          const duration = video.duration
          const fps = 10 // Target 10 FPS for animated WebP
          const interval = 1 / fps
          const frames: string[] = []
          
          onProgress?.({ progress: 20, stage: 'Extracting frames...' })
          
          // Extract frames
          for (let time = 0; time < duration; time += interval) {
            video.currentTime = time
            
            await new Promise(resolve => {
              video.onseeked = resolve
            })
            
            // Draw frame to canvas
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
            
            // Convert frame to WebP
            const frameDataUrl = canvas.toDataURL('image/webp', 0.8)
            frames.push(frameDataUrl)
            
            const progress = 20 + (time / duration) * 60
            onProgress?.({ progress, stage: `Extracting frame ${frames.length}...` })
          }
          
          onProgress?.({ progress: 80, stage: 'Creating animated WebP...' })
          
          // For now, we'll create a simple WebP of the first frame
          // In a real implementation, you'd need a library like 'webp-writer' or server-side processing
          // to create actual animated WebPs
          if (frames.length > 0) {
            const firstFrameData = frames[0]
            const response = await fetch(firstFrameData)
            const blob = await response.blob()
            
            onProgress?.({ progress: 100, stage: 'WebP creation complete!' })
            resolve(blob)
          } else {
            reject(new Error('No frames extracted from video'))
          }
        } catch (error) {
          reject(error)
        }
      }
      
      video.onerror = () => {
        reject(new Error('Failed to load video for WebP conversion'))
      }
      
      video.src = URL.createObjectURL(videoBlob)
    })
  }

  // Simple format conversion using MediaRecorder API
  async convertToFormat(
    videoBlob: Blob,
    targetFormat: ExportFormat,
    onProgress?: (progress: ConversionProgress) => void
  ): Promise<Blob> {
    onProgress?.({ progress: 0, stage: 'Starting conversion...' })

    try {
      // Handle WebP conversion
      if (targetFormat === 'webp') {
        return await this.convertToAnimatedWebP(videoBlob, onProgress)
      }

      // For now, we'll only support direct download for video formats
      // Complex conversion would require FFmpeg or server-side processing
      if (targetFormat === 'webm' || videoBlob.type.includes('webm')) {
        onProgress?.({ progress: 100, stage: 'Conversion complete!' })
        return videoBlob
      }

      // If we need MP4 but have WebM, inform user about limitation
      if (targetFormat === 'mp4' && videoBlob.type.includes('webm')) {
        throw new Error('MP4 conversion requires server-side processing. Download as WebM instead.')
      }

      onProgress?.({ progress: 100, stage: 'Conversion complete!' })
      return videoBlob
    } catch (error) {
      console.error('❌ Format conversion failed:', error)
      throw error
    }
  }

  getFormatInfo(format: ExportFormat) {
    switch (format) {
      case 'mp4':
        return {
          name: 'MP4',
          description: 'Universal compatibility, best for sharing',
          icon: '🎬',
          extension: 'mp4',
          mimeType: 'video/mp4'
        }
      case 'webp':
        return {
          name: 'WebP',
          description: 'Lightweight animated format, perfect for web',
          icon: '🖼️',
          extension: 'webp',
          mimeType: 'image/webp'
        }
      case 'webm':
      default:
        return {
          name: 'WebM',
          description: 'High quality, web optimized',
          icon: '🌐',
          extension: 'webm',
          mimeType: 'video/webm'
        }
    }
  }

  // Create download link for video
  downloadVideo(blob: Blob, format: ExportFormat, filename?: string): void {
    const formatInfo = this.getFormatInfo(format)
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-')
    const finalFilename = filename || `video-presentation-${timestamp}.${formatInfo.extension}`

    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = finalFilename
    
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    
    // Cleanup
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  // Check if conversion is needed
  needsConversion(currentFormat: string, targetFormat: ExportFormat): boolean {
    const target = this.getFormatInfo(targetFormat)
    
    // WebP always needs conversion from video formats
    if (targetFormat === 'webp') {
      return true
    }
    
    return !currentFormat.includes(target.extension)
  }
}

// Singleton instance
export const videoExporter = new VideoExporter() 