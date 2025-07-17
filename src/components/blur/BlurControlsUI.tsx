'use client'

import React, { useState, useCallback } from 'react';
import { Eye, EyeOff, Activity, AlertTriangle, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { BlurControlsProps } from '@/lib/blur/types';
import { BLUR_CONSTANTS } from '@/lib/blur/types';

/**
 * UI component for blur controls in the settings panel
 * Provides toggle switch, intensity slider, and status indicators
 */
export function BlurControlsUI({ 
  onToggle, 
  onIntensityChange, 
  status 
}: BlurControlsProps) {
  const [localIntensity, setLocalIntensity] = useState(status.intensity);

  // Handle intensity changes with smooth updates
  const handleIntensityChange = useCallback((value: number[]) => {
    const newIntensity = value[0];
    setLocalIntensity(newIntensity);
    onIntensityChange(newIntensity);
  }, [onIntensityChange]);

  // Handle toggle changes
  const handleToggle = useCallback((enabled: boolean) => {
    onToggle(enabled);
  }, [onToggle]);

  // Get status indicator based on current state
  const getStatusIndicator = () => {
    if (!status.enabled) {
      return {
        icon: EyeOff,
        color: 'text-muted-foreground',
        bgColor: 'bg-muted',
        text: 'Disabled',
        tooltip: 'Human blurring is currently disabled'
      };
    }

    if (status.isProcessing) {
      return {
        icon: Activity,
        color: 'text-blue-500',
        bgColor: 'bg-blue-50',
        text: 'Active',
        tooltip: 'Currently processing video frames for human detection'
      };
    }

    // Check performance metrics for warnings
    const isPerformanceGood = status.performance.fps >= BLUR_CONSTANTS.TARGET_FPS && 
                             status.performance.averageProcessingTime <= BLUR_CONSTANTS.MAX_PROCESSING_TIME_MS;

    if (!isPerformanceGood) {
      return {
        icon: AlertTriangle,
        color: 'text-yellow-500',
        bgColor: 'bg-yellow-50',
        text: 'Performance',
        tooltip: `Performance warning: ${status.performance.fps.toFixed(1)} FPS, ${status.performance.averageProcessingTime.toFixed(1)}ms processing time`
      };
    }

    return {
      icon: CheckCircle,
      color: 'text-green-500',
      bgColor: 'bg-green-50',
      text: 'Ready',
      tooltip: 'Human blurring is enabled and performing well'
    };
  };

  const statusInfo = getStatusIndicator();
  const StatusIcon = statusInfo.icon;

  return (
    <TooltipProvider>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Eye className="w-4 h-4" />
              Human Blurring
            </CardTitle>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge 
                  variant="outline" 
                  className={`${statusInfo.bgColor} ${statusInfo.color} border-current`}
                >
                  <StatusIcon className="w-3 h-3 mr-1" />
                  {statusInfo.text}
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p>{statusInfo.tooltip}</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Toggle Switch */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="blur-toggle" className="text-sm font-medium">
                Enable Blurring
              </Label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <p className="text-xs text-muted-foreground cursor-help">
                    Automatically blur human figures in video
                  </p>
                </TooltipTrigger>
                <TooltipContent>
                  <p>When enabled, the system will detect and blur human figures in real-time to protect privacy</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <Switch
              id="blur-toggle"
              checked={status.enabled}
              onCheckedChange={handleToggle}
            />
          </div>

          {/* Intensity Slider */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="blur-intensity" className="text-sm font-medium">
                Blur Intensity
              </Label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="text-xs text-muted-foreground cursor-help">
                    {localIntensity}%
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Adjust the strength of the blur effect applied to detected humans</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <Slider
              id="blur-intensity"
              min={BLUR_CONSTANTS.MIN_INTENSITY}
              max={BLUR_CONSTANTS.MAX_INTENSITY}
              step={1}
              value={[localIntensity]}
              onValueChange={handleIntensityChange}
              disabled={!status.enabled}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Light</span>
              <span>Strong</span>
            </div>
          </div>

          {/* Performance Metrics */}
          {status.enabled && (
            <div className="space-y-2 pt-2 border-t">
              <Label className="text-xs font-medium text-muted-foreground">
                Performance
              </Label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex justify-between cursor-help">
                      <span>FPS:</span>
                      <span className={status.performance.fps >= BLUR_CONSTANTS.TARGET_FPS ? 'text-green-600' : 'text-yellow-600'}>
                        {status.performance.fps.toFixed(1)}
                      </span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Frames processed per second (target: {BLUR_CONSTANTS.TARGET_FPS} FPS)</p>
                  </TooltipContent>
                </Tooltip>
                
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex justify-between cursor-help">
                      <span>Processing:</span>
                      <span className={status.performance.averageProcessingTime <= BLUR_CONSTANTS.MAX_PROCESSING_TIME_MS ? 'text-green-600' : 'text-yellow-600'}>
                        {status.performance.averageProcessingTime.toFixed(0)}ms
                      </span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Average processing time per frame (target: ≤{BLUR_CONSTANTS.MAX_PROCESSING_TIME_MS}ms)</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}