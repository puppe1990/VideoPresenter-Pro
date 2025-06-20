'use client'

import { useState, useRef, useEffect } from 'react'
import VideoCanvas from './VideoCanvas'
import ControlsPanel from './ControlsPanel'
import TopBar from './TopBar'
import Teleprompter from './Teleprompter'


export interface PresenterSettings {
  backgroundType: 'visible' | 'blurred' | 'hidden'
  shape: 'rectangle' | 'circle' | 'rounded'
  color: string
  virtualBackground: string | null
  showPointer: boolean
  size: 'small' | 'medium' | 'large' | 'xlarge'
  position: { x: number; y: number }
  isDragging: boolean
}

export type RecordingSource = 'camera' | 'screen' | 'both'

export default function VideoPresenter() {
  const [isRecording, setIsRecording] = useState(false)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [recordedChunks, setRecordedChunks] = useState<Blob[]>([])
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null)
  const [recordingDuration, setRecordingDuration] = useState(0)
  const [recordedMimeType, setRecordedMimeType] = useState<string>('')
  const [recordingSource, setRecordingSource] = useState<RecordingSource>('camera')
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null)
  const [isTeleprompterVisible, setIsTeleprompterVisible] = useState(false)
  const [isCameraPopupOpen, setIsCameraPopupOpen] = useState(false)
  const [settings, setSettings] = useState<PresenterSettings>({
    backgroundType: 'visible',
    shape: 'rectangle',
    color: '#10b981',
    virtualBackground: null,
    showPointer: true,
    size: 'medium',
    position: { x: 16, y: 16 },
    isDragging: false,
  })

  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null)
  const cameraPopupRef = useRef<Window | null>(null)

  useEffect(() => {
    // Initialize camera
    async function initCamera() {
      try {
        console.log('Requesting camera access...')
        
        // Check if getUserMedia is supported
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          console.error('getUserMedia is not supported in this browser')
          return
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { 
            width: { ideal: 1280 }, 
            height: { ideal: 720 },
            facingMode: 'user'
          },
          audio: true,
        })
        
        console.log('Camera access granted, stream:', stream)
        streamRef.current = stream
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          console.log('Video stream assigned to video element')
        }
      } catch (err) {
        console.error('Error accessing camera:', err)
        if (err instanceof Error) {
          console.error('Error details:', err.message)
        }
      }
    }

    initCamera()

    return () => {
      if (streamRef.current) {
        console.log('Stopping camera stream')
        streamRef.current.getTracks().forEach(track => track.stop())
      }
      
      // Cleanup recording resources
      if (mediaRecorderRef.current && isRecording) {
        mediaRecorderRef.current.stop()
      }
      
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current)
      }
      
      if (screenStream) {
        screenStream.getTracks().forEach(track => track.stop())
      }
      
      if (downloadUrl) {
        URL.revokeObjectURL(downloadUrl)
      }
    }
  }, [downloadUrl, isRecording, screenStream])

  const getScreenStream = async () => {
    try {
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 30 }
        },
        audio: true // Include system audio
      })
      
      setScreenStream(displayStream)
      return displayStream
    } catch (error) {
      console.error('Error accessing screen:', error)
      throw error
    }
  }

  const combineStreams = (cameraStream: MediaStream, screenStream: MediaStream) => {
    // Create a new MediaStream that combines both streams
    // For recording purposes, we'll use the screen stream as primary
    // but keep the camera stream visible in the UI
    const combinedStream = new MediaStream()
    
    // Add screen video track (primary for recording)
    screenStream.getVideoTracks().forEach(track => {
      combinedStream.addTrack(track)
    })
    
    // Add both audio tracks if available
    cameraStream.getAudioTracks().forEach(track => {
      combinedStream.addTrack(track)
    })
    screenStream.getAudioTracks().forEach(track => {
      combinedStream.addTrack(track)
    })
    
    return combinedStream
  }

  const handleStartRecording = async () => {
    try {
      let recordingStream: MediaStream | null = null

      // Clear previous recording
      setRecordedChunks([])
      setDownloadUrl(null)
      setRecordingDuration(0)

      // Get the appropriate stream based on recording source
      switch (recordingSource) {
        case 'camera':
          if (!streamRef.current) {
            console.error('No camera stream available for recording')
            return
          }
          recordingStream = streamRef.current
          break
          
        case 'screen':
          recordingStream = await getScreenStream()
          break
          
        case 'both':
          if (!streamRef.current) {
            console.error('No camera stream available for recording')
            return
          }
          const screenStreamForBoth = await getScreenStream()
          recordingStream = combineStreams(streamRef.current, screenStreamForBoth)
          // Keep camera stream visible in UI - don't change videoRef.current.srcObject
          // The recording will use the combined stream, but UI shows camera
          break
      }

      if (!recordingStream) {
        console.error('No recording stream available')
        return
      }

      // Create MediaRecorder with the selected stream
      let mimeType = 'video/webm; codecs=vp9'
      
      // Check for MP4 support first, then fallback to WebM
      if (MediaRecorder.isTypeSupported('video/mp4; codecs=h264')) {
        mimeType = 'video/mp4; codecs=h264'
      } else if (MediaRecorder.isTypeSupported('video/webm; codecs=vp9')) {
        mimeType = 'video/webm; codecs=vp9'
      } else if (MediaRecorder.isTypeSupported('video/webm; codecs=vp8')) {
        mimeType = 'video/webm; codecs=vp8'
      } else {
        mimeType = 'video/webm'
      }

      const mediaRecorder = new MediaRecorder(recordingStream, {
        mimeType,
        videoBitsPerSecond: 2500000, // 2.5 Mbps for good quality
        audioBitsPerSecond: 128000   // 128 kbps for audio
      })

      mediaRecorderRef.current = mediaRecorder
      setRecordedMimeType(mimeType)
      const chunks: Blob[] = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: mimeType })
        const url = URL.createObjectURL(blob)
        setDownloadUrl(url)
        setRecordedChunks(chunks)
      }

      mediaRecorder.start()
      setIsRecording(true)

      // Start recording timer
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1)
      }, 1000)

      console.log(`Recording started - Source: ${recordingSource}`)
    } catch (error) {
      console.error('Error starting recording:', error)
    }
  }

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)

      // Stop timer
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current)
        recordingTimerRef.current = null
      }

      console.log('Recording stopped')
    }
  }

  const downloadRecording = () => {
    if (downloadUrl) {
      const a = document.createElement('a')
      a.href = downloadUrl
      
      // Determine file extension based on MIME type
      const fileExtension = recordedMimeType.includes('mp4') ? 'mp4' : 'webm'
      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-')
      a.download = `video-presentation-${timestamp}.${fileExtension}`
      
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
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
  }, [streamRef.current])

  // Update recording indicator in popup
  useEffect(() => {
    if (cameraPopupRef.current) {
      const indicator = cameraPopupRef.current.document.querySelector('.recording-indicator') as HTMLElement
      if (indicator) {
        indicator.style.display = isRecording ? 'flex' : 'none'
      }
    }
  }, [isRecording])



  return (
    <div className="h-screen flex flex-col bg-gray-900">
      <TopBar />
      
      <div className="flex-1 flex">
        {/* Main video area */}
        <div className="flex-1 relative">
          <VideoCanvas
            videoRef={videoRef}
            settings={settings}
            onSettingsChange={setSettings}
            isRecording={isRecording}
          />
        </div>

        {/* Controls panel */}
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
        />
      </div>

      {/* Teleprompter - positioned outside the recording area */}
      <Teleprompter
        isVisible={isTeleprompterVisible}
        onToggleVisibility={handleToggleTeleprompter}
        isRecording={isRecording}
      />
    </div>
  )
} 