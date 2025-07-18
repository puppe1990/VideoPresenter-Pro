import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { HumanDetectionService } from '../HumanDetectionService'
import { BlurError, BlurErrorCode } from '../types'

// Mock TensorFlow.js and BodyPix
vi.mock('@tensorflow/tfjs', () => ({
  ready: vi.fn().mockResolvedValue(undefined),
  getBackend: vi.fn().mockReturnValue('webgl'),
  setBackend: vi.fn().mockResolvedValue(undefined),
  disposeVariables: vi.fn()
}))

vi.mock('@tensorflow-models/body-pix', () => ({
  load: vi.fn()
}))

// Mock DOM APIs
Object.defineProperty(global, 'document', {
  value: {
    createElement: vi.fn(() => {
      const canvas = {
        width: 0,
        height: 0,
        getContext: vi.fn(() => ({
          putImageData: vi.fn(),
          getImageData: vi.fn()
        })),
        remove: vi.fn()
      }
      // Make it look like HTMLCanvasElement for instanceof checks
      Object.setPrototypeOf(canvas, HTMLCanvasElement.prototype)
      return canvas
    })
  }
})

// Mock HTMLCanvasElement constructor
global.HTMLCanvasElement = class HTMLCanvasElement {
  width = 0
  height = 0
  getContext = vi.fn()
  remove = vi.fn()
} as Partial<HTMLCanvasElement>

