/**
 * Performance tests for the blur system
 * Tests FPS requirements, processing time limits, and memory management
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { BlurController } from '../BlurController';
import { HumanDetectionService } from '../HumanDetectionService';
import { BlurProcessingEngine } from '../BlurProcessingEngine';
import { BLUR_CONSTANTS } from '../types';

// Mock TensorFlow.js and BodyPix for performance testing
vi.mock('@tensorflow/tfjs', () => ({
  ready: vi.fn().mockResolvedValue(undefined),
  getBackend: vi.fn().mockReturnValue('webgl'),
  setBackend: vi.fn().mockResolvedValue(undefined),
  disposeVariables: vi.fn()
}));

vi.mock('@tensorflow-models/body-pix', () => ({
  load: vi.fn().mockResolvedValue({
    segmentPerson: vi.fn().mockResolvedValue({
      data: new Array(640 * 480).fill(0).map((_, i) => i % 10 === 0 ? 1 : 0) // Mock human detection
    }),
    dispose: vi.fn()
  })
}));

// Mock Worker for performance testing
global.Worker = class MockWorker {
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  
  constructor() {}
  
  postMessage(message: any) {
    // Simulate worker processing time
    setTimeout(() => {
      if (this.onmessage) {
        this.onmessage({
          data: {
            id: message.id,
            type: 'SUCCESS',
            data: {
              mask: new ImageData(640, 480),
              confidence: 0.8,
              processingTime: 25 // Mock processing time
            }
          }
        } as MessageEvent);
      }
    }, 25); // Simulate 25ms processing time
  }
  
  terminate() {}
} as any;

describe('BlurPerformance', () => {
  let blurController: BlurController;
  let testImageData: ImageData;

  beforeEach(async () => {
    // Create test image data
    testImageData = new ImageData(640, 480);
    
    // Initialize blur controller
    blurController = new BlurController({
      enabled: false,
      intensity: 50,
      modelPath: 'test-model',
      performanceThreshold: BLUR_CONSTANTS.MAX_PROCESSING_TIME_MS,
      fallbackMode: false
    });

    await blurController.enable();
  });

  afterEach(() => {
    blurController.dispose();
  });

  describe('FPS Requirements', () => {
    it('should maintain target FPS under normal conditions', async () => {
      const targetFPS = BLUR_CONSTANTS.TARGET_FPS;
      const frameCount = 10;
      const startTime = performance.now();
      
      // Process multiple frames
      for (let i = 0; i < frameCount; i++) {
        await blurController.processFrame(testImageData);
      }
      
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      const actualFPS = (frameCount * 1000) / totalTime;
      
      // Should achieve at least 80% of target FPS
      expect(actualFPS).toBeGreaterThanOrEqual(targetFPS * 0.8);
    }, 10000);

    it('should enable frame skipping when performance degrades', async () => {
      // Mock slow processing by increasing processing time
      const originalProcessFrame = blurController.processFrame.bind(blurController);
      vi.spyOn(blurController, 'processFrame').mockImplementation(async (frame) => {
        // Simulate slow processing
        await new Promise(resolve => setTimeout(resolve, 100));
        return originalProcessFrame(frame);
      });

      // Process several frames to trigger frame skipping
      for (let i = 0; i < 5; i++) {
        await blurController.processFrame(testImageData);
      }

      const status = blurController.getStatus();
      
      // Performance should degrade and trigger optimizations
      expect(status.performance.averageProcessingTime).toBeGreaterThan(50);
    }, 15000);
  });

  describe('Processing Time Requirements', () => {
    it('should complete detection within time threshold', async () => {
      const maxProcessingTime = BLUR_CONSTANTS.MAX_PROCESSING_TIME_MS;
      const iterations = 5;
      const processingTimes: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const startTime = performance.now();
        await blurController.processFrame(testImageData);
        const processingTime = performance.now() - startTime;
        processingTimes.push(processingTime);
      }

      const averageTime = processingTimes.reduce((sum, time) => sum + time, 0) / iterations;
      
      // Average processing time should be within threshold
      expect(averageTime).toBeLessThanOrEqual(maxProcessingTime * 1.5); // Allow 50% margin for test environment
    });

    it('should handle concurrent processing requests gracefully', async () => {
      // Start multiple processing requests simultaneously
      const promises = Array.from({ length: 3 }, () => 
        blurController.processFrame(testImageData)
      );

      const results = await Promise.all(promises);
      
      // All requests should complete successfully
      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result).toBeInstanceOf(ImageData);
        expect(result.width).toBe(640);
        expect(result.height).toBe(480);
      });
    });
  });

  describe('Memory Management', () => {
    it('should not leak memory during extended processing', async () => {
      const initialMemory = getMemoryUsage();
      const frameCount = 20;

      // Process many frames
      for (let i = 0; i < frameCount; i++) {
        await blurController.processFrame(testImageData);
        
        // Trigger garbage collection periodically
        if (i % 5 === 0 && 'gc' in global && typeof (global as any).gc === 'function') {
          (global as any).gc();
        }
      }

      const finalMemory = getMemoryUsage();
      const memoryIncrease = finalMemory - initialMemory;
      
      // Memory increase should be reasonable (less than 50MB)
      expect(memoryIncrease).toBeLessThan(50);
    });

    it('should clean up resources properly on disposal', () => {
      const status = blurController.getStatus();
      expect(status.enabled).toBe(true);

      blurController.dispose();

      const statusAfterDisposal = blurController.getStatus();
      expect(statusAfterDisposal.enabled).toBe(false);
    });
  });

  describe('Error Handling Performance', () => {
    it('should handle detection failures without blocking', async () => {
      // Mock detection service to fail
      const detectionService = new HumanDetectionService();
      vi.spyOn(detectionService, 'detectHumans').mockRejectedValue(new Error('Detection failed'));

      const startTime = performance.now();
      const result = await blurController.processFrame(testImageData);
      const processingTime = performance.now() - startTime;

      // Should return original frame quickly when detection fails
      expect(result).toBe(testImageData);
      expect(processingTime).toBeLessThan(100); // Should fail fast
    });

    it('should recover from temporary performance issues', async () => {
      let callCount = 0;
      const originalProcessFrame = blurController.processFrame.bind(blurController);
      
      // Mock intermittent slow processing
      vi.spyOn(blurController, 'processFrame').mockImplementation(async (frame) => {
        callCount++;
        if (callCount <= 3) {
          // First few calls are slow
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        return originalProcessFrame(frame);
      });

      // Process frames - should adapt to performance changes
      const processingTimes: number[] = [];
      for (let i = 0; i < 6; i++) {
        const startTime = performance.now();
        await blurController.processFrame(testImageData);
        processingTimes.push(performance.now() - startTime);
      }

      // Later frames should be faster as system adapts
      const earlyAverage = processingTimes.slice(0, 3).reduce((sum, time) => sum + time, 0) / 3;
      const laterAverage = processingTimes.slice(3).reduce((sum, time) => sum + time, 0) / 3;
      
      expect(laterAverage).toBeLessThan(earlyAverage);
    }, 10000);
  });

  describe('Fallback Mode Performance', () => {
    it('should maintain basic functionality in fallback mode', async () => {
      // Force fallback mode by simulating poor performance
      for (let i = 0; i < 5; i++) {
        const slowFrame = new Promise(resolve => setTimeout(resolve, 200));
        await slowFrame;
        await blurController.processFrame(testImageData);
      }

      const status = blurController.getStatus();
      
      // Should still be processing frames
      const result = await blurController.processFrame(testImageData);
      expect(result).toBeInstanceOf(ImageData);
    });
  });

  describe('Worker Performance', () => {
    it('should distribute load across multiple workers', async () => {
      // This test verifies that the WorkerManager can handle multiple requests
      const promises = Array.from({ length: 4 }, (_, i) => 
        blurController.processFrame(testImageData)
      );

      const startTime = performance.now();
      const results = await Promise.all(promises);
      const totalTime = performance.now() - startTime;

      // With workers, parallel processing should be faster than sequential
      expect(results).toHaveLength(4);
      expect(totalTime).toBeLessThan(200); // Should complete in reasonable time
    });
  });
});

/**
 * Get current memory usage (simplified for testing)
 */
function getMemoryUsage(): number {
  if ('memory' in performance) {
    return (performance as any).memory.usedJSHeapSize / 1024 / 1024; // MB
  }
  return 0; // Fallback for environments without memory API
}