import type { 
  BlurController as IBlurController, 
  BlurStatus, 
  BlurConfig,
  PerformanceMetrics,
  HumanDetectionService as IHumanDetectionService,
  BlurProcessingEngine as IBlurProcessingEngine
} from './types';
import { HumanDetectionService } from './HumanDetectionService';
import { BlurProcessingEngine } from './BlurProcessingEngine';
import { BlurError, BlurErrorCode, BLUR_CONSTANTS } from './types';

/**
 * Main controller that orchestrates human detection and blur processing
 * Manages the complete blur pipeline with performance monitoring and fallback mechanisms
 */
export class BlurController implements IBlurController {
  private detectionService: IHumanDetectionService;
  private processingEngine: IBlurProcessingEngine;
  private config: BlurConfig;
  private isEnabled: boolean = false;
  private isProcessing: boolean = false;
  private isInitialized: boolean = false;
  
  // Performance tracking
  private performanceMetrics: PerformanceMetrics = {
    fps: 0,
    averageProcessingTime: 0,
    detectionAccuracy: 0,
    memoryUsage: 0
  };
  
  private frameProcessingTimes: number[] = [];
  private lastFrameTime: number = 0;
  private frameCount: number = 0;
  private totalDetectionAccuracy: number = 0;
  private fallbackMode: boolean = false;
  private consecutiveSlowFrames: number = 0;
  
  // Constants for performance monitoring
  private static readonly MAX_PROCESSING_TIMES_HISTORY = 30;
  private static readonly SLOW_FRAME_THRESHOLD = 3;
  private static readonly FALLBACK_RECOVERY_FRAMES = 10;

  constructor(config?: Partial<BlurConfig>) {
    this.config = {
      enabled: false,
      intensity: BLUR_CONSTANTS.DEFAULT_INTENSITY,
      modelPath: BLUR_CONSTANTS.MODEL_URL,
      performanceThreshold: BLUR_CONSTANTS.MAX_PROCESSING_TIME_MS,
      fallbackMode: false,
      ...config
    };

    this.detectionService = new HumanDetectionService();
    this.processingEngine = new BlurProcessingEngine();
    
    // Set initial blur intensity
    this.processingEngine.setBlurIntensity(this.config.intensity);
  }

  /**
   * Initialize the blur system and enable processing
   */
  async enable(): Promise<void> {
    if (this.isEnabled) {
      return;
    }

    try {
      // Initialize detection service if not already done
      if (!this.isInitialized) {
        await this.detectionService.initialize();
        this.isInitialized = true;
      }

      this.isEnabled = true;
      this.config.enabled = true;
      this.resetPerformanceMetrics();
      
    } catch (error) {
      this.isEnabled = false;
      this.config.enabled = false;
      
      if (error instanceof BlurError) {
        throw error;
      }
      throw new BlurError(
        'Failed to enable blur controller',
        BlurErrorCode.MODEL_LOAD_FAILED,
        error as Error
      );
    }
  }

  /**
   * Disable blur processing
   */
  disable(): void {
    this.isEnabled = false;
    this.config.enabled = false;
    this.isProcessing = false;
    this.fallbackMode = false;
    this.resetPerformanceMetrics();
  }

  /**
   * Set blur intensity and update processing engine
   */
  setIntensity(intensity: number): void {
    // Validate and clamp intensity
    const clampedIntensity = Math.max(
      BLUR_CONSTANTS.MIN_INTENSITY,
      Math.min(BLUR_CONSTANTS.MAX_INTENSITY, intensity)
    );
    
    this.config.intensity = clampedIntensity;
    this.processingEngine.setBlurIntensity(clampedIntensity);
  }

  /**
   * Process a single frame through the blur pipeline
   */
  async processFrame(frame: ImageData): Promise<ImageData> {
    // Return original frame if disabled
    if (!this.isEnabled || !this.isInitialized) {
      return frame;
    }

    // Prevent concurrent processing
    if (this.isProcessing) {
      return frame;
    }

    this.isProcessing = true;
    const startTime = performance.now();

    try {
      // In fallback mode, skip detection periodically to maintain performance
      if (this.fallbackMode && this.frameCount % 3 !== 0) {
        this.frameCount++;
        this.isProcessing = false;
        return frame;
      }

      // Perform human detection
      const detectionResult = await this.detectionService.detectHumans(frame);
      
      // Apply blur effect using the detection mask
      const blurredFrame = this.processingEngine.applyBlur(
        frame, 
        detectionResult.mask, 
        this.config.intensity
      );

      // Update performance metrics
      const processingTime = performance.now() - startTime;
      this.updatePerformanceMetrics(processingTime, detectionResult.confidence);
      
      // Check for performance degradation and adjust accordingly
      this.handlePerformanceMonitoring(processingTime);

      this.isProcessing = false;
      return blurredFrame;

    } catch (error) {
      this.isProcessing = false;
      
      // Handle errors gracefully - return original frame and log error
      console.error('Frame processing failed:', error);
      
      // Enable fallback mode on repeated failures
      this.enableFallbackMode();
      
      return frame;
    }
  }

