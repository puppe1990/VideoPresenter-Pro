'use client'

import { useTranslation } from '@/lib/useTranslation'
import { Button } from '@/components/ui/button'
import { Languages } from 'lucide-react'

export default function LanguageSwitcher() {
  const { language, changeLanguage } = useTranslation()

  const handleToggleLanguage = () => {
    const newLanguage = language === 'en' ? 'pt-br' : 'en'
    console.log('🌍 Toggling language from', language, 'to', newLanguage)
    changeLanguage(newLanguage)
  }

  return (
    <Button 
      variant="outline" 
      size="sm" 
      className="gap-2" 
      onClick={handleToggleLanguage}
      title={language === 'en' ? 'Switch to Portuguese' : 'Trocar para Inglês'}
    >
      <Languages className="h-4 w-4" />
      <span className="hidden sm:inline">
        {language === 'en' ? '🇺🇸 EN' : '🇧🇷 PT'}
      </span>
    </Button>
  )
} 