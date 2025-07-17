import * as bodyPix from '@tensorflow-models/body-pix';
import * as tf from '@tensorflow/tfjs';
import type { HumanDetectionService as IHumanDetectionService, DetectionResult } from './types';
import { BlurError, BlurErrorCode } from './types';
import { WorkerManager } from './WorkerManager';

/**
 * Service for detecting human figures in video frames using TensorFlow.js BodyPix model
 * Supports both worker-based processing for performance and direct processing as fallback
 */
export class HumanDetectionService implements IHumanDetectionService {
  private model: bodyPix.BodyPix | null = null;
  private workerManager: WorkerManager | null = null;
  private isInitialized = false;
  private isInitializing = false;
  private useWorkers = true;
  private initializationRetries = 0;
  private maxRetries = 3;

  /**
   * Initialize the detection service with worker support and fallback
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    if (this.isInitializing) {
      // Wait for existing initialization to complete
      while (this.isInitializing) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      return;
    }

    this.isInitializing = true;

    try {
      await this.initializeWithRetry();
      this.isInitialized = true;
    } catch (error) {
      this.isInitializing = false;
      throw new BlurError(
        'Failed to initialize human detection service after all retries',
        BlurErrorCode.MODEL_LOAD_FAILED,
        error instanceof Error ? error : new Error(String(error))
      );
    } finally {
      this.isInitializing = false;
    }
  }

  /**
   * Initialize with retry logic and fallback strategies
   */
  private async initializeWithRetry(): Promise<void> {
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        // Try worker-based initialization first
        if (this.useWorkers && this.supportsWorkers()) {
          await this.initializeWorkers();
          console.info('Human detection initialized with Web Workers');
          return;
        }

        // Fallback to direct model loading
        await this.initializeDirect();
        console.info('Human detection initialized with direct processing');
        return;

      } catch (error) {
        console.warn(`Initialization attempt ${attempt + 1} failed:`, error);
        
        if (attempt === 0 && this.useWorkers) {
          // First failure with workers - try direct approach
          this.useWorkers = false;
          console.info('Falling back to direct processing due to worker initialization failure');
          continue;
        }

        if (attempt < this.maxRetries) {
          // Wait before retry with exponential backoff
          const delay = Math.min(1000 * Math.pow(2, attempt), 5000);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }

        // Final attempt failed
        throw error;
      }
    }
  }

  /**
   * Initialize using Web Workers
   */
  private async initializeWorkers(): Promise<void> {
    this.workerManager = new WorkerManager(2); // Use 2 workers for load balancing
    await this.workerManager.initialize();
  }

  /**
   * Initialize direct processing (fallback)
   */
  private async initializeDirect(): Promise<void> {
    // Set TensorFlow.js backend to WebGL for better performance
    await tf.ready();
    
    if (tf.getBackend() !== 'webgl') {
      try {
        await tf.setBackend('webgl');
      } catch (error) {
        console.warn('WebGL backend not available, falling back to CPU:', error);
        await tf.setBackend('cpu');
      }
    }

    // Load the BodyPix model with optimized configuration
    this.model = await bodyPix.load({
      architecture: 'MobileNetV1',
      outputStride: 16,
      multiplier: 0.75,
      quantBytes: 2
    });
  }

  /**
   * Check if Web Workers are supported
   */
  private supportsWorkers(): boolean {
    return typeof Worker !== 'undefined' && typeof URL !== 'undefined';
  }

  /**
   * Detect humans in the provided image data and return detection mask
   */
  async detectHumans(imageData: ImageData): Promise<DetectionResult> {
    if (!this.isInitialized) {
      throw new BlurError(
        'Human detection service not initialized',
        BlurErrorCode.DETECTION_FAILED
      );
    }

    try {
      // Use worker-based detection if available
      if (this.workerManager) {
        return await this.detectWithWorker(imageData);
      }

      // Fallback to direct detection
      if (this.model) {
        return await this.detectDirect(imageData);
      }

      throw new BlurError(
        'No detection method available',
        BlurErrorCode.DETECTION_FAILED
      );

    } catch (error) {
      // If worker fails, try direct detection as fallback
      if (this.workerManager && this.model && error instanceof BlurError) {
        console.warn('Worker detection failed, falling back to direct processing:', error.message);
        try {
          return await this.detectDirect(imageData);
        } catch (fallbackError) {
          // Both methods failed
          throw new BlurError(
            'Both worker and direct detection failed',
            BlurErrorCode.DETECTION_FAILED,
            fallbackError instanceof Error ? fallbackError : new Error(String(fallbackError))
          );
        }
      }

      throw error instanceof BlurError ? error : new BlurError(
        'Failed to detect humans in image',
        BlurErrorCode.DETECTION_FAILED,
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  /**
   * Detect humans using Web Worker
   */
  private async detectWithWorker(imageData: ImageData): Promise<DetectionResult> {
    if (!this.workerManager) {
      throw new BlurError(
        'Worker manager not available',
        BlurErrorCode.DETECTION_FAILED
      );
    }

    return await this.workerManager.detectHumans(imageData);
  }

  /**
   * Detect humans using direct processing
   */
  private async detectDirect(imageData: ImageData): Promise<DetectionResult> {
    if (!this.model) {
      throw new BlurError(
        'Detection model not loaded',
        BlurErrorCode.DETECTION_FAILED
      );
    }

    const startTime = performance.now();

    // Create a canvas element to work with the ImageData
    const canvas = document.createElement('canvas');
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      throw new Error('Failed to get canvas context');
    }

    // Put the image data onto the canvas
    ctx.putImageData(imageData, 0, 0);

    // Perform person segmentation
    const segmentation = await this.model.segmentPerson(canvas, {
      flipHorizontal: false,
      internalResolution: 'medium',
      segmentationThreshold: 0.7,
      maxDetections: 10,
      scoreThreshold: 0.3,
      nmsRadius: 20
    });

    // Create mask ImageData from segmentation
    const maskData = new Uint8ClampedArray(imageData.width * imageData.height * 4);
    
    for (let i = 0; i < segmentation.data.length; i++) {
      const pixelIndex = i * 4;
      const isHuman = segmentation.data[i] === 1;
      
      // Set alpha channel based on human detection
      maskData[pixelIndex] = 0;     // R
      maskData[pixelIndex + 1] = 0; // G
      maskData[pixelIndex + 2] = 0; // B
      maskData[pixelIndex + 3] = isHuman ? 255 : 0; // A - fully opaque for humans, transparent for background
    }

    const mask = new ImageData(maskData, imageData.width, imageData.height);
    const processingTime = performance.now() - startTime;

    // Calculate confidence based on the number of detected human pixels
    const humanPixels = segmentation.data.filter(pixel => pixel === 1).length;
    const totalPixels = segmentation.data.length;
    const confidence = humanPixels > 0 ? Math.min(humanPixels / totalPixels * 10, 1) : 0;

    // Clean up canvas
    canvas.remove();

    return {
      mask,
      confidence,
      processingTime
    };
  }

  /**
   * Clean up resources and dispose of the model
   */
  dispose(): void {
    if (this.model) {
      this.model.dispose();
      this.model = null;
    }

    if (this.workerManager) {
      this.workerManager.dispose();
      this.workerManager = null;
    }
    
    this.isInitialized = false;
    this.isInitializing = false;

    // Clean up TensorFlow.js tensors
    tf.disposeVariables();
  }
}