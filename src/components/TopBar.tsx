'use client'

import { Settings, Users, HelpCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { useTranslation } from '@/lib/useTranslation'
import LanguageSwitcher from './LanguageSwitcher'

// Logo Component
const VideoPresenterLogo = () => (
  <svg width="300" height="72" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 120">
    {/* Icon: screen with play triangle */}
    <g transform="translate(20, 30)">
      <rect x="0" y="0" width="60" height="60" rx="12" fill="#00BFA6"/>
      <polygon points="22,18 42,30 22,42" fill="white"/>
    </g>

    {/* Wordmark */}
    <text x="100" y="60"
          fontFamily="Segoe UI, sans-serif"
          fontSize="36"
          fontWeight="700"
          fill="#222">
      VideoPresenter
    </text>

    {/* Sub-label: Pro badge */}
    <rect x="365" y="35" rx="5" ry="5" width="60" height="28" fill="#00BFA6"/>
    <text x="395" y="55" textAnchor="middle"
          fontFamily="Segoe UI, sans-serif"
          fontSize="16"
          fontWeight="600"
          fill="white">
      PRO
    </text>
  </svg>
)

export default function TopBar() {
  const { t, mounted } = useTranslation()
  
  return (
    <div className="flex items-center justify-between p-4 bg-background border-b border-border">
      <div className="flex items-center">
        <VideoPresenterLogo />
      </div>

      <div className="flex items-center gap-2">
        <LanguageSwitcher />
        
        <Separator orientation="vertical" className="h-6" />
        
        <Button variant="ghost" size="icon" title="Users">
          <Users className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" title="Help">
          <HelpCircle className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" title={mounted ? t.settings : 'Settings'}>
          <Settings className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
} 