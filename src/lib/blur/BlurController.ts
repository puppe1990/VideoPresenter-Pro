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
  
  // Frame skipping logic
  private targetFPS: number = BLUR_CONSTANTS.TARGET_FPS;
  private frameSkipCount: number = 0;
  private skipFrameThreshold: number = 2; // Skip every N frames when performance is poor
  private lastProcessedFrame: ImageData | null = null;
  private frameSkipEnabled: boolean = false;
  
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
   * Process a single frame through the blur pipeline with frame skipping optimization
   */
  async processFrame(frame: ImageData): Promise<ImageData> {
    // Return original frame if disabled
    if (!this.isEnabled || !this.isInitialized) {
      return frame;
    }

    // Prevent concurrent processing
    if (this.isProcessing) {
      // Return last processed frame if available, otherwise original
      return this.lastProcessedFrame || frame;
    }

    // Check if we should skip this frame for performance
    if (this.shouldSkipFrame()) {
      this.frameSkipCount++;
      // Return last processed frame with blur applied if available
      if (this.lastProcessedFrame) {
        return this.applyLastKnownBlur(frame);
      }
      return frame;
    }

    this.isProcessing = true;
    const startTime = performance.now();

    try {
      // Perform human detection
      const detectionResult = await this.detectionService.detectHumans(frame);
      
      // Apply blur effect using the detection mask
      const blurredFrame = this.processingEngine.applyBlur(
        frame, 
        detectionResult.mask, 
        this.config.intensity
      );

      // Store the processed frame for potential reuse
      this.lastProcessedFrame = blurredFrame;

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
   * Determine if current frame should be skipped for performance
   */
  private shouldSkipFrame(): boolean {
    // Don't skip if frame skipping is disabled
    if (!this.frameSkipEnabled) {
      return false;
    }

    // Skip frames based on current performance
    const currentFPS = this.performanceMetrics.fps;
    const targetFrameTime = 1000 / this.targetFPS;
    const avgProcessingTime = this.performanceMetrics.averageProcessingTime;

    // Enable frame skipping if processing is taking too long
    if (avgProcessingTime > targetFrameTime * 0.8) {
      return this.frameSkipCount % this.skipFrameThreshold === 0;
    }

    return false;
  }

  /**
   * Apply blur effect using the last known detection mask
   */
  private applyLastKnownBlur(frame: ImageData): ImageData {
    if (!this.lastProcessedFrame) {
      return frame;
    }

    // Simple approach: apply a light blur to the entire frame
    // This is a fallback when we don't have recent detection data
    try {
      const lightBlurIntensity = Math.max(10, this.config.intensity * 0.3);
      return this.processingEngine.applyUniformBlur(frame, lightBlurIntensity);
    } catch (error) {
      console.warn('Failed to apply fallback blur:', error);
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
    const targetFrameTime = 1000 / this.targetFPS;
    
    // Check if processing time exceeds threshold
    if (processingTime > this.config.performanceThreshold) {
      this.consecutiveSlowFrames++;
      
      // Enable frame skipping first
      if (this.consecutiveSlowFrames >= 2 && !this.frameSkipEnabled) {
        this.enableFrameSkipping();
      }
      
      // Enable fallback mode after more consecutive slow frames
      if (this.consecutiveSlowFrames >= BlurController.SLOW_FRAME_THRESHOLD) {
        this.enableFallbackMode();
      }
    } else {
      this.consecutiveSlowFrames = 0;
      
      // Try to recover from fallback mode
      if (this.fallbackMode && this.frameCount % BlurController.FALLBACK_RECOVERY_FRAMES === 0) {
        this.disableFallbackMode();
      }
      
      // Disable frame skipping if performance is good
      if (this.frameSkipEnabled && processingTime < targetFrameTime * 0.6) {
        this.disableFrameSkipping();
      }
    }
  }

  /**
   * Enable frame skipping to improve performance
   */
  private enableFrameSkipping(): void {
    if (!this.frameSkipEnabled) {
      this.frameSkipEnabled = true;
      console.info('Frame skipping enabled to maintain performance');
    }
  }

  /**
   * Disable frame skipping when performance improves
   */
  private disableFrameSkipping(): void {
    if (this.frameSkipEnabled) {
      this.frameSkipEnabled = false;
      this.frameSkipCount = 0;
      console.info('Frame skipping disabled - performance recovered');
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
    this.frameSkipCount = 0;
    this.frameSkipEnabled = false;
    this.lastProcessedFrame = null;
  }

  /**
   * Handle critical errors and attempt recovery
   */
  private async handleCriticalError(error: Error): Promise<void> {
    console.error('Critical blur system error:', error);
    
    // Disable processing temporarily
    const wasEnabled = this.isEnabled;
    this.disable();
    
    try {
      // Attempt to reinitialize the detection service
      if (error instanceof BlurError && error.code === BlurErrorCode.MODEL_LOAD_FAILED) {
        console.info('Attempting to recover from model loading failure...');
        
        // Dispose current service
        this.detectionService.dispose();
        
        // Wait a bit before retry
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Try to reinitialize
        await this.detectionService.initialize();
        
        // Re-enable if it was previously enabled
        if (wasEnabled) {
          await this.enable();
        }
        
        console.info('Successfully recovered from critical error');
      }
    } catch (recoveryError) {
      console.error('Failed to recover from critical error:', recoveryError);
      // Stay disabled - manual intervention required
    }
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