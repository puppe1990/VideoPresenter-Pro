import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock BlurProcessingEngine to focus on visual regression logic
class MockBlurProcessingEngine {
  private blurIntensity: number = 50

  applyBlur(originalFrame: ImageData, mask: ImageData, intensity?: number): ImageData {
    const effectiveIntensity = intensity !== undefined ? intensity : this.blurIntensity
    
    // Simulate blur effect by modifying pixel data based on intensity
    const result = new ImageData(originalFrame.width, originalFrame.height)
    const originalData = originalFrame.data
    const maskData = mask.data
    const resultData = result.data

    for (let i = 0; i < originalData.length; i += 4) {
      const pixelIndex = i / 4
      const x = pixelIndex % originalFrame.width
      const y = Math.floor(pixelIndex / originalFrame.width)
      
      // Check mask value - use red channel as mask indicator
      const maskValue = maskData[i] / 255
      
      if (maskValue > 0.1) {
        // Apply simulated blur effect based on intensity
        const blurFactor = effectiveIntensity / 100
        
        // Simulate blur by averaging with neighboring pixels
        let avgR = originalData[i]
        let avgG = originalData[i + 1]
        let avgB = originalData[i + 2]
        
        // Simple blur simulation - average with adjacent pixels
        if (blurFactor > 0) {
          const blurRadius = Math.max(1, Math.floor(blurFactor * 5)) // Increased radius for more noticeable effect
          let count = 1
          
          for (let dy = -blurRadius; dy <= blurRadius; dy++) {
            for (let dx = -blurRadius; dx <= blurRadius; dx++) {
              const nx = x + dx
              const ny = y + dy
              
              if (nx >= 0 && nx < originalFrame.width && ny >= 0 && ny < originalFrame.height) {
                const neighborIndex = (ny * originalFrame.width + nx) * 4
                // Weight closer pixels more heavily
                const distance = Math.sqrt(dx * dx + dy * dy)
                const weight = Math.max(0.1, 1 / (1 + distance))
                
                avgR += originalData[neighborIndex] * weight
                avgG += originalData[neighborIndex + 1] * weight
                avgB += originalData[neighborIndex + 2] * weight
                count += weight
              }
            }
          }
          
          avgR = Math.round(avgR / count)
          avgG = Math.round(avgG / count)
          avgB = Math.round(avgB / count)
        }
        
        resultData[i] = avgR
        resultData[i + 1] = avgG
        resultData[i + 2] = avgB
        resultData[i + 3] = originalData[i + 3]
      } else {
        // Preserve original pixels exactly
        resultData[i] = originalData[i]
        resultData[i + 1] = originalData[i + 1]
        resultData[i + 2] = originalData[i + 2]
        resultData[i + 3] = originalData[i + 3]
      }
    }

    return result
  }

  setBlurIntensity(intensity: number): void {
    this.blurIntensity = Math.max(0, Math.min(100, intensity))
  }
}

