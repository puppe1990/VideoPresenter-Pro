'use client'

import { PresenterSettings, RecordingSource } from './VideoPresenter'
import { Eye, EyeOff, Square, Circle, CornerUpRight, Settings, Maximize2, RotateCcw, Video, Download, Type, Camera, FileVideo, FileText, Hexagon, Diamond, Heart, Star, Upload, X } from 'lucide-react'
import { useRef, useEffect } from 'react'
import { useTranslation } from '@/lib/useTranslation'
import { type ExportFormat, type ConversionProgress, videoExporter } from '@/lib/videoConverter'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Slider } from '@/components/ui/slider'
import clsx from 'clsx'

interface ControlsPanelProps {
  settings: PresenterSettings
  onSettingsChange: (settings: PresenterSettings) => void
  isRecording: boolean
  recordingSource: RecordingSource
  onRecordingSourceChange: (source: RecordingSource) => void
  onStartRecording: () => void
  onStopRecording: () => void
  recordingDuration: number
  downloadUrl: string | null
  onDownloadRecording: (format?: ExportFormat) => void
  onClearRecording?: () => void
  recordedMimeType?: string
  onPictureInPicture: () => void
  onToggleTeleprompter: () => void
  onToggleCameraPopup: () => void
  onAddNote: () => void
  exportFormat: ExportFormat
  onExportFormatChange: (format: ExportFormat) => void
  isConverting: boolean
  conversionProgress: ConversionProgress | null
}

