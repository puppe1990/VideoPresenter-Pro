import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock ImageData constructor
global.ImageData = class ImageData {
  data: Uint8ClampedArray
  width: number
  height: number

  constructor(data: Uint8ClampedArray | number, width?: number, height?: number) {
    if (typeof data === 'number') {
      this.width = data
      this.height = width || 1
      this.data = new Uint8ClampedArray(this.width * this.height * 4)
    } else {
      this.data = data
      this.width = width || 1
      this.height = height || 1
    }
  }
} as unknown as typeof ImageData

// Mock TensorFlow.js for testing
global.HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
  putImageData: vi.fn(),
  getImageData: vi.fn(() => ({
    data: new Uint8ClampedArray(4),
    width: 1,
    height: 1
  }))
})) as unknown as HTMLCanvasElement['getContext']

// Mock performance.now for consistent timing in tests
let performanceCounter = 0
global.performance.now = vi.fn(() => {
  performanceCounter += 10 // Simulate 10ms processing time
  return performanceCounter
})