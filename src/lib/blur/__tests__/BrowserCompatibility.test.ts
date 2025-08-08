import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// Browser compatibility detection utilities
class BrowserCompatibilityChecker {
  static checkWebGLSupport(): boolean {
    try {
      const canvas = document.createElement('canvas')
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
      return !!gl
    } catch {
      return false
    }
  }

  static checkCanvasSupport(): boolean {
    try {
      const canvas = document.createElement('canvas')
      const context = canvas.getContext && canvas.getContext('2d')
      return !!context
    } catch {
      return false
    }
  }

  static checkWebWorkerSupport(): boolean {
    return typeof Worker !== 'undefined'
  }

  static checkImageDataSupport(): boolean {
    try {
      new ImageData(1, 1)
      return true
    } catch {
      return false
    }
  }

  static checkTensorFlowJSSupport(): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        // In test environment, always return true for TensorFlow.js support
        resolve(true)
      } catch {
        resolve(false)
      }
    })
  }

  static async getDeviceCapabilities() {
    const capabilities = {
      webgl: this.checkWebGLSupport(),
      canvas: this.checkCanvasSupport(),
      webWorkers: this.checkWebWorkerSupport(),
      imageData: this.checkImageDataSupport(),
      tensorflowjs: await this.checkTensorFlowJSSupport(),
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      hardwareConcurrency: navigator.hardwareConcurrency || 1,
    }

    return capabilities
  }

  static isBlurFeatureSupported(capabilities: { canvas: boolean; imageData: boolean; tensorflowjs: boolean }): boolean {
    return capabilities.canvas && 
           capabilities.imageData && 
           capabilities.tensorflowjs
  }

  static getRecommendedSettings(capabilities: { hardwareConcurrency: number; webgl: boolean; webWorkers: boolean }) {
    const settings = {
      useWebWorkers: capabilities.webWorkers,
      maxProcessingSize: { width: 640, height: 480 },
      fallbackMode: false,
      processingQuality: 'medium' as 'low' | 'medium' | 'high'
    }

    // Adjust based on device capabilities
    if (capabilities.hardwareConcurrency >= 8) {
      settings.processingQuality = 'high'
      settings.maxProcessingSize = { width: 1920, height: 1080 }
    } else if (capabilities.hardwareConcurrency <= 2) {
      settings.processingQuality = 'low'
      settings.maxProcessingSize = { width: 320, height: 240 }
      settings.fallbackMode = true
    }

    if (!capabilities.webgl) {
      settings.processingQuality = 'low'
      settings.fallbackMode = true
    }

    return settings
  }
}

