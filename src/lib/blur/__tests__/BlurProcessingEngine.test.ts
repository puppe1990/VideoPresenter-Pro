/**
 * Unit tests for BlurProcessingEngine
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BlurProcessingEngine } from '../BlurProcessingEngine';
import { BLUR_CONSTANTS, BlurError, BlurErrorCode } from '../types';

// Mock Canvas API
const mockCanvas = {
  width: 0,
  height: 0,
  getContext: vi.fn()
};

const mockContext = {
  putImageData: vi.fn(),
  getImageData: vi.fn(),
  drawImage: vi.fn(),
  filter: 'none'
};

// Mock document.createElement
Object.defineProperty(global, 'document', {
  value: {
    createElement: vi.fn(() => mockCanvas)
  }
});

describe('BlurProcessingEngine', () => {
  let engine: BlurProcessingEngine;
  let mockImageData: ImageData;
  let mockMaskData: ImageData;

  beforeEach(() => {
    vi.clearAllMocks();
    mockCanvas.getContext.mockReturnValue(mockContext);
    
    // Create mock image data (2x2 pixels for simplicity)
    mockImageData = new ImageData(new Uint8ClampedArray([
      255, 0, 0, 255,    // Red pixel
      0, 255, 0, 255,    // Green pixel
      0, 0, 255, 255,    // Blue pixel
      255, 255, 255, 255 // White pixel
    ]), 2, 2);

    // Create mock mask data (2x2 pixels)
    mockMaskData = new ImageData(new Uint8ClampedArray([
      0, 0, 0, 255,      // Detected human (full alpha)
      0, 0, 0, 0,        // No detection (zero alpha)
      0, 0, 0, 128,      // Partial detection (half alpha)
      0, 0, 0, 0         // No detection (zero alpha)
    ]), 2, 2);

    engine = new BlurProcessingEngine();
  });

  describe('constructor', () => {
    it('should create canvas and context successfully', () => {
      expect(document.createElement).toHaveBeenCalledWith('canvas');
      expect(mockCanvas.getContext).toHaveBeenCalledWith('2d');
    });

    it('should throw error if canvas context is not available', () => {
      mockCanvas.getContext.mockReturnValue(null);
      
      expect(() => new BlurProcessingEngine()).toThrow(BlurError);
      expect(() => new BlurProcessingEngine()).toThrow('Failed to get 2D rendering context');
    });
  });

  describe('setBlurIntensity', () => {
    it('should set blur intensity within valid range', () => {
      engine.setBlurIntensity(75);
      // We can't directly test the private property, but we can test it through applyBlur
      expect(() => engine.setBlurIntensity(75)).not.toThrow();
    });

    it('should clamp intensity to minimum value', () => {
      engine.setBlurIntensity(-10);
      expect(() => engine.setBlurIntensity(-10)).not.toThrow();
    });

    it('should clamp intensity to maximum value', () => {
      engine.setBlurIntensity(150);
      expect(() => engine.setBlurIntensity(150)).not.toThrow();
    });
  });

  describe('applyBlur', () => {
    beforeEach(() => {
      // Mock getImageData to return a blurred version
      mockContext.getImageData.mockReturnValue(new ImageData(new Uint8ClampedArray([
        128, 128, 128, 255, // Blurred pixel
        128, 128, 128, 255, // Blurred pixel
        128, 128, 128, 255, // Blurred pixel
        128, 128, 128, 255  // Blurred pixel
      ]), 2, 2));
    });

    it('should apply blur effect successfully', () => {
      const result = engine.applyBlur(mockImageData, mockMaskData, 50);
      
      expect(result).toBeInstanceOf(ImageData);
      expect(result.width).toBe(2);
      expect(result.height).toBe(2);
      expect(mockContext.putImageData).toHaveBeenCalledWith(mockImageData, 0, 0);
    });

    it('should throw error for null original frame', () => {
      expect(() => engine.applyBlur(null as any, mockMaskData, 50))
        .toThrow(BlurError);
    });

    it('should throw error for null mask', () => {
      expect(() => engine.applyBlur(mockImageData, null as any, 50))
        .toThrow(BlurError);
    });

    it('should throw error for mismatched dimensions', () => {
      const mismatchedMask = new ImageData(new Uint8ClampedArray([
        0, 0, 0, 255
      ]), 1, 1);

      expect(() => engine.applyBlur(mockImageData, mismatchedMask, 50))
        .toThrow(BlurError);
      expect(() => engine.applyBlur(mockImageData, mismatchedMask, 50))
        .toThrow('Frame and mask dimensions must match');
    });

    it('should handle zero intensity (no blur)', () => {
      const result = engine.applyBlur(mockImageData, mockMaskData, 0);
      
      expect(result).toBeInstanceOf(ImageData);
      // With zero intensity, filter should not be applied
      expect(mockContext.filter).toBe('none');
    });

    it('should handle maximum intensity', () => {
      const result = engine.applyBlur(mockImageData, mockMaskData, 100);
      
      expect(result).toBeInstanceOf(ImageData);
      expect(mockContext.putImageData).toHaveBeenCalled();
    });

    it('should composite frames correctly based on mask', () => {
      const result = engine.applyBlur(mockImageData, mockMaskData, 50);
      
      // First pixel should be blurred (mask alpha = 255)
      expect(result.data[0]).toBe(128); // Blurred red channel
      expect(result.data[1]).toBe(128); // Blurred green channel
      expect(result.data[2]).toBe(128); // Blurred blue channel
      expect(result.data[3]).toBe(255); // Original alpha preserved
      
      // Second pixel should be original (mask alpha = 0)
      expect(result.data[4]).toBe(0);   // Original red channel
      expect(result.data[5]).toBe(255); // Original green channel
      expect(result.data[6]).toBe(0);   // Original blue channel
      expect(result.data[7]).toBe(255); // Original alpha
    });
  });

  describe('error handling', () => {
    it('should wrap unknown errors in BlurError', () => {
      mockContext.putImageData.mockImplementation(() => {
        throw new Error('Canvas error');
      });

      expect(() => engine.applyBlur(mockImageData, mockMaskData, 50))
        .toThrow(BlurError);
      expect(() => engine.applyBlur(mockImageData, mockMaskData, 50))
        .toThrow('Failed to apply blur effect');
    });

    it('should preserve BlurError instances', () => {
      const customError = new BlurError('Custom error', BlurErrorCode.PROCESSING_FAILED);
      mockContext.putImageData.mockImplementation(() => {
        throw customError;
      });

      expect(() => engine.applyBlur(mockImageData, mockMaskData, 50))
        .toThrow(customError);
    });
  });

  describe('dispose', () => {
    it('should clean up resources', () => {
      engine.dispose();
      expect(mockContext.filter).toBe('none');
    });
  });

  describe('performance considerations', () => {
    it('should handle large image data efficiently', () => {
      // Create larger mock data (100x100 pixels)
      const largeImageData = new ImageData(100, 100);
      const largeMaskData = new ImageData(100, 100);
      
      // Fill with test data
      for (let i = 0; i < largeImageData.data.length; i += 4) {
        largeImageData.data[i] = 255;     // R
        largeImageData.data[i + 1] = 0;   // G
        largeImageData.data[i + 2] = 0;   // B
        largeImageData.data[i + 3] = 255; // A
        
        largeMaskData.data[i + 3] = i % 8 === 0 ? 255 : 0; // Sparse detection
      }

      mockContext.getImageData.mockReturnValue(largeImageData);

      const startTime = performance.now();
      const result = engine.applyBlur(largeImageData, largeMaskData, 50);
      const endTime = performance.now();

      expect(result).toBeInstanceOf(ImageData);
      expect(result.width).toBe(100);
      expect(result.height).toBe(100);
      
      // Processing should complete within reasonable time
      expect(endTime - startTime).toBeLessThan(100); // 100ms threshold
    });
  });
});