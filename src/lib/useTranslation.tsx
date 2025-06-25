'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { Language, translations, Translations } from './translations'

interface TranslationContextType {
  language: Language
  t: Translations
  changeLanguage: (newLanguage: Language) => void
  isPortuguese: boolean
  isEnglish: boolean
  mounted: boolean
}

const TranslationContext = createContext<TranslationContextType | undefined>(undefined)

export function TranslationProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>('en')
  const [mounted, setMounted] = useState(false)

  // Initialize language from localStorage after component mounts
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('video-presenter-language') as Language
      const initialLanguage = saved && (saved === 'en' || saved === 'pt-br') ? saved : 'en'
      console.log('🌍 Initializing language:', initialLanguage)
      setLanguage(initialLanguage)
    }
    setMounted(true)
  }, [])

  // Save language to localStorage when it changes
  useEffect(() => {
    if (typeof window !== 'undefined' && mounted) {
      localStorage.setItem('video-presenter-language', language)
      console.log('💾 Language saved to localStorage:', language)
    }
  }, [language, mounted])

  const changeLanguage = (newLanguage: Language) => {
    console.log('🎯 changeLanguage called - from:', language, 'to:', newLanguage)
    setLanguage(newLanguage)
  }

  // Always get current translations - don't wait for mounted
  const t = translations[language]

  const value: TranslationContextType = {
    language,
    t,
    changeLanguage,
    isPortuguese: language === 'pt-br',
    isEnglish: language === 'en',
    mounted
  }

  return (
    <TranslationContext.Provider value={value}>
      {children}
    </TranslationContext.Provider>
  )
}

export function useTranslation() {
  const context = useContext(TranslationContext)
  if (context === undefined) {
    throw new Error('useTranslation must be used within a TranslationProvider')
  }
  return context
} 