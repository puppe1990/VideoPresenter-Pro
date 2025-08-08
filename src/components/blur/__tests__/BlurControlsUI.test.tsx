import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BlurControlsUI } from '../BlurControlsUI';
import type { BlurStatus } from '@/lib/blur/types';
import { BLUR_CONSTANTS } from '@/lib/blur/types';

// Mock the UI components
vi.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: { children: React.ReactNode; className?: string }) => 
    <div className={className} data-testid="card">{children}</div>,
  CardContent: ({ children, className }: { children: React.ReactNode; className?: string }) => 
    <div className={className} data-testid="card-content">{children}</div>,
  CardHeader: ({ children, className }: { children: React.ReactNode; className?: string }) => 
    <div className={className} data-testid="card-header">{children}</div>,
  CardTitle: ({ children, className }: { children: React.ReactNode; className?: string }) => 
    <div className={className} data-testid="card-title">{children}</div>,
}));

vi.mock('@/components/ui/switch', () => ({
  Switch: ({ checked, onCheckedChange, id }: { 
    checked: boolean; 
    onCheckedChange: (checked: boolean) => void; 
    id: string 
  }) => (
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onCheckedChange(e.target.checked)}
      data-testid={id}
    />
  ),
}));

vi.mock('@/components/ui/slider', () => ({
  Slider: ({ value, onValueChange, min, max, disabled, id }: { 
    value: number[]; 
    onValueChange: (value: number[]) => void; 
    min: number; 
    max: number; 
    disabled?: boolean; 
    id: string 
  }) => (
    <input
      type="range"
      value={value[0]}
      onChange={(e) => onValueChange([parseInt(e.target.value)])}
      min={min}
      max={max}
      disabled={disabled}
      data-testid={id}
    />
  ),
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, className }: { children: React.ReactNode; className?: string }) => 
    <span className={className} data-testid="status-badge">{children}</span>,
}));