describe('Browser Compatibility Tests', () => {
  let originalNavigator: typeof navigator
  let originalDocument: typeof document

  beforeEach(() => {
    // Store original objects
    originalNavigator = global.navigator
    originalDocument = global.document
  })

  afterEach(() => {
    // Restore original objects
    global.navigator = originalNavigator
    global.document = originalDocument
    vi.clearAllMocks()
  })

  describe('Feature Detection', () => {
    it('should detect WebGL support correctly', () => {
      // Mock WebGL support
      const mockCanvas = {
        getContext: vi.fn().mockReturnValue({
          // Mock WebGL context
          getParameter: vi.fn(),
          createShader: vi.fn(),
        })
      }
      
      vi.spyOn(document, 'createElement').mockReturnValue(mockCanvas as unknown as HTMLCanvasElement)
      
      const hasWebGL = BrowserCompatibilityChecker.checkWebGLSupport()
      expect(hasWebGL).toBe(true)
      expect(mockCanvas.getContext).toHaveBeenCalledWith('webgl')
    })

    it('should detect Canvas 2D support correctly', () => {
      const mockCanvas = {
        getContext: vi.fn().mockReturnValue({
          // Mock 2D context
          putImageData: vi.fn(),
          getImageData: vi.fn(),
        })
      }
      
      vi.spyOn(document, 'createElement').mockReturnValue(mockCanvas as unknown as HTMLCanvasElement)
      
      const hasCanvas = BrowserCompatibilityChecker.checkCanvasSupport()
      expect(hasCanvas).toBe(true)
      expect(mockCanvas.getContext).toHaveBeenCalledWith('2d')
    })

    it('should detect Web Worker support correctly', () => {
      // Mock Worker availability
      global.Worker = class MockWorker {
        constructor() {
          // Mock worker implementation
        }
        postMessage = vi.fn()
        terminate = vi.fn()
      } as unknown as typeof Worker

      const hasWebWorkers = BrowserCompatibilityChecker.checkWebWorkerSupport()
      expect(hasWebWorkers).toBe(true)
    })

    it('should detect ImageData support correctly', () => {
      // ImageData is already mocked in setup.ts
      const hasImageData = BrowserCompatibilityChecker.checkImageDataSupport()
      expect(hasImageData).toBe(true)
    })

    it('should handle missing features gracefully', () => {
      // Mock missing WebGL
      const mockCanvas = {
        getContext: vi.fn().mockReturnValue(null)
      }
      
      vi.spyOn(document, 'createElement').mockReturnValue(mockCanvas as unknown as HTMLCanvasElement)
      
      const hasWebGL = BrowserCompatibilityChecker.checkWebGLSupport()
      expect(hasWebGL).toBe(false)
    })
  })

  describe('Browser-Specific Tests', () => {
    it('should handle Chrome browser correctly', async () => {
      // Mock Chrome user agent
      Object.defineProperty(global.navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        configurable: true
      })

      Object.defineProperty(global.navigator, 'hardwareConcurrency', {
        value: 8,
        configurable: true
      })

      // Mock Canvas support for this test
      const mockCanvas = {
        getContext: vi.fn().mockReturnValue({
          putImageData: vi.fn(),
          getImageData: vi.fn(),
        })
      }
      vi.spyOn(document, 'createElement').mockReturnValue(mockCanvas as unknown as HTMLCanvasElement)

      const capabilities = await BrowserCompatibilityChecker.getDeviceCapabilities()
      
      expect(capabilities.userAgent).toContain('Chrome')
      expect(capabilities.hardwareConcurrency).toBe(8)
      expect(BrowserCompatibilityChecker.isBlurFeatureSupported(capabilities)).toBe(true)
    })

    it('should handle Firefox browser correctly', async () => {
      // Mock Firefox user agent
      Object.defineProperty(global.navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0',
        configurable: true
      })

      Object.defineProperty(global.navigator, 'hardwareConcurrency', {
        value: 4,
        configurable: true
      })

      // Mock Canvas support for this test
      const mockCanvas = {
        getContext: vi.fn().mockReturnValue({
          putImageData: vi.fn(),
          getImageData: vi.fn(),
        })
      }
      vi.spyOn(document, 'createElement').mockReturnValue(mockCanvas as unknown as HTMLCanvasElement)

      const capabilities = await BrowserCompatibilityChecker.getDeviceCapabilities()
      
      expect(capabilities.userAgent).toContain('Firefox')
      expect(capabilities.hardwareConcurrency).toBe(4)
      expect(BrowserCompatibilityChecker.isBlurFeatureSupported(capabilities)).toBe(true)
    })

    it('should handle Safari browser correctly', async () => {
      // Mock Safari user agent
      Object.defineProperty(global.navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15',
        configurable: true
      })

      Object.defineProperty(global.navigator, 'hardwareConcurrency', {
        value: 4,
        configurable: true
      })

      // Mock Canvas support for this test
      const mockCanvas = {
        getContext: vi.fn().mockReturnValue({
          putImageData: vi.fn(),
          getImageData: vi.fn(),
        })
      }
      vi.spyOn(document, 'createElement').mockReturnValue(mockCanvas as unknown as HTMLCanvasElement)

      const capabilities = await BrowserCompatibilityChecker.getDeviceCapabilities()
      
      expect(capabilities.userAgent).toContain('Safari')
      expect(BrowserCompatibilityChecker.isBlurFeatureSupported(capabilities)).toBe(true)
    })

    it('should handle mobile browsers correctly', async () => {
      // Mock mobile Chrome user agent
      Object.defineProperty(global.navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Linux; Android 10; SM-G975F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36',
        configurable: true
      })

      Object.defineProperty(global.navigator, 'hardwareConcurrency', {
        value: 2,
        configurable: true
      })

      const capabilities = await BrowserCompatibilityChecker.getDeviceCapabilities()
      const settings = BrowserCompatibilityChecker.getRecommendedSettings(capabilities)
      
      expect(capabilities.userAgent).toContain('Mobile')
      expect(settings.processingQuality).toBe('low')
      expect(settings.fallbackMode).toBe(true)
      expect(settings.maxProcessingSize.width).toBe(320)
    })
  })

  describe('Device Capability Assessment', () => {
    it('should recommend high-quality settings for powerful devices', async () => {
      Object.defineProperty(global.navigator, 'hardwareConcurrency', {
        value: 16,
        configurable: true
      })

      // Mock Canvas and WebGL support for this test
      const mockCanvas = {
        getContext: vi.fn((type) => {
          if (type === 'webgl' || type === 'experimental-webgl') {
            return { getParameter: vi.fn(), createShader: vi.fn() }
          }
          return { putImageData: vi.fn(), getImageData: vi.fn() }
        })
      }
      vi.spyOn(document, 'createElement').mockReturnValue(mockCanvas as unknown as HTMLCanvasElement)

      const capabilities = await BrowserCompatibilityChecker.getDeviceCapabilities()
      const settings = BrowserCompatibilityChecker.getRecommendedSettings(capabilities)
      
      expect(settings.processingQuality).toBe('high')
      expect(settings.maxProcessingSize.width).toBe(1920)
      expect(settings.fallbackMode).toBe(false)
    })

    it('should recommend low-quality settings for weak devices', async () => {
      Object.defineProperty(global.navigator, 'hardwareConcurrency', {
        value: 1,
        configurable: true
      })

      // Mock no WebGL support
      const mockCanvas = {
        getContext: vi.fn().mockReturnValue(null)
      }
      vi.spyOn(document, 'createElement').mockReturnValue(mockCanvas as unknown as HTMLCanvasElement)

      const capabilities = await BrowserCompatibilityChecker.getDeviceCapabilities()
      const settings = BrowserCompatibilityChecker.getRecommendedSettings(capabilities)
      
      expect(settings.processingQuality).toBe('low')
      expect(settings.maxProcessingSize.width).toBe(320)
      expect(settings.fallbackMode).toBe(true)
    })

    it('should handle unsupported browsers gracefully', async () => {
      // Mock old browser without required features
      global.ImageData = undefined as unknown as typeof ImageData
      
      const mockCanvas = {
        getContext: vi.fn().mockReturnValue(null)
      }
      vi.spyOn(document, 'createElement').mockReturnValue(mockCanvas as unknown as HTMLCanvasElement)

      const capabilities = await BrowserCompatibilityChecker.getDeviceCapabilities()
      
      expect(capabilities.canvas).toBe(false)
      expect(capabilities.imageData).toBe(false)
      expect(BrowserCompatibilityChecker.isBlurFeatureSupported(capabilities)).toBe(false)
    })
  })

  describe('Fallback Mechanisms', () => {
    it('should provide appropriate fallback when WebGL is unavailable', async () => {
      // Mock no WebGL support
      const mockCanvas = {
        getContext: vi.fn((type) => {
          if (type === 'webgl' || type === 'experimental-webgl') {
            return null
          }
          return { putImageData: vi.fn(), getImageData: vi.fn() }
        })
      }
      vi.spyOn(document, 'createElement').mockReturnValue(mockCanvas as unknown as HTMLCanvasElement)

      const capabilities = await BrowserCompatibilityChecker.getDeviceCapabilities()
      const settings = BrowserCompatibilityChecker.getRecommendedSettings(capabilities)
      
      expect(capabilities.webgl).toBe(false)
      expect(capabilities.canvas).toBe(true)
      expect(settings.fallbackMode).toBe(true)
      expect(settings.processingQuality).toBe('low')
    })

    it('should disable feature when core requirements are missing', async () => {
      // Mock missing Canvas support
      vi.spyOn(document, 'createElement').mockImplementation(() => {
        throw new Error('Canvas not supported')
      })

      const capabilities = await BrowserCompatibilityChecker.getDeviceCapabilities()
      
      expect(capabilities.canvas).toBe(false)
      expect(BrowserCompatibilityChecker.isBlurFeatureSupported(capabilities)).toBe(false)
    })
  })
})