  /**
   * Get current blur system status
   */
  getStatus(): BlurStatus {
    return {
      enabled: this.isEnabled,
      intensity: this.config.intensity,
      isProcessing: this.isProcessing,
      performance: { ...this.performanceMetrics }
    };
  }

  /**
   * Update performance metrics with latest frame data
   */
  private updatePerformanceMetrics(processingTime: number, confidence: number): void {
    // Update processing times history
    this.frameProcessingTimes.push(processingTime);
    if (this.frameProcessingTimes.length > BlurController.MAX_PROCESSING_TIMES_HISTORY) {
      this.frameProcessingTimes.shift();
    }

    // Calculate average processing time
    this.performanceMetrics.averageProcessingTime = 
      this.frameProcessingTimes.reduce((sum, time) => sum + time, 0) / 
      this.frameProcessingTimes.length;

    // Update FPS calculation
    const currentTime = performance.now();
    if (this.lastFrameTime > 0) {
      const timeDelta = currentTime - this.lastFrameTime;
      this.performanceMetrics.fps = 1000 / timeDelta;
    }
    this.lastFrameTime = currentTime;

    // Update detection accuracy (running average)
    this.frameCount++;
    this.totalDetectionAccuracy += confidence;
    this.performanceMetrics.detectionAccuracy = this.totalDetectionAccuracy / this.frameCount;

    // Estimate memory usage (simplified)
    this.performanceMetrics.memoryUsage = this.estimateMemoryUsage();
  }

  /**
   * Monitor performance and enable fallback mechanisms if needed
   */
  private handlePerformanceMonitoring(processingTime: number): void {
    // Check if processing time exceeds threshold
    if (processingTime > this.config.performanceThreshold) {
      this.consecutiveSlowFrames++;
      
      // Enable fallback mode after consecutive slow frames
      if (this.consecutiveSlowFrames >= BlurController.SLOW_FRAME_THRESHOLD) {
        this.enableFallbackMode();
      }
    } else {
      this.consecutiveSlowFrames = 0;
      
      // Try to recover from fallback mode
      if (this.fallbackMode && this.frameCount % BlurController.FALLBACK_RECOVERY_FRAMES === 0) {
        this.disableFallbackMode();
      }
    }
  }

  /**
   * Enable fallback mode to maintain performance
   */
  private enableFallbackMode(): void {
    if (!this.fallbackMode) {
      this.fallbackMode = true;
      this.config.fallbackMode = true;
      console.warn('Blur system entering fallback mode due to performance issues');
    }
  }

  /**
   * Disable fallback mode when performance improves
   */
  private disableFallbackMode(): void {
    if (this.fallbackMode) {
      this.fallbackMode = false;
      this.config.fallbackMode = false;
      console.info('Blur system exiting fallback mode - performance recovered');
    }
  }

  /**
   * Reset performance metrics
   */
  private resetPerformanceMetrics(): void {
    this.performanceMetrics = {
      fps: 0,
      averageProcessingTime: 0,
      detectionAccuracy: 0,
      memoryUsage: 0
    };
    
    this.frameProcessingTimes = [];
    this.lastFrameTime = 0;
    this.frameCount = 0;
    this.totalDetectionAccuracy = 0;
    this.consecutiveSlowFrames = 0;
  }

  /**
   * Estimate current memory usage (simplified implementation)
   */
  private estimateMemoryUsage(): number {
    // This is a simplified estimation
    // In a real implementation, you might use performance.memory if available
    if ('memory' in performance) {
      return (performance as any).memory.usedJSHeapSize / 1024 / 1024; // MB
    }
    
    // Fallback estimation based on processing complexity
    return this.frameProcessingTimes.length * 0.1; // Rough estimate
  }

  /**
   * Clean up resources and dispose of services
   */
  dispose(): void {
    this.disable();
    this.detectionService.dispose();
    this.processingEngine.dispose();
    this.isInitialized = false;
  }

  /**
   * Get current configuration
   */
  getConfig(): BlurConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<BlurConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Apply intensity change if provided
    if (newConfig.intensity !== undefined) {
      this.setIntensity(newConfig.intensity);
    }
    
    // Handle enable/disable state change
    if (newConfig.enabled !== undefined && newConfig.enabled !== this.isEnabled) {
      if (newConfig.enabled) {
        this.enable().catch(error => {
          console.error('Failed to enable blur controller:', error);
        });
      } else {
        this.disable();
      }
    }
  }
}