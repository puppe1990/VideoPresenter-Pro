'use client'

import { useState, useRef, useEffect } from 'react'
import VideoCanvas from './VideoCanvas'
import ControlsPanel from './ControlsPanel'
import TopBar from './TopBar'


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
  const [settings, setSettings] = useState<PresenterSettings>({
    backgroundType: 'visible',
    shape: 'rectangle',
    color: '#10b981',
    virtualBackground: null,
    showPointer: true,
    size: 'medium',
    position: { x: 0, y: 0 },
    isDragging: false,
  })

  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null)

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
  }, [])

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
    // For now, prioritize screen stream when recording both
    // In a more advanced implementation, you could combine them into a picture-in-picture layout
    return screenStream
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
        />
      </div>
    </div>
  )
} 