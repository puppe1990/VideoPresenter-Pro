import * as bodyPix from '@tensorflow-models/body-pix';
import * as tf from '@tensorflow/tfjs';
import type { HumanDetectionService as IHumanDetectionService, DetectionResult } from './types';
import { BlurError, BlurErrorCode } from './types';

/**
 * Service for detecting human figures in video frames using TensorFlow.js BodyPix model
 */
export class HumanDetectionService implements IHumanDetectionService {
  private model: bodyPix.BodyPix | null = null;
  private isInitialized = false;
  private isInitializing = false;

  /**
   * Initialize the BodyPix model with error handling
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

      this.isInitialized = true;
    } catch (error) {
      throw new BlurError(
        'Failed to initialize human detection model',
        BlurErrorCode.MODEL_LOAD_FAILED,
        error instanceof Error ? error : new Error(String(error))
      );
    } finally {
      this.isInitializing = false;
    }
  }

  /**
   * Detect humans in the provided image data and return detection mask
   */
  async detectHumans(imageData: ImageData): Promise<DetectionResult> {
    if (!this.isInitialized || !this.model) {
      throw new BlurError(
        'Human detection service not initialized',
        BlurErrorCode.DETECTION_FAILED
      );
    }

    const startTime = performance.now();

    try {
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

    } catch (error) {
      throw new BlurError(
        'Failed to detect humans in image',
        BlurErrorCode.DETECTION_FAILED,
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  /**
   * Clean up resources and dispose of the model
   */
  dispose(): void {
    if (this.model) {
      this.model.dispose();
      this.model = null;
    }
    
    this.isInitialized = false;
    this.isInitializing = false;

    // Clean up TensorFlow.js tensors
    tf.disposeVariables();
  }
}