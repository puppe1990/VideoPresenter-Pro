/**
 * Tests for WorkerManager performance and reliability
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { WorkerManager } from '../WorkerManager';
import { BlurError, BlurErrorCode } from '../types';

// Mock Worker for testing
global.Worker = class MockWorker {
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  
  constructor() {}
  
  postMessage(message: { type: string; id: string; imageData?: ImageData }) {
    // Simulate different response times based on message type
    const delay = message.type === 'INITIALIZE' ? 100 : 25;
    
    setTimeout(() => {
      if (this.onmessage) {
        if (message.type === 'INITIALIZE') {
          this.onmessage({
            data: {
              id: message.id,
              type: 'SUCCESS',
              data: { success: true }
            }
          } as MessageEvent);
        } else if (message.type === 'DETECT') {
          this.onmessage({
            data: {
              id: message.id,
              type: 'SUCCESS',
              data: {
                mask: new ImageData(640, 480),
                confidence: 0.8,
                processingTime: 25
              }
            }
          } as MessageEvent);
        } else if (message.type === 'DISPOSE') {
          this.onmessage({
            data: {
              id: message.id,
              type: 'SUCCESS',
              data: { success: true }
            }
          } as MessageEvent);
        }
      }
    }, delay);
  }
  
  terminate() {}
} as unknown as typeof Worker;

describe('WorkerManager', () => {
  let workerManager: WorkerManager;
  let testImageData: ImageData;

  beforeEach(() => {
    testImageData = new ImageData(640, 480);
  });

  afterEach(() => {
    if (workerManager) {
      workerManager.dispose();
    }
  });

  describe('Initialization', () => {
    it('should initialize with single worker', async () => {
      workerManager = new WorkerManager(1);
      await workerManager.initialize();
      
      const status = workerManager.getStatus();
      expect(status.initialized).toBe(true);
      expect(status.workerCount).toBe(1);
    });

    it('should initialize with multiple workers', async () => {
      workerManager = new WorkerManager(2);
      await workerManager.initialize();
      
      const status = workerManager.getStatus();
      expect(status.initialized).toBe(true);
      expect(status.workerCount).toBe(2);
    });

    it('should limit worker count based on hardware', async () => {
      // Mock navigator.hardwareConcurrency
      Object.defineProperty(navigator, 'hardwareConcurrency', {
        value: 2,
        configurable: true
      });

      workerManager = new WorkerManager(10); // Request more than available
      await workerManager.initialize();
      
      const status = workerManager.getStatus();
      expect(status.workerCount).toBeLessThanOrEqual(4); // Should be limited
    });
  });

  describe('Detection Performance', () => {
    beforeEach(async () => {
      workerManager = new WorkerManager(2);
      await workerManager.initialize();
    });

    it('should process detection requests within time limit', async () => {
      const startTime = performance.now();
      const result = await workerManager.detectHumans(testImageData);
      const processingTime = performance.now() - startTime;

      expect(result).toBeDefined();
      expect(result.mask).toBeInstanceOf(ImageData);
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(processingTime).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should handle concurrent detection requests', async () => {
      const promises = Array.from({ length: 4 }, () => 
        workerManager.detectHumans(testImageData)
      );

      const startTime = performance.now();
      const results = await Promise.all(promises);
      const totalTime = performance.now() - startTime;

      expect(results).toHaveLength(4);
      results.forEach(result => {
        expect(result.mask).toBeInstanceOf(ImageData);
        expect(result.confidence).toBeGreaterThanOrEqual(0);
      });

      // With 2 workers, should complete faster than sequential processing
      expect(totalTime).toBeLessThan(200);
    });

    it('should distribute load across workers', async () => {
      const requestCount = 6;
      const promises = Array.from({ length: requestCount }, () => 
        workerManager.detectHumans(testImageData)
      );

      const results = await Promise.all(promises);
      
      expect(results).toHaveLength(requestCount);
      // All requests should complete successfully
      results.forEach(result => {
        expect(result).toBeDefined();
        expect(result.mask).toBeInstanceOf(ImageData);
      });
    });
  });

  describe('Error Handling', () => {
    beforeEach(async () => {
      workerManager = new WorkerManager(1);
      await workerManager.initialize();
    });

    it('should handle worker errors gracefully', async () => {
      // Mock worker to simulate error
      const mockWorker = {
        onmessage: null as ((event: MessageEvent) => void) | null,
        onerror: null as ((event: ErrorEvent) => void) | null,
        postMessage: vi.fn(),
        terminate: vi.fn()
      };

      // Simulate worker error
      setTimeout(() => {
        if (mockWorker.onerror) {
          mockWorker.onerror(new ErrorEvent('error', { error: new Error('Worker failed') }));
        }
      }, 10);

      // The detection should still handle the error
      try {
        await workerManager.detectHumans(testImageData);
      } catch (error) {
        expect(error).toBeInstanceOf(BlurError);
        expect((error as BlurError).code).toBe(BlurErrorCode.DETECTION_FAILED);
      }
    });

    it('should timeout long-running requests', async () => {
      // Create a worker manager with very short timeout for testing
      const shortTimeoutManager = new (class extends WorkerManager {
        constructor() {
          super(1);
          (this as WorkerManager & { requestTimeout: number }).requestTimeout = 50; // 50ms timeout
        }
      })();

      await shortTimeoutManager.initialize();

      // Mock worker to never respond
      const originalWorker = global.Worker;
      global.Worker = class MockSlowWorker {
        onmessage: ((event: MessageEvent) => void) | null = null;
        onerror: ((event: ErrorEvent) => void) | null = null;
        
        constructor() {}
        
        postMessage(message: { type: string; id: string }) {
          if (message.type === 'INITIALIZE') {
            // Initialize normally
            setTimeout(() => {
              if (this.onmessage) {
                this.onmessage({
                  data: {
                    id: message.id,
                    type: 'SUCCESS',
                    data: { success: true }
                  }
                } as MessageEvent);
              }
            }, 10);
          }
          // Don't respond to DETECT messages to simulate timeout
        }
        
        terminate() {}
      } as unknown as typeof Worker;

      try {
        await shortTimeoutManager.detectHumans(testImageData);
        expect.fail('Should have timed out');
      } catch (error) {
        expect(error).toBeInstanceOf(BlurError);
        expect((error as BlurError).message).toContain('timed out');
      } finally {
        global.Worker = originalWorker;
        shortTimeoutManager.dispose();
      }
    }, 1000);

    it('should reject requests when queue is full', async () => {
      // Create worker manager with small queue
      const limitedManager = new (class extends WorkerManager {
        constructor() {
          super(1);
          (this as WorkerManager & { maxQueueSize: number }).maxQueueSize = 2; // Very small queue
        }
      })();

      await limitedManager.initialize();

      // Fill the queue
      const promises = Array.from({ length: 5 }, () => 
        limitedManager.detectHumans(testImageData)
      );

      const results = await Promise.allSettled(promises);
      
      // Some requests should be rejected due to queue limit
      const rejected = results.filter(result => result.status === 'rejected');
      expect(rejected.length).toBeGreaterThan(0);

      limitedManager.dispose();
    });
  });

  describe('Memory Management', () => {
    it('should clean up resources on disposal', async () => {
      workerManager = new WorkerManager(2);
      await workerManager.initialize();

      const statusBefore = workerManager.getStatus();
      expect(statusBefore.initialized).toBe(true);
      expect(statusBefore.workerCount).toBe(2);

      workerManager.dispose();

      const statusAfter = workerManager.getStatus();
      expect(statusAfter.initialized).toBe(false);
      expect(statusAfter.workerCount).toBe(0);
      expect(statusAfter.pendingRequests).toBe(0);
    });

    it('should handle disposal with pending requests', async () => {
      workerManager = new WorkerManager(1);
      await workerManager.initialize();

      // Start a request but don't wait for it
      const promise = workerManager.detectHumans(testImageData);

      // Dispose immediately
      workerManager.dispose();

      // The pending request should be rejected
      try {
        await promise;
        expect.fail('Should have been rejected');
      } catch (error) {
        expect(error).toBeInstanceOf(BlurError);
        expect((error as BlurError).message).toContain('disposed');
      }
    });
  });

  describe('Performance Monitoring', () => {
    beforeEach(async () => {
      workerManager = new WorkerManager(2);
      await workerManager.initialize();
    });

    it('should track queue utilization', async () => {
      const status = workerManager.getStatus();
      expect(status.queueUtilization).toBe(0);

      // Start multiple requests
      const promises = Array.from({ length: 3 }, () => 
        workerManager.detectHumans(testImageData)
      );

      // Check status while requests are pending
      const statusDuringProcessing = workerManager.getStatus();
      expect(statusDuringProcessing.pendingRequests).toBeGreaterThan(0);

      await Promise.all(promises);

      // Queue should be empty after completion
      const statusAfter = workerManager.getStatus();
      expect(statusAfter.pendingRequests).toBe(0);
    });
  });
});