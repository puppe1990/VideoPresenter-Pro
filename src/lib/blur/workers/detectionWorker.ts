/**
 * Web Worker for offloading heavy human detection processing
 * This worker runs TensorFlow.js BodyPix model in a separate thread
 * to prevent blocking the main UI thread during detection operations
 */

import * as bodyPix from '@tensorflow-models/body-pix';
import * as tf from '@tensorflow/tfjs';
import { BlurError, BlurErrorCode, DetectionResult } from '../types';

interface WorkerMessage {
  id: string;
  type: 'INITIALIZE' | 'DETECT' | 'DISPOSE';
  data?: {
    imageData?: ImageData;
    config?: {
      architecture: 'MobileNetV1' | 'ResNet50';
      outputStride: number;
      multiplier: number;
      quantBytes: number;
    };
  };
}

interface WorkerResponse {
  id: string;
  type: 'SUCCESS' | 'ERROR';
  data?: DetectionResult | { message: string; code: BlurErrorCode };
}

class DetectionWorker {
  private model: bodyPix.BodyPix | null = null;
  private isInitialized = false;

  async initialize(config: WorkerMessage['data']['config']): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // Set up TensorFlow.js backend
      await tf.ready();
      
      // Try WebGL first, fallback to CPU
      try {
        await tf.setBackend('webgl');
      } catch (error) {
        console.warn('WebGL not available in worker, using CPU backend');
        await tf.setBackend('cpu');
      }

      // Load BodyPix model with provided configuration
      this.model = await bodyPix.load({
        architecture: config?.architecture || 'MobileNetV1',
        outputStride: config?.outputStride || 16,
        multiplier: config?.multiplier || 0.75,
        quantBytes: config?.quantBytes || 2
      });

      this.isInitialized = true;
    } catch (error) {
      throw new BlurError(
        'Failed to initialize detection model in worker',
        BlurErrorCode.MODEL_LOAD_FAILED,
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  async detectHumans(imageData: ImageData): Promise<DetectionResult> {
    if (!this.isInitialized || !this.model) {
      throw new BlurError(
        'Detection worker not initialized',
        BlurErrorCode.DETECTION_FAILED
      );
    }

    const startTime = performance.now();

    try {
      // Create OffscreenCanvas for processing (if available)
      let canvas: HTMLCanvasElement | OffscreenCanvas;
      let ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

      if (typeof OffscreenCanvas !== 'undefined') {
        canvas = new OffscreenCanvas(imageData.width, imageData.height);
        ctx = canvas.getContext('2d')!;
      } else {
        // Fallback for browsers without OffscreenCanvas
        canvas = new (self as any).HTMLCanvasElement();
        canvas.width = imageData.width;
        canvas.height = imageData.height;
        ctx = canvas.getContext('2d')!;
      }

      if (!ctx) {
        throw new Error('Failed to get canvas context in worker');
      }

      // Put image data on canvas
      ctx.putImageData(imageData, 0, 0);

      // Perform segmentation with optimized settings for performance
      const segmentation = await this.model.segmentPerson(canvas as any, {
        flipHorizontal: false,
        internalResolution: 'low', // Use low resolution for better performance
        segmentationThreshold: 0.6,
        maxDetections: 5, // Limit detections for performance
        scoreThreshold: 0.4,
        nmsRadius: 15
      });

      // Create mask from segmentation
      const maskData = new Uint8ClampedArray(imageData.width * imageData.height * 4);
      
      for (let i = 0; i < segmentation.data.length; i++) {
        const pixelIndex = i * 4;
        const isHuman = segmentation.data[i] === 1;
        
        maskData[pixelIndex] = 0;
        maskData[pixelIndex + 1] = 0;
        maskData[pixelIndex + 2] = 0;
        maskData[pixelIndex + 3] = isHuman ? 255 : 0;
      }

      const mask = new ImageData(maskData, imageData.width, imageData.height);
      const processingTime = performance.now() - startTime;

      // Calculate confidence
      const humanPixels = segmentation.data.filter(pixel => pixel === 1).length;
      const totalPixels = segmentation.data.length;
      const confidence = humanPixels > 0 ? Math.min(humanPixels / totalPixels * 10, 1) : 0;

      return {
        mask,
        confidence,
        processingTime
      };

    } catch (error) {
      throw new BlurError(
        'Detection failed in worker',
        BlurErrorCode.DETECTION_FAILED,
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  dispose(): void {
    if (this.model) {
      this.model.dispose();
      this.model = null;
    }
    
    this.isInitialized = false;
    tf.disposeVariables();
  }
}

// Worker instance
const worker = new DetectionWorker();

// Message handler
self.onmessage = async (event: MessageEvent<WorkerMessage>) => {
  const { id, type, data } = event.data;
  
  try {
    let result: any;

    switch (type) {
      case 'INITIALIZE':
        await worker.initialize(data?.config);
        result = { success: true };
        break;

      case 'DETECT':
        if (!data?.imageData) {
          throw new Error('No image data provided for detection');
        }
        result = await worker.detectHumans(data.imageData);
        break;

      case 'DISPOSE':
        worker.dispose();
        result = { success: true };
        break;

      default:
        throw new Error(`Unknown message type: ${type}`);
    }

    const response: WorkerResponse = {
      id,
      type: 'SUCCESS',
      data: result
    };

    self.postMessage(response);

  } catch (error) {
    const response: WorkerResponse = {
      id,
      type: 'ERROR',
      data: {
        message: error instanceof Error ? error.message : String(error),
        code: error instanceof BlurError ? error.code : BlurErrorCode.DETECTION_FAILED
      }
    };

    self.postMessage(response);
  }
};