'use client'

import { useEffect, useRef, useState } from 'react'
import { useTranslation } from '@/lib/useTranslation'

interface CaptionsOverlayProps {
  isVisible: boolean
}

export default function CaptionsOverlay({ isVisible }: CaptionsOverlayProps) {
  const { language } = useTranslation()
  const [text, setText] = useState('')
  const recognitionRef = useRef<SpeechRecognition | null>(null)

  useEffect(() => {
    if (!isVisible) {
      recognitionRef.current?.stop()
      return
    }

    interface WithWebkit extends Window {
      webkitSpeechRecognition?: typeof SpeechRecognition
    }
    const win = window as WithWebkit
    const SpeechRecognition = win.SpeechRecognition || win.webkitSpeechRecognition
    if (!SpeechRecognition) {
      console.warn('SpeechRecognition API not supported')
      return
    }

    const recognition: SpeechRecognition = new SpeechRecognition()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = language === 'pt-br' ? 'pt-BR' : 'en-US'

    recognition.onresult = (e: SpeechRecognitionEvent) => {
      let latest = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        latest += e.results[i][0].transcript
      }
      setText(latest.trim())
    }

    recognition.onerror = (e) => {
      console.error('Speech recognition error:', e)
    }

    recognitionRef.current = recognition
    recognition.start()

    return () => {
      recognition.stop()
    }
  }, [isVisible, language])

  if (!isVisible) return null

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/70 text-white px-3 py-1 rounded text-sm pointer-events-none max-w-full">
      {text}
    </div>
  )
}
