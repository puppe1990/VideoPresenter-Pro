import type { 
  BlurController as IBlurController, 
  BlurStatus, 
  BlurConfig,
  PerformanceMetrics 
} from './types';

/**
 * Main controller that orchestrates human detection and blur processing
 * Implementation will be added in task 4
 */
export class BlurController implements IBlurController {
  enable(): void {
    throw new Error('Not implemented - will be implemented in task 4');
  }

  disable(): void {
    throw new Error('Not implemented - will be implemented in task 4');
  }

  setIntensity(intensity: number): void {
    throw new Error('Not implemented - will be implemented in task 4');
  }

  async processFrame(frame: ImageData): Promise<ImageData> {
    throw new Error('Not implemented - will be implemented in task 4');
  }

  getStatus(): BlurStatus {
    throw new Error('Not implemented - will be implemented in task 4');
  }
}