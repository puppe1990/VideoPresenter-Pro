import type { BlurProcessingEngine as IBlurProcessingEngine } from './types';

/**
 * Engine for applying blur effects to video frames based on detection masks
 * Implementation will be added in task 3
 */
export class BlurProcessingEngine implements IBlurProcessingEngine {
  applyBlur(
    originalFrame: ImageData, 
    mask: ImageData, 
    intensity: number
  ): ImageData {
    throw new Error('Not implemented - will be implemented in task 3');
  }

  setBlurIntensity(intensity: number): void {
    throw new Error('Not implemented - will be implemented in task 3');
  }
}