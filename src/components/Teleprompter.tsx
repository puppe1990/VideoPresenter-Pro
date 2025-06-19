'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Type, 
  ChevronUp, 
  ChevronDown, 
  Settings,
  X,
  Minimize2,
  Maximize2
} from 'lucide-react'

interface TeleprompterProps {
  isVisible: boolean
  onToggleVisibility: () => void
}

export default function Teleprompter({ isVisible, onToggleVisibility }: TeleprompterProps) {
  const [text, setText] = useState(`Welcome to your video presentation!

Today we'll be covering several important topics that will help you understand the key concepts we're discussing.

First, let's start with an introduction to the subject matter.

This teleprompter will help you deliver your presentation smoothly while maintaining eye contact with your camera.

Remember to speak clearly and at a steady pace.

You can customize the scroll speed and text size to match your reading preferences.

Feel free to edit this text to include your own presentation script.

Thank you for watching, and let's begin!`)
  
  const [isScrolling, setIsScrolling] = useState(false)
  const [scrollSpeed, setScrollSpeed] = useState(2)
  const [fontSize, setFontSize] = useState(24)
  const [lineHeight, setLineHeight] = useState(1.6)
  const [isMinimized, setIsMinimized] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [mirrorText, setMirrorText] = useState(false)
  
  // Drag functionality state
  const [position, setPosition] = useState(() => {
    // Initialize position to top-right corner
    if (typeof window !== 'undefined') {
      return { x: window.innerWidth - 384 - 16, y: 16 } // 384px width + 16px margin
    }
    return { x: 16, y: 16 }
  })
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const textAreaRef = useRef<HTMLTextAreaElement>(null)
  const animationRef = useRef<number | null>(null)
  const lastTimestampRef = useRef<number>(0)
  const teleprompterRef = useRef<HTMLDivElement>(null)

  const startScrolling = () => {
    if (!scrollContainerRef.current) return
    
    setIsScrolling(true)
    lastTimestampRef.current = performance.now()
    
    const scroll = (timestamp: number) => {
      if (!scrollContainerRef.current) return
      
      const deltaTime = timestamp - lastTimestampRef.current
      lastTimestampRef.current = timestamp
      
      // Scroll based on speed setting (pixels per second)
      const scrollAmount = (scrollSpeed * deltaTime) / 16.67 // Normalize for 60fps
      scrollContainerRef.current.scrollTop += scrollAmount
      
      // Check if we've reached the end
      const container = scrollContainerRef.current
      if (container.scrollTop >= container.scrollHeight - container.clientHeight) {
        setIsScrolling(false)
        return
      }
      
      if (isScrolling) {
        animationRef.current = requestAnimationFrame(scroll)
      }
    }
    
    animationRef.current = requestAnimationFrame(scroll)
  }

  const stopScrolling = () => {
    setIsScrolling(false)
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
      animationRef.current = null
    }
  }

  const resetScroll = () => {
    stopScrolling()
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0
    }
  }

  const scrollUp = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop -= 50
    }
  }

  const scrollDown = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop += 50
    }
  }

  // Drag functionality
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!teleprompterRef.current) return
    
    const rect = teleprompterRef.current.getBoundingClientRect()
    setIsDragging(true)
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    })
    
    // Prevent default to avoid text selection
    e.preventDefault()
  }

  // Global mouse move and up handlers
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return
      
      const newX = e.clientX - dragOffset.x
      const newY = e.clientY - dragOffset.y
      
      // Constrain to viewport boundaries
      const maxX = window.innerWidth - 384 // 384px is w-96 (24rem)
      const maxY = window.innerHeight - 100 // Leave some space at bottom
      
      const constrainedX = Math.max(0, Math.min(newX, maxX))
      const constrainedY = Math.max(0, Math.min(newY, maxY))
      
      setPosition({ x: constrainedX, y: constrainedY })
    }

    const handleMouseUp = () => {
      setIsDragging(false)
    }

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, dragOffset])

  // Cleanup animation on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [])

  // Stop scrolling when isScrolling becomes false
  useEffect(() => {
    if (!isScrolling && animationRef.current) {
      cancelAnimationFrame(animationRef.current)
      animationRef.current = null
    }
  }, [isScrolling])

  if (!isVisible) return null

  return (
    <div 
      ref={teleprompterRef}
      className="fixed z-50 w-96 max-w-[calc(100vw-2rem)]"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        cursor: isDragging ? 'grabbing' : 'default'
      }}
    >
      <Card className="bg-black/90 backdrop-blur-sm border-gray-700 text-white shadow-2xl">
        {/* Header */}
        <CardHeader 
          className="pb-2 cursor-grab active:cursor-grabbing select-none"
          onMouseDown={handleMouseDown}
        >
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2 pointer-events-none">
              <Type className="h-4 w-4" />
              Teleprompter
            </CardTitle>
            <div className="flex items-center gap-1 pointer-events-auto">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowSettings(!showSettings)}
                className="h-6 w-6 p-0 text-gray-400 hover:text-white"
              >
                <Settings className="h-3 w-3" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setIsMinimized(!isMinimized)}
                className="h-6 w-6 p-0 text-gray-400 hover:text-white"
              >
                {isMinimized ? <Maximize2 className="h-3 w-3" /> : <Minimize2 className="h-3 w-3" />}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={onToggleVisibility}
                className="h-6 w-6 p-0 text-gray-400 hover:text-white"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </CardHeader>

        {!isMinimized && (
          <CardContent className="space-y-3">
            {/* Settings Panel */}
            {showSettings && (
              <div className="space-y-3 p-3 bg-gray-800/50 rounded-lg border border-gray-700">
                <div className="space-y-2">
                  <Label className="text-xs text-gray-300">Speed: {scrollSpeed}x</Label>
                  <Slider
                    value={[scrollSpeed]}
                    onValueChange={(value) => setScrollSpeed(value[0])}
                    min={0.5}
                    max={5}
                    step={0.1}
                    className="w-full"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label className="text-xs text-gray-300">Font Size: {fontSize}px</Label>
                  <Slider
                    value={[fontSize]}
                    onValueChange={(value) => setFontSize(value[0])}
                    min={14}
                    max={36}
                    step={2}
                    className="w-full"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs text-gray-300">Line Height: {lineHeight}</Label>
                  <Slider
                    value={[lineHeight]}
                    onValueChange={(value) => setLineHeight(value[0])}
                    min={1.2}
                    max={2.5}
                    step={0.1}
                    className="w-full"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label className="text-xs text-gray-300">Mirror Text</Label>
                  <Switch
                    checked={mirrorText}
                    onCheckedChange={setMirrorText}
                  />
                </div>
                
                <Separator className="bg-gray-700" />
              </div>
            )}

            {/* Control Buttons */}
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant={isScrolling ? "secondary" : "default"}
                onClick={isScrolling ? stopScrolling : startScrolling}
                className="flex-1"
              >
                {isScrolling ? (
                  <>
                    <Pause className="h-3 w-3 mr-1" />
                    Pause
                  </>
                ) : (
                  <>
                    <Play className="h-3 w-3 mr-1" />
                    Start
                  </>
                )}
              </Button>
              
              <Button
                size="sm"
                variant="outline"
                onClick={resetScroll}
              >
                <RotateCcw className="h-3 w-3" />
              </Button>
              
              <Button
                size="sm"
                variant="outline"
                onClick={scrollUp}
              >
                <ChevronUp className="h-3 w-3" />
              </Button>
              
              <Button
                size="sm"
                variant="outline"
                onClick={scrollDown}
              >
                <ChevronDown className="h-3 w-3" />
              </Button>
            </div>

            {/* Text Display Area */}
            <div 
              ref={scrollContainerRef}
              className="h-64 overflow-y-auto bg-black/50 rounded-lg p-4 border border-gray-700 scroll-smooth"
              style={{
                scrollBehavior: 'smooth'
              }}
            >
              <div 
                className="whitespace-pre-wrap leading-relaxed text-center"
                style={{
                  fontSize: `${fontSize}px`,
                  lineHeight: lineHeight,
                  transform: mirrorText ? 'scaleX(-1)' : 'none',
                  fontFamily: 'ui-serif, Georgia, serif'
                }}
              >
                {text}
              </div>
            </div>

            {/* Text Editor */}
            <div className="space-y-2">
              <Label className="text-xs text-gray-300">Edit Script:</Label>
              <textarea
                ref={textAreaRef}
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="w-full h-24 p-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter your teleprompter script here..."
              />
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  )
} 