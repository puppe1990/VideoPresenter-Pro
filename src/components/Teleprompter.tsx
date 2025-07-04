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
  isRecording?: boolean
  remoteCommand?: string | null
  onRemoteCommandHandled?: () => void
}

export default function Teleprompter({ isVisible, onToggleVisibility, isRecording = false, remoteCommand, onRemoteCommandHandled }: TeleprompterProps) {
  const [text, setText] = useState(`Welcome to your video presentation!

Today we'll be covering several important topics that will help you understand the key concepts we're discussing.

First, let's start with an introduction to the subject matter.

This teleprompter will help you deliver your presentation smoothly while maintaining eye contact with your camera.

Remember to speak clearly and at a steady pace.

You can customize the scroll speed and text size to match your reading preferences.

Feel free to edit this text to include your own presentation script.

Thank you for watching, and let's begin!`)
  
  const [isScrolling, setIsScrolling] = useState(false)
  const [scrollSpeed, setScrollSpeed] = useState(1.5)
  const [fontSize, setFontSize] = useState(24)
  const [lineHeight, setLineHeight] = useState(1.6)
  const [isMinimized, setIsMinimized] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [mirrorText, setMirrorText] = useState(false)
  const [isCompactMode, setIsCompactMode] = useState(false)
  const [opacity, setOpacity] = useState(0.95)
  const [autoHideDuringRecording, setAutoHideDuringRecording] = useState(false)
  
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
  const popupWindowRef = useRef<Window | null>(null)

  // Apply remote commands
  useEffect(() => {
    if (!remoteCommand) return
    switch (remoteCommand) {
      case 'teleprompterPlay':
        startScrolling()
        break
      case 'teleprompterPause':
        stopScrolling()
        break
      case 'teleprompterUp':
        scrollUp()
        break
      case 'teleprompterDown':
        scrollDown()
        break
    }
    if (onRemoteCommandHandled) onRemoteCommandHandled()
  }, [remoteCommand, onRemoteCommandHandled])

  const startScrolling = () => {
    if (!scrollContainerRef.current) return
    
    setIsScrolling(true)
    lastTimestampRef.current = performance.now()
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

  // Main scrolling effect
  useEffect(() => {
    if (!isScrolling) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
        animationRef.current = null
      }
      return
    }

    const scroll = (timestamp: number) => {
      if (!scrollContainerRef.current) return
      
      const deltaTime = timestamp - lastTimestampRef.current
      lastTimestampRef.current = timestamp
      
      // Scroll based on speed setting (pixels per second)
      // scrollSpeed range: 0.5 - 5.0
      // Convert to actual pixels per second: 10-100 pixels/sec
      const pixelsPerSecond = scrollSpeed * 20
      const scrollAmount = (pixelsPerSecond * deltaTime) / 1000 // deltaTime is in milliseconds
      scrollContainerRef.current.scrollTop += scrollAmount
      
      // Check if we've reached the end
      const container = scrollContainerRef.current
      if (container.scrollTop >= container.scrollHeight - container.clientHeight) {
        setIsScrolling(false)
        return
      }
      
      // Continue scrolling
      animationRef.current = requestAnimationFrame(scroll)
    }
    
    // Start the animation loop
    lastTimestampRef.current = performance.now()
    animationRef.current = requestAnimationFrame(scroll)
    
    // Cleanup function
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
        animationRef.current = null
      }
    }
  }, [isScrolling, scrollSpeed])

  // Manage popup window for recording
  useEffect(() => {
    if (isRecording && !autoHideDuringRecording) {
      // Open popup window for teleprompter during recording
      const popup = window.open(
        '', 
        'teleprompter-popup',
        'width=400,height=600,left=0,top=0,toolbar=no,menubar=no,scrollbars=no,resizable=yes'
      )
      
      if (popup) {
        popupWindowRef.current = popup
        
        // Style the popup
        popup.document.write(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Teleprompter</title>
            <style>
              body {
                margin: 0;
                padding: 20px;
                background: #111;
                color: #f0f0f0;
                font-family: Georgia, serif;
                overflow-y: auto;
              }
              .teleprompter-content {
                font-size: ${fontSize}px;
                line-height: ${lineHeight};
                text-align: center;
                white-space: pre-wrap;
                text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8);
                font-weight: 500;
                transform: ${mirrorText ? 'scaleX(-1)' : 'none'};
              }
              .controls {
                position: fixed;
                top: 10px;
                right: 10px;
                background: rgba(0,0,0,0.8);
                padding: 10px;
                border-radius: 8px;
                border: 1px solid #444;
              }
              button {
                background: #333;
                color: white;
                border: none;
                padding: 8px 12px;
                border-radius: 4px;
                cursor: pointer;
                margin: 2px;
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
                padding: 8px 12px;
                border-radius: 6px;
                font-size: 12px;
                display: flex;
                align-items: center;
                gap: 8px;
              }
              .pulse {
                width: 8px;
                height: 8px;
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
              🔴 GRAVANDO - Teleprompter em janela separada
            </div>
            <div class="controls">
              <button onclick="startScroll()">▶️ Play</button>
              <button onclick="pauseScroll()">⏸️ Pause</button>
              <button onclick="resetScroll()">🔄 Reset</button>
              <button onclick="scrollUp()">⬆️</button>
              <button onclick="scrollDown()">⬇️</button>
            </div>
            <div id="teleprompter-text" class="teleprompter-content">${text}</div>
            <script>
              let isScrolling = false;
              let scrollSpeed = ${scrollSpeed};
              let animationId = null;
              let lastTimestamp = 0;
              
              function startScroll() {
                if (isScrolling) return;
                isScrolling = true;
                lastTimestamp = performance.now();
                
                function scroll(timestamp) {
                  const deltaTime = timestamp - lastTimestamp;
                  lastTimestamp = timestamp;
                  
                  const pixelsPerSecond = scrollSpeed * 20;
                  const scrollAmount = (pixelsPerSecond * deltaTime) / 1000;
                  window.scrollBy(0, scrollAmount);
                  
                  if (window.scrollY >= document.body.scrollHeight - window.innerHeight) {
                    isScrolling = false;
                    return;
                  }
                  
                  if (isScrolling) {
                    animationId = requestAnimationFrame(scroll);
                  }
                }
                
                animationId = requestAnimationFrame(scroll);
              }
              
              function pauseScroll() {
                isScrolling = false;
                if (animationId) {
                  cancelAnimationFrame(animationId);
                  animationId = null;
                }
              }
              
              function resetScroll() {
                pauseScroll();
                window.scrollTo(0, 0);
              }
              
              function scrollUp() {
                window.scrollBy(0, -50);
              }
              
              function scrollDown() {
                window.scrollBy(0, 50);
              }
              
              // Auto-start scrolling if it was running
              ${isScrolling ? 'startScroll();' : ''}
            </script>
          </body>
          </html>
        `)
        popup.document.close()
      }
    } else if (!isRecording && popupWindowRef.current) {
      // Close popup when recording stops
      popupWindowRef.current.close()
      popupWindowRef.current = null
    }
    
    return () => {
      if (popupWindowRef.current) {
        popupWindowRef.current.close()
        popupWindowRef.current = null
      }
    }
  }, [isRecording, autoHideDuringRecording, text, fontSize, lineHeight, mirrorText, scrollSpeed, isScrolling])

  if (!isVisible) return null

  // Hide during recording if auto-hide is enabled
  const shouldHide = autoHideDuringRecording && isRecording

  return (
    <div 
      ref={teleprompterRef}
      className={`fixed max-w-[calc(100vw-2rem)] transition-all duration-200 ${
        isCompactMode ? 'w-80' : 'w-96'
      } ${shouldHide ? 'pointer-events-none opacity-0 scale-95' : 'z-50'}`}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        cursor: isDragging ? 'grabbing' : 'default',
        opacity: shouldHide ? 0 : opacity,
        transform: shouldHide ? 'scale(0.95)' : 'scale(1)',
        zIndex: isRecording ? 999999 : 9999, // Z-index MUITO ALTO durante gravação
        // CRITICAL: Exclude from screen capture
        mixBlendMode: 'screen', // Blend mode que pode excluir da captura
        isolation: 'isolate',
        filter: isRecording ? 'contrast(0) brightness(2)' : 'none', // Filtro especial durante gravação
        // Browser-specific screen capture exclusion
        WebkitUserSelect: 'none',
        userSelect: 'none',
        pointerEvents: 'auto',
        // Força o elemento a ficar em camada separada
        willChange: 'transform, opacity',
        backfaceVisibility: 'hidden' as const,
        perspective: '1000px',
        position: 'fixed' as const
      }}
      data-html2canvas-ignore="true"
      data-screenshot-ignore="true"
    >
      <Card className="bg-gray-900/95 backdrop-blur-sm border-gray-600 text-white shadow-2xl hover:shadow-3xl transition-shadow duration-200">
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
                onClick={() => setIsCompactMode(!isCompactMode)}
                className="h-6 w-6 p-0 text-gray-400 hover:text-white"
                title="Toggle compact mode"
              >
                <div className="h-3 w-3 flex items-center justify-center">
                  <div className={`transition-all duration-200 ${isCompactMode ? 'scale-75' : 'scale-100'}`}>
                    <div className="w-2 h-2 border border-current rounded-sm" />
                  </div>
                </div>
              </Button>
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
                  <Label className="text-xs text-gray-200 font-medium">Speed: {scrollSpeed}x ({Math.round(scrollSpeed * 20)} px/sec)</Label>
                  <Slider
                    value={[scrollSpeed]}
                    onValueChange={(value) => setScrollSpeed(value[0])}
                    min={0.3}
                    max={3}
                    step={0.1}
                    className="w-full"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label className="text-xs text-gray-200 font-medium">Font Size: {fontSize}px</Label>
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
                  <Label className="text-xs text-gray-200 font-medium">Line Height: {lineHeight}</Label>
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
                  <Label className="text-xs text-gray-200 font-medium">Mirror Text</Label>
                  <Switch
                    checked={mirrorText}
                    onCheckedChange={setMirrorText}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs text-gray-200 font-medium">Opacity: {Math.round(opacity * 100)}%</Label>
                  <Slider
                    value={[opacity]}
                    onValueChange={(value) => setOpacity(value[0])}
                    min={0.3}
                    max={1}
                    step={0.05}
                    className="w-full"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label className="text-xs text-gray-200 font-medium">Esconder Durante Gravação</Label>
                  <Switch
                    checked={autoHideDuringRecording}
                    onCheckedChange={setAutoHideDuringRecording}
                  />
                </div>
                
                {isRecording && !autoHideDuringRecording && (
                  <div className="p-2 bg-red-900/30 border border-red-700/50 rounded-lg">
                    <div className="text-xs text-red-200 flex items-center gap-2">
                      <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                      🔴 GRAVANDO - Teleprompter em janela separada
                    </div>
                    <div className="text-xs text-gray-300 mt-1">
                      Verifique se a janela popup do teleprompter abriu
                    </div>
                  </div>
                )}
                
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
              className={`overflow-y-auto bg-black/80 rounded-lg border border-gray-600 scroll-smooth shadow-inner transition-all duration-200 ${
                isCompactMode ? 'h-48 p-4' : 'h-64 p-6'
              }`}
              style={{
                scrollBehavior: 'smooth'
              }}
            >
              <div 
                className="whitespace-pre-wrap leading-relaxed text-center text-gray-50"
                                  style={{
                    fontSize: `${isCompactMode ? fontSize * 0.9 : fontSize}px`,
                    lineHeight: lineHeight,
                    transform: mirrorText ? 'scaleX(-1)' : 'none',
                    fontFamily: 'ui-serif, Georgia, serif',
                    textShadow: '0 1px 2px rgba(0, 0, 0, 0.8)',
                    fontWeight: '500'
                  }}
              >
                {text}
              </div>
            </div>

            {/* Text Editor */}
            <div className="space-y-2">
              <Label className="text-xs text-gray-200 font-medium">Edit Script:</Label>
              <textarea
                ref={textAreaRef}
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="w-full h-24 p-3 bg-gray-800/80 border border-gray-600 rounded-lg text-gray-100 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 placeholder-gray-400"
                placeholder="Enter your teleprompter script here..."
              />
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  )
} 