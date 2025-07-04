'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import VideoCanvas, { type VideoCanvasHandle } from './VideoCanvas'
import ControlsPanel from './ControlsPanel'
import TopBar from './TopBar'
import Teleprompter from './Teleprompter'
import { videoExporter, type ExportFormat, type ConversionProgress } from '@/lib/videoConverter'
import { useTranslation } from '@/lib/useTranslation'


export interface PresenterSettings {
  backgroundType: 'visible' | 'blurred' | 'hidden'
  shape: 'rectangle' | 'circle' | 'rounded' | 'hexagon' | 'diamond' | 'heart' | 'star'
  color: string
  virtualBackground: string | null
  videoFilter: 'none' | 'grayscale' | 'sepia' | 'invert'
  size: 'small' | 'medium' | 'large' | 'xlarge'
  position: { x: number; y: number }
  isDragging: boolean
}

export type RecordingSource = 'camera' | 'screen' | 'both'

export default function VideoPresenter() {
  const { t } = useTranslation()
  const [isRecording, setIsRecording] = useState(false)
  const [recordedChunks, setRecordedChunks] = useState<Blob[]>([])
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null)
  const [recordingDuration, setRecordingDuration] = useState(0)
  const [recordedMimeType, setRecordedMimeType] = useState<string>('')
  const [recordingSource, setRecordingSource] = useState<RecordingSource>('camera')
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null)
  const [isTeleprompterVisible, setIsTeleprompterVisible] = useState(false)
  const [isCameraPopupOpen, setIsCameraPopupOpen] = useState(false)
  const [exportFormat, setExportFormat] = useState<ExportFormat>('webm')
  const [isConverting, setIsConverting] = useState(false)
  const [conversionProgress, setConversionProgress] = useState<ConversionProgress | null>(null)
  const [settings, setSettings] = useState<PresenterSettings>({
    backgroundType: 'visible',
    shape: 'rectangle',
    color: '#3b82f6', // Beautiful blue instead of green
    virtualBackground: 'tech', // Set tech background as default
    videoFilter: 'none',
    size: 'medium',
    position: { x: 16, y: 16 },
    isDragging: false,
  })
  const [isPictureInPicture, setIsPictureInPicture] = useState(false)
  const [isSidebarVisible, setIsSidebarVisible] = useState(true)

  const videoRef = useRef<HTMLVideoElement>(null)
  const videoCanvasRef = useRef<VideoCanvasHandle>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null)
  const cameraPopupRef = useRef<Window | null>(null)

  useEffect(() => {
    // Initialize camera only once
    async function initCamera() {
      if (streamRef.current) {
        console.log('🔄 Camera already initialized, skipping...')
        return
      }
      
      try {
        console.log('📹 Requesting camera access...')
        
        // Check if getUserMedia is supported
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          console.error('❌ getUserMedia is not supported in this browser')
          return
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { 
            width: { ideal: 1280 }, 
            height: { ideal: 720 },
            facingMode: 'user'
          },
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            sampleRate: 44100
          },
        })
        
        console.log('✅ Camera access granted')
        console.log(`📊 Stream tracks: ${stream.getVideoTracks().length} video, ${stream.getAudioTracks().length} audio`)
        
        // Debug track details
        stream.getTracks().forEach((track, index) => {
          console.log(`🎯 Track ${index}: ${track.kind} - ${track.label} - Ready: ${track.readyState}`)
        })
        
        streamRef.current = stream
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          console.log('📺 Video stream assigned to video element')
          
          // Wait for video to be ready
          videoRef.current.onloadedmetadata = () => {
            console.log('🎥 Video metadata loaded - ready for recording')
          }

          // Add Picture-in-Picture event listeners
          videoRef.current.addEventListener('enterpictureinpicture', () => {
            console.log('📺 Entered Picture-in-Picture mode')
            setIsPictureInPicture(true)
          })

          videoRef.current.addEventListener('leavepictureinpicture', () => {
            console.log('📺 Left Picture-in-Picture mode')
            setIsPictureInPicture(false)
          })
        }
      } catch (err) {
        console.error('❌ Error accessing camera:', err)
        if (err instanceof DOMException) {
          if (err.name === 'NotAllowedError') {
            console.error('🚫 Camera permission denied by user')
          } else if (err.name === 'NotFoundError') {
            console.error('📹 No camera device found')
          } else if (err.name === 'NotReadableError') {
            console.error('📹 Camera is being used by another application')
          }
        }
      }
    }

    initCamera()

    return () => {
      // Only cleanup on unmount, not on every state change
      console.log('🔄 Component cleanup triggered')
    }
  }, []) // Remove dependencies to prevent re-initialization

  // Cleanup effect for unmount only
  useEffect(() => {
    return () => {
      console.log('🧹 Component unmounting - full cleanup')
      if (streamRef.current) {
        console.log('🧹 Stopping camera stream')
        streamRef.current.getTracks().forEach(track => {
          track.stop()
          console.log(`⏹️ Stopped ${track.kind} track`)
        })
      }
      
      // Cleanup recording resources
      if (mediaRecorderRef.current) {
        console.log('🛑 Stopping recording due to unmount')
        try {
          mediaRecorderRef.current.stop()
        } catch (e) {
          console.log('Recording already stopped:', e)
        }
      }
      
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current)
      }
      
      if (screenStream) {
        console.log('🧹 Cleaning up screen stream')
        screenStream.getTracks().forEach(track => track.stop())
      }
      
      if (downloadUrl) {
        URL.revokeObjectURL(downloadUrl)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Intentionally empty - only cleanup on unmount, not on state changes

  const getScreenStream = async () => {
    try {
      console.log('🖥️ Requesting screen capture...')
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 30 }
        },
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          sampleRate: 44100
        }
      })
      
      // Listen for when user stops screen sharing
      displayStream.getVideoTracks()[0].addEventListener('ended', () => {
        console.log('🚫 Screen sharing ended by user')
        if (isRecording && (recordingSource === 'screen' || recordingSource === 'both')) {
          console.log('⏹️ Auto-stopping recording due to screen share end')
          handleStopRecording()
        }
        setScreenStream(null)
      })
      
      setScreenStream(displayStream)
      console.log('✅ Screen capture started')
      return displayStream
          } catch (error) {
        console.error('Error accessing screen:', error)
        if (error instanceof DOMException) {
          if (error.name === 'NotAllowedError') {
            throw new Error('Screen sharing permission denied')
          } else if (error.name === 'AbortError') {
            throw new Error('Screen sharing cancelled by user')
          }
        }
        throw error
      }
  }

  const combineStreams = (cameraStream: MediaStream, screenStream: MediaStream) => {
    console.log('🔄 Combining camera and screen streams...')
    
    // Create a new MediaStream that combines both streams
    const combinedStream = new MediaStream()
    
    // Add screen video track (primary for recording)
    const screenVideoTracks = screenStream.getVideoTracks()
    console.log(`📹 Adding ${screenVideoTracks.length} screen video track(s)`)
    screenVideoTracks.forEach(track => {
      combinedStream.addTrack(track)
    })
    
    // Add camera audio track (usually better quality than screen audio)
    const cameraAudioTracks = cameraStream.getAudioTracks()
    console.log(`🎤 Adding ${cameraAudioTracks.length} camera audio track(s)`)
    cameraAudioTracks.forEach(track => {
      combinedStream.addTrack(track)
    })
    
    // Also add screen audio if available (system sounds)
    const screenAudioTracks = screenStream.getAudioTracks()
    if (screenAudioTracks.length > 0) {
      console.log(`🔊 Adding ${screenAudioTracks.length} screen audio track(s)`)
      screenAudioTracks.forEach(track => {
        combinedStream.addTrack(track)
      })
    } else {
      console.log('🔇 No screen audio tracks available')
    }
    
    console.log(`✅ Combined stream created with ${combinedStream.getTracks().length} total tracks`)
    return combinedStream
  }

  const handleStartRecording = async () => {
    console.log('🚀 START RECORDING FUNCTION CALLED')
    console.log('📊 Current state:', { 
      recordingSource, 
      isRecording, 
      hasCamera: !!streamRef.current,
      cameraStream: streamRef.current?.getTracks().length || 0
    })
    
    // Early exit if already recording
    if (isRecording) {
      console.log('⚠️ Already recording, ignoring start request')
      return
    }
    
    try {
      let recordingStream: MediaStream | null = null

      // Clear previous recording
      setRecordedChunks([])
      setDownloadUrl(null)
      setRecordingDuration(0)
      
      console.log('🧹 Previous recording cleared')

      // Get the appropriate stream based on recording source
      switch (recordingSource) {
        case 'camera':
          if (!streamRef.current) {
            alert('❌ Camera not available. Please ensure camera permissions are granted.')
            return
          }
          recordingStream = streamRef.current
          console.log('📹 Recording camera stream')
          break
          
        case 'screen':
          try {
            recordingStream = await getScreenStream()
            console.log('🖥️ Recording screen stream')
          } catch (error) {
            console.error('Screen capture error:', error)
            alert('❌ Screen capture failed. Please try again and allow screen sharing.')
            return
          }
          break
          
        case 'both':
          if (!streamRef.current) {
            alert('❌ Camera not available. Please ensure camera permissions are granted.')
            return
          }
          
          try {
            const screenStreamForBoth = await getScreenStream()
            recordingStream = combineStreams(streamRef.current, screenStreamForBoth)
            console.log('📹🖥️ Recording both camera and screen')
          } catch (error) {
            console.error('Screen capture error for both mode:', error)
            alert('❌ Screen capture failed. Recording camera only instead.')
            recordingStream = streamRef.current
          }
          break
      }

      if (!recordingStream) {
        alert('❌ No recording stream available. Please check your camera and screen permissions.')
        return
      }

      // Check if MediaRecorder is supported
      console.log('🔍 Checking MediaRecorder support...')
      console.log('📝 MediaRecorder available:', typeof MediaRecorder !== 'undefined')
      console.log('🧪 isTypeSupported method:', typeof MediaRecorder.isTypeSupported)
      
      if (typeof MediaRecorder === 'undefined') {
        alert('❌ MediaRecorder not available in this browser. Please use Chrome, Firefox, or Safari.')
        return
      }
      
      if (!MediaRecorder.isTypeSupported || typeof MediaRecorder.isTypeSupported !== 'function') {
        alert('❌ Recording not supported in this browser. Please use Chrome, Firefox, or Safari.')
        return
      }

      // Use the best format the browser supports
      console.log('🎭 Getting optimal recording format...')
      const bestFormat = videoExporter.getBestRecordingFormat()
      const mimeType = bestFormat.mimeType
      
      console.log(`🎬 Selected recording format: ${mimeType} (${bestFormat.format})`)
      
      // Set quality options based on format
      let options: MediaRecorderOptions = { mimeType }
      
      if (bestFormat.format === 'mp4') {
        options = {
          mimeType,
          videoBitsPerSecond: 3000000, // Higher quality for MP4
          audioBitsPerSecond: 128000
        }
      } else {
        options = {
          mimeType,
          videoBitsPerSecond: 2500000,
          audioBitsPerSecond: 128000
        }
      }
      
      // Log supported formats for debugging
      const supportedFormats = videoExporter.getSupportedRecordingFormats()
      console.log('📋 Browser supports recording in:', supportedFormats)

      console.log('🎬 Creating MediaRecorder with:', mimeType, options)
      console.log('📊 Recording stream details:', {
        tracks: recordingStream.getTracks().length,
        video: recordingStream.getVideoTracks().length,
        audio: recordingStream.getAudioTracks().length,
        active: recordingStream.active
      })

      let mediaRecorder: MediaRecorder
      try {
        mediaRecorder = new MediaRecorder(recordingStream, options)
        console.log('✅ MediaRecorder created successfully')
      } catch (mediaRecorderError) {
        console.error('❌ Failed to create MediaRecorder:', mediaRecorderError)
        alert(`❌ Failed to create recorder: ${mediaRecorderError instanceof Error ? mediaRecorderError.message : 'Unknown error'}`)
        return
      }
      mediaRecorderRef.current = mediaRecorder
      setRecordedMimeType(mimeType)
      const chunks: Blob[] = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data)
          console.log('📦 Recorded chunk:', event.data.size, 'bytes')
        }
      }

      mediaRecorder.onstop = () => {
        console.log('⏹️ Recording stopped, processing', chunks.length, 'chunks')
        const blob = new Blob(chunks, { type: mimeType })
        const url = URL.createObjectURL(blob)
        setDownloadUrl(url)
        setRecordedChunks(chunks)
        console.log('✅ Recording ready for download:', blob.size, 'bytes')
      }

      mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event)
        alert('❌ Recording error occurred. Please try again.')
        setIsRecording(false)
      }

      // Start recording with data interval
      console.log('▶️ Attempting to start MediaRecorder...')
      try {
        mediaRecorder.start(1000) // Collect data every second
        console.log('✅ MediaRecorder.start() called successfully')
        setIsRecording(true)

        // Start recording timer
        recordingTimerRef.current = setInterval(() => {
          setRecordingDuration(prev => prev + 1)
        }, 1000)

        console.log(`✅ Recording started - Source: ${recordingSource}`)
        console.log('🎯 Recording state should now be true:', true)
      } catch (startError) {
        console.error('❌ Failed to start recording:', startError)
        alert(`❌ Failed to start recording: ${startError instanceof Error ? startError.message : 'Unknown error'}`)
        return
      }
      
    } catch (error) {
      console.error('Error starting recording:', error)
      alert(`❌ Recording failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      setIsRecording(false)
    }
  }

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      try {
        console.log('🛑 User requested stop recording...')
        mediaRecorderRef.current.stop()
        setIsRecording(false)

        // Stop timer
        if (recordingTimerRef.current) {
          clearInterval(recordingTimerRef.current)
          recordingTimerRef.current = null
        }

        // Clean up screen stream if it was used
        if (screenStream) {
          console.log('🧹 Cleaning up screen stream')
          screenStream.getTracks().forEach(track => {
            track.stop()
            console.log('⏹️ Stopped screen track:', track.kind)
          })
          setScreenStream(null)
        }

        console.log('✅ Recording stopped successfully')
      } catch (error) {
        console.error('Error stopping recording:', error)
        setIsRecording(false)
        if (recordingTimerRef.current) {
          clearInterval(recordingTimerRef.current)
          recordingTimerRef.current = null
        }
      }
    } else {
      console.log('⚠️ Stop recording called but not currently recording')
    }
  }

  const downloadRecording = async (format?: ExportFormat) => {
    if (!downloadUrl) return

    const targetFormat = format || exportFormat
    
    try {
      if (!recordedChunks.length) {
        // Direct download if no chunks available
        const formatInfo = videoExporter.getFormatInfo(targetFormat)
        videoExporter.downloadVideo(
          await fetch(downloadUrl).then(r => r.blob()),
          targetFormat,
          `video-presentation-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.${formatInfo.extension}`
        )
        return
      }

      // Create blob from recorded chunks
      const originalBlob = new Blob(recordedChunks, { type: recordedMimeType })
      
      // Check if conversion is needed
      if (videoExporter.needsConversion(recordedMimeType, targetFormat)) {
        console.log(`🎬 Converting to ${targetFormat.toUpperCase()}...`)
        setIsConverting(true)
        setConversionProgress({ progress: 0, stage: 'Preparing conversion...' })

        // Convert video
        const convertedBlob = await videoExporter.convertToFormat(
          originalBlob,
          targetFormat,
          (progress: ConversionProgress) => {
            setConversionProgress(progress)
          }
        )

        // Download converted file
        videoExporter.downloadVideo(convertedBlob, targetFormat)
        console.log(`✅ ${targetFormat.toUpperCase()} conversion and download complete!`)
      } else {
        // Direct download without conversion
        videoExporter.downloadVideo(originalBlob, targetFormat)
        console.log(`✅ ${targetFormat.toUpperCase()} download complete!`)
      }
    } catch (error) {
      console.error('❌ Download/conversion failed:', error)
      alert(`❌ Failed to download ${targetFormat.toUpperCase()}: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsConverting(false)
      setConversionProgress(null)
    }
  }

  const clearRecording = () => {
    if (downloadUrl) {
      URL.revokeObjectURL(downloadUrl)
    }
    setDownloadUrl(null)
    setRecordedChunks([])
    setRecordingDuration(0)
  }

  const handlePictureInPicture = async () => {
    try {
      if (videoRef.current) {
        // Check if Picture-in-Picture is supported
        if (!document.pictureInPictureEnabled) {
          console.warn('Picture-in-Picture is not supported in this browser')
          return
        }

        // Check if already in PIP mode
        if (document.pictureInPictureElement) {
          await document.exitPictureInPicture()
        } else {
          const video = videoRef.current
          
          // If it's not a circle, use simple PIP
          if (settings.shape !== 'circle') {
            await video.requestPictureInPicture()
            return
          }

          // For circle shape, create a canvas with circular clipping
          const canvas = document.createElement('canvas')
          const ctx = canvas.getContext('2d', { alpha: true })
          if (!ctx) {
            // Fallback to regular PIP if canvas fails
            await video.requestPictureInPicture()
            return
          }

          // Set square canvas size for circle with high DPI support
          const size = 400 // Increased size for better quality
          const dpr = window.devicePixelRatio || 1
          canvas.width = size * dpr
          canvas.height = size * dpr
          canvas.style.width = size + 'px'
          canvas.style.height = size + 'px'
          
          // Scale context for high DPI
          ctx.scale(dpr, dpr)
          
          // Enable anti-aliasing
          ctx.imageSmoothingEnabled = true
          ctx.imageSmoothingQuality = 'high'

          // Create a video element for the canvas stream
          const pipVideo = document.createElement('video')
          pipVideo.muted = true
          pipVideo.playsInline = true

          // Function to draw circular video frame
          const drawFrame = () => {
            // Clear with transparent background
            ctx.clearRect(0, 0, size, size)
            
            // First, draw the video in a circle
            ctx.save()
            ctx.beginPath()
            ctx.arc(size / 2, size / 2, size / 2 - 8, 0, 2 * Math.PI)
            ctx.clip()
            
            // Draw video frame (even if not fully loaded)
            try {
              ctx.drawImage(video, 0, 0, size, size)
            } catch {
              // If video can't be drawn, create a subtle circle instead of black rectangle
              ctx.fillStyle = settings.color + '20' // Very transparent color
              ctx.fill()
            }
            ctx.restore()
            
            // Draw clean circular border
            ctx.strokeStyle = settings.color
            ctx.lineWidth = 8
            ctx.lineCap = 'round'
            ctx.beginPath()
            ctx.arc(size / 2, size / 2, size / 2 - 4, 0, 2 * Math.PI)
            ctx.stroke()
            
            // Continue animation while PIP is active
            if (document.pictureInPictureElement === pipVideo) {
              requestAnimationFrame(drawFrame)
            }
          }

          // Get stream from canvas and set up PIP video
          const stream = canvas.captureStream(30)
          pipVideo.srcObject = stream
          
          // Start the animation loop immediately
          const startAnimation = () => {
            drawFrame()
          }
          
          // Start drawing and PIP
          startAnimation()
          await pipVideo.play()
          await pipVideo.requestPictureInPicture()
          
          // Ensure animation continues after PIP starts
          setTimeout(startAnimation, 100)
        }
      }
    } catch (error) {
      console.error('Error toggling Picture-in-Picture:', error)
      // Fallback to simple PIP if shaped PIP fails
      if (videoRef.current) {
        try {
          await videoRef.current.requestPictureInPicture()
        } catch (fallbackError) {
          console.error('Fallback PIP also failed:', fallbackError)
        }
      }
    }
  }

  const handleToggleTeleprompter = () => {
    setIsTeleprompterVisible(!isTeleprompterVisible)
  }

  const handleToggleCameraPopup = () => {
    if (isCameraPopupOpen) {
      // Close popup
      if (cameraPopupRef.current) {
        cameraPopupRef.current.close()
        cameraPopupRef.current = null
      }
      setIsCameraPopupOpen(false)
    } else {
      // Open popup
      openCameraPopup()
    }
  }

  const handleToggleSidebar = useCallback(() => {
    setIsSidebarVisible(!isSidebarVisible)
  }, [isSidebarVisible])

  const handleAddNote = () => {
    videoCanvasRef.current?.addNote()
  }

  const openCameraPopup = () => {
    const popup = window.open(
      '',
      'camera-popup',
      'width=400,height=300,left=100,top=100,toolbar=no,menubar=no,scrollbars=no,resizable=yes'
    )

    if (popup) {
      cameraPopupRef.current = popup
      setIsCameraPopupOpen(true)

      // Create the popup content
      popup.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Camera View</title>
          <style>
            body {
              margin: 0;
              padding: 0;
              background: #000;
              overflow: hidden;
              display: flex;
              align-items: center;
              justify-content: center;
              height: 100vh;
            }
            video {
              width: 100%;
              height: 100%;
              object-fit: cover;
            }
            .controls {
              position: fixed;
              top: 10px;
              right: 10px;
              background: rgba(0,0,0,0.8);
              padding: 8px;
              border-radius: 6px;
              display: flex;
              gap: 8px;
            }
            button {
              background: #333;
              color: white;
              border: none;
              padding: 6px 10px;
              border-radius: 4px;
              cursor: pointer;
              font-size: 12px;
            }
            button:hover {
              background: #555;
            }
            .recording-indicator {
              position: fixed;
              top: 10px;
              left: 10px;
              background: rgba(220, 38, 38, 0.2);
              border: 1px solid rgba(220, 38, 38, 0.5);
              padding: 6px 10px;
              border-radius: 4px;
              font-size: 11px;
              color: #fca5a5;
              display: ${isRecording ? 'flex' : 'none'};
              align-items: center;
              gap: 6px;
            }
            .pulse {
              width: 6px;
              height: 6px;
              background: #dc2626;
              border-radius: 50%;
              animation: pulse 1s infinite;
            }
            @keyframes pulse {
              0%, 100% { opacity: 1; }
              50% { opacity: 0.3; }
            }
          </style>
        </head>
        <body>
          <div class="recording-indicator">
            <div class="pulse"></div>
            🔴 RECORDING
          </div>
          <div class="controls">
            <button onclick="togglePiP()">📺 PiP</button>
            <button onclick="window.close()">✕ Close</button>
          </div>
          <video id="popup-video" autoplay playsinline muted></video>
          <script>
            function togglePiP() {
              const video = document.getElementById('popup-video');
              if (document.pictureInPictureElement) {
                document.exitPictureInPicture();
              } else {
                video.requestPictureInPicture();
              }
            }
            
            // Handle window closing
            window.addEventListener('beforeunload', function() {
              window.opener.postMessage('camera-popup-closing', '*');
            });
          </script>
        </body>
        </html>
      `)
      popup.document.close()

      // Set up the video stream in the popup
      const popupVideo = popup.document.getElementById('popup-video') as HTMLVideoElement
      if (popupVideo && streamRef.current) {
        popupVideo.srcObject = streamRef.current
      }

      // Listen for popup closing
      const checkClosed = setInterval(() => {
        if (popup.closed) {
          setIsCameraPopupOpen(false)
          cameraPopupRef.current = null
          clearInterval(checkClosed)
        }
      }, 1000)

      // Handle messages from popup
      window.addEventListener('message', (event) => {
        if (event.data === 'camera-popup-closing') {
          setIsCameraPopupOpen(false)
          cameraPopupRef.current = null
        }
      })
    }
  }

  // Update popup video stream when it changes
  useEffect(() => {
    if (cameraPopupRef.current && streamRef.current) {
      const popupVideo = cameraPopupRef.current.document.getElementById('popup-video') as HTMLVideoElement
      if (popupVideo) {
        popupVideo.srcObject = streamRef.current
      }
    }
  }, [])

  // Update recording indicator in popup
  useEffect(() => {
    if (cameraPopupRef.current) {
      const indicator = cameraPopupRef.current.document.querySelector('.recording-indicator') as HTMLElement
      if (indicator) {
        indicator.style.display = isRecording ? 'flex' : 'none'
      }
    }
  }, [isRecording])

  // Keyboard shortcut for toggling sidebar
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      // Toggle sidebar with Tab key (but not when focused on input elements)
      if (event.key === 'Tab' && event.target instanceof Element && !event.target.matches('input, textarea, select')) {
        event.preventDefault()
        handleToggleSidebar()
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [handleToggleSidebar])



  return (
    <div className="h-full flex flex-col bg-gray-900 overflow-hidden">
      <TopBar />
      
      <div className="flex-1 flex min-h-0">
        {/* Main video area */}
        <div className="flex-1 relative overflow-hidden">
          <VideoCanvas
            ref={videoCanvasRef}
            videoRef={videoRef}
            settings={settings}
            onSettingsChange={setSettings}
            isRecording={isRecording}
            isPictureInPicture={isPictureInPicture}
          />
          
          {/* Sidebar toggle button - positioned near sidebar edge */}
          <button
            onClick={handleToggleSidebar}
            className={`fixed top-20 right-4 z-50 p-3 rounded-lg shadow-xl transition-all duration-300 ${
              isSidebarVisible 
                ? 'bg-white hover:bg-gray-50 text-gray-900 border border-gray-200' 
                : 'bg-blue-600 hover:bg-blue-700 text-white border border-blue-500'
            }`}
            title={isSidebarVisible ? t.hideSidebar : t.showSidebar}
          >
            <svg 
              className={`w-4 h-4 transition-transform duration-300 ${!isSidebarVisible ? 'rotate-180' : ''}`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={3} 
                d="M9 5l7 7-7 7" 
              />
            </svg>
          </button>
        </div>

        {/* Controls panel - conditionally shown */}
        {isSidebarVisible && (
          <div className="flex-shrink-0 animate-in slide-in-from-right duration-200">
            <ControlsPanel
              settings={settings}
              onSettingsChange={setSettings}
              isRecording={isRecording}
              recordingSource={recordingSource}
              onRecordingSourceChange={setRecordingSource}
              onStartRecording={handleStartRecording}
              onStopRecording={handleStopRecording}
              recordingDuration={recordingDuration}
              downloadUrl={downloadUrl}
              onDownloadRecording={downloadRecording}
              onClearRecording={clearRecording}
              recordedMimeType={recordedMimeType}
              onPictureInPicture={handlePictureInPicture}
              onToggleTeleprompter={handleToggleTeleprompter}
              onToggleCameraPopup={handleToggleCameraPopup}
              onAddNote={handleAddNote}
              exportFormat={exportFormat}
              onExportFormatChange={setExportFormat}
              isConverting={isConverting}
              conversionProgress={conversionProgress}
            />
          </div>
        )}
      </div>

      {/* Teleprompter */}
      <Teleprompter
        isVisible={isTeleprompterVisible}
        onToggleVisibility={handleToggleTeleprompter}
        isRecording={isRecording}
        recordingSource={recordingSource}
      />
    </div>
  )
} 