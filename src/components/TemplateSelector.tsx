'use client'

import { templates } from '@/lib/templates'
import { PresenterSettings } from './VideoPresenter'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useTranslation } from '@/lib/useTranslation'

interface TemplateSelectorProps {
  settings: PresenterSettings
  onSettingsChange: (settings: PresenterSettings) => void
}

export default function TemplateSelector({ settings, onSettingsChange }: TemplateSelectorProps) {
  const { t } = useTranslation()

  const applyTemplate = (idx: number) => {
    const template = templates[idx]
    onSettingsChange({
      ...settings,
      ...template.settings,
      position: template.settings.position ?? settings.position
    })
  }

  return (
    <Card className='mb-6'>
      <CardHeader className='pb-3'>
        <CardTitle className='text-sm'>{t.templates}</CardTitle>
      </CardHeader>
      <CardContent className='flex flex-col gap-2'>
        {templates.map((tpl, i) => (
          <Button key={tpl.name} variant='outline' onClick={() => applyTemplate(i)}>
            {tpl.name}
          </Button>
        ))}
      </CardContent>
    </Card>
  )
}
