/**
 * WorkerManager - Manages Web Workers for offloading heavy detection processing
 * 
 * This class handles the lifecycle of detection workers, load balancing,
 * and communication between the main thread and worker threads.
 */

import { DetectionResult, BlurError, BlurErrorCode } from './types';

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

interface PendingRequest {
  resolve: (result: DetectionResult) => void;
  reject: (error: Error) => void;
  timestamp: number;
}

export class WorkerManager {
  private workers: Worker[] = [];
  private workerIndex = 0;
  private pendingRequests = new Map<string, PendingRequest>();
  private isInitialized = false;
  private workerCount: number;
  private requestTimeout = 5000; // 5 second timeout
  private maxQueueSize = 10;

  constructor(workerCount: number = 1) {
    // Limit worker count based on CPU cores (max 4 for detection)
    const maxWorkers = Math.min(navigator.hardwareConcurrency || 2, 4);
    this.workerCount = Math.min(workerCount, maxWorkers);
  }

  /**
   * Initialize workers with the detection model
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // Create workers
      for (let i = 0; i < this.workerCount; i++) {
        const worker = new Worker(
          new URL('./workers/detectionWorker.ts', import.meta.url),
          { type: 'module' }
        );
        
        worker.onmessage = this.handleWorkerMessage.bind(this);
        worker.onerror = this.handleWorkerError.bind(this);
        
        this.workers.push(worker);
      }

      // Initialize all workers
      const initPromises = this.workers.map(worker => 
        this.sendWorkerMessage(worker, {
          id: this.generateId(),
          type: 'INITIALIZE',
          data: {
            config: {
              architecture: 'MobileNetV1',
              outputStride: 16,
              multiplier: 0.75,
              quantBytes: 2
            }
          }
        })
      );

      await Promise.all(initPromises);
      this.isInitialized = true;

    } catch (error) {
      // Clean up on failure
      this.dispose();
      throw new BlurError(
        'Failed to initialize worker manager',
        BlurErrorCode.MODEL_LOAD_FAILED,
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  /**
   * Detect humans using available worker
   */
  async detectHumans(imageData: ImageData): Promise<DetectionResult> {
    if (!this.isInitialized) {
      throw new BlurError(
        'Worker manager not initialized',
        BlurErrorCode.DETECTION_FAILED
      );
    }

    // Check queue size to prevent memory issues
    if (this.pendingRequests.size >= this.maxQueueSize) {
      throw new BlurError(
        'Detection queue full - processing overloaded',
        BlurErrorCode.PERFORMANCE_DEGRADED
      );
    }

    // Get next available worker (round-robin)
    const worker = this.getNextWorker();
    const messageId = this.generateId();

    return new Promise<DetectionResult>((resolve, reject) => {
      // Set up timeout
      const timeoutId = setTimeout(() => {
        this.pendingRequests.delete(messageId);
        reject(new BlurError(
          'Detection request timed out',
          BlurErrorCode.DETECTION_FAILED
        ));
      }, this.requestTimeout);

      // Store request
      this.pendingRequests.set(messageId, {
        resolve: (result) => {
          clearTimeout(timeoutId);
          resolve(result);
        },
        reject: (error) => {
          clearTimeout(timeoutId);
          reject(error);
        },
        timestamp: Date.now()
      });

      // Send message to worker
      worker.postMessage({
        id: messageId,
        type: 'DETECT',
        data: { imageData }
      } as WorkerMessage);
    });
  }

  /**
   * Handle messages from workers
   */
  private handleWorkerMessage(event: MessageEvent<WorkerResponse>): void {
    const { id, type, data } = event.data;
    const request = this.pendingRequests.get(id);

    if (!request) {
      console.warn('Received response for unknown request:', id);
      return;
    }

    this.pendingRequests.delete(id);

    if (type === 'SUCCESS') {
      request.resolve(data as DetectionResult);
    } else if (type === 'ERROR') {
      const errorData = data as { message: string; code: BlurErrorCode };
      request.reject(new BlurError(
        errorData.message,
        errorData.code
      ));
    }
  }

  /**
   * Handle worker errors
   */
  private handleWorkerError(event: ErrorEvent): void {
    console.error('Worker error:', event.error);
    
    // Reject all pending requests for this worker
    for (const [id, request] of this.pendingRequests.entries()) {
      request.reject(new BlurError(
        'Worker encountered an error',
        BlurErrorCode.DETECTION_FAILED,
        event.error
      ));
      this.pendingRequests.delete(id);
    }
  }

  /**
   * Send message to worker and wait for response
   */
  private async sendWorkerMessage(worker: Worker, message: WorkerMessage): Promise<any> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        this.pendingRequests.delete(message.id);
        reject(new Error('Worker initialization timeout'));
      }, 10000); // 10 second timeout for initialization

      this.pendingRequests.set(message.id, {
        resolve: (result) => {
          clearTimeout(timeoutId);
          resolve(result);
        },
        reject: (error) => {
          clearTimeout(timeoutId);
          reject(error);
        },
        timestamp: Date.now()
      });

      worker.postMessage(message);
    });
  }

  /**
   * Get next worker using round-robin
   */
  private getNextWorker(): Worker {
    const worker = this.workers[this.workerIndex];
    this.workerIndex = (this.workerIndex + 1) % this.workers.length;
    return worker;
  }

  /**
   * Generate unique message ID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get worker manager status
   */
  getStatus() {
    return {
      initialized: this.isInitialized,
      workerCount: this.workers.length,
      pendingRequests: this.pendingRequests.size,
      queueUtilization: this.pendingRequests.size / this.maxQueueSize
    };
  }

  /**
   * Clean up all workers and pending requests
   */
  dispose(): void {
    // Reject all pending requests
    for (const [id, request] of this.pendingRequests.entries()) {
      request.reject(new BlurError(
        'Worker manager disposed',
        BlurErrorCode.DETECTION_FAILED
      ));
    }
    this.pendingRequests.clear();

    // Dispose workers
    for (const worker of this.workers) {
      worker.postMessage({
        id: this.generateId(),
        type: 'DISPOSE'
      } as WorkerMessage);
      worker.terminate();
    }

    this.workers = [];
    this.isInitialized = false;
  }
}