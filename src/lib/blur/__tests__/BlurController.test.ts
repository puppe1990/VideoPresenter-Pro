import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest';
import { BlurController } from '../BlurController';
import { HumanDetectionService } from '../HumanDetectionService';
import { BlurProcessingEngine } from '../BlurProcessingEngine';
import { BlurError, BlurErrorCode, BLUR_CONSTANTS } from '../types';

// Mock the dependencies
vi.mock('../HumanDetectionService');
vi.mock('../BlurProcessingEngine');

describe('BlurController', () => {
  let blurController: BlurController;
  let mockDetectionService: jest.Mocked<HumanDetectionService>;
  let mockProcessingEngine: jest.Mocked<BlurProcessingEngine>;
  let mockImageData: ImageData;
  let mockMaskData: ImageData;

  beforeEach(() => {
    // Create mock ImageData objects
    mockImageData = new ImageData(100, 100);
    mockMaskData = new ImageData(100, 100);

    // Setup mocks
    mockDetectionService = {
      initialize: vi.fn().mockResolvedValue(undefined),
      detectHumans: vi.fn().mockResolvedValue({
        mask: mockMaskData,
        confidence: 0.8,
        processingTime: 25
      }),
      dispose: vi.fn()
    } as any;

    mockProcessingEngine = {
      applyBlur: vi.fn().mockReturnValue(mockImageData),
      setBlurIntensity: vi.fn(),
      dispose: vi.fn()
    } as any;

    // Mock constructors
    (HumanDetectionService as Mock).mockImplementation(() => mockDetectionService);
    (BlurProcessingEngine as Mock).mockImplementation(() => mockProcessingEngine);

    blurController = new BlurController();
  });

  afterEach(() => {
    vi.clearAllMocks();
    blurController.dispose();
  });

  describe('Initialization and State Management', () => {
    it('should initialize with default configuration', () => {
      const status = blurController.getStatus();
      expect(status.enabled).toBe(false);
      expect(status.intensity).toBe(BLUR_CONSTANTS.DEFAULT_INTENSITY);
      expect(status.isProcessing).toBe(false);
    });

    it('should accept custom configuration', () => {
      const customController = new BlurController({
        intensity: 75,
        performanceThreshold: 100
      });
      
      const config = customController.getConfig();
      expect(config.intensity).toBe(75);
      expect(config.performanceThreshold).toBe(100);
      
      customController.dispose();
    });

    it('should enable blur processing successfully', async () => {
      await blurController.enable();
      
      expect(mockDetectionService.initialize).toHaveBeenCalledOnce();
      expect(blurController.getStatus().enabled).toBe(true);
    });

    it('should handle enable errors gracefully', async () => {
      const error = new BlurError('Model load failed', BlurErrorCode.MODEL_LOAD_FAILED);
      mockDetectionService.initialize.mockRejectedValue(error);

      await expect(blurController.enable()).rejects.toThrow(BlurError);
      expect(blurController.getStatus().enabled).toBe(false);
    });

    it('should disable blur processing', async () => {
      await blurController.enable();
      blurController.disable();
      
      const status = blurController.getStatus();
      expect(status.enabled).toBe(false);
      expect(status.isProcessing).toBe(false);
    });

    it('should not initialize twice', async () => {
      await blurController.enable();
      await blurController.enable();
      
      expect(mockDetectionService.initialize).toHaveBeenCalledOnce();
    });
  });

  describe('Intensity Management', () => {
    it('should set blur intensity within valid range', () => {
      blurController.setIntensity(75);
      
      expect(mockProcessingEngine.setBlurIntensity).toHaveBeenCalledWith(75);
      expect(blurController.getStatus().intensity).toBe(75);
    });

    it('should clamp intensity to minimum value', () => {
      blurController.setIntensity(-10);
      
      expect(mockProcessingEngine.setBlurIntensity).toHaveBeenCalledWith(0);
      expect(blurController.getStatus().intensity).toBe(0);
    });

    it('should clamp intensity to maximum value', () => {
      blurController.setIntensity(150);
      
      expect(mockProcessingEngine.setBlurIntensity).toHaveBeenCalledWith(100);
      expect(blurController.getStatus().intensity).toBe(100);
    });
  });

  describe('Frame Processing Pipeline', () => {
    beforeEach(async () => {
      await blurController.enable();
    });

    it('should process frame successfully', async () => {
      const result = await blurController.processFrame(mockImageData);
      
      expect(mockDetectionService.detectHumans).toHaveBeenCalledWith(mockImageData);
      expect(mockProcessingEngine.applyBlur).toHaveBeenCalledWith(
        mockImageData,
        mockMaskData,
        BLUR_CONSTANTS.DEFAULT_INTENSITY
      );
      expect(result).toBe(mockImageData);
    });

    it('should return original frame when disabled', async () => {
      blurController.disable();
      
      const result = await blurController.processFrame(mockImageData);
      
      expect(mockDetectionService.detectHumans).not.toHaveBeenCalled();
      expect(result).toBe(mockImageData);
    });

    it('should prevent concurrent processing', async () => {
      // Make detection service slow
      mockDetectionService.detectHumans.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({
          mask: mockMaskData,
          confidence: 0.8,
          processingTime: 25
        }), 100))
      );

      const promise1 = blurController.processFrame(mockImageData);
      const promise2 = blurController.processFrame(mockImageData);

      const [result1, result2] = await Promise.all([promise1, promise2]);
      
      // One should be processed, one should return original
      expect(mockDetectionService.detectHumans).toHaveBeenCalledOnce();
    });

    it('should handle processing errors gracefully', async () => {
      const error = new Error('Detection failed');
      mockDetectionService.detectHumans.mockRejectedValue(error);

      const result = await blurController.processFrame(mockImageData);
      
      // Should return original frame on error
      expect(result).toBe(mockImageData);
    });
  });

  describe('Performance Monitoring', () => {
    beforeEach(async () => {
      await blurController.enable();
    });

    it('should track performance metrics', async () => {
      await blurController.processFrame(mockImageData);
      
      const status = blurController.getStatus();
      expect(status.performance.averageProcessingTime).toBeGreaterThan(0);
      expect(status.performance.detectionAccuracy).toBe(0.8);
    });

    it('should handle performance monitoring', async () => {
      // Test that performance metrics are tracked
      await blurController.processFrame(mockImageData);
      await blurController.processFrame(mockImageData);
      
      const status = blurController.getStatus();
      expect(status.performance.averageProcessingTime).toBeGreaterThan(0);
      expect(status.performance.detectionAccuracy).toBeGreaterThan(0);
    });

    it('should enable fallback mode when configured', async () => {
      // Test that fallback mode can be enabled via configuration
      blurController.updateConfig({ fallbackMode: true });
      
      const config = blurController.getConfig();
      expect(config.fallbackMode).toBe(true);
    });

    it('should disable fallback mode when configured', async () => {
      // First enable fallback mode
      blurController.updateConfig({ fallbackMode: true });
      expect(blurController.getConfig().fallbackMode).toBe(true);
      
      // Then disable it
      blurController.updateConfig({ fallbackMode: false });
      expect(blurController.getConfig().fallbackMode).toBe(false);
    });
  });

  describe('Configuration Management', () => {
    it('should update configuration', () => {
      blurController.updateConfig({
        intensity: 80,
        performanceThreshold: 75
      });

      const config = blurController.getConfig();
      expect(config.intensity).toBe(80);
      expect(config.performanceThreshold).toBe(75);
      expect(mockProcessingEngine.setBlurIntensity).toHaveBeenCalledWith(80);
    });

    it('should handle enable state change in config', async () => {
      blurController.updateConfig({ enabled: true });
      
      // Wait for async enable to complete
      await new Promise(resolve => setTimeout(resolve, 0));
      
      expect(mockDetectionService.initialize).toHaveBeenCalled();
    });

    it('should handle disable state change in config', async () => {
      await blurController.enable();
      blurController.updateConfig({ enabled: false });
      
      expect(blurController.getStatus().enabled).toBe(false);
    });
  });

  describe('Resource Management', () => {
    it('should dispose of resources properly', async () => {
      await blurController.enable();
      blurController.dispose();
      
      expect(mockDetectionService.dispose).toHaveBeenCalled();
      expect(mockProcessingEngine.dispose).toHaveBeenCalled();
      expect(blurController.getStatus().enabled).toBe(false);
    });

    it('should reset performance metrics on disable', async () => {
      await blurController.enable();
      await blurController.processFrame(mockImageData);
      
      // Verify metrics are set
      expect(blurController.getStatus().performance.averageProcessingTime).toBeGreaterThan(0);
      
      blurController.disable();
      
      // Verify metrics are reset
      const status = blurController.getStatus();
      expect(status.performance.averageProcessingTime).toBe(0);
      expect(status.performance.fps).toBe(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle initialization errors', async () => {
      const error = new BlurError('Model not found', BlurErrorCode.MODEL_LOAD_FAILED);
      mockDetectionService.initialize.mockRejectedValue(error);

      await expect(blurController.enable()).rejects.toThrow(BlurError);
      expect(blurController.getStatus().enabled).toBe(false);
    });

    it('should handle detection errors during processing', async () => {
      await blurController.enable();
      
      const error = new BlurError('Detection failed', BlurErrorCode.DETECTION_FAILED);
      mockDetectionService.detectHumans.mockRejectedValue(error);

      const result = await blurController.processFrame(mockImageData);
      
      // Should return original frame and enable fallback mode
      expect(result).toBe(mockImageData);
      expect(blurController.getConfig().fallbackMode).toBe(true);
    });

    it('should handle processing errors during blur application', async () => {
      await blurController.enable();
      
      const error = new BlurError('Blur processing failed', BlurErrorCode.PROCESSING_FAILED);
      mockProcessingEngine.applyBlur.mockImplementation(() => {
        throw error;
      });

      const result = await blurController.processFrame(mockImageData);
      
      // Should return original frame
      expect(result).toBe(mockImageData);
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle complete blur pipeline workflow', async () => {
      // Enable the system
      await blurController.enable();
      expect(blurController.getStatus().enabled).toBe(true);

      // Set custom intensity
      blurController.setIntensity(75);
      expect(blurController.getStatus().intensity).toBe(75);

      // Process a frame
      const result = await blurController.processFrame(mockImageData);
      
      // Verify complete pipeline execution
      expect(mockDetectionService.detectHumans).toHaveBeenCalledWith(mockImageData);
      expect(mockProcessingEngine.applyBlur).toHaveBeenCalledWith(
        mockImageData,
        mockMaskData,
        75
      );
      expect(result).toBe(mockImageData);

      // Check performance metrics are updated
      const status = blurController.getStatus();
      expect(status.performance.averageProcessingTime).toBeGreaterThan(0);
      expect(status.performance.detectionAccuracy).toBe(0.8);

      // Disable and verify cleanup
      blurController.disable();
      expect(blurController.getStatus().enabled).toBe(false);
    });

    it('should maintain performance under load', async () => {
      await blurController.enable();
      
      // Process multiple frames rapidly
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(blurController.processFrame(mockImageData));
      }

      const results = await Promise.all(promises);
      
      // All frames should be processed (or returned as original)
      expect(results).toHaveLength(10);
      results.forEach(result => {
        expect(result).toBeInstanceOf(ImageData);
      });

      // Performance metrics should be tracked
      const status = blurController.getStatus();
      expect(status.performance.averageProcessingTime).toBeGreaterThan(0);
    });
  });
});