describe('HumanDetectionService', () => {
  let service: HumanDetectionService
  let mockModel: { segmentPerson: ReturnType<typeof vi.fn>; dispose: ReturnType<typeof vi.fn> }

  beforeEach(() => {
    service = new HumanDetectionService()
    
    // Create mock model
    mockModel = {
      segmentPerson: vi.fn(),
      dispose: vi.fn()
    }

    // Reset all mocks
    vi.clearAllMocks()
  })

  afterEach(() => {
    service.dispose()
  })

  describe('initialize', () => {
    it('should initialize successfully with WebGL backend', async () => {
      const { load } = await import('@tensorflow-models/body-pix')
      const tf = await import('@tensorflow/tfjs')
      
      vi.mocked(load).mockResolvedValue(mockModel)
      vi.mocked(tf.ready).mockResolvedValue(undefined)
      vi.mocked(tf.getBackend).mockReturnValue('webgl')

      await service.initialize()

      expect(tf.ready).toHaveBeenCalled()
      expect(load).toHaveBeenCalledWith({
        architecture: 'MobileNetV1',
        outputStride: 16,
        multiplier: 0.75,
        quantBytes: 2
      })
    })

    it('should fallback to CPU backend if WebGL fails', async () => {
      const { load } = await import('@tensorflow-models/body-pix')
      const tf = await import('@tensorflow/tfjs')
      
      vi.mocked(load).mockResolvedValue(mockModel)
      vi.mocked(tf.ready).mockResolvedValue(undefined)
      vi.mocked(tf.getBackend).mockReturnValue('cpu')
      vi.mocked(tf.setBackend).mockRejectedValueOnce(new Error('WebGL not supported'))

      await service.initialize()

      expect(tf.setBackend).toHaveBeenCalledWith('webgl')
      expect(tf.setBackend).toHaveBeenCalledWith('cpu')
    })

    it('should throw BlurError if model loading fails', async () => {
      const { load } = await import('@tensorflow-models/body-pix')
      const tf = await import('@tensorflow/tfjs')
      
      vi.mocked(tf.ready).mockResolvedValue(undefined)
      vi.mocked(load).mockRejectedValue(new Error('Network error'))

      await expect(service.initialize()).rejects.toThrow(BlurError)
      await expect(service.initialize()).rejects.toThrow('Failed to initialize human detection model')
    })

    it('should not reinitialize if already initialized', async () => {
      const { load } = await import('@tensorflow-models/body-pix')
      
      vi.mocked(load).mockResolvedValue(mockModel)

      await service.initialize()
      await service.initialize()

      expect(load).toHaveBeenCalledTimes(1)
    })

    it('should wait for existing initialization to complete', async () => {
      const { load } = await import('@tensorflow-models/body-pix')
      
      // Simulate slow initialization
      vi.mocked(load).mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve(mockModel), 100))
      )

      const promise1 = service.initialize()
      const promise2 = service.initialize()

      await Promise.all([promise1, promise2])

      expect(load).toHaveBeenCalledTimes(1)
    })
  })

  describe('detectHumans', () => {
    beforeEach(async () => {
      const { load } = await import('@tensorflow-models/body-pix')
      vi.mocked(load).mockResolvedValue(mockModel)
      await service.initialize()
    })

    it('should detect humans and return detection result', async () => {
      const mockImageData = new ImageData(new Uint8ClampedArray(16), 2, 2)
      const mockSegmentation = {
        data: new Uint8Array([1, 0, 1, 0]) // 2 human pixels, 2 background pixels
      }

      mockModel.segmentPerson.mockResolvedValue(mockSegmentation)

      const result = await service.detectHumans(mockImageData)

      expect(result).toHaveProperty('mask')
      expect(result).toHaveProperty('confidence')
      expect(result).toHaveProperty('processingTime')
      expect(result.confidence).toBeGreaterThan(0)
      expect(result.processingTime).toBeGreaterThan(0)
      expect(result.mask).toBeInstanceOf(ImageData)
    })

    it('should return zero confidence when no humans detected', async () => {
      const mockImageData = new ImageData(new Uint8ClampedArray(16), 2, 2)
      const mockSegmentation = {
        data: new Uint8Array([0, 0, 0, 0]) // No human pixels
      }

      mockModel.segmentPerson.mockResolvedValue(mockSegmentation)

      const result = await service.detectHumans(mockImageData)

      expect(result.confidence).toBe(0)
    })

    it('should throw BlurError if not initialized', async () => {
      const uninitializedService = new HumanDetectionService()
      const mockImageData = new ImageData(new Uint8ClampedArray(4), 1, 1)

      await expect(uninitializedService.detectHumans(mockImageData))
        .rejects.toThrow(BlurError)
      await expect(uninitializedService.detectHumans(mockImageData))
        .rejects.toThrow('Human detection service not initialized')
    })

    it('should throw BlurError if detection fails', async () => {
      const mockImageData = new ImageData(new Uint8ClampedArray(4), 1, 1)
      
      mockModel.segmentPerson.mockRejectedValue(new Error('Segmentation failed'))

      await expect(service.detectHumans(mockImageData))
        .rejects.toThrow(BlurError)
      await expect(service.detectHumans(mockImageData))
        .rejects.toThrow('Failed to detect humans in image')
    })

    it('should call segmentPerson with correct parameters', async () => {
      const mockImageData = new ImageData(new Uint8ClampedArray(16), 2, 2)
      const mockSegmentation = {
        data: new Uint8Array([1, 0, 1, 0])
      }

      mockModel.segmentPerson.mockResolvedValue(mockSegmentation)

      await service.detectHumans(mockImageData)

      expect(mockModel.segmentPerson).toHaveBeenCalledWith(
        expect.objectContaining({
          width: 2,
          height: 2,
          getContext: expect.any(Function),
          remove: expect.any(Function)
        }),
        {
          flipHorizontal: false,
          internalResolution: 'medium',
          segmentationThreshold: 0.7,
          maxDetections: 10,
          scoreThreshold: 0.3,
          nmsRadius: 20
        }
      )
    })
  })

  describe('dispose', () => {
    it('should dispose model and clean up resources', async () => {
      const { load } = await import('@tensorflow-models/body-pix')
      const tf = await import('@tensorflow/tfjs')
      
      vi.mocked(load).mockResolvedValue(mockModel)
      await service.initialize()

      service.dispose()

      expect(mockModel.dispose).toHaveBeenCalled()
      expect(tf.disposeVariables).toHaveBeenCalled()
    })

    it('should handle disposal when not initialized', () => {
      expect(() => service.dispose()).not.toThrow()
    })

    it('should allow reinitialization after disposal', async () => {
      const { load } = await import('@tensorflow-models/body-pix')
      
      vi.mocked(load).mockResolvedValue(mockModel)
      
      await service.initialize()
      service.dispose()
      await service.initialize()

      expect(load).toHaveBeenCalledTimes(2)
    })
  })

  describe('error handling', () => {
    it('should throw BlurError with correct error code for model loading failure', async () => {
      const { load } = await import('@tensorflow-models/body-pix')
      
      vi.mocked(load).mockRejectedValue(new Error('Network error'))

      try {
        await service.initialize()
      } catch (error) {
        expect(error).toBeInstanceOf(BlurError)
        expect((error as BlurError).code).toBe(BlurErrorCode.MODEL_LOAD_FAILED)
        expect((error as BlurError).cause).toBeInstanceOf(Error)
      }
    })

    it('should throw BlurError with correct error code for detection failure', async () => {
      const { load } = await import('@tensorflow-models/body-pix')
      
      vi.mocked(load).mockResolvedValue(mockModel)
      await service.initialize()

      const mockImageData = new ImageData(new Uint8ClampedArray(4), 1, 1)
      mockModel.segmentPerson.mockRejectedValue(new Error('Detection error'))

      try {
        await service.detectHumans(mockImageData)
      } catch (error) {
        expect(error).toBeInstanceOf(BlurError)
        expect((error as BlurError).code).toBe(BlurErrorCode.DETECTION_FAILED)
      }
    })
  })
})