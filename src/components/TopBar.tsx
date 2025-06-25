'use client'

import { Menu, Settings, Users, HelpCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { useTranslation } from '@/lib/useTranslation'
import LanguageSwitcher from './LanguageSwitcher'

export default function TopBar() {
  const { t, language, mounted } = useTranslation()
  
  return (
    <div className="flex items-center justify-between p-4 bg-background border-b border-border">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon">
          <Menu className="h-5 w-5" />
        </Button>
        
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold text-foreground">
            {mounted ? t.videoPresenter : 'Video Presenter'}
          </h1>
          <Badge variant="secondary" className="px-2 py-1 text-xs">
            {mounted ? t.beta : 'Beta'}
          </Badge>
          <Badge variant="outline" className="px-2 py-1 text-xs bg-yellow-100 dark:bg-yellow-900">
            {language === 'en' ? '🇺🇸 EN' : '🇧🇷 PT'}
          </Badge>
        </div>
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