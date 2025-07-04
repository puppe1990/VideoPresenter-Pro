'use client'

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { type RecordingSource } from './VideoPresenter'

interface TeleprompterProps {
  isVisible: boolean
  onToggleVisibility: () => void
  isRecording: boolean
  recordingSource: RecordingSource
}

export default function Teleprompter({
  isVisible,
  onToggleVisibility,
  isRecording,
  recordingSource
}: TeleprompterProps) {
  const [text, setText] = useState('')
  const [isScrolling, setIsScrolling] = useState(false)
  const overlayRef = useRef<HTMLDivElement>(null)
  const animationRef = useRef<number | null>(null)

  useEffect(() => {
    if (!isScrolling) return

    const step = () => {
      if (overlayRef.current) {
        overlayRef.current.scrollTop += 1
        animationRef.current = requestAnimationFrame(step)
      }
    }

    animationRef.current = requestAnimationFrame(step)

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [isScrolling])

  const resetScroll = () => {
    if (overlayRef.current) {
      overlayRef.current.scrollTop = 0
    }
    setIsScrolling(false)
  }

  if (!isVisible) return null

  const showOverlay =
    isRecording && (recordingSource === 'screen' || recordingSource === 'both')

  return (
    <>
      <Card className='fixed bottom-4 right-4 z-50 w-80 bg-gray-900 text-white'>
        <CardHeader className='flex items-center justify-between py-2'>
          <CardTitle className='text-sm'>Teleprompter</CardTitle>
          <Button size='sm' variant='ghost' onClick={onToggleVisibility}>
            ×
          </Button>
        </CardHeader>
        <CardContent className='space-y-2'>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            className='h-24 w-full rounded bg-gray-800 p-2 text-sm'
            placeholder='Enter script...'
          />
          <div className='flex gap-2'>
            <Button size='sm' onClick={() => setIsScrolling(!isScrolling)}>
              {isScrolling ? 'Pause' : 'Start'}
            </Button>
            <Button size='sm' variant='secondary' onClick={resetScroll}>
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      {showOverlay && (
        <div className='fixed bottom-0 left-0 right-0 z-40 pointer-events-none'>
          <div
            ref={overlayRef}
            className='mx-auto mb-4 max-h-40 w-3/4 overflow-hidden rounded bg-black/70 p-4 text-center text-lg leading-relaxed text-white whitespace-pre-wrap'
          >
            {text}
          </div>
        </div>
      )}
    </>
  )
}
