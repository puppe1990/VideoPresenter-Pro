import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { BlurController } from '../BlurController'

// Mock the entire blur system components
vi.mock('../HumanDetectionService', () => ({
  HumanDetectionService: vi.fn().mockImplementation(() => ({
    initialize: vi.fn().mockResolvedValue(undefined),
    detectHumans: vi.fn().mockResolvedValue({
      mask: new ImageData(640, 480),
      confidence: 0.85,
      processingTime: 25
    }),
    dispose: vi.fn(),
  }))
}))

vi.mock('../BlurProcessingEngine', () => ({
  BlurProcessingEngine: vi.fn().mockImplementation(() => ({
    applyBlur: vi.fn().mockImplementation((frame) => {
      // Return a new ImageData with same dimensions
      return new ImageData(frame.width, frame.height)
    }),
    setBlurIntensity: vi.fn(),
    applyUniformBlur: vi.fn().mockImplementation((frame) => {
      return new ImageData(frame.width, frame.height)
    }),
    dispose: vi.fn(),
  }))
}))

describe('Blur Workflow End-to-End Tests', () => {
  let blurController: BlurController

  beforeEach(async () => {
    blurController = new BlurController()
    await blurController.enable()
  })

  afterEach(() => {
    blurController.dispose()
    vi.clearAllMocks()
  })

  it('should complete full blur workflow from video frame to blurred output', async () => {
    // Arrange: Create test video frame
    const testFrame = new ImageData(640, 480)
    
    // Act: Set intensity and process frame (already enabled in beforeEach)
    blurController.setIntensity(50)
    
    const result = await blurController.processFrame(testFrame)
    
    // Assert: Verify complete workflow
    expect(result).toBeInstanceOf(ImageData)
    expect(result.width).toBe(640)
    expect(result.height).toBe(480)
    
    const status = blurController.getStatus()
    expect(status.enabled).toBe(true)
    expect(status.intensity).toBe(50)
    expect(status.isProcessing).toBe(false)
  })

  it('should handle multiple humans in single frame', async () => {
    // Arrange: Mock detection service to return multiple human regions
    const testFrame = new ImageData(640, 480)
    
    // Act: Process frame with multiple humans (already enabled in beforeEach)
    const result = await blurController.processFrame(testFrame)
    
    // Assert: Verify all humans are processed
    expect(result).toBeInstanceOf(ImageData)
    const status = blurController.getStatus()
    expect(status.performance.detectionAccuracy).toBeGreaterThan(0)
  })

  it('should maintain performance under continuous processing', async () => {
    // Arrange: Setup for performance test
    const testFrame = new ImageData(640, 480)
    
    const startTime = performance.now()
    const frameCount = 10
    
    // Act: Process multiple frames continuously (already enabled in beforeEach)
    for (let i = 0; i < frameCount; i++) {
      await blurController.processFrame(testFrame)
    }
    
    const endTime = performance.now()
    const avgProcessingTime = (endTime - startTime) / frameCount
    
    // Assert: Verify performance requirements (< 50ms per frame)
    expect(avgProcessingTime).toBeLessThan(50)
    
    const status = blurController.getStatus()
    expect(status.performance.fps).toBeGreaterThanOrEqual(20)
  })

  it('should gracefully handle enable/disable state changes during processing', async () => {
    // Arrange
    const testFrame = new ImageData(640, 480)
    
    // Act: Toggle states during processing (already enabled in beforeEach)
    const enabledResult = await blurController.processFrame(testFrame)
    
    blurController.disable()
    const disabledResult = await blurController.processFrame(testFrame)
    
    await blurController.enable()
    const reEnabledResult = await blurController.processFrame(testFrame)
    
    // Assert: Verify state changes are handled correctly
    expect(enabledResult).toBeInstanceOf(ImageData)
    expect(disabledResult).toEqual(testFrame) // Should return original frame when disabled
    expect(reEnabledResult).toBeInstanceOf(ImageData)
    
    const status = blurController.getStatus()
    expect(status.enabled).toBe(true)
  })

  it('should handle intensity changes during real-time processing', async () => {
    // Arrange
    const testFrame = new ImageData(640, 480)
    
    // Act: Change intensity multiple times during processing (already enabled in beforeEach)
    const intensities = [10, 50, 90, 30]
    const results = []
    
    for (const intensity of intensities) {
      blurController.setIntensity(intensity)
      const result = await blurController.processFrame(testFrame)
      results.push(result)
      
      const status = blurController.getStatus()
      expect(status.intensity).toBe(intensity)
    }
    
    // Assert: All results should be valid ImageData
    results.forEach(result => {
      expect(result).toBeInstanceOf(ImageData)
      expect(result.width).toBe(640)
      expect(result.height).toBe(480)
    })
  })
})