export default function ControlsPanel({ 
  settings, 
  onSettingsChange, 
  isRecording, 
  recordingSource, 
  onRecordingSourceChange, 
  onStartRecording, 
  onStopRecording, 
  recordingDuration, 
  downloadUrl, 
  onDownloadRecording,
  onClearRecording,
  recordedMimeType,
  onPictureInPicture,
  onToggleTeleprompter,
  onToggleCameraPopup,
  onAddNote,
  exportFormat,
  onExportFormatChange,
  isConverting,
  conversionProgress
}: ControlsPanelProps) {
  const { t, mounted } = useTranslation()
  const bgInputRef = useRef<HTMLInputElement>(null)
  const customBgUrlRef = useRef<string | null>(null)

  useEffect(() => {
    return () => {
      if (customBgUrlRef.current) {
        URL.revokeObjectURL(customBgUrlRef.current)
      }
    }
  }, [])
  
  const backgroundOptions = [
    { value: 'visible', label: t.visible, icon: Eye },
    { value: 'blurred', label: t.blurred, icon: EyeOff },
    { value: 'hidden', label: t.hidden, icon: EyeOff },
  ] as const

  const shapeOptions = [
    { value: 'rectangle', icon: Square, label: 'Rectangle' },
    { value: 'circle', icon: Circle, label: 'Circle' },
    { value: 'rounded', icon: CornerUpRight, label: 'Rounded' },
    { value: 'hexagon', icon: Hexagon, label: 'Hexagon' },
    { value: 'diamond', icon: Diamond, label: 'Diamond' },
    { value: 'heart', icon: Heart, label: 'Heart' },
    { value: 'star', icon: Star, label: 'Star' },
  ] as const

  const colorOptions = [
    { value: '#3b82f6', name: t.blue }, // Moved to first position as default
    { value: '#8b5cf6', name: t.purple },
    { value: '#10b981', name: t.emerald },
    { value: '#f59e0b', name: t.amber },
    { value: '#ef4444', name: t.red },
    { value: '#6b7280', name: t.gray },
  ]

  const filterOptions = [
    { value: 'none', label: t.noFilter },
    { value: 'grayscale', label: t.grayscale },
    { value: 'sepia', label: t.sepia },
    { value: 'invert', label: t.invert }
  ] as const

  const handleBgUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const url = URL.createObjectURL(file)
      if (customBgUrlRef.current) {
        URL.revokeObjectURL(customBgUrlRef.current)
      }
      customBgUrlRef.current = url
      onSettingsChange({ ...settings, virtualBackground: url })
      e.target.value = ''
    }
  }

  const removeCustomBg = () => {
    if (customBgUrlRef.current) {
      URL.revokeObjectURL(customBgUrlRef.current)
      customBgUrlRef.current = null
    }
    onSettingsChange({ ...settings, virtualBackground: null })
  }



  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="w-80 bg-background border-l border-border flex flex-col h-full">
      <div className="flex items-center gap-2 p-6 pb-4 flex-shrink-0">
        <h2 className="text-xl font-semibold">{mounted ? t.videoPresenter : 'Video Presenter'}</h2>
        <Badge variant="outline">{mounted ? t.beta : 'Beta'}</Badge>
      </div>
      
      <div className="flex-1 overflow-y-auto px-6 pb-6 min-h-0">{/* Space for content */}

      {/* Virtual background - MOVED TO TOP */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">{mounted ? t.virtualBackground : 'Virtual background'}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* First row - Popular options */}
          <div className="grid grid-cols-3 gap-2">
            {/* Tech background - default */}
            <Button
              variant={settings.virtualBackground === 'tech' ? "default" : "outline"}
              onClick={() => onSettingsChange({ ...settings, virtualBackground: 'tech' })}
              className="aspect-video p-1 h-auto"
              title={mounted ? t.techBackground : 'Tech/Futuristic background'}
            >
              <div className="w-full h-full bg-gradient-to-br from-cyan-400 via-blue-500 to-purple-600 rounded-sm relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent transform -skew-x-12"></div>
              </div>
            </Button>
            
            {/* Space background */}
            <Button
              variant={settings.virtualBackground === 'space' ? "default" : "outline"}
              onClick={() => onSettingsChange({ ...settings, virtualBackground: 'space' })}
              className="aspect-video p-1 h-auto"
              title={mounted ? t.spaceBackground : 'Space background'}
            >
              <div className="w-full h-full bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 rounded-sm relative overflow-hidden">
                <div className="absolute top-1 right-1 w-0.5 h-0.5 bg-white rounded-full"></div>
                <div className="absolute bottom-1 left-1 w-0.5 h-0.5 bg-white rounded-full"></div>
                <div className="absolute top-1/2 left-1/2 w-0.5 h-0.5 bg-white rounded-full"></div>
              </div>
            </Button>
            
            {/* Ocean background */}
            <Button
              variant={settings.virtualBackground === 'ocean' ? "default" : "outline"}
              onClick={() => onSettingsChange({ ...settings, virtualBackground: 'ocean' })}
              className="aspect-video p-1 h-auto"
              title={mounted ? t.oceanBackground : 'Ocean background'}
            >
              <div className="w-full h-full bg-gradient-to-br from-blue-600 via-cyan-500 to-teal-400 rounded-sm"></div>
            </Button>
          </div>

          {/* Expandable section for more backgrounds */}
          <details className="group">
            <summary className="cursor-pointer text-xs text-muted-foreground hover:text-primary flex items-center gap-1">
              <span>{mounted ? t.moreBackgrounds : 'More backgrounds'}</span>
              <svg className="w-3 h-3 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </summary>
            <div className="mt-2 space-y-2">
              {/* Professional backgrounds */}
              <div className="grid grid-cols-3 gap-2">
                <Button
                  variant={settings.virtualBackground === 'dark-pro' ? "default" : "outline"}
                  onClick={() => onSettingsChange({ ...settings, virtualBackground: 'dark-pro' })}
                  className="aspect-video p-1 h-auto"
                  title="Dark professional background"
                >
                  <div className="w-full h-full bg-gradient-to-br from-gray-900 via-slate-800 to-zinc-900 rounded-sm"></div>
                </Button>
                
                <Button
                  variant={settings.virtualBackground === 'modern-office' ? "default" : "outline"}
                  onClick={() => onSettingsChange({ ...settings, virtualBackground: 'modern-office' })}
                  className="aspect-video p-1 h-auto"
                  title="Modern office background"
                >
                  <div className="w-full h-full bg-gradient-to-br from-slate-100 via-gray-200 to-zinc-300 rounded-sm"></div>
                </Button>
                
                <Button
                  variant={settings.virtualBackground === 'library' ? "default" : "outline"}
                  onClick={() => onSettingsChange({ ...settings, virtualBackground: 'library' })}
                  className="aspect-video p-1 h-auto"
                  title="Library background"
                >
                  <div className="w-full h-full bg-gradient-to-br from-amber-900 via-yellow-800 to-orange-700 rounded-sm"></div>
                </Button>
              </div>

              {/* Nature & Creative */}
              <div className="grid grid-cols-3 gap-2">
                <Button
                  variant={settings.virtualBackground === 'forest' ? "default" : "outline"}
                  onClick={() => onSettingsChange({ ...settings, virtualBackground: 'forest' })}
                  className="aspect-video p-1 h-auto"
                  title="Forest background"
                >
                  <div className="w-full h-full bg-gradient-to-br from-green-800 via-green-600 to-emerald-500 rounded-sm"></div>
                </Button>
                
                <Button
                  variant={settings.virtualBackground === 'sunset' ? "default" : "outline"}
                  onClick={() => onSettingsChange({ ...settings, virtualBackground: 'sunset' })}
                  className="aspect-video p-1 h-auto"
                  title="Sunset background"
                >
                  <div className="w-full h-full bg-gradient-to-br from-orange-500 via-pink-500 to-purple-600 rounded-sm"></div>
                </Button>
                
                <Button
                  variant={settings.virtualBackground === 'waves' ? "default" : "outline"}
                  onClick={() => onSettingsChange({ ...settings, virtualBackground: 'waves' })}
                  className="aspect-video p-1 h-auto"
                  title="Abstract waves background"
                >
                  <div className="w-full h-full bg-gradient-to-br from-violet-400 via-purple-500 to-indigo-600 rounded-sm"></div>
                </Button>
              </div>

              {/* More options */}
              <div className="grid grid-cols-3 gap-2">
                <Button
                  variant={settings.virtualBackground === 'office' ? "default" : "outline"}
                  onClick={() => onSettingsChange({ ...settings, virtualBackground: 'office' })}
                  className="aspect-video p-1 h-auto"
                  title="Warm office background"
                >
                  <div className="w-full h-full bg-gradient-to-br from-amber-100 to-orange-200 rounded-sm"></div>
                </Button>
                
                <Button
                  variant={settings.virtualBackground === 'city' ? "default" : "outline"}
                  onClick={() => onSettingsChange({ ...settings, virtualBackground: 'city' })}
                  className="aspect-video p-1 h-auto"
                  title="City skyline background"
                >
                  <div className="w-full h-full bg-gradient-to-br from-slate-700 via-blue-800 to-indigo-900 rounded-sm"></div>
                </Button>
                
                <Button
                  variant={settings.virtualBackground === 'warm' ? "default" : "outline"}
                  onClick={() => onSettingsChange({ ...settings, virtualBackground: 'warm' })}
                  className="aspect-video p-1 h-auto"
                  title="Warm gradient background"
                >
                  <div className="w-full h-full bg-gradient-to-br from-rose-300 via-pink-400 to-red-500 rounded-sm"></div>
                </Button>
              </div>

              {/* Clean options */}
              <div className="grid grid-cols-3 gap-2">
                <Button
                  variant={settings.virtualBackground === 'clean-white' ? "default" : "outline"}
                  onClick={() => onSettingsChange({ ...settings, virtualBackground: 'clean-white' })}
                  className="aspect-video p-1 h-auto"
                  title="Clean white background"
                >
                  <div className="w-full h-full bg-gradient-to-br from-gray-50 to-white rounded-sm border"></div>
                </Button>
                
                <Button
                  variant={settings.virtualBackground === 'soft-blur' ? "default" : "outline"}
                  onClick={() => onSettingsChange({ ...settings, virtualBackground: 'soft-blur' })}
                  className="aspect-video p-1 h-auto"
                  title="Soft blur background"
                >
                  <div className="w-full h-full bg-gradient-to-br from-blue-50 via-indigo-100 to-purple-200 rounded-sm"></div>
                </Button>
                
                <Button
                  variant={settings.virtualBackground === null ? "default" : "outline"}
                  onClick={() => onSettingsChange({ ...settings, virtualBackground: null })}
                  className="aspect-video p-1 h-auto"
                  title={mounted ? t.noBackground : 'No background (Green screen effect)'}
                >
                  <div className="w-full h-full bg-gradient-to-br from-green-400 to-green-600 rounded-sm flex items-center justify-center">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  </div>
                </Button>
              </div>
            </div>
          </details>
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">{mounted ? t.customBackground : 'Custom background'}</Label>
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start"
              onClick={() => bgInputRef.current?.click()}
            >
              <Upload className="mr-2 h-4 w-4" />
              {mounted ? t.uploadBackground : 'Upload background'}
            </Button>
            {settings.virtualBackground && settings.virtualBackground.startsWith('blob:') && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start"
                onClick={removeCustomBg}
              >
                <X className="mr-2 h-4 w-4" />
                {mounted ? t.removeBackground : 'Remove background'}
              </Button>
            )}
            <input
              ref={bgInputRef}
              type="file"
              accept="image/*"
              onChange={handleBgUpload}
              className="hidden"
            />
          </div>
        </CardContent>
      </Card>

      {/* Recording Controls */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Video className="h-4 w-4" />
            {mounted ? t.recording : 'Recording'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Recording source selection */}
          {!isRecording && (
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">{mounted ? t.record : 'Record'}:</Label>
              <div className="grid grid-cols-1 gap-2">
                                  <Button
                    variant={recordingSource === 'camera' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => onRecordingSourceChange('camera')}
                    className="justify-start text-xs"
                  >
                    📹 {mounted ? t.camera : 'Camera'}
                  </Button>
                  <Button
                    variant={recordingSource === 'screen' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => onRecordingSourceChange('screen')}
                    className="justify-start text-xs"
                  >
                    🖥️ {mounted ? t.screen : 'Screen'}
                  </Button>
                  <Button
                    variant={recordingSource === 'both' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => onRecordingSourceChange('both')}
                    className="justify-start text-xs"
                  >
                    📹🖥️ {mounted ? t.both : 'Both'}
                  </Button>
              </div>
            </div>
          )}
          
          {/* Recording controls */}
          <div className="space-y-2">
            {!isRecording ? (
                              <Button
                  onClick={() => {
                    console.log('🎬 RECORD BUTTON CLICKED in ControlsPanel')
                    console.log('📋 Recording source:', recordingSource)
                    console.log('🔍 Is recording already?', isRecording)
                    console.log('📞 Calling onStartRecording...')
                    onStartRecording()
                    console.log('✅ onStartRecording called')
                  }}
                  variant="destructive"
                  size="sm"
                  className="w-full"
                  disabled={isRecording}
                >
                  <div className="w-2 h-2 bg-white rounded-full mr-2"></div>
                  {mounted ? t.record : 'Record'} {recordingSource === 'camera' ? (mounted ? t.camera : 'Camera') : recordingSource === 'screen' ? (mounted ? t.screen : 'Screen') : (mounted ? t.both : 'Both')}
                </Button>
            ) : (
              <div className="space-y-2">
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                      <span className="text-muted-foreground">
                        {mounted ? t.recordingActive : 'Recording'} {recordingSource === 'camera' ? `📹 ${mounted ? t.camera : 'Camera'}` : 
                                  recordingSource === 'screen' ? `🖥️ ${mounted ? t.screen : 'Screen'}` : 
                                  `📹🖥️ ${mounted ? t.both : 'Both'}`}
                      </span>
                    </div>
                    <span className="font-mono font-semibold text-red-600">{formatDuration(recordingDuration)}</span>
                  </div>
                  
                  {recordingSource === 'both' && (
                    <div className="text-xs text-muted-foreground bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded border border-amber-200 dark:border-amber-800">
                      💡 {mounted ? t.screenCameraRecording : 'Screen + Camera recording active'}
                    </div>
                  )}
                </div>
                
                <Button
                  onClick={onStopRecording}
                  variant="destructive"
                  size="sm"
                  className="w-full"
                >
                  <div className="w-2 h-2 bg-white mr-2"></div>
                  {mounted ? t.stopRecording : 'Stop Recording'}
                </Button>
              </div>
            )}
            
            {downloadUrl && !isRecording && !isConverting && (
              <div className="space-y-3">
                {/* Video Preview */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-muted-foreground">{mounted ? t.preview : 'Preview'}</Label>
                    <div className="text-xs text-muted-foreground">
                      {formatDuration(recordingDuration)} • {recordedMimeType?.includes('mp4') ? 'MP4' : 'WebM'}
                    </div>
                  </div>
                  <div className="relative rounded-lg overflow-hidden bg-gray-900 border">
                    <video
                      src={downloadUrl}
                      controls
                      className="w-full h-32 object-cover"
                      preload="metadata"
                      poster="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTggNUwyMSAxMkw4IDE5VjVaIiBmaWxsPSIjNjM2MzYzIi8+Cjwvc3ZnPgo="
                    />
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="bg-black/20 rounded-full p-2">
                        <div className="w-6 h-6 text-white opacity-50">
                          <Video className="w-full h-full" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Export Format Selection */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">{mounted ? t.exportFormat : 'Export Format:'}</Label>
                  <div className="grid grid-cols-3 gap-1">
                    {(['webm', 'mp4', 'webp'] as ExportFormat[]).map((format) => {
                      const formatInfo = videoExporter.getFormatInfo(format)
                      return (
                        <Button
                          key={format}
                          variant={exportFormat === format ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => onExportFormatChange(format)}
                          className="text-xs p-2 h-auto flex flex-col gap-1"
                        >
                          <span className="text-xs">{formatInfo.icon}</span>
                          <span className="text-xs font-medium">{formatInfo.name}</span>
                        </Button>
                      )
                    })}
                  </div>
                  <div className="text-xs text-muted-foreground text-center">
                    {videoExporter.getFormatInfo(exportFormat).description}
                  </div>
                </div>
                
                {/* Action Buttons */}
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    onClick={() => onDownloadRecording()}
                    variant="default"
                    size="sm"
                    className="text-xs"
                  >
                    <Download className="h-3 w-3 mr-1" />
                    {mounted ? t.download : 'Download'} {videoExporter.getFormatInfo(exportFormat).name}
                  </Button>
                  {onClearRecording && (
                    <Button
                      onClick={onClearRecording}
                      variant="outline"
                      size="sm"
                      className="text-xs"
                    >
                                              <Video className="h-3 w-3 mr-1" />
                        {mounted ? t.recordAgain : 'Record Again'}
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* Conversion Progress */}
            {isConverting && conversionProgress && (
              <div className="space-y-3">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-muted-foreground">{mounted ? t.converting : 'Converting to'} {videoExporter.getFormatInfo(exportFormat).name}</Label>
                    <div className="text-xs text-muted-foreground">{Math.round(conversionProgress.progress)}%</div>
                  </div>
                  
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full transition-all duration-300"
                      style={{ width: `${conversionProgress.progress}%` }}
                    />
                  </div>
                  
                  <div className="text-xs text-center text-muted-foreground">
                    {conversionProgress.stage}
                  </div>
                </div>
                
                <div className="flex items-center justify-center text-xs text-muted-foreground">
                  <FileVideo className="h-4 w-4 mr-2 animate-pulse" />
                  {mounted ? t.conversionProgress : 'This may take a few moments...'}
                </div>
              </div>
            )}
          </div>
          
          {/* Picture-in-Picture */}
          <Separator />
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">{mounted ? t.stayVisible : 'Stay Visible'}</Label>
            <Button
              onClick={onPictureInPicture}
              variant="outline"
              size="sm"
              className="w-full text-xs"
              title="Picture-in-Picture (Stay visible when switching tabs)"
            >
              <svg className="h-3 w-3 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
                <rect x="8" y="8" width="8" height="6" rx="1" ry="1"/>
              </svg>
              {mounted ? t.pictureInPicture : 'Picture-in-Picture'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Real background */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">{mounted ? t.realBackground : 'Real background'}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            {backgroundOptions.map(({ value, label, icon: Icon }) => (
              <Button
                key={value}
                variant={settings.backgroundType === value ? "default" : "outline"}
                size="sm"
                onClick={() => onSettingsChange({ ...settings, backgroundType: value })}
                className="flex flex-col gap-1 h-auto py-3"
              >
                <Icon className="h-4 w-4" />
                <span className="text-xs">{label}</span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Shape */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">{mounted ? t.shape : 'Shape'}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Current Shape Preview */}
          <div className="flex items-center justify-center p-4 bg-muted/30 rounded-lg">
            <div className="relative">
              <div 
                className="w-16 h-12 bg-gradient-to-br from-blue-500 to-purple-600 transition-all duration-500"
                style={(() => {
                  const baseStyle = {
                    border: `2px solid ${settings.color}`,
                  }
                  
                  switch (settings.shape) {
                    case 'circle':
                      return { ...baseStyle, borderRadius: '50%', width: '48px', height: '48px', aspectRatio: '1/1' }
                    case 'rounded':
                      return { ...baseStyle, borderRadius: '12px' }
                    case 'hexagon':
                      return { ...baseStyle, clipPath: 'polygon(50% 0%, 93.3% 25%, 93.3% 75%, 50% 100%, 6.7% 75%, 6.7% 25%)', borderRadius: '0' }
                    case 'diamond':
                      return { ...baseStyle, clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)', borderRadius: '0' }
                    case 'heart':
                      return { ...baseStyle, clipPath: 'polygon(50% 20%, 20% 0%, 0% 30%, 0% 60%, 50% 100%, 100% 60%, 100% 30%, 80% 0%)', borderRadius: '0' }
                    case 'star':
                      return { ...baseStyle, clipPath: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)', borderRadius: '0' }
                    default:
                      return { ...baseStyle, borderRadius: '8px' }
                  }
                })()}
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-1 h-1 bg-white rounded-full animate-pulse"></div>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-4 gap-2">
            {shapeOptions.slice(0, 4).map(({ value, icon: Icon, label }) => (
              <Button
                key={value}
                variant={settings.shape === value ? "default" : "outline"}
                onClick={() => onSettingsChange({ ...settings, shape: value })}
                className={`h-16 flex flex-col gap-1 transition-all duration-200 ${
                  settings.shape === value ? 'ring-2 ring-primary ring-offset-2 scale-105' : 'hover:scale-102'
                }`}
                title={label}
              >
                <Icon className="h-5 w-5" />
                <span className="text-xs">{label}</span>
              </Button>
            ))}
          </div>
          
          {/* Creative Shapes */}
          <details className="group">
            <summary className="cursor-pointer text-xs text-muted-foreground hover:text-primary flex items-center gap-1">
              <span>Creative Shapes</span>
              <svg className="w-3 h-3 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </summary>
            <div className="mt-2">
                             <div className="grid grid-cols-3 gap-2">
                 {shapeOptions.slice(4).map(({ value, icon: Icon, label }) => (
                   <Button
                     key={value}
                     variant={settings.shape === value ? "default" : "outline"}
                     onClick={() => onSettingsChange({ ...settings, shape: value })}
                     className={`h-16 flex flex-col gap-1 transition-all duration-200 ${
                       settings.shape === value ? 'ring-2 ring-primary ring-offset-2 scale-105' : 'hover:scale-102'
                     }`}
                     title={label}
                   >
                     <Icon className="h-5 w-5" />
                     <span className="text-xs">{label}</span>
                   </Button>
                 ))}
               </div>
            </div>
          </details>
          
          <div className="text-xs text-center text-muted-foreground p-2 bg-accent/20 rounded">
            <span className="font-medium">Current Shape:</span>{' '}
            <span className="font-semibold capitalize text-primary">{settings.shape}</span>
            {settings.shape !== 'rectangle' && (
              <div className="text-xs mt-1 text-muted-foreground">
                ✨ {settings.shape === 'circle' ? 'Perfect for portraits' : 
                     settings.shape === 'rounded' ? 'Professional & modern' :
                     settings.shape === 'hexagon' ? 'Geometric & unique' :
                     settings.shape === 'diamond' ? 'Bold & distinctive' :
                     settings.shape === 'heart' ? 'Creative & playful' :
                     settings.shape === 'star' ? 'Eye-catching & fun' : 'Classic & versatile'}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Color */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">{mounted ? t.color : 'Color'}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 flex-wrap">
            {colorOptions.map(({ value, name }) => (
              <Button
                key={value}
                variant="outline"
                size="icon"
                onClick={() => onSettingsChange({ ...settings, color: value })}
                className={clsx(
                  'h-10 w-10 border-2 transition-all relative',
                  settings.color === value && 'ring-2 ring-primary ring-offset-2'
                )}
                style={{ backgroundColor: value }}
              >
                {settings.color === value && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-2 h-2 bg-white rounded-full" />
                  </div>
                )}
                <span className="sr-only">{name}</span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">{mounted ? t.filters : 'Video filters'}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2">
            {filterOptions.map(({ value, label }) => (
              <Button
                key={value}
                variant={settings.videoFilter === value ? 'default' : 'outline'}
                size="sm"
                onClick={() => onSettingsChange({ ...settings, videoFilter: value })}
                className="text-xs"
              >
                {label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Video Size */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Maximize2 className="h-4 w-4" />
            {mounted ? t.videoSize : 'Video Size'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            {(['small', 'medium', 'large', 'xlarge'] as const).map((size) => (
              <Button
                key={size}
                variant={settings.size === size ? "default" : "outline"}
                size="sm"
                onClick={() => onSettingsChange({ ...settings, size })}
                className="text-xs capitalize"
              >
{mounted ? (size === 'xlarge' ? t.xlarge : t[size]) : (size === 'xlarge' ? 'X-Large' : size)}
              </Button>
            ))}
          </div>
          
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">{mounted ? t.size : 'Size'}: {settings.size}</Label>
            <Slider
              value={[
                settings.size === 'small' ? 25 :
                settings.size === 'medium' ? 50 :
                settings.size === 'large' ? 75 : 100
              ]}
              onValueChange={([value]) => {
                const newSize = 
                  value <= 25 ? 'small' :
                  value <= 50 ? 'medium' :
                  value <= 75 ? 'large' : 'xlarge';
                onSettingsChange({ ...settings, size: newSize });
              }}
              max={100}
              min={25}
              step={25}
              className="w-full"
            />
          </div>
          
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground">{mounted ? t.position : 'Position'}</Label>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onSettingsChange({ 
                ...settings, 
                position: { x: 0, y: 0 } 
              })}
              className="text-xs"
            >
              <RotateCcw className="h-3 w-3 mr-1" />
              {mounted ? t.reset : 'Reset'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Additional settings */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">{mounted ? t.additionalSettings : 'Additional settings'}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {/* File Upload Info */}
          <div className="bg-muted/30 rounded-lg p-3 space-y-2">
            <div className="flex items-center gap-2">
              <Upload className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Add Files to Board</span>
            </div>
            <p className="text-xs text-muted-foreground">
              💡 Drag & drop files anywhere on the board to add them
            </p>
            <div className="text-xs text-muted-foreground">
              <div>📷 Images: .png, .jpg, .gif, .webp</div>
              <div>🎥 Videos: .mp4, .webm, .mov</div>
              <div>📄 Documents: .pdf, .pptx, .key</div>
            </div>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            className="text-sm w-full justify-start"
            onClick={onToggleTeleprompter}
          >
            <Type className="mr-2 h-4 w-4" />
            {mounted ? t.teleprompter : 'Teleprompter'}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-sm w-full justify-start"
            onClick={onAddNote}
          >
            <FileText className="mr-2 h-4 w-4" />
            {mounted ? t.addNote : 'Add Note'}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-sm w-full justify-start"
            onClick={onToggleCameraPopup}
          >
            <Camera className="mr-2 h-4 w-4" />
            {mounted ? t.cameraPopup : 'Camera Popup'}
          </Button>

          <Button variant="ghost" size="sm" className="text-sm w-full justify-start">
            <Settings className="mr-2 h-4 w-4" />
            {mounted ? t.advancedOptions : 'Advanced options'}
          </Button>
        </CardContent>
      </Card>




      </div>
    </div>
  )
} 