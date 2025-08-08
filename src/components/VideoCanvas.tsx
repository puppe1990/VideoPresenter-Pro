'use client'

import React from 'react'
import { useEffect, useRef, useState, useCallback, forwardRef, useImperativeHandle } from 'react'
import Image from 'next/image'
import { PresenterSettings } from './VideoPresenter'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Move, Upload, FileImage, FileVideo, FileText, X, Copy, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react'
import DocumentViewer from './DocumentViewer'
import { BlurController } from '@/lib/blur/BlurController'
// import type { BlurStatus } from '@/lib/blur/types'

export interface VideoCanvasHandle {
  addNote: () => void
}

interface VideoCanvasProps {
  videoRef: React.RefObject<HTMLVideoElement | null>
  settings: PresenterSettings
  onSettingsChange: (settings: PresenterSettings) => void
  isRecording: boolean
  isPictureInPicture: boolean
  blurController?: BlurController
}

const VideoCanvas = forwardRef<VideoCanvasHandle, VideoCanvasProps>(function VideoCanvas({ videoRef, settings, onSettingsChange, isRecording, isPictureInPicture, blurController }, ref) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const videoContainerRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [isDragOver, setIsDragOver] = useState(false)
  const [boardItems, setBoardItems] = useState<BoardItem[]>([])
  const [selectedItem, setSelectedItem] = useState<string | null>(null)
  const [draggingItemId, setDraggingItemId] = useState<string | null>(null)
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [isResizing, setIsResizing] = useState(false)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [resizeHandle, setResizeHandle] = useState<string | null>(null)
  const [isVideoSelected, setIsVideoSelected] = useState(false)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [isVideoResizing, setIsVideoResizing] = useState(false)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [videoResizeHandle, setVideoResizeHandle] = useState<string | null>(null)
  const [customVideoSize, setCustomVideoSize] = useState<{ width: number; height: number } | null>(null)
  // Zoom functionality
  const [zoomLevel, setZoomLevel] = useState(1)
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState({ x: 0, y: 0 })
  const moveFrameRef = useRef<number | null>(null)

  interface BoardItem {
    id: string
    type: 'image' | 'video' | 'document' | 'note'
    src?: string
    content?: string
    fileName?: string
    x: number
    y: number
    width: number
    height: number
    rotation: number
    zIndex: number
  }

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
    
    // Calculate board bounds based on zoom level
    let maxX, maxY, minX, minY
    
    if (zoomLevel < 1) {
      // When zoomed out, allow camera to move across the entire expanded board space
      const expandedWidth = containerRect.width / zoomLevel
      const expandedHeight = containerRect.height / zoomLevel
      const videoWidth = videoContainerRef.current?.offsetWidth || 0
      const videoHeight = videoContainerRef.current?.offsetHeight || 0
      
      // Calculate the expanded board boundaries
      const boardOffsetX = -(expandedWidth - containerRect.width) / 2
      const boardOffsetY = -(expandedHeight - containerRect.height) / 2
      
      minX = boardOffsetX
      minY = boardOffsetY
      maxX = boardOffsetX + expandedWidth - videoWidth
      maxY = boardOffsetY + expandedHeight - videoHeight
    } else {
      // When zoomed in or at normal zoom, use original container bounds
      const videoWidth = videoContainerRef.current?.offsetWidth || 0
      const videoHeight = videoContainerRef.current?.offsetHeight || 0
      
      minX = 0
      minY = 0
      maxX = containerRect.width - videoWidth
      maxY = containerRect.height - videoHeight
    }
    
    const clampedX = Math.max(minX, Math.min(newX, maxX))
    const clampedY = Math.max(minY, Math.min(newY, maxY))
    
    onSettingsChange({
      ...settings,
      position: { x: clampedX, y: clampedY }
    })
  }, [settings, onSettingsChange, dragOffset, zoomLevel])

  const handleMouseUp = useCallback(() => {
    if (settings.isDragging) {
      onSettingsChange({ ...settings, isDragging: false })
    }
  }, [settings, onSettingsChange])

  // File handling functions
  const isValidFileType = (file: File) => {
    // Define comprehensive MIME types and extensions
    const validMimeTypes = [
      // Images
      'image/png',
      'image/jpeg', 
      'image/jpg',
      'image/gif',
      'image/webp', // Added WebP support
      // Videos
      'video/mp4',
      'video/webm', // Added WebM support
      'video/quicktime', // Added MOV support
      // Documents
      'application/pdf',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/vnd.apple.keynote',
      // Additional office formats
      'application/vnd.ms-powerpoint.presentation.macroEnabled.12',
      'application/vnd.oasis.opendocument.presentation'
    ]
    
    const validExtensions = [
      '.png', '.jpg', '.jpeg', '.gif', '.webp',
      '.mp4', '.webm', '.mov',
      '.pdf', '.pptx', '.key', '.ppt', '.odp'
    ]
    
    // Check file size limits (50MB for videos, 10MB for others)
    const maxSizeVideo = 50 * 1024 * 1024 // 50MB
    const maxSizeOther = 10 * 1024 * 1024 // 10MB
    const isVideo = file.type.startsWith('video/') || file.name.toLowerCase().match(/\.(mp4|webm|mov)$/i)
    const maxSize = isVideo ? maxSizeVideo : maxSizeOther
    
    if (file.size > maxSize) {
      const sizeMB = Math.round(file.size / (1024 * 1024))
      const maxSizeMB = Math.round(maxSize / (1024 * 1024))
      throw new Error(`File "${file.name}" is too large (${sizeMB}MB). Maximum size is ${maxSizeMB}MB.`)
    }
    
    // Check MIME type
    const hasValidMimeType = validMimeTypes.includes(file.type)
    
    // Check file extension as fallback
    const fileName = file.name.toLowerCase()
    const hasValidExtension = validExtensions.some(ext => fileName.endsWith(ext))
    
    return hasValidMimeType || hasValidExtension
  }

  const handleFiles = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files)
    const results = {
      processed: 0,
      skipped: 0,
      errors: [] as string[]
    }
    
    // Process each file individually to provide better error handling
    for (const file of fileArray) {
      try {
        if (!isValidFileType(file)) {
          results.errors.push(`"${file.name}" - Invalid file type`)
          results.skipped++
          continue
        }
        
        console.log('Processing file:', file.name, file.type, `${Math.round(file.size / 1024)}KB`)
        
        const fileUrl = URL.createObjectURL(file)
        
        // Determine file type with better detection
        let itemType: 'image' | 'video' | 'document' = 'image'
        
        if (file.type.startsWith('video/') || file.name.toLowerCase().match(/\.(mp4|webm|mov)$/i)) {
          itemType = 'video'
        } else if (
          file.type.includes('pdf') ||
          file.type.includes('powerpoint') ||
          file.type.includes('presentation') ||
          file.type.includes('keynote') ||
          file.name.toLowerCase().match(/\.(pdf|pptx?|key|odp)$/i)
        ) {
          itemType = 'document'
        }
        
        // Calculate board dimensions based on zoom level
        const container = containerRef.current
        const boardWidth = container ? (zoomLevel < 1 ? container.clientWidth / zoomLevel : container.clientWidth) : 800
        const boardHeight = container ? (zoomLevel < 1 ? container.clientHeight / zoomLevel : container.clientHeight) : 600
        
        // Better positioning - avoid overlapping with video
        const videoArea = {
          x: settings.position.x,
          y: settings.position.y,
          width: 320, // Approximate video width
          height: 240  // Approximate video height
        }
        
        let attempts = 0
        let x, y
        
        do {
          x = Math.random() * (boardWidth * 0.7) + boardWidth * 0.15
          y = Math.random() * (boardHeight * 0.7) + boardHeight * 0.15
          attempts++
        } while (
          attempts < 10 && 
          x < videoArea.x + videoArea.width && 
          x + 250 > videoArea.x && 
          y < videoArea.y + videoArea.height && 
          y + 180 > videoArea.y
        )
        
        const newItem: BoardItem = {
          id: `item-${Date.now()}-${Math.random()}`,
          type: itemType,
          src: fileUrl,
          fileName: file.name,
          x,
          y,
          width: itemType === 'image' ? 200 : itemType === 'video' ? 300 : 250,
          height: itemType === 'image' ? 150 : itemType === 'video' ? 200 : 180,
          rotation: 0,
          zIndex: boardItems.length + results.processed + 1
        }
        
        setBoardItems(prev => [...prev, newItem])
        results.processed++
        
      } catch (error) {
        console.error('Error processing file:', file.name, error)
        results.errors.push(`"${file.name}" - ${error instanceof Error ? error.message : 'Processing error'}`)
        results.skipped++
      }
    }
    
    // Provide comprehensive feedback to user
    if (results.processed === 0 && results.errors.length > 0) {
      // No files processed
      const errorMessage = results.errors.length === 1 
        ? results.errors[0]
        : `${results.errors.length} files had errors:\n${results.errors.slice(0, 3).join('\n')}${results.errors.length > 3 ? '\n...' : ''}`
      
      alert(`❌ No files could be processed.\n\n${errorMessage}\n\nSupported formats: .png, .jpg, .gif, .webp, .mp4, .webm, .pdf, .pptx, .key`)
    } else if (results.processed > 0) {
      // Some or all files processed
      let message = `✅ Successfully added ${results.processed} file${results.processed === 1 ? '' : 's'} to your board!`
      
      if (results.errors.length > 0) {
        message += `\n\n⚠️ ${results.errors.length} file${results.errors.length === 1 ? '' : 's'} skipped:\n${results.errors.slice(0, 2).join('\n')}${results.errors.length > 2 ? '\n...' : ''}`
      }
      
      // Show success message briefly
      const notification = document.createElement('div')
      notification.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 animate-fade-in'
      notification.textContent = `✅ Added ${results.processed} file${results.processed === 1 ? '' : 's'}!`
      document.body.appendChild(notification)
      
      setTimeout(() => {
        notification.remove()
      }, 3000)
      
      console.log(message)
    }
  }, [boardItems, zoomLevel, settings.position])

  // Drag and drop event handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    // Only show drag over state if files are being dragged
    if (e.dataTransfer.types.includes('Files')) {
      setIsDragOver(true)
    }
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    // Only hide drag over state if we're leaving the main container
    const rect = containerRef.current?.getBoundingClientRect()
    if (rect) {
      const isOutside = e.clientX < rect.left || e.clientX > rect.right || 
                       e.clientY < rect.top || e.clientY > rect.bottom
      if (isOutside) {
        setIsDragOver(false)
      }
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
    
    const files = e.dataTransfer.files
    if (files.length > 0) {
      handleFiles(files)
    }
  }, [handleFiles])

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleFiles(files)
    }
  }

  // Board item manipulation functions
  const handleItemMouseDown = useCallback((e: React.MouseEvent, itemId: string) => {
    e.preventDefault()
    e.stopPropagation()
    setSelectedItem(itemId)
    setDraggingItemId(itemId)
    
    const item = boardItems.find(item => item.id === itemId)
    if (!item) return
    
    const rect = containerRef.current?.getBoundingClientRect()
    if (rect) {
      const startX = e.clientX - rect.left - item.x
      const startY = e.clientY - rect.top - item.y
      
      const handleMouseMove = (e: MouseEvent) => {
        const newX = e.clientX - rect.left - startX
        const newY = e.clientY - rect.top - startY
        
        // Calculate board bounds based on zoom level for board items too
        let minX, minY, maxX, maxY
        
        if (zoomLevel < 1) {
          // When zoomed out, allow items to move across the entire expanded board space
          const expandedWidth = rect.width / zoomLevel
          const expandedHeight = rect.height / zoomLevel
          const itemWidth = item.width
          const itemHeight = item.height
          
          // Calculate the expanded board boundaries
          const boardOffsetX = -(expandedWidth - rect.width) / 2
          const boardOffsetY = -(expandedHeight - rect.height) / 2
          
          minX = boardOffsetX
          minY = boardOffsetY
          maxX = boardOffsetX + expandedWidth - itemWidth
          maxY = boardOffsetY + expandedHeight - itemHeight
        } else {
          // When zoomed in or at normal zoom, use more relaxed bounds
          minX = -item.width * 0.5 // Allow items to go slightly off-screen
          minY = -item.height * 0.5
          maxX = rect.width + item.width * 0.5
          maxY = rect.height + item.height * 0.5
        }
        
        const clampedX = Math.max(minX, Math.min(newX, maxX))
        const clampedY = Math.max(minY, Math.min(newY, maxY))

        if (moveFrameRef.current) {
          cancelAnimationFrame(moveFrameRef.current)
        }
        moveFrameRef.current = requestAnimationFrame(() => {
          setBoardItems(prev => prev.map(prevItem =>
            prevItem.id === itemId
              ? { ...prevItem, x: clampedX, y: clampedY }
              : prevItem
          ))
        })
      }

      const handleMouseUp = () => {
        if (moveFrameRef.current) {
          cancelAnimationFrame(moveFrameRef.current)
          moveFrameRef.current = null
        }
        setDraggingItemId(null)
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
      
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    }
  }, [boardItems, zoomLevel])

  const handleResizeMouseDown = useCallback((e: React.MouseEvent, itemId: string, handle: string) => {
    e.preventDefault()
    e.stopPropagation()
    setIsResizing(true)
    setResizeHandle(handle)
    setSelectedItem(itemId)
    
    const item = boardItems.find(item => item.id === itemId)
    if (!item) return
    
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    
    const startX = e.clientX
    const startY = e.clientY
    const startWidth = item.width
    const startHeight = item.height
    const startPosX = item.x
    const startPosY = item.y
    
    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - startX
      const deltaY = e.clientY - startY
      
      let newWidth = startWidth
      let newHeight = startHeight
      let newX = startPosX
      let newY = startPosY
      
      switch (handle) {
        case 'se': // Southeast
          newWidth = Math.max(50, startWidth + deltaX)
          newHeight = Math.max(50, startHeight + deltaY)
          break
        case 'sw': // Southwest
          newWidth = Math.max(50, startWidth - deltaX)
          newHeight = Math.max(50, startHeight + deltaY)
          newX = startPosX + (startWidth - newWidth)
          break
        case 'ne': // Northeast
          newWidth = Math.max(50, startWidth + deltaX)
          newHeight = Math.max(50, startHeight - deltaY)
          newY = startPosY + (startHeight - newHeight)
          break
        case 'nw': // Northwest
          newWidth = Math.max(50, startWidth - deltaX)
          newHeight = Math.max(50, startHeight - deltaY)
          newX = startPosX + (startWidth - newWidth)
          newY = startPosY + (startHeight - newHeight)
          break
      }
      
      setBoardItems(prev => prev.map(prevItem => 
        prevItem.id === itemId 
          ? { ...prevItem, width: newWidth, height: newHeight, x: newX, y: newY }
          : prevItem
      ))
    }
    
    const handleMouseUp = () => {
      setIsResizing(false)
      setResizeHandle(null)
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
    
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }, [boardItems])

  const deleteItem = useCallback((itemId: string) => {
    setBoardItems(prev => prev.filter(item => item.id !== itemId))
    setSelectedItem(null)
  }, [])

  const duplicateItem = useCallback((itemId: string) => {
    const item = boardItems.find(item => item.id === itemId)
    if (item) {
      // Calculate offset based on zoom level
      const offset = zoomLevel < 1 ? 50 / zoomLevel : 20 // Larger offset when zoomed out
      
      const newItem: BoardItem = {
        ...item,
        id: `item-${Date.now()}-${Math.random()}`,
        x: item.x + offset,
        y: item.y + offset,
        zIndex: Math.max(...boardItems.map(i => i.zIndex)) + 1
      }
      setBoardItems(prev => [...prev, newItem])
    }
  }, [boardItems, zoomLevel])

  const updateItemContent = useCallback((itemId: string, content: string) => {
    setBoardItems(prev => prev.map(item => item.id === itemId ? { ...item, content } : item))
  }, [])

  const addNote = useCallback((x?: number, y?: number) => {
    const rect = containerRef.current?.getBoundingClientRect()
    const boardWidth = rect ? (zoomLevel < 1 ? rect.width / zoomLevel : rect.width) : 800
    const boardHeight = rect ? (zoomLevel < 1 ? rect.height / zoomLevel : rect.height) : 600

    const posX = x !== undefined ? x : boardWidth / 2 - 100
    const posY = y !== undefined ? y : boardHeight / 2 - 75

    const newItem: BoardItem = {
      id: `note-${Date.now()}-${Math.random()}`,
      type: 'note',
      content: 'New Note',
      x: posX,
      y: posY,
      width: 200,
      height: 150,
      rotation: 0,
      zIndex: boardItems.length + 1
    }

    setBoardItems(prev => [...prev, newItem])
    setSelectedItem(newItem.id)
    setEditingNoteId(newItem.id)
    setIsVideoSelected(false)
  }, [boardItems, zoomLevel])

  useImperativeHandle(ref, () => ({ addNote }))

  // Video resize handler
  const handleVideoResizeMouseDown = useCallback((e: React.MouseEvent, handle: string) => {
    e.preventDefault()
    e.stopPropagation()
    setIsVideoResizing(true)
    setVideoResizeHandle(handle)
    setIsVideoSelected(true)
    
    const videoContainer = videoContainerRef.current
    if (!videoContainer) return
    
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    
    const startX = e.clientX
    const startY = e.clientY
    const startWidth = videoContainer.offsetWidth
    const startHeight = videoContainer.offsetHeight
    const startPosX = settings.position.x
    const startPosY = settings.position.y
    
    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - startX
      const deltaY = e.clientY - startY
      
      let newWidth = startWidth
      let newHeight = startHeight
      let newX = startPosX
      let newY = startPosY
      
      const minSize = 150
      const isCircle = settings.shape === 'circle'
      
      if (isCircle) {
        // For circles, maintain 1:1 aspect ratio
        // Calculate the average delta to make resize feel more natural
        const avgDelta = (Math.abs(deltaX) + Math.abs(deltaY)) / 2
        let sizeDelta = 0
        
        switch (handle) {
          case 'se': // Southeast - both deltas should be positive for growth
            sizeDelta = deltaX > 0 && deltaY > 0 ? avgDelta : -avgDelta
            break
          case 'sw': // Southwest - deltaX negative, deltaY positive for growth
            sizeDelta = deltaX < 0 && deltaY > 0 ? avgDelta : -avgDelta
            break
          case 'ne': // Northeast - deltaX positive, deltaY negative for growth
            sizeDelta = deltaX > 0 && deltaY < 0 ? avgDelta : -avgDelta
            break
          case 'nw': // Northwest - both deltas should be negative for growth
            sizeDelta = deltaX < 0 && deltaY < 0 ? avgDelta : -avgDelta
            break
        }
        
        // Calculate new size, ensuring it doesn't go below minimum
        const newSize = Math.max(minSize, startWidth + sizeDelta)
        newWidth = newSize
        newHeight = newSize // Keep it perfectly square for circle
        
        // Calculate center point of original circle
        const centerX = startPosX + startWidth / 2
        const centerY = startPosY + startHeight / 2
        
        // Position new circle centered on the same point
        newX = centerX - newSize / 2
        newY = centerY - newSize / 2
      } else {
        // For rectangles, allow free resizing
        switch (handle) {
          case 'se': // Southeast
            newWidth = Math.max(minSize, startWidth + deltaX)
            newHeight = Math.max(minSize, startHeight + deltaY)
            break
          case 'sw': // Southwest
            newWidth = Math.max(minSize, startWidth - deltaX)
            newHeight = Math.max(minSize, startHeight + deltaY)
            newX = startPosX + (startWidth - newWidth)
            break
          case 'ne': // Northeast
            newWidth = Math.max(minSize, startWidth + deltaX)
            newHeight = Math.max(minSize, startHeight - deltaY)
            newY = startPosY + (startHeight - newHeight)
            break
          case 'nw': // Northwest
            newWidth = Math.max(minSize, startWidth - deltaX)
            newHeight = Math.max(minSize, startHeight - deltaY)
            newX = startPosX + (startWidth - newWidth)
            newY = startPosY + (startHeight - newHeight)
            break
        }
      }
      
      // Update settings with new position and store custom size locally
      onSettingsChange({
        ...settings,
        position: { x: newX, y: newY }
      })
      setCustomVideoSize({ width: newWidth, height: newHeight })
    }
    
    const handleMouseUp = () => {
      setIsVideoResizing(false)
      setVideoResizeHandle(null)
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
    
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }, [settings, onSettingsChange])

  // Zoom functionality
  const handleZoomIn = useCallback(() => {
    setZoomLevel(prev => Math.min(prev + 0.2, 3)) // Max zoom 3x
  }, [])

  const handleZoomOut = useCallback(() => {
    setZoomLevel(prev => Math.max(prev - 0.2, 0.1)) // Min zoom 0.1x
  }, [])

  const handleZoomReset = useCallback(() => {
    setZoomLevel(1)
    setPanOffset({ x: 0, y: 0 })
  }, [])

  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault()
    const zoomFactor = e.deltaY > 0 ? -0.1 : 0.1
    setZoomLevel(prev => Math.max(0.1, Math.min(3, prev + zoomFactor)))
  }, [])

  const handlePanStart = useCallback((e: React.MouseEvent) => {
    if ((zoomLevel !== 1) && e.ctrlKey) {
      e.preventDefault()
      setIsPanning(true)
      setPanStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y })
    }
  }, [zoomLevel, panOffset])

  const handlePanMove = useCallback((e: MouseEvent) => {
    if (isPanning) {
      const newX = e.clientX - panStart.x
      const newY = e.clientY - panStart.y
      
      // Add some constraints to prevent panning too far off-screen
      const container = containerRef.current
      if (container) {
        const containerWidth = container.clientWidth
        const containerHeight = container.clientHeight
        
        // Calculate generous pan limits based on zoom level for full board access
        let maxPanX, maxPanY
        
        if (zoomLevel < 1) {
          // When zoomed out, allow panning across the entire expanded board area
          const expandedWidth = containerWidth / zoomLevel
          const expandedHeight = containerHeight / zoomLevel
          maxPanX = (expandedWidth - containerWidth) * 0.6 // Allow 60% of the expanded area
          maxPanY = (expandedHeight - containerHeight) * 0.6
        } else {
          // When zoomed in, use more restrictive limits
          maxPanX = containerWidth * (zoomLevel - 1) * 0.6
          maxPanY = containerHeight * (zoomLevel - 1) * 0.6
        }
        
        setPanOffset({
          x: Math.max(-maxPanX, Math.min(maxPanX, newX)),
          y: Math.max(-maxPanY, Math.min(maxPanY, newY))
        })
      } else {
        setPanOffset({ x: newX, y: newY })
      }
    }
  }, [isPanning, panStart, zoomLevel])

  const handlePanEnd = useCallback(() => {
    setIsPanning(false)
  }, [])

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

  // Pan event listeners
  useEffect(() => {
    if (isPanning) {
      document.addEventListener('mousemove', handlePanMove)
      document.addEventListener('mouseup', handlePanEnd)
      
      return () => {
        document.removeEventListener('mousemove', handlePanMove)
        document.removeEventListener('mouseup', handlePanEnd)
      }
    }
  }, [isPanning, handlePanMove, handlePanEnd])

  // Wheel zoom event listener
  useEffect(() => {
    const container = containerRef.current
    if (container) {
      container.addEventListener('wheel', handleWheel, { passive: false })
      
      return () => {
        container.removeEventListener('wheel', handleWheel)
      }
    }
  }, [handleWheel])

  // Keyboard shortcuts for zoom
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case '=':
          case '+':
            e.preventDefault()
            handleZoomIn()
            break
          case '-':
            e.preventDefault()
            handleZoomOut()
            break
          case '0':
            e.preventDefault()
            handleZoomReset()
            break
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [handleZoomIn, handleZoomOut, handleZoomReset])

  useEffect(() => {
    const canvas = canvasRef.current
    const video = videoRef.current
    if (!canvas || !video) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationFrame: number

    const drawFrame = async () => {
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

      // Process frame through blur controller if available and enabled
      if (blurController && settings.backgroundType !== 'hidden') {
        try {
          // Draw video to a temporary canvas to get ImageData
          const tempCanvas = document.createElement('canvas')
          tempCanvas.width = canvasWidth
          tempCanvas.height = canvasHeight
          const tempCtx = tempCanvas.getContext('2d')
          
          if (tempCtx) {
            // Draw original video frame
            tempCtx.drawImage(video, 0, 0, canvasWidth, canvasHeight)
            
            // Get ImageData for blur processing
            const imageData = tempCtx.getImageData(0, 0, canvasWidth, canvasHeight)
            
            // Process frame through blur controller
            const processedImageData = await blurController.processFrame(imageData)
            
            // Draw processed frame to main canvas
            ctx.putImageData(processedImageData, 0, 0)
          } else {
            // Fallback: draw original video if temp canvas fails
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
          }
        } catch (error) {
          console.error('Blur processing failed, falling back to original video:', error)
          // Fallback: draw original video
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
        }
      } else {
        // Draw video normally when blur is disabled or background is hidden
        if (settings.backgroundType !== 'hidden') {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
        } else {
          // For hidden background, just draw a solid color
          ctx.fillStyle = settings.color
          ctx.fillRect(0, 0, canvas.width, canvas.height)
        }
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
  }, [videoRef, settings, blurController])

  const getShapeClass = () => {
    const baseClasses = 'transition-all duration-500 shadow-lg'
    
    switch (settings.shape) {
      case 'circle':
        return `${baseClasses}` // No rounded-full here, handled in style
      case 'rounded':
        return `${baseClasses} rounded-3xl object-cover`
      case 'hexagon':
        return `${baseClasses} object-cover`
      case 'diamond':
        return `${baseClasses} object-cover`
      case 'heart':
        return `${baseClasses} object-cover`
      case 'star':
        return `${baseClasses} object-cover`
      default:
        return `${baseClasses} rounded-lg object-cover`
    }
  }

  const getShapeStyle = () => {
    const filterParts: string[] = []
    if (settings.backgroundType === 'blurred') filterParts.push('blur(10px)')
    switch (settings.videoFilter) {
      case 'grayscale':
        filterParts.push('grayscale(1)')
        break
      case 'sepia':
        filterParts.push('sepia(1)')
        break
      case 'invert':
        filterParts.push('invert(1)')
        break
    }
    const baseStyle = {
      border: `4px solid ${settings.color}`,
      filter: filterParts.join(' ') || 'none',
      minHeight: '200px',
      minWidth: '300px',
      ...(customVideoSize && {
        width: '100%',
        height: '100%',
        objectFit: 'cover' as const
      })
    }

    switch (settings.shape) {
      case 'circle':
        // Force perfect circle by making width = height and using object-fit
        const circleSize = customVideoSize ? 
          Math.min(customVideoSize.width, customVideoSize.height) : 
          (settings.size === 'small' ? 200 : 
           settings.size === 'medium' ? 300 : 
           settings.size === 'large' ? 400 : 500)
        return {
          ...baseStyle,
          width: `${circleSize}px`,
          height: `${circleSize}px`,
          borderRadius: '50%',
          objectFit: 'cover' as const,
          minWidth: `${circleSize}px`,
          minHeight: `${circleSize}px`
        }
      case 'hexagon':
        return {
          ...baseStyle,
          clipPath: 'polygon(50% 0%, 93.3% 25%, 93.3% 75%, 50% 100%, 6.7% 75%, 6.7% 25%)',
          borderRadius: '0'
        }
      case 'diamond':
        return {
          ...baseStyle,
          clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
          borderRadius: '0'
        }
      case 'heart':
        return {
          ...baseStyle,
          clipPath: 'polygon(50% 20%, 20% 0%, 0% 30%, 0% 60%, 50% 100%, 100% 60%, 100% 30%, 80% 0%)',
          borderRadius: '0'
        }
      case 'star':
        return {
          ...baseStyle,
          clipPath: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)',
          borderRadius: '0'
        }
      default:
        return baseStyle
    }
  }

  const getSizeClass = () => {
    // For circles, we'll handle sizing in the style function to ensure perfect circles
    if (settings.shape === 'circle') {
      return '' // No size classes for circles, handled in getShapeStyle
    }
    
    switch (settings.size) {
      case 'small':
        return 'max-w-sm max-h-80'
      case 'medium':
        return 'max-w-2xl max-h-96'
      case 'large':
        return 'max-w-4xl max-h-[500px]'
      case 'xlarge':
        return 'max-w-6xl max-h-[600px]'
      default:
        return 'max-w-2xl max-h-96'
    }
  }

  const getBackgroundStyle = () => {
    // Use a subtle, professional gradient
    return {
      background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
      position: 'relative' as const
    }
  }

  return (
    <div
      ref={containerRef}
      className={`w-full h-full relative p-8 ${zoomLevel < 1 ? 'overflow-visible' : 'overflow-hidden'}`}
      style={getBackgroundStyle()}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onMouseDown={handlePanStart}
      onDoubleClick={(e) => {
        if (e.target === containerRef.current) {
          const rect = containerRef.current.getBoundingClientRect()
          const x = (e.clientX - rect.left) / zoomLevel - 100
          const y = (e.clientY - rect.top) / zoomLevel - 75
          addNote(x, y)
        }
      }}
    >
      {/* Zoom Controls */}
      <div className="absolute top-4 right-4 z-50 flex flex-col gap-2">
        <div className="bg-background/90 backdrop-blur-sm rounded-lg border p-1 flex flex-col gap-1">
          <Button
            size="sm"
            variant="outline"
            className="h-8 w-8 p-0"
            onClick={handleZoomIn}
            disabled={zoomLevel >= 3}
            title="Zoom In (Ctrl + = or Ctrl + Mouse Wheel Up)"
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-8 w-8 p-0"
            onClick={handleZoomOut}
            disabled={zoomLevel <= 0.1}
            title="Zoom Out (Ctrl + - or Ctrl + Mouse Wheel Down)"
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-8 w-8 p-0"
            onClick={handleZoomReset}
            disabled={zoomLevel === 1 && panOffset.x === 0 && panOffset.y === 0}
            title="Reset Zoom & Pan (Ctrl + 0)"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
        {zoomLevel !== 1 && (
          <div className="bg-background/90 backdrop-blur-sm rounded-lg border px-2 py-1 text-xs text-center">
            {Math.round(zoomLevel * 100)}%
          </div>
        )}
        {zoomLevel < 0.5 && (
          <div className="bg-background/90 backdrop-blur-sm rounded-lg border px-2 py-1 text-xs text-center">
            Board: {Math.round(100/zoomLevel)}x larger
          </div>
        )}
        {zoomLevel < 0.5 && (
          <div className="bg-background/90 backdrop-blur-sm rounded-lg border px-2 py-1 text-xs text-center text-muted-foreground">
            Objects have larger click areas
          </div>
        )}
        {zoomLevel !== 1 && (
          <div className="bg-background/90 backdrop-blur-sm rounded-lg border px-2 py-1 text-xs text-center">
            Ctrl+Click to pan
          </div>
        )}
      </div>

      {/* Zoom Content Wrapper */}
      <div
        className="origin-center transition-transform duration-200 ease-out"
        style={{
          // Expand the content area when zoomed out to show more board space
          width: zoomLevel < 1 ? `${100 / zoomLevel}%` : '100%',
          height: zoomLevel < 1 ? `${100 / zoomLevel}%` : '100%',
          // Center the expanded area when zoomed out
          position: 'absolute',
          top: zoomLevel < 1 ? `${-(100 / zoomLevel - 100) / 2}%` : '0',
          left: zoomLevel < 1 ? `${-(100 / zoomLevel - 100) / 2}%` : '0',
          transform: `scale(${zoomLevel}) translate(${panOffset.x / zoomLevel}px, ${panOffset.y / zoomLevel}px)`,
          cursor: zoomLevel !== 1 && isPanning ? 'grabbing' : zoomLevel !== 1 ? 'grab' : 'default'
        }}
      >
        {/* Subtle overlay pattern for texture - scales with zoom */}
        <div 
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='1'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            backgroundSize: `${60 * zoomLevel}px ${60 * zoomLevel}px`
          }}
        />

        {/* Board area indicator when zoomed out */}
        {zoomLevel < 0.5 && (
          <div 
            className="absolute inset-0 border-2 border-dashed border-primary/20"
            style={{
              // Show original board boundaries as a reference
              width: `${100 * zoomLevel}%`,
              height: `${100 * zoomLevel}%`,
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
              pointerEvents: 'none'
            }}
          >
            <div className="absolute top-2 left-2 bg-primary/10 backdrop-blur-sm rounded px-2 py-1 text-xs text-primary">
              Original Board Area
            </div>
          </div>
        )}

        {/* Grid overlay for better spatial awareness when zoomed out */}
        {zoomLevel < 0.3 && (
          <div 
            className="absolute inset-0 opacity-10 pointer-events-none"
            style={{
              backgroundImage: `
                linear-gradient(to right, rgba(255,255,255,0.1) 1px, transparent 1px),
                linear-gradient(to bottom, rgba(255,255,255,0.1) 1px, transparent 1px)
              `,
              backgroundSize: `${200 * zoomLevel}px ${200 * zoomLevel}px`
            }}
          />
        )}

      {/* Full board drag overlay */}
      {isDragOver && (
        <div className="absolute inset-0 bg-primary/10 border-4 border-dashed border-primary/50 z-40 flex items-center justify-center backdrop-blur-sm">
          <div className="bg-background/90 rounded-lg p-8 text-center shadow-lg">
            <div className="flex items-center justify-center gap-3 mb-4">
              <Upload className="h-8 w-8 text-primary animate-bounce" />
              <div>
                <h3 className="text-lg font-semibold text-foreground">Drop Files Here</h3>
                <p className="text-sm text-muted-foreground">Add images, videos, PDFs, or presentations to your board</p>
              </div>
            </div>
            <div className="flex items-center justify-center gap-2 text-muted-foreground mb-2">
              <FileImage className="h-4 w-4" />
              <FileVideo className="h-4 w-4" />
              <FileText className="h-4 w-4" />
            </div>
            <div className="text-xs text-muted-foreground">
              <div>Images: .png, .jpg, .gif, .webp</div>
              <div>Videos: .mp4, .webm, .mov (max 50MB)</div>
              <div>Documents: .pdf, .pptx, .key (max 10MB)</div>
            </div>
          </div>
        </div>
      )}
      {/* Virtual background overlay */}
      {settings.virtualBackground && (
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-30"
          style={{ 
            backgroundImage: (() => {
              switch (settings.virtualBackground) {
                case 'space':
                  return 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                case 'office':
                  return 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)'
                case 'forest':
                  return 'linear-gradient(135deg, #1f2937 0%, #059669 50%, #10b981 100%)'
                case 'ocean':
                  return 'linear-gradient(135deg, #2563eb 0%, #06b6d4 50%, #14b8a6 100%)'
                case 'sunset':
                  return 'linear-gradient(135deg, #f97316 0%, #ec4899 50%, #9333ea 100%)'
                case 'modern-office':
                  return 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 50%, #cbd5e1 100%)'
                case 'library':
                  return 'linear-gradient(135deg, #78350f 0%, #ca8a04 50%, #ea580c 100%)'
                case 'city':
                  return 'linear-gradient(135deg, #334155 0%, #1e40af 50%, #3730a3 100%)'
                case 'tech':
                  return 'linear-gradient(135deg, #22d3ee 0%, #3b82f6 50%, #9333ea 100%)'
                case 'waves':
                  return 'linear-gradient(135deg, #a78bfa 0%, #8b5cf6 50%, #4f46e5 100%)'
                case 'warm':
                  return 'linear-gradient(135deg, #fda4af 0%, #f472b6 50%, #ef4444 100%)'
                case 'clean-white':
                  return 'linear-gradient(135deg, #f9fafb 0%, #ffffff 100%)'
                case 'dark-pro':
                  return 'linear-gradient(135deg, #111827 0%, #1e293b 50%, #18181b 100%)'
                case 'soft-blur':
                  return 'linear-gradient(135deg, #eff6ff 0%, #e0e7ff 50%, #e9d5ff 100%)'
                default:
                  return `url(${settings.virtualBackground})`
              }
            })()
          }}
        />
      )}

      {/* Draggable Video container */}
      <div 
        ref={videoContainerRef}
        className={`absolute cursor-move ${settings.isDragging ? 'z-50' : 'z-10'} ${
          isVideoSelected ? 'ring-2 ring-primary' : ''
        }`}
        style={{ 
          left: settings.position.x === 0 && settings.position.y === 0 
            ? '50%' 
            : `${settings.position.x}px`, 
          top: settings.position.x === 0 && settings.position.y === 0 
            ? '50%' 
            : `${settings.position.y}px`,
          transform: settings.position.x === 0 && settings.position.y === 0 
            ? 'translate(-50%, -50%)' 
            : 'none',
          // Make invisible but keep functional for PiP
          opacity: settings.backgroundType === 'hidden' || isPictureInPicture ? 0 : 1,
          pointerEvents: settings.backgroundType === 'hidden' || isPictureInPicture ? 'none' : 'auto',
          ...(customVideoSize && {
            width: `${customVideoSize.width}px`,
            height: `${customVideoSize.height}px`
          })
        }}
        onMouseDown={handleMouseDown}
        onClick={(e) => {
          e.stopPropagation()
          setIsVideoSelected(true)
          setSelectedItem(null) // Deselect board items
        }}
      >
        <div className={`relative overflow-hidden ${getShapeClass()} ${settings.isDragging ? 'scale-105' : ''} transition-all duration-200`}>
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
            <div className={`${customVideoSize ? 'w-full h-full' : getSizeClass()} ${getShapeClass()} bg-gray-800 flex items-center justify-center text-white text-sm absolute inset-0 z-0`}
                 style={getShapeStyle()}>
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
              className={`${customVideoSize ? '' : getSizeClass()} ${getShapeClass()} transition-all duration-300 ease-in-out ${
                settings.isDragging ? 'pointer-events-none' : ''
              } bg-gray-800 relative z-10`}
              style={getShapeStyle()}
            />
            
            {/* Canvas for processed output (drawn every frame) */}
            <canvas
              ref={canvasRef}
              className="absolute inset-0 z-20"
              style={getShapeStyle()}
            />
            
            {/* Video Resize Handles */}
            {isVideoSelected && (
              <>
                <div
                  className="absolute -top-1 -left-1 w-3 h-3 bg-primary rounded-full cursor-nw-resize z-20"
                  onMouseDown={(e) => handleVideoResizeMouseDown(e, 'nw')}
                />
                <div
                  className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full cursor-ne-resize z-20"
                  onMouseDown={(e) => handleVideoResizeMouseDown(e, 'ne')}
                />
                <div
                  className="absolute -bottom-1 -left-1 w-3 h-3 bg-primary rounded-full cursor-sw-resize z-20"
                  onMouseDown={(e) => handleVideoResizeMouseDown(e, 'sw')}
                />
                <div
                  className="absolute -bottom-1 -right-1 w-3 h-3 bg-primary rounded-full cursor-se-resize z-20"
                  onMouseDown={(e) => handleVideoResizeMouseDown(e, 'se')}
                />
              </>
            )}

            {/* Recording indicator */}
            {isRecording && (
              <div className="absolute top-4 left-4">
                <Badge variant="destructive" className="flex items-center gap-2 px-3 py-1">
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                  REC
                </Badge>
              </div>
            )}

            {/* Picture-in-Picture indicator */}
            {isPictureInPicture && (
              <div className="absolute top-4 right-4">
                <Badge variant="secondary" className="flex items-center gap-2 px-3 py-1 bg-blue-500/80 text-white">
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
                    <rect x="8" y="8" width="8" height="6" rx="1" ry="1"/>
                  </svg>
                  PiP Active
                </Badge>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Board Items */}
      {boardItems.map((item) => {
        // Calculate enhanced interaction sizes when zoomed out
        const padding = zoomLevel < 0.5 ? 20 / zoomLevel : 5
        const borderWidth = zoomLevel < 0.5 ? 4 / zoomLevel : 2
        const handleSize = zoomLevel < 0.5 ? 16 / zoomLevel : 8
        
        return (
          <div
            key={item.id}
            className={`absolute cursor-move select-none ${
              draggingItemId === item.id ? '' : 'transition-all duration-200'
            } ${
              selectedItem === item.id ? 'shadow-xl' : ''
            } ${zoomLevel < 0.5 ? 'hover:shadow-lg' : ''}`}
            style={{
              left: `${item.x - padding}px`,
              top: `${item.y - padding}px`,
              width: `${item.width + padding * 2}px`,
              height: `${item.height + padding * 2}px`,
              zIndex: item.zIndex,
              transform: `rotate(${item.rotation}deg)`,
              padding: `${padding}px`,
            }}
            onMouseDown={(e) => handleItemMouseDown(e, item.id)}
            onClick={() => {
              setSelectedItem(item.id)
              setIsVideoSelected(false) // Deselect video when selecting board item
            }}
          >
          {/* Enhanced visual outline when zoomed out */}
          {zoomLevel < 0.5 && (
            <div
              className="absolute inset-0 border-2 border-primary/30 rounded-lg pointer-events-none"
              style={{
                borderWidth: `${borderWidth}px`,
              }}
            />
          )}

          {/* Selection outline */}
          {selectedItem === item.id && (
            <div
              className="absolute inset-0 border-primary rounded-lg pointer-events-none"
              style={{
                boxShadow: `0 0 0 ${borderWidth}px rgb(var(--primary))`,
              }}
            />
          )}

          {/* Item Content Container */}
          <div 
            className="w-full h-full"
            style={{
              margin: `-${padding}px`,
              width: `${item.width}px`,
              height: `${item.height}px`,
              position: 'relative',
              top: `${padding}px`,
              left: `${padding}px`,
            }}
          >
            {/* Item Content */}
            {item.type === 'image' ? (
              <Image
                src={item.src || ''}
                alt="Board item"
                fill
                className="object-cover rounded-lg shadow-lg"
                draggable={false}
                loading="lazy"
              />
            ) : item.type === 'video' ? (
              <video
                src={item.src}
                className="w-full h-full object-cover rounded-lg shadow-lg"
                controls
                muted
              />
            ) : item.type === 'document' ? (
              <DocumentViewer
                src={item.src || ''}
                fileName={item.fileName || 'Document'}
                type={
                  item.fileName?.toLowerCase().endsWith('.pdf') ? 'pdf' :
                  item.fileName?.toLowerCase().endsWith('.pptx') ? 'ppt' :
                  item.fileName?.toLowerCase().endsWith('.key') ? 'key' : 'pdf'
                }
                className="w-full h-full"
              />
            ) : item.type === 'note' ? (
              editingNoteId === item.id ? (
                <textarea
                  value={item.content || ''}
                  onChange={(e) => updateItemContent(item.id, e.target.value)}
                  onBlur={() => setEditingNoteId(null)}
                  className="w-full h-full bg-yellow-200 rounded-lg shadow-lg p-2 text-black text-sm resize-none focus:outline-none"
                  style={{ whiteSpace: 'pre-wrap' }}
                  autoFocus
                />
              ) : (
                <div
                  className="w-full h-full bg-yellow-200 rounded-lg shadow-lg p-2 text-black text-sm whitespace-pre-wrap"
                  onDoubleClick={() => setEditingNoteId(item.id)}
                >
                  {item.content}
                </div>
              )
            ) : (
              <div className="w-full h-full bg-white rounded-lg shadow-lg p-4 text-black">
                {item.content || 'Text content'}
              </div>
            )}
          </div>

          {/* Selection Controls - Enhanced for zoom out */}
          {selectedItem === item.id && (
            <>
              {/* Resize Handles - Larger when zoomed out */}
              <div
                className="absolute bg-primary rounded-full cursor-nw-resize"
                style={{
                  width: `${handleSize}px`,
                  height: `${handleSize}px`,
                  top: `-${handleSize / 2}px`,
                  left: `-${handleSize / 2}px`,
                }}
                onMouseDown={(e) => handleResizeMouseDown(e, item.id, 'nw')}
              />
              <div
                className="absolute bg-primary rounded-full cursor-ne-resize"
                style={{
                  width: `${handleSize}px`,
                  height: `${handleSize}px`,
                  top: `-${handleSize / 2}px`,
                  right: `-${handleSize / 2}px`,
                }}
                onMouseDown={(e) => handleResizeMouseDown(e, item.id, 'ne')}
              />
              <div
                className="absolute bg-primary rounded-full cursor-sw-resize"
                style={{
                  width: `${handleSize}px`,
                  height: `${handleSize}px`,
                  bottom: `-${handleSize / 2}px`,
                  left: `-${handleSize / 2}px`,
                }}
                onMouseDown={(e) => handleResizeMouseDown(e, item.id, 'sw')}
              />
              <div
                className="absolute bg-primary rounded-full cursor-se-resize"
                style={{
                  width: `${handleSize}px`,
                  height: `${handleSize}px`,
                  bottom: `-${handleSize / 2}px`,
                  right: `-${handleSize / 2}px`,
                }}
                onMouseDown={(e) => handleResizeMouseDown(e, item.id, 'se')}
              />

              {/* Action Buttons - Enhanced size for zoom out */}
              <div 
                className="absolute flex gap-1"
                style={{
                  top: `-${handleSize * 3}px`,
                  left: '0',
                }}
              >
                <Button
                  size="sm"
                  variant="secondary"
                  className="p-0"
                  style={{
                    width: `${Math.max(24, handleSize * 1.5)}px`,
                    height: `${Math.max(24, handleSize * 1.5)}px`,
                  }}
                  onClick={(e) => {
                    e.stopPropagation()
                    duplicateItem(item.id)
                  }}
                >
                  <Copy className={`${zoomLevel < 0.5 ? 'w-4 h-4' : 'w-3 h-3'}`} />
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  className="p-0"
                  style={{
                    width: `${Math.max(24, handleSize * 1.5)}px`,
                    height: `${Math.max(24, handleSize * 1.5)}px`,
                  }}
                  onClick={(e) => {
                    e.stopPropagation()
                    deleteItem(item.id)
                  }}
                >
                  <X className={`${zoomLevel < 0.5 ? 'w-4 h-4' : 'w-3 h-3'}`} />
                </Button>
              </div>
            </>
          )}
          </div>
        )
      })}

      {/* Click outside to deselect */}
      <div
        className="absolute inset-0 -z-10"
        onClick={() => {
          setSelectedItem(null)
          setIsVideoSelected(false)
        }}
      />

      {/* Hidden file input for drag and drop functionality */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".png,.jpg,.jpeg,.gif,.mp4,.pdf,.pptx,.key"
        onChange={handleFileInputChange}
        className="hidden"
      />
      </div>
    </div>
  )
})

export default VideoCanvas
