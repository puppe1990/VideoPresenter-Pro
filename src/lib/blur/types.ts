/**
 * Core types and interfaces for the real-time human blurring system
 */

export interface DetectionResult {
  mask: ImageData;
  confidence: number;
  processingTime: number;
}

export interface HumanDetectionService {
  initialize(): Promise<void>;
  detectHumans(imageData: ImageData): Promise<DetectionResult>;
  dispose(): void;
}

export interface BlurProcessingEngine {
  applyBlur(
    originalFrame: ImageData, 
    mask: ImageData, 
    intensity?: number
  ): ImageData;
  setBlurIntensity(intensity: number): void;
}

export interface PerformanceMetrics {
  fps: number;
  averageProcessingTime: number;
  detectionAccuracy: number;
  memoryUsage: number;
}

export interface BlurStatus {
  enabled: boolean;
  intensity: number;
  isProcessing: boolean;
  performance: PerformanceMetrics;
}

export interface BlurController {
  enable(): void;
  disable(): void;
  setIntensity(intensity: number): void;
  processFrame(frame: ImageData): Promise<ImageData>;
  getStatus(): BlurStatus;
}

export interface BlurConfig {
  enabled: boolean;
  intensity: number; // 0-100
  modelPath: string;
  performanceThreshold: number; // max processing time in ms
  fallbackMode: boolean;
}

export interface BlurControlsProps {
  onToggle: (enabled: boolean) => void;
  onIntensityChange: (intensity: number) => void;
  status: BlurStatus;
}

// Error types for better error handling
export class BlurError extends Error {
  constructor(
    message: string,
    public code: BlurErrorCode,
    public cause?: Error
  ) {
    super(message);
    this.name = 'BlurError';
  }
}

export enum BlurErrorCode {
  MODEL_LOAD_FAILED = 'MODEL_LOAD_FAILED',
  DETECTION_FAILED = 'DETECTION_FAILED',
  PROCESSING_FAILED = 'PROCESSING_FAILED',
  PERFORMANCE_DEGRADED = 'PERFORMANCE_DEGRADED',
  BROWSER_UNSUPPORTED = 'BROWSER_UNSUPPORTED'
}

// Constants for configuration
export const BLUR_CONSTANTS = {
  DEFAULT_INTENSITY: 50,
  MIN_INTENSITY: 0,
  MAX_INTENSITY: 100,
  TARGET_FPS: 24,
  MAX_PROCESSING_TIME_MS: 50,
  MODEL_URL: 'https://storage.googleapis.com/tfjs-models/savedmodel/bodypix/mobilenet/float/075/model-stride16.json'
} as const;