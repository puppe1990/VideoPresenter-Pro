import type { HumanDetectionService as IHumanDetectionService, DetectionResult } from './types';

/**
 * Service for detecting human figures in video frames using TensorFlow.js BodyPix model
 * Implementation will be added in task 2
 */
export class HumanDetectionService implements IHumanDetectionService {
  async initialize(): Promise<void> {
    throw new Error('Not implemented - will be implemented in task 2');
  }

  async detectHumans(imageData: ImageData): Promise<DetectionResult> {
    throw new Error('Not implemented - will be implemented in task 2');
  }

  dispose(): void {
    throw new Error('Not implemented - will be implemented in task 2');
  }
}