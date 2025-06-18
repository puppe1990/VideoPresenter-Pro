'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { PresenterSettings } from './VideoPresenter'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Move } from 'lucide-react'

interface VideoCanvasProps {
  videoRef: React.RefObject<HTMLVideoElement>
  settings: PresenterSettings
  onSettingsChange: (settings: PresenterSettings) => void
  isRecording: boolean
}

export default function VideoCanvas({ videoRef, settings, onSettingsChange, isRecording }: VideoCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const videoContainerRef = useRef<HTMLDivElement>(null)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })

  // Drag functionality
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    const rect = videoContainerRef.current?.getBoundingClientRect()
    if (rect) {
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      })
      onSettingsChange({ ...settings, isDragging: true })
    }
  }, [settings, onSettingsChange])

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!settings.isDragging || !containerRef.current) return
    
    const containerRect = containerRef.current.getBoundingClientRect()
    const newX = e.clientX - containerRect.left - dragOffset.x
    const newY = e.clientY - containerRect.top - dragOffset.y
    
    // Clamp position to container bounds
    const maxX = containerRect.width - (videoContainerRef.current?.offsetWidth || 0)
    const maxY = containerRect.height - (videoContainerRef.current?.offsetHeight || 0)
    
    const clampedX = Math.max(0, Math.min(newX, maxX))
    const clampedY = Math.max(0, Math.min(newY, maxY))
    
    onSettingsChange({
      ...settings,
      position: { x: clampedX, y: clampedY }
    })
  }, [settings, onSettingsChange, dragOffset])

  const handleMouseUp = useCallback(() => {
    if (settings.isDragging) {
      onSettingsChange({ ...settings, isDragging: false })
    }
  }, [settings, onSettingsChange])

  // Add global mouse event listeners for dragging
  useEffect(() => {
    if (settings.isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [settings.isDragging, handleMouseMove, handleMouseUp])

  useEffect(() => {
    const canvas = canvasRef.current
    const video = videoRef.current
    if (!canvas || !video) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationFrame: number

    const drawFrame = () => {
      if (video.readyState < 2) { // HAVE_CURRENT_DATA
        animationFrame = requestAnimationFrame(drawFrame)
        return
      }

      if (video.videoWidth === 0 || video.videoHeight === 0) {
        animationFrame = requestAnimationFrame(drawFrame)
        return
      }

      // Set canvas size to match video and settings
      const aspectRatio = video.videoWidth / video.videoHeight
      
      // Get max dimensions based on size setting
      let maxWidth: number, maxHeight: number
      switch (settings.size) {
        case 'small':
          maxWidth = 384; maxHeight = 320; break  // max-w-sm max-h-80
        case 'medium':
          maxWidth = 672; maxHeight = 384; break  // max-w-2xl max-h-96
        case 'large':
          maxWidth = 896; maxHeight = 500; break  // max-w-4xl max-h-[500px]
        case 'xlarge':
          maxWidth = 1152; maxHeight = 600; break // max-w-6xl max-h-[600px]
        default:
          maxWidth = 672; maxHeight = 384; break
      }
      
      let canvasWidth = maxWidth
      let canvasHeight = maxWidth / aspectRatio
      
      if (canvasHeight > maxHeight) {
        canvasHeight = maxHeight
        canvasWidth = maxHeight * aspectRatio
      }

      canvas.width = canvasWidth
      canvas.height = canvasHeight

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Apply background blur if needed
      if (settings.backgroundType === 'blurred') {
        ctx.filter = 'blur(10px)'
      } else {
        ctx.filter = 'none'
      }

      // Draw video
      if (settings.backgroundType !== 'hidden') {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      } else {
        // For hidden background, just draw a solid color
        ctx.fillStyle = settings.color
        ctx.fillRect(0, 0, canvas.width, canvas.height)
      }

      animationFrame = requestAnimationFrame(drawFrame)
    }

    const handleLoadedData = () => {
      console.log('Video loaded, starting animation')
      drawFrame()
    }

    video.addEventListener('loadeddata', handleLoadedData)
    video.addEventListener('canplay', handleLoadedData)
    
    // Start immediately if video is already loaded
    if (video.readyState >= 2) {
      drawFrame()
    }

    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame)
      }
      video.removeEventListener('loadeddata', handleLoadedData)
      video.removeEventListener('canplay', handleLoadedData)
    }
  }, [videoRef, settings])

  const getShapeClass = () => {
    switch (settings.shape) {
      case 'circle':
        return 'rounded-full aspect-square object-cover'
      case 'rounded':
        return 'rounded-xl'
      default:
        return 'rounded-lg'
    }
  }

  const getSizeClass = () => {
    switch (settings.size) {
      case 'small':
        return settings.shape === 'circle' ? 'w-40 h-40' : 'max-w-sm max-h-80'
      case 'medium':
        return settings.shape === 'circle' ? 'w-60 h-60' : 'max-w-2xl max-h-96'
      case 'large':
        return settings.shape === 'circle' ? 'w-80 h-80' : 'max-w-4xl max-h-[500px]'
      case 'xlarge':
        return settings.shape === 'circle' ? 'w-96 h-96' : 'max-w-6xl max-h-[600px]'
      default:
        return settings.shape === 'circle' ? 'w-60 h-60' : 'max-w-2xl max-h-96'
    }
  }

  const getBackgroundStyle = () => {
    // Professional gradient backgrounds
    const backgrounds = [
      // Modern dark gradient
      'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      // Soft blue gradient  
      'linear-gradient(135deg, #74b9ff 0%, #0984e3 100%)',
      // Professional dark
      'linear-gradient(135deg, #2d3748 0%, #1a202c 100%)',
      // Elegant purple
      'linear-gradient(135deg, #9f7aea 0%, #553c9a 100%)',
      // Clean minimal
      'linear-gradient(135deg, #f7fafc 0%, #edf2f7 100%)'
    ]
    
    // Use a subtle, professional gradient
    return {
      background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
      position: 'relative' as const
    }
  }

  return (
    <div 
      ref={containerRef}
      className="w-full h-full relative p-8 overflow-hidden"
      style={getBackgroundStyle()}
    >
      {/* Subtle overlay pattern for texture */}
      <div 
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='1'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          backgroundSize: '60px 60px'
        }}
      />
      {/* Virtual background overlay */}
      {settings.virtualBackground && (
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-30"
          style={{ 
            backgroundImage: settings.virtualBackground === 'space' 
              ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
              : settings.virtualBackground === 'office'
              ? 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)'
              : `url(${settings.virtualBackground})`
          }}
        />
      )}

      {/* Draggable Video container */}
      <div 
        ref={videoContainerRef}
        className={`absolute cursor-move ${settings.isDragging ? 'z-50' : 'z-10'}`}
        style={{ 
          left: settings.position.x === 0 && settings.position.y === 0 
            ? '50%' 
            : `${settings.position.x}px`, 
          top: settings.position.x === 0 && settings.position.y === 0 
            ? '50%' 
            : `${settings.position.y}px`,
          transform: settings.position.x === 0 && settings.position.y === 0 
            ? 'translate(-50%, -50%)' 
            : 'none'
        }}
        onMouseDown={handleMouseDown}
      >
        <div className={`relative overflow-hidden ${settings.isDragging ? 'scale-105' : ''} transition-all duration-200`}>
          <div className="relative">
            {/* Drag handle indicator */}
            {settings.isDragging && (
              <div className="absolute top-2 right-2 z-10">
                <Badge variant="secondary" className="flex items-center gap-1 text-xs">
                  <Move className="h-3 w-3" />
                  Drag
                </Badge>
              </div>
            )}

            {/* Camera loading placeholder */}
            <div className={`${getSizeClass()} ${getShapeClass()} bg-gray-800 flex items-center justify-center text-white text-sm absolute inset-0 z-0`}
                 style={{ border: `4px solid ${settings.color}` }}>
              <div className="text-center">
                <div className="animate-pulse mb-2">📹</div>
                <div>Camera Loading...</div>
              </div>
            </div>

            {/* Main video element */}
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className={`${getSizeClass()} ${getShapeClass()} transition-all duration-300 ease-in-out ${
                settings.isDragging ? 'pointer-events-none' : ''
              } bg-gray-800 relative z-10`}
              style={{
                border: `4px solid ${settings.color}`,
                filter: settings.backgroundType === 'blurred' ? 'blur(10px)' : 'none',
                display: settings.backgroundType === 'hidden' ? 'none' : 'block',
                minHeight: '200px',
                minWidth: '300px'
              }}
            />
            
            {/* Canvas for advanced effects (currently hidden while we debug) */}
            <canvas
              ref={canvasRef}
              className="hidden"
              style={{
                border: `4px solid ${settings.color}`,
              }}
            />
            
            {/* Recording indicator */}
            {isRecording && (
              <div className="absolute top-4 left-4">
                <Badge variant="destructive" className="flex items-center gap-2 px-3 py-1">
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                  REC
                </Badge>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* File drop area */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2">
        <Card className="bg-background/80 backdrop-blur-sm border-dashed">
          <div className="px-6 py-4 text-center">
            <p className="text-sm text-muted-foreground">
              Drag and drop files here
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              (.png, .jpg, .gif, .mp4, .pptx, .key)
            </p>
          </div>
        </Card>
      </div>
    </div>
  )
} 