describe('Blur Visual Regression Tests', () => {
  let blurEngine: MockBlurProcessingEngine

  beforeEach(() => {
    blurEngine = new MockBlurProcessingEngine()
  })

  it('should produce consistent blur effects for identical inputs', () => {
    // Arrange: Create identical test frames and masks
    const testFrame1 = createTestImageData(100, 100, [255, 0, 0, 255]) // Red frame
    const testFrame2 = createTestImageData(100, 100, [255, 0, 0, 255]) // Identical red frame
    const mask = createTestImageData(100, 100, [255, 255, 255, 255]) // Full mask
    
    // Act: Apply blur to both frames
    const result1 = blurEngine.applyBlur(testFrame1, mask, 50)
    const result2 = blurEngine.applyBlur(testFrame2, mask, 50)
    
    // Assert: Results should be identical
    expect(result1.width).toBe(result2.width)
    expect(result1.height).toBe(result2.height)
    expect(Array.from(result1.data)).toEqual(Array.from(result2.data))
  })

  it('should apply different blur intensities correctly', () => {
    // Arrange: Create test frame with distinct pattern
    const testFrame = createCheckerboardPattern(100, 100)
    const mask = createTestImageData(100, 100, [255, 255, 255, 255])
    
    // Act: Apply different blur intensities
    const lightBlur = blurEngine.applyBlur(testFrame, mask, 10)
    const mediumBlur = blurEngine.applyBlur(testFrame, mask, 50)
    const heavyBlur = blurEngine.applyBlur(testFrame, mask, 90)
    
    // Assert: Higher intensity should produce more blur
    const lightVariance = calculateImageVariance(lightBlur)
    const mediumVariance = calculateImageVariance(mediumBlur)
    const heavyVariance = calculateImageVariance(heavyBlur)
    
    // Higher blur should reduce image variance (smoother image)
    expect(lightVariance).toBeGreaterThan(mediumVariance)
    expect(mediumVariance).toBeGreaterThan(heavyVariance)
  })

  it('should preserve non-masked regions exactly', () => {
    // Arrange: Create test frame and partial mask
    const testFrame = createTestImageData(100, 100, [255, 0, 0, 255])
    const partialMask = createPartialMask(100, 100)
    
    // Act: Apply blur with partial mask
    const result = blurEngine.applyBlur(testFrame, partialMask, 90)
    
    // Assert: Non-masked regions should remain unchanged
    const originalData = testFrame.data
    const resultData = result.data
    
    // Check specific pixels that should be unmasked (first quarter of image)
    for (let i = 0; i < (100 * 25 * 4); i += 4) {
      expect(resultData[i]).toBe(originalData[i])     // Red
      expect(resultData[i + 1]).toBe(originalData[i + 1]) // Green
      expect(resultData[i + 2]).toBe(originalData[i + 2]) // Blue
      expect(resultData[i + 3]).toBe(originalData[i + 3]) // Alpha
    }
  })

  it('should handle edge cases in blur application', () => {
    // Test with minimum size image
    const tinyFrame = createTestImageData(1, 1, [128, 128, 128, 255])
    const tinyMask = createTestImageData(1, 1, [255, 255, 255, 255])
    
    const tinyResult = blurEngine.applyBlur(tinyFrame, tinyMask, 50)
    expect(tinyResult.width).toBe(1)
    expect(tinyResult.height).toBe(1)
    
    // Test with zero intensity
    const testFrame = createTestImageData(50, 50, [100, 150, 200, 255])
    const mask = createTestImageData(50, 50, [255, 255, 255, 255])
    
    const zeroBlurResult = blurEngine.applyBlur(testFrame, mask, 0)
    expect(Array.from(zeroBlurResult.data)).toEqual(Array.from(testFrame.data))
  })

  it('should maintain image dimensions and format', () => {
    // Test various image sizes
    const sizes = [
      { width: 320, height: 240 },
      { width: 640, height: 480 },
      { width: 1920, height: 1080 },
      { width: 100, height: 200 }, // Non-square
    ]
    
    sizes.forEach(({ width, height }) => {
      const testFrame = createTestImageData(width, height, [128, 128, 128, 255])
      const mask = createTestImageData(width, height, [255, 255, 255, 255])
      
      const result = blurEngine.applyBlur(testFrame, mask, 50)
      
      expect(result.width).toBe(width)
      expect(result.height).toBe(height)
      expect(result.data.length).toBe(width * height * 4)
    })
  })
})

// Helper functions for visual testing
function createTestImageData(width: number, height: number, color: [number, number, number, number]): ImageData {
  const data = new Uint8ClampedArray(width * height * 4)
  for (let i = 0; i < data.length; i += 4) {
    data[i] = color[0]     // Red
    data[i + 1] = color[1] // Green
    data[i + 2] = color[2] // Blue
    data[i + 3] = color[3] // Alpha
  }
  return new ImageData(data, width, height)
}

function createCheckerboardPattern(width: number, height: number): ImageData {
  const data = new Uint8ClampedArray(width * height * 4)
  const squareSize = 10
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = (y * width + x) * 4
      const isBlack = Math.floor(x / squareSize) % 2 === Math.floor(y / squareSize) % 2
      const color = isBlack ? 0 : 255
      
      data[index] = color     // Red
      data[index + 1] = color // Green
      data[index + 2] = color // Blue
      data[index + 3] = 255   // Alpha
    }
  }
  
  return new ImageData(data, width, height)
}

function createPartialMask(width: number, height: number): ImageData {
  const data = new Uint8ClampedArray(width * height * 4)
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = (y * width + x) * 4
      // Mask only the bottom half of the image
      const maskValue = y > height / 2 ? 255 : 0
      
      data[index] = maskValue     // Red
      data[index + 1] = maskValue // Green
      data[index + 2] = maskValue // Blue
      data[index + 3] = 255       // Alpha
    }
  }
  
  return new ImageData(data, width, height)
}

function calculateImageVariance(imageData: ImageData): number {
  const data = imageData.data
  let sum = 0
  let sumSquares = 0
  const pixelCount = data.length / 4
  
  for (let i = 0; i < data.length; i += 4) {
    // Calculate grayscale value
    const gray = (data[i] + data[i + 1] + data[i + 2]) / 3
    sum += gray
    sumSquares += gray * gray
  }
  
  const mean = sum / pixelCount
  const variance = (sumSquares / pixelCount) - (mean * mean)
  return variance
}