vi.mock('@/components/ui/label', () => ({
  Label: ({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) => 
    <label htmlFor={htmlFor} data-testid={`label-${htmlFor}`}>{children}</label>,
}));

vi.mock('@/components/ui/tooltip', () => ({
  TooltipProvider: ({ children }: { children: React.ReactNode }) => 
    <div data-testid="tooltip-provider">{children}</div>,
  Tooltip: ({ children }: { children: React.ReactNode }) => 
    <div data-testid="tooltip">{children}</div>,
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => 
    <div data-testid="tooltip-trigger">{children}</div>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => 
    <div data-testid="tooltip-content">{children}</div>,
}));

describe('BlurControlsUI', () => {
  const mockOnToggle = vi.fn();
  const mockOnIntensityChange = vi.fn();

  const defaultStatus: BlurStatus = {
    enabled: false,
    intensity: BLUR_CONSTANTS.DEFAULT_INTENSITY,
    isProcessing: false,
    performance: {
      fps: 30,
      averageProcessingTime: 25,
      detectionAccuracy: 0.95,
      memoryUsage: 100
    }
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('renders the component with all main elements', () => {
      render(
        <BlurControlsUI
          onToggle={mockOnToggle}
          onIntensityChange={mockOnIntensityChange}
          status={defaultStatus}
        />
      );

      expect(screen.getByTestId('card')).toBeInTheDocument();
      expect(screen.getByText('Human Blurring')).toBeInTheDocument();
      expect(screen.getByText('Enable Blurring')).toBeInTheDocument();
      expect(screen.getByText('Blur Intensity')).toBeInTheDocument();
      expect(screen.getByTestId('blur-toggle')).toBeInTheDocument();
      expect(screen.getByTestId('blur-intensity')).toBeInTheDocument();
    });

    it('displays the correct status badge when disabled', () => {
      render(
        <BlurControlsUI
          onToggle={mockOnToggle}
          onIntensityChange={mockOnIntensityChange}
          status={defaultStatus}
        />
      );

      const statusBadge = screen.getByTestId('status-badge');
      expect(statusBadge).toHaveTextContent('Disabled');
    });

    it('displays the correct status badge when enabled and processing', () => {
      const processingStatus: BlurStatus = {
        ...defaultStatus,
        enabled: true,
        isProcessing: true
      };

      render(
        <BlurControlsUI
          onToggle={mockOnToggle}
          onIntensityChange={mockOnIntensityChange}
          status={processingStatus}
        />
      );

      const statusBadge = screen.getByTestId('status-badge');
      expect(statusBadge).toHaveTextContent('Active');
    });

    it('displays performance warning when metrics are poor', () => {
      const poorPerformanceStatus: BlurStatus = {
        ...defaultStatus,
        enabled: true,
        isProcessing: false,
        performance: {
          fps: 15, // Below target
          averageProcessingTime: 80, // Above threshold
          detectionAccuracy: 0.95,
          memoryUsage: 100
        }
      };

      render(
        <BlurControlsUI
          onToggle={mockOnToggle}
          onIntensityChange={mockOnIntensityChange}
          status={poorPerformanceStatus}
        />
      );

      const statusBadge = screen.getByTestId('status-badge');
      expect(statusBadge).toHaveTextContent('Performance');
    });

    it('displays ready status when performance is good', () => {
      const goodPerformanceStatus: BlurStatus = {
        ...defaultStatus,
        enabled: true,
        isProcessing: false,
        performance: {
          fps: 30, // Above target
          averageProcessingTime: 20, // Below threshold
          detectionAccuracy: 0.95,
          memoryUsage: 100
        }
      };

      render(
        <BlurControlsUI
          onToggle={mockOnToggle}
          onIntensityChange={mockOnIntensityChange}
          status={goodPerformanceStatus}
        />
      );

      const statusBadge = screen.getByTestId('status-badge');
      expect(statusBadge).toHaveTextContent('Ready');
    });
  });

  describe('Toggle Switch Interactions', () => {
    it('calls onToggle when switch is clicked', () => {
      render(
        <BlurControlsUI
          onToggle={mockOnToggle}
          onIntensityChange={mockOnIntensityChange}
          status={defaultStatus}
        />
      );

      const toggleSwitch = screen.getByTestId('blur-toggle');
      fireEvent.click(toggleSwitch);

      expect(mockOnToggle).toHaveBeenCalledWith(true);
    });

    it('reflects the current enabled state in the switch', () => {
      const enabledStatus: BlurStatus = {
        ...defaultStatus,
        enabled: true
      };

      render(
        <BlurControlsUI
          onToggle={mockOnToggle}
          onIntensityChange={mockOnIntensityChange}
          status={enabledStatus}
        />
      );

      const toggleSwitch = screen.getByTestId('blur-toggle') as HTMLInputElement;
      expect(toggleSwitch.checked).toBe(true);
    });
  });

  describe('Intensity Slider Interactions', () => {
    it('calls onIntensityChange when slider value changes', () => {
      render(
        <BlurControlsUI
          onToggle={mockOnToggle}
          onIntensityChange={mockOnIntensityChange}
          status={defaultStatus}
        />
      );

      const intensitySlider = screen.getByTestId('blur-intensity');
      fireEvent.change(intensitySlider, { target: { value: '75' } });

      expect(mockOnIntensityChange).toHaveBeenCalledWith(75);
    });

    it('displays the current intensity value', () => {
      const customIntensityStatus: BlurStatus = {
        ...defaultStatus,
        intensity: 80
      };

      render(
        <BlurControlsUI
          onToggle={mockOnToggle}
          onIntensityChange={mockOnIntensityChange}
          status={customIntensityStatus}
        />
      );

      expect(screen.getByText('80%')).toBeInTheDocument();
    });

    it('disables slider when blur is disabled', () => {
      render(
        <BlurControlsUI
          onToggle={mockOnToggle}
          onIntensityChange={mockOnIntensityChange}
          status={defaultStatus}
        />
      );

      const intensitySlider = screen.getByTestId('blur-intensity') as HTMLInputElement;
      expect(intensitySlider.disabled).toBe(true);
    });

    it('enables slider when blur is enabled', () => {
      const enabledStatus: BlurStatus = {
        ...defaultStatus,
        enabled: true
      };

      render(
        <BlurControlsUI
          onToggle={mockOnToggle}
          onIntensityChange={mockOnIntensityChange}
          status={enabledStatus}
        />
      );

      const intensitySlider = screen.getByTestId('blur-intensity') as HTMLInputElement;
      expect(intensitySlider.disabled).toBe(false);
    });

    it('uses correct min and max values for slider', () => {
      render(
        <BlurControlsUI
          onToggle={mockOnToggle}
          onIntensityChange={mockOnIntensityChange}
          status={defaultStatus}
        />
      );

      const intensitySlider = screen.getByTestId('blur-intensity') as HTMLInputElement;
      expect(intensitySlider.min).toBe(BLUR_CONSTANTS.MIN_INTENSITY.toString());
      expect(intensitySlider.max).toBe(BLUR_CONSTANTS.MAX_INTENSITY.toString());
    });
  });

  describe('Performance Metrics Display', () => {
    it('shows performance metrics when blur is enabled', () => {
      const enabledStatus: BlurStatus = {
        ...defaultStatus,
        enabled: true,
        performance: {
          fps: 28.5,
          averageProcessingTime: 35.7,
          detectionAccuracy: 0.95,
          memoryUsage: 100
        }
      };

      render(
        <BlurControlsUI
          onToggle={mockOnToggle}
          onIntensityChange={mockOnIntensityChange}
          status={enabledStatus}
        />
      );

      expect(screen.getByText('Performance')).toBeInTheDocument();
      expect(screen.getByText('28.5')).toBeInTheDocument(); // FPS
      expect(screen.getByText('36ms')).toBeInTheDocument(); // Processing time rounded
    });

    it('hides performance metrics when blur is disabled', () => {
      render(
        <BlurControlsUI
          onToggle={mockOnToggle}
          onIntensityChange={mockOnIntensityChange}
          status={defaultStatus}
        />
      );

      expect(screen.queryByText('Performance')).not.toBeInTheDocument();
    });

    it('applies correct styling for good performance metrics', () => {
      const goodPerformanceStatus: BlurStatus = {
        ...defaultStatus,
        enabled: true,
        performance: {
          fps: 30, // Above target
          averageProcessingTime: 20, // Below threshold
          detectionAccuracy: 0.95,
          memoryUsage: 100
        }
      };

      render(
        <BlurControlsUI
          onToggle={mockOnToggle}
          onIntensityChange={mockOnIntensityChange}
          status={goodPerformanceStatus}
        />
      );

      // Check that performance values have green styling (good performance)
      const fpsValue = screen.getByText('30.0');
      const processingValue = screen.getByText('20ms');
      
      expect(fpsValue).toHaveClass('text-green-600');
      expect(processingValue).toHaveClass('text-green-600');
    });

    it('applies correct styling for poor performance metrics', () => {
      const poorPerformanceStatus: BlurStatus = {
        ...defaultStatus,
        enabled: true,
        performance: {
          fps: 15, // Below target
          averageProcessingTime: 80, // Above threshold
          detectionAccuracy: 0.95,
          memoryUsage: 100
        }
      };

      render(
        <BlurControlsUI
          onToggle={mockOnToggle}
          onIntensityChange={mockOnIntensityChange}
          status={poorPerformanceStatus}
        />
      );

      // Check that performance values have yellow styling (poor performance)
      const fpsValue = screen.getByText('15.0');
      const processingValue = screen.getByText('80ms');
      
      expect(fpsValue).toHaveClass('text-yellow-600');
      expect(processingValue).toHaveClass('text-yellow-600');
    });
  });

  describe('State Updates', () => {
    it('updates local intensity state when slider changes', async () => {
      render(
        <BlurControlsUI
          onToggle={mockOnToggle}
          onIntensityChange={mockOnIntensityChange}
          status={defaultStatus}
        />
      );

      const intensitySlider = screen.getByTestId('blur-intensity');
      fireEvent.change(intensitySlider, { target: { value: '65' } });

      await waitFor(() => {
        expect(screen.getByText('65%')).toBeInTheDocument();
      });
    });

    it('maintains smooth updates during rapid intensity changes', async () => {
      render(
        <BlurControlsUI
          onToggle={mockOnToggle}
          onIntensityChange={mockOnIntensityChange}
          status={defaultStatus}
        />
      );

      const intensitySlider = screen.getByTestId('blur-intensity');
      
      // Simulate rapid changes
      fireEvent.change(intensitySlider, { target: { value: '30' } });
      fireEvent.change(intensitySlider, { target: { value: '60' } });
      fireEvent.change(intensitySlider, { target: { value: '90' } });

      await waitFor(() => {
        expect(screen.getByText('90%')).toBeInTheDocument();
      });

      expect(mockOnIntensityChange).toHaveBeenCalledTimes(3);
      expect(mockOnIntensityChange).toHaveBeenLastCalledWith(90);
    });
  });

  describe('Accessibility', () => {
    it('has proper labels for form controls', () => {
      render(
        <BlurControlsUI
          onToggle={mockOnToggle}
          onIntensityChange={mockOnIntensityChange}
          status={defaultStatus}
        />
      );

      expect(screen.getByTestId('label-blur-toggle')).toBeInTheDocument();
      expect(screen.getByTestId('label-blur-intensity')).toBeInTheDocument();
    });

    it('provides tooltip information for user guidance', () => {
      render(
        <BlurControlsUI
          onToggle={mockOnToggle}
          onIntensityChange={mockOnIntensityChange}
          status={defaultStatus}
        />
      );

      // Check that tooltips are present
      const tooltips = screen.getAllByTestId('tooltip');
      expect(tooltips.length).toBeGreaterThan(0);
    });
  });
});