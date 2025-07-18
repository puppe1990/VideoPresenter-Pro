/**
 * BlurProcessingEngine - Handles applying blur effects to detected human regions
 * 
 * This class implements Canvas-based blur algorithms that use detection masks
 * to selectively blur human figures while keeping the rest of the image clear.
 */

import { BlurProcessingEngine as IBlurProcessingEngine, BLUR_CONSTANTS, BlurError, BlurErrorCode } from './types';

export class BlurProcessingEngine implements IBlurProcessingEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private blurIntensity: number = BLUR_CONSTANTS.DEFAULT_INTENSITY;
  
  // Memory management
  private tempCanvas: HTMLCanvasElement;
  private tempCtx: CanvasRenderingContext2D;
  private maxCanvasSize: number = 1920 * 1080; // Max pixels to prevent memory issues
  private lastCleanupTime: number = 0;
  private cleanupInterval: number = 30000; // 30 seconds

  constructor() {
    // Create offscreen canvas for processing
    this.canvas = document.createElement('canvas');
    const context = this.canvas.getContext('2d');
    
    if (!context) {
      throw new BlurError(
        'Failed to get 2D rendering context',
        BlurErrorCode.BROWSER_UNSUPPORTED
      );
    }
    
    this.ctx = context;

    // Create temporary canvas for intermediate processing
    this.tempCanvas = document.createElement('canvas');
    const tempContext = this.tempCanvas.getContext('2d');
    
    if (!tempContext) {
      throw new BlurError(
        'Failed to get temporary 2D rendering context',
        BlurErrorCode.BROWSER_UNSUPPORTED
      );
    }
    
    this.tempCtx = tempContext;
    this.lastCleanupTime = Date.now();
  }

  /**
   * Apply blur effect to detected human regions in the frame
   */
  applyBlur(originalFrame: ImageData, mask: ImageData, intensity?: number): ImageData {
    try {
      // Validate inputs
      if (!originalFrame || !mask) {
        throw new BlurError(
          'Invalid input data provided',
          BlurErrorCode.PROCESSING_FAILED
        );
      }

      if (originalFrame.width !== mask.width || originalFrame.height !== mask.height) {
        throw new BlurError(
          'Frame and mask dimensions must match',
          BlurErrorCode.PROCESSING_FAILED
        );
      }

      // Check canvas size limits to prevent memory issues
      const totalPixels = originalFrame.width * originalFrame.height;
      if (totalPixels > this.maxCanvasSize) {
        throw new BlurError(
          'Frame size exceeds maximum allowed dimensions',
          BlurErrorCode.PROCESSING_FAILED
        );
      }

      // Perform periodic memory cleanup
      this.performMemoryCleanup();

      // Set up canvas dimensions
      this.setupCanvas(originalFrame.width, originalFrame.height);

      // Use provided intensity or fall back to stored intensity
      const effectiveIntensity = intensity !== undefined ? intensity : this.blurIntensity;
      
      // Create blurred version of the original frame
      const blurredFrame = this.createBlurredFrame(originalFrame, effectiveIntensity);
      
      // Composite original and blurred frames using the mask
      return this.compositeMaskedFrames(originalFrame, blurredFrame, mask);

    } catch (error) {
      if (error instanceof BlurError) {
        throw error;
      }
      throw new BlurError(
        'Failed to apply blur effect',
        BlurErrorCode.PROCESSING_FAILED,
        error as Error
      );
    }
  }

  /**
   * Set the blur intensity for future processing
   */
  setBlurIntensity(intensity: number): void {
    // Clamp intensity to valid range
    this.blurIntensity = Math.max(
      BLUR_CONSTANTS.MIN_INTENSITY,
      Math.min(BLUR_CONSTANTS.MAX_INTENSITY, intensity)
    );
  }

  /**
   * Apply uniform blur to entire frame (fallback method)
   */
  applyUniformBlur(frame: ImageData, intensity: number): ImageData {
    try {
      // Set up canvas dimensions
      this.canvas.width = frame.width;
      this.canvas.height = frame.height;

      // Put original frame on canvas
      this.ctx.putImageData(frame, 0, 0);
      
      // Calculate blur radius based on intensity
      const blurRadius = Math.round((intensity / 100) * 15); // Lighter blur for uniform application
      
      if (blurRadius > 0) {
        // Apply CSS filter blur
        this.ctx.filter = `blur(${blurRadius}px)`;
        
        // Redraw the image with blur applied
        this.ctx.drawImage(this.canvas, 0, 0);
        
        // Reset filter
        this.ctx.filter = 'none';
      }
      
      // Get the blurred image data
      return this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);

    } catch (error) {
      console.warn('Failed to apply uniform blur, returning original frame:', error);
      return frame;
    }
  }

  /**
   * Create a blurred version of the input frame
   */
  private createBlurredFrame(frame: ImageData, intensity: number): ImageData {
    // Put original frame on canvas
    this.ctx.putImageData(frame, 0, 0);
    
    // Calculate blur radius based on intensity (0-100 -> 0-20px)
    const blurRadius = Math.round((intensity / 100) * 20);
    
    if (blurRadius > 0) {
      // Apply CSS filter blur
      this.ctx.filter = `blur(${blurRadius}px)`;
      
      // Redraw the image with blur applied
      this.ctx.drawImage(this.canvas, 0, 0);
      
      // Reset filter
      this.ctx.filter = 'none';
    }
    
    // Get the blurred image data
    return this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
  }

  /**
   * Composite original and blurred frames using the detection mask
   */
  private compositeMaskedFrames(
    originalFrame: ImageData, 
    blurredFrame: ImageData, 
    mask: ImageData
  ): ImageData {
    const result = new ImageData(originalFrame.width, originalFrame.height);
    const originalData = originalFrame.data;
    const blurredData = blurredFrame.data;
    const maskData = mask.data;
    const resultData = result.data;

    // Process each pixel
    for (let i = 0; i < originalData.length; i += 4) {
      // Get mask alpha value (assuming mask uses alpha channel for detection)
      const maskAlpha = maskData[i + 3] / 255;
      
      // Blend original and blurred pixels based on mask
      if (maskAlpha > 0.1) { // Threshold for human detection
        // Use blurred pixel for detected human regions
        resultData[i] = blurredData[i];     // R
        resultData[i + 1] = blurredData[i + 1]; // G
        resultData[i + 2] = blurredData[i + 2]; // B
        resultData[i + 3] = originalData[i + 3]; // A (preserve original alpha)
      } else {
        // Use original pixel for non-human regions
        resultData[i] = originalData[i];     // R
        resultData[i + 1] = originalData[i + 1]; // G
        resultData[i + 2] = originalData[i + 2]; // B
        resultData[i + 3] = originalData[i + 3]; // A
      }
    }

    return result;
  }

  /**
   * Set up canvas dimensions with memory management
   */
  private setupCanvas(width: number, height: number): void {
    // Only resize if dimensions changed to avoid unnecessary memory allocation
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
    }

    if (this.tempCanvas.width !== width || this.tempCanvas.height !== height) {
      this.tempCanvas.width = width;
      this.tempCanvas.height = height;
    }
  }

  /**
   * Perform periodic memory cleanup
   */
  private performMemoryCleanup(): void {
    const now = Date.now();
    if (now - this.lastCleanupTime > this.cleanupInterval) {
      try {
        // Clear canvas contexts
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.tempCtx.clearRect(0, 0, this.tempCanvas.width, this.tempCanvas.height);
        
        // Reset context state
        this.ctx.filter = 'none';
        this.tempCtx.filter = 'none';
        
        // Force garbage collection if available (Chrome DevTools)
        if ('gc' in window && typeof (window as Window & { gc?: () => void }).gc === 'function') {
          (window as Window & { gc: () => void }).gc();
        }
        
        this.lastCleanupTime = now;
      } catch (error) {
        console.warn('Memory cleanup failed:', error);
      }
    }
  }

  /**
   * Clean up resources and handle memory management
   */
  dispose(): void {
    try {
      // Reset context state
      this.ctx.filter = 'none';
      this.tempCtx.filter = 'none';
      
      // Clear both canvases
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      this.tempCtx.clearRect(0, 0, this.tempCanvas.width, this.tempCanvas.height);
      
      // Reset canvas dimensions to free memory
      this.canvas.width = 0;
      this.canvas.height = 0;
      this.tempCanvas.width = 0;
      this.tempCanvas.height = 0;
    } catch (error) {
      console.warn('Error during BlurProcessingEngine disposal:', error);
    }
  }
}