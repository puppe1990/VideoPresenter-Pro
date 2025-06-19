'use client'

import { PresenterSettings, RecordingSource } from './VideoPresenter'
import { Eye, EyeOff, Square, Circle, CornerUpRight, MousePointer, Settings, Maximize2, RotateCcw, Video, Download, Type, Camera } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
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
  onDownloadRecording: () => void
  onClearRecording?: () => void
  recordedMimeType?: string
  onPictureInPicture: () => void
  onToggleTeleprompter: () => void
  onToggleCameraPopup: () => void
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
  onToggleCameraPopup
}: ControlsPanelProps) {
  const backgroundOptions = [
    { value: 'visible', label: 'Visible', icon: Eye },
    { value: 'blurred', label: 'Blurred', icon: EyeOff },
    { value: 'hidden', label: 'Hidden', icon: EyeOff },
  ] as const

  const shapeOptions = [
    { value: 'rectangle', icon: Square },
    { value: 'circle', icon: Circle },
    { value: 'rounded', icon: CornerUpRight },
  ] as const

  const colorOptions = [
    { value: '#10b981', name: 'Emerald' },
    { value: '#3b82f6', name: 'Blue' },
    { value: '#8b5cf6', name: 'Purple' },
    { value: '#f59e0b', name: 'Amber' },
    { value: '#ef4444', name: 'Red' },
    { value: '#6b7280', name: 'Gray' },
  ]



  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="w-80 bg-background border-l border-border p-6 overflow-y-auto">
      <div className="flex items-center gap-2 mb-6">
        <h2 className="text-xl font-semibold">Presenter</h2>
        <Badge variant="outline">Beta</Badge>
      </div>

      {/* Recording Controls */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Video className="h-4 w-4" />
            Recording
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Recording source selection */}
          {!isRecording && (
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Record:</Label>
              <div className="grid grid-cols-1 gap-2">
                <Button
                  variant={recordingSource === 'camera' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => onRecordingSourceChange('camera')}
                  className="justify-start text-xs"
                >
                  📹 Camera
                </Button>
                <Button
                  variant={recordingSource === 'screen' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => onRecordingSourceChange('screen')}
                  className="justify-start text-xs"
                >
                  🖥️ Screen
                </Button>
                <Button
                  variant={recordingSource === 'both' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => onRecordingSourceChange('both')}
                  className="justify-start text-xs"
                >
                  📹🖥️ Both
                </Button>
              </div>
            </div>
          )}
          
          {/* Recording controls */}
          <div className="space-y-2">
            {!isRecording ? (
              <Button
                onClick={onStartRecording}
                variant="destructive"
                size="sm"
                className="w-full"
              >
                <div className="w-2 h-2 bg-white rounded-full mr-2"></div>
                Record {recordingSource === 'camera' ? 'Camera' : recordingSource === 'screen' ? 'Screen' : 'Both'}
              </Button>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Recording: {recordingSource}</span>
                  <span className="font-mono">{formatDuration(recordingDuration)}</span>
                </div>
                <Button
                  onClick={onStopRecording}
                  variant="destructive"
                  size="sm"
                  className="w-full animate-pulse"
                >
                  <div className="w-2 h-2 bg-white mr-2"></div>
                  Stop Recording
                </Button>
              </div>
            )}
            
            {downloadUrl && !isRecording && (
              <div className="space-y-3">
                {/* Video Preview */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-muted-foreground">Preview</Label>
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
                
                {/* Action Buttons */}
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    onClick={onDownloadRecording}
                    variant="default"
                    size="sm"
                    className="text-xs"
                  >
                    <Download className="h-3 w-3 mr-1" />
                    Download
                  </Button>
                  {onClearRecording && (
                    <Button
                      onClick={onClearRecording}
                      variant="outline"
                      size="sm"
                      className="text-xs"
                    >
                      <Video className="h-3 w-3 mr-1" />
                      Record Again
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
          
          {/* Picture-in-Picture */}
          <Separator />
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Stay Visible</Label>
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
              Picture-in-Picture
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Real background */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Real background</CardTitle>
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
          <CardTitle className="text-sm">Shape</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            {shapeOptions.map(({ value, icon: Icon }) => (
              <Button
                key={value}
                variant={settings.shape === value ? "default" : "outline"}
                size="icon"
                onClick={() => onSettingsChange({ ...settings, shape: value })}
                className="h-10 w-10"
              >
                <Icon className="h-4 w-4" />
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Color */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Color</CardTitle>
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

      {/* Video Size */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Maximize2 className="h-4 w-4" />
            Video Size
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
                {size === 'xlarge' ? 'X-Large' : size}
              </Button>
            ))}
          </div>
          
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Size: {settings.size}</Label>
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
            <Label className="text-xs text-muted-foreground">Position</Label>
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
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Additional settings */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Additional settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-sm w-full justify-start"
            onClick={onToggleTeleprompter}
          >
            <Type className="mr-2 h-4 w-4" />
            Teleprompter
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-sm w-full justify-start"
            onClick={onToggleCameraPopup}
          >
            <Camera className="mr-2 h-4 w-4" />
            Camera Popup
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-sm w-full justify-start"
            onClick={onPictureInPicture}
          >
            <Maximize2 className="mr-2 h-4 w-4" />
            Picture in Picture
          </Button>
          <Button variant="ghost" size="sm" className="text-sm w-full justify-start">
            <Settings className="mr-2 h-4 w-4" />
            Advanced options
          </Button>
        </CardContent>
      </Card>

      {/* Virtual background */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Virtual background</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-2">
            {/* Green screen option */}
            <Button
              variant="outline"
              onClick={() => onSettingsChange({ ...settings, virtualBackground: null })}
              className="aspect-video p-1 h-auto"
            >
              <div className="w-full h-full bg-gradient-to-br from-green-400 to-green-600 rounded-sm flex items-center justify-center">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              </div>
            </Button>
            
            {/* Space background */}
            <Button
              variant="outline"
              onClick={() => onSettingsChange({ ...settings, virtualBackground: 'space' })}
              className="aspect-video p-1 h-auto"
            >
              <div className="w-full h-full bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 rounded-sm relative overflow-hidden">
                <div className="absolute top-1 right-1 w-0.5 h-0.5 bg-white rounded-full"></div>
                <div className="absolute bottom-1 left-1 w-0.5 h-0.5 bg-white rounded-full"></div>
                <div className="absolute top-1/2 left-1/2 w-0.5 h-0.5 bg-white rounded-full"></div>
              </div>
            </Button>
            
            {/* Office background */}
            <Button
              variant="outline"
              onClick={() => onSettingsChange({ ...settings, virtualBackground: 'office' })}
              className="aspect-video p-1 h-auto"
            >
              <div className="w-full h-full bg-gradient-to-br from-amber-100 to-orange-200 rounded-sm"></div>
            </Button>
          </div>
          
          <Button variant="ghost" size="sm" className="w-full text-sm">
            See all backgrounds
          </Button>
        </CardContent>
      </Card>

      <Separator className="my-6" />

      {/* Pointer */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Pointer</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MousePointer className="h-4 w-4" />
              <Label htmlFor="show-pointer" className="text-sm">Show logo</Label>
            </div>
            <Switch
              id="show-pointer"
              checked={settings.showPointer}
              onCheckedChange={(checked) => 
                onSettingsChange({ ...settings, showPointer: checked })
              }
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 