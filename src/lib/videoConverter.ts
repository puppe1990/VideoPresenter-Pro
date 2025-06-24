'use client'

export type ExportFormat = 'webm' | 'mp4'

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

  // Simple format conversion using MediaRecorder API
  async convertToFormat(
    videoBlob: Blob,
    targetFormat: ExportFormat,
    onProgress?: (progress: ConversionProgress) => void
  ): Promise<Blob> {
    onProgress?.({ progress: 0, stage: 'Starting conversion...' })

    try {
      // For now, we'll only support direct download
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
    return !currentFormat.includes(target.extension)
  }
}

// Singleton instance
export const videoExporter = new VideoExporter() 