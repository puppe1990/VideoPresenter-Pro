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
  }

  /**
   * Apply blur effect to detected human regions in the frame
   */
  applyBlur(originalFrame: ImageData, mask: ImageData, intensity: number): ImageData {
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

      // Set up canvas dimensions
      this.canvas.width = originalFrame.width;
      this.canvas.height = originalFrame.height;

      // Create blurred version of the original frame
      const blurredFrame = this.createBlurredFrame(originalFrame, intensity);
      
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
   * Clean up resources
   */
  dispose(): void {
    // Canvas cleanup is handled by garbage collection
    // Reset context state
    this.ctx.filter = 'none';
  }
}