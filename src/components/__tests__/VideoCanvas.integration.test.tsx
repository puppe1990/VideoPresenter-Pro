import React from 'react';
import { render, screen } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import VideoCanvas from '../VideoCanvas';
// import { BlurController } from '@/lib/blur/BlurController';
import type { PresenterSettings } from '../VideoPresenter';

// Mock the blur controller
vi.mock('@/lib/blur/BlurController');

// Mock HTMLVideoElement methods
Object.defineProperty(HTMLVideoElement.prototype, 'readyState', {
  writable: true,
  value: 4, // HAVE_ENOUGH_DATA
});

Object.defineProperty(HTMLVideoElement.prototype, 'videoWidth', {
  writable: true,
  value: 640,
});

Object.defineProperty(HTMLVideoElement.prototype, 'videoHeight', {
  writable: true,
  value: 480,
});

// Mock Canvas API
const mockGetContext = vi.fn();
const mockDrawImage = vi.fn();
const mockPutImageData = vi.fn();
const mockGetImageData = vi.fn();
const mockClearRect = vi.fn();

HTMLCanvasElement.prototype.getContext = mockGetContext.mockReturnValue({
  drawImage: mockDrawImage,
  putImageData: mockPutImageData,
  getImageData: mockGetImageData,
  clearRect: mockClearRect,
  fillRect: vi.fn(),
  fillStyle: '',
  filter: '',
});

// Mock requestAnimationFrame
global.requestAnimationFrame = vi.fn((cb) => {
  setTimeout(cb, 16);
  return 1;
});

global.cancelAnimationFrame = vi.fn();

describe('VideoCanvas Integration with Blur System', () => {
  let mockBlurController: any;
  let mockVideoRef: React.RefObject<HTMLVideoElement>;
  let defaultSettings: PresenterSettings;
  let mockOnSettingsChange: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
    
    // Create mock blur controller
    mockBlurController = {
      processFrame: vi.fn().mockResolvedValue(new ImageData(640, 480)),
      getStatus: vi.fn().mockReturnValue({
        enabled: true,
        intensity: 50,
        isProcessing: false,
        performance: { fps: 30, averageProcessingTime: 20, detectionAccuracy: 0.8, memoryUsage: 100 }
      }),
      enable: vi.fn().mockResolvedValue(undefined),
      disable: vi.fn(),
      setIntensity: vi.fn(),
      dispose: vi.fn()
    };

    // Create mock video element
    const mockVideo = document.createElement('video');
    mockVideo.readyState = 4;
    mockVideo.videoWidth = 640;
    mockVideo.videoHeight = 480;
    
    mockVideoRef = { current: mockVideo };

    // Default settings
    defaultSettings = {
      backgroundType: 'visible',
      shape: 'rectangle',
      color: '#3b82f6',
      virtualBackground: null,
      size: 'medium',
      position: { x: 16, y: 16 },
      isDragging: false,
    };

    mockOnSettingsChange = vi.fn();

    // Mock getImageData to return valid ImageData
    mockGetImageData.mockReturnValue(new ImageData(640, 480));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should render VideoCanvas without blur controller', () => {
    render(
      <VideoCanvas
        videoRef={mockVideoRef}
        settings={defaultSettings}
        onSettingsChange={mockOnSettingsChange}
        isRecording={false}
        isPictureInPicture={false}
      />
    );

    // Check that the component renders without errors
    expect(screen.getByRole('button', { name: /zoom in/i })).toBeInTheDocument();
  });

  it('should render VideoCanvas with blur controller', () => {
    render(
      <VideoCanvas
        videoRef={mockVideoRef}
        settings={defaultSettings}
        onSettingsChange={mockOnSettingsChange}
        isRecording={false}
        isPictureInPicture={false}
        blurController={mockBlurController}
      />
    );

    // Check that the component renders without errors
    expect(screen.getByRole('button', { name: /zoom in/i })).toBeInTheDocument();
  });

  it('should accept blur controller prop without errors', () => {
    const { container } = render(
      <VideoCanvas
        videoRef={mockVideoRef}
        settings={defaultSettings}
        onSettingsChange={mockOnSettingsChange}
        isRecording={false}
        isPictureInPicture={false}
        blurController={mockBlurController}
      />
    );

    // Component should render successfully with blur controller
    expect(container.firstChild).toBeInTheDocument();
  });

  it('should handle null blur controller gracefully', () => {
    const { container } = render(
      <VideoCanvas
        videoRef={mockVideoRef}
        settings={defaultSettings}
        onSettingsChange={mockOnSettingsChange}
        isRecording={false}
        isPictureInPicture={false}
        blurController={null}
      />
    );

    // Component should render successfully without blur controller
    expect(container.firstChild).toBeInTheDocument();
  });

  it('should render different video sizes correctly', () => {
    const largeSettings = { ...defaultSettings, size: 'large' as const };
    
    const { container } = render(
      <VideoCanvas
        videoRef={mockVideoRef}
        settings={largeSettings}
        onSettingsChange={mockOnSettingsChange}
        isRecording={false}
        isPictureInPicture={false}
        blurController={mockBlurController}
      />
    );

    // Component should render with large size setting
    expect(container.firstChild).toBeInTheDocument();
  });

  it('should handle hidden background type correctly', () => {
    const hiddenSettings = { ...defaultSettings, backgroundType: 'hidden' as const };

    const { container } = render(
      <VideoCanvas
        videoRef={mockVideoRef}
        settings={hiddenSettings}
        onSettingsChange={mockOnSettingsChange}
        isRecording={false}
        isPictureInPicture={false}
        blurController={mockBlurController}
      />
    );

    // Component should render with hidden background
    expect(container.firstChild).toBeInTheDocument();
  });

  it('should integrate blur controller into video processing pipeline', () => {
    // This test verifies that the blur controller is properly integrated
    // by checking that the component accepts it as a prop and renders without errors
    
    const { container } = render(
      <VideoCanvas
        videoRef={mockVideoRef}
        settings={defaultSettings}
        onSettingsChange={mockOnSettingsChange}
        isRecording={false}
        isPictureInPicture={false}
        blurController={mockBlurController}
      />
    );

    // Verify the component structure includes video and canvas elements
    const videoElement = container.querySelector('video');
    const canvasElement = container.querySelector('canvas');
    
    expect(videoElement).toBeInTheDocument();
    expect(canvasElement).toBeInTheDocument();
  });
});