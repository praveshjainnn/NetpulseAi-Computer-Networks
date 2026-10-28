/**
 * Unit tests for ConfigurationPanel component
 * Tests validation logic for each parameter and error message display
 * Requirements: 9.4
 */

import { render, screen, fireEvent } from '@testing-library/react';
import ConfigurationPanel from './ConfigurationPanel';
import { SimulationConfig } from '@/lib/api';

describe('ConfigurationPanel', () => {
  const mockOnConfigChange = jest.fn();
  const defaultConfig: SimulationConfig = {
    total_bandwidth: 100.0,
    base_latency: 10.0,
    congestion_factor: 1.5,
    packet_loss_rate: 2.0,
    random_seed: 42,
  };

  beforeEach(() => {
    mockOnConfigChange.mockClear();
  });

  describe('Bandwidth validation', () => {
    it('should accept valid bandwidth within range (10-1000)', () => {
      render(
        <ConfigurationPanel
          currentConfig={defaultConfig}
          onConfigChange={mockOnConfigChange}
        />
      );

      const input = screen.getByLabelText(/Total Bandwidth/i);
      fireEvent.change(input, { target: { value: '500' } });

      expect(screen.queryByText(/Bandwidth must be between 10 and 1000 Mbps/i)).not.toBeInTheDocument();
      expect(mockOnConfigChange).toHaveBeenCalledWith(
        expect.objectContaining({ total_bandwidth: 500 })
      );
    });

    it('should show error for bandwidth below minimum (< 10)', () => {
      render(
        <ConfigurationPanel
          currentConfig={defaultConfig}
          onConfigChange={mockOnConfigChange}
        />
      );

      const input = screen.getByLabelText(/Total Bandwidth/i);
      fireEvent.change(input, { target: { value: '5' } });

      expect(screen.getByText(/Bandwidth must be between 10 and 1000 Mbps/i)).toBeInTheDocument();
      expect(mockOnConfigChange).not.toHaveBeenCalled();
    });

    it('should show error for bandwidth above maximum (> 1000)', () => {
      render(
        <ConfigurationPanel
          currentConfig={defaultConfig}
          onConfigChange={mockOnConfigChange}
        />
      );

      const input = screen.getByLabelText(/Total Bandwidth/i);
      fireEvent.change(input, { target: { value: '1500' } });

      expect(screen.getByText(/Bandwidth must be between 10 and 1000 Mbps/i)).toBeInTheDocument();
      expect(mockOnConfigChange).not.toHaveBeenCalled();
    });

    it('should accept bandwidth at minimum boundary (10)', () => {
      render(
        <ConfigurationPanel
          currentConfig={defaultConfig}
          onConfigChange={mockOnConfigChange}
        />
      );

      const input = screen.getByLabelText(/Total Bandwidth/i);
      fireEvent.change(input, { target: { value: '10' } });

      expect(screen.queryByText(/Bandwidth must be between 10 and 1000 Mbps/i)).not.toBeInTheDocument();
      expect(mockOnConfigChange).toHaveBeenCalled();
    });

    it('should accept bandwidth at maximum boundary (1000)', () => {
      render(
        <ConfigurationPanel
          currentConfig={defaultConfig}
          onConfigChange={mockOnConfigChange}
        />
      );

      const input = screen.getByLabelText(/Total Bandwidth/i);
      fireEvent.change(input, { target: { value: '1000' } });

      expect(screen.queryByText(/Bandwidth must be between 10 and 1000 Mbps/i)).not.toBeInTheDocument();
      expect(mockOnConfigChange).toHaveBeenCalled();
    });

    it('should display error message with red styling', () => {
      render(
        <ConfigurationPanel
          currentConfig={defaultConfig}
          onConfigChange={mockOnConfigChange}
        />
      );

      const input = screen.getByLabelText(/Total Bandwidth/i);
      fireEvent.change(input, { target: { value: '5' } });

      const errorMessage = screen.getByText(/Bandwidth must be between 10 and 1000 Mbps/i);
      expect(errorMessage).toHaveClass('text-red-600');
    });

    it('should apply red border to input when validation fails', () => {
      render(
        <ConfigurationPanel
          currentConfig={defaultConfig}
          onConfigChange={mockOnConfigChange}
        />
      );

      const input = screen.getByLabelText(/Total Bandwidth/i);
      fireEvent.change(input, { target: { value: '5' } });

      expect(input).toHaveClass('border-red-500');
    });
  });

  describe('Latency validation', () => {
    it('should accept valid latency within range (1-100)', () => {
      render(
        <ConfigurationPanel
          currentConfig={defaultConfig}
          onConfigChange={mockOnConfigChange}
        />
      );

      const input = screen.getByLabelText(/Base Latency/i);
      fireEvent.change(input, { target: { value: '50' } });

      expect(screen.queryByText(/Base latency must be between 1 and 100 ms/i)).not.toBeInTheDocument();
      expect(mockOnConfigChange).toHaveBeenCalledWith(
        expect.objectContaining({ base_latency: 50 })
      );
    });

    it('should show error for latency below minimum (< 1)', () => {
      render(
        <ConfigurationPanel
          currentConfig={defaultConfig}
          onConfigChange={mockOnConfigChange}
        />
      );

      const input = screen.getByLabelText(/Base Latency/i);
      fireEvent.change(input, { target: { value: '0.5' } });

      expect(screen.getByText(/Base latency must be between 1 and 100 ms/i)).toBeInTheDocument();
      expect(mockOnConfigChange).not.toHaveBeenCalled();
    });

    it('should show error for latency above maximum (> 100)', () => {
      render(
        <ConfigurationPanel
          currentConfig={defaultConfig}
          onConfigChange={mockOnConfigChange}
        />
      );

      const input = screen.getByLabelText(/Base Latency/i);
      fireEvent.change(input, { target: { value: '150' } });

      expect(screen.getByText(/Base latency must be between 1 and 100 ms/i)).toBeInTheDocument();
      expect(mockOnConfigChange).not.toHaveBeenCalled();
    });

    it('should accept latency at minimum boundary (1)', () => {
      render(
        <ConfigurationPanel
          currentConfig={defaultConfig}
          onConfigChange={mockOnConfigChange}
        />
      );

      const input = screen.getByLabelText(/Base Latency/i);
      fireEvent.change(input, { target: { value: '1' } });

      expect(screen.queryByText(/Base latency must be between 1 and 100 ms/i)).not.toBeInTheDocument();
      expect(mockOnConfigChange).toHaveBeenCalled();
    });

    it('should accept latency at maximum boundary (100)', () => {
      render(
        <ConfigurationPanel
          currentConfig={defaultConfig}
          onConfigChange={mockOnConfigChange}
        />
      );

      const input = screen.getByLabelText(/Base Latency/i);
      fireEvent.change(input, { target: { value: '100' } });

      expect(screen.queryByText(/Base latency must be between 1 and 100 ms/i)).not.toBeInTheDocument();
      expect(mockOnConfigChange).toHaveBeenCalled();
    });
  });

  describe('Congestion factor validation', () => {
    it('should accept valid congestion factor within range (1.0-10.0)', () => {
      render(
        <ConfigurationPanel
          currentConfig={defaultConfig}
          onConfigChange={mockOnConfigChange}
        />
      );

      const input = screen.getByLabelText(/Congestion Factor/i);
      fireEvent.change(input, { target: { value: '5.5' } });

      expect(screen.queryByText(/Congestion factor must be between 1.0 and 10.0/i)).not.toBeInTheDocument();
      expect(mockOnConfigChange).toHaveBeenCalledWith(
        expect.objectContaining({ congestion_factor: 5.5 })
      );
    });

    it('should show error for congestion factor below minimum (< 1.0)', () => {
      render(
        <ConfigurationPanel
          currentConfig={defaultConfig}
          onConfigChange={mockOnConfigChange}
        />
      );

      const input = screen.getByLabelText(/Congestion Factor/i);
      fireEvent.change(input, { target: { value: '0.5' } });

      expect(screen.getByText(/Congestion factor must be between 1.0 and 10.0/i)).toBeInTheDocument();
      expect(mockOnConfigChange).not.toHaveBeenCalled();
    });

    it('should show error for congestion factor above maximum (> 10.0)', () => {
      render(
        <ConfigurationPanel
          currentConfig={defaultConfig}
          onConfigChange={mockOnConfigChange}
        />
      );

      const input = screen.getByLabelText(/Congestion Factor/i);
      fireEvent.change(input, { target: { value: '15' } });

      expect(screen.getByText(/Congestion factor must be between 1.0 and 10.0/i)).toBeInTheDocument();
      expect(mockOnConfigChange).not.toHaveBeenCalled();
    });

    it('should accept congestion factor at minimum boundary (1.0)', () => {
      render(
        <ConfigurationPanel
          currentConfig={defaultConfig}
          onConfigChange={mockOnConfigChange}
        />
      );

      const input = screen.getByLabelText(/Congestion Factor/i);
      fireEvent.change(input, { target: { value: '1.0' } });

      expect(screen.queryByText(/Congestion factor must be between 1.0 and 10.0/i)).not.toBeInTheDocument();
      expect(mockOnConfigChange).toHaveBeenCalled();
    });

    it('should accept congestion factor at maximum boundary (10.0)', () => {
      render(
        <ConfigurationPanel
          currentConfig={defaultConfig}
          onConfigChange={mockOnConfigChange}
        />
      );

      const input = screen.getByLabelText(/Congestion Factor/i);
      fireEvent.change(input, { target: { value: '10.0' } });

      expect(screen.queryByText(/Congestion factor must be between 1.0 and 10.0/i)).not.toBeInTheDocument();
      expect(mockOnConfigChange).toHaveBeenCalled();
    });
  });

  describe('Packet loss rate validation', () => {
    it('should accept valid packet loss rate within range (0-100)', () => {
      render(
        <ConfigurationPanel
          currentConfig={defaultConfig}
          onConfigChange={mockOnConfigChange}
        />
      );

      const input = screen.getByLabelText(/Packet Loss Rate/i);
      fireEvent.change(input, { target: { value: '50' } });

      expect(screen.queryByText(/Packet loss rate must be between 0 and 100%/i)).not.toBeInTheDocument();
      expect(mockOnConfigChange).toHaveBeenCalledWith(
        expect.objectContaining({ packet_loss_rate: 50 })
      );
    });

    it('should show error for packet loss rate below minimum (< 0)', () => {
      render(
        <ConfigurationPanel
          currentConfig={defaultConfig}
          onConfigChange={mockOnConfigChange}
        />
      );

      const input = screen.getByLabelText(/Packet Loss Rate/i);
      fireEvent.change(input, { target: { value: '-5' } });

      expect(screen.getByText(/Packet loss rate must be between 0 and 100%/i)).toBeInTheDocument();
      expect(mockOnConfigChange).not.toHaveBeenCalled();
    });

    it('should show error for packet loss rate above maximum (> 100)', () => {
      render(
        <ConfigurationPanel
          currentConfig={defaultConfig}
          onConfigChange={mockOnConfigChange}
        />
      );

      const input = screen.getByLabelText(/Packet Loss Rate/i);
      fireEvent.change(input, { target: { value: '150' } });

      expect(screen.getByText(/Packet loss rate must be between 0 and 100%/i)).toBeInTheDocument();
      expect(mockOnConfigChange).not.toHaveBeenCalled();
    });

    it('should accept packet loss rate at minimum boundary (0)', () => {
      render(
        <ConfigurationPanel
          currentConfig={defaultConfig}
          onConfigChange={mockOnConfigChange}
        />
      );

      const input = screen.getByLabelText(/Packet Loss Rate/i);
      fireEvent.change(input, { target: { value: '0' } });

      expect(screen.queryByText(/Packet loss rate must be between 0 and 100%/i)).not.toBeInTheDocument();
      expect(mockOnConfigChange).toHaveBeenCalled();
    });

    it('should accept packet loss rate at maximum boundary (100)', () => {
      render(
        <ConfigurationPanel
          currentConfig={defaultConfig}
          onConfigChange={mockOnConfigChange}
        />
      );

      const input = screen.getByLabelText(/Packet Loss Rate/i);
      fireEvent.change(input, { target: { value: '100' } });

      expect(screen.queryByText(/Packet loss rate must be between 0 and 100%/i)).not.toBeInTheDocument();
      expect(mockOnConfigChange).toHaveBeenCalled();
    });
  });

  describe('Error message display', () => {
    it('should display validation error banner when any field has errors', () => {
      render(
        <ConfigurationPanel
          currentConfig={defaultConfig}
          onConfigChange={mockOnConfigChange}
        />
      );

      const input = screen.getByLabelText(/Total Bandwidth/i);
      fireEvent.change(input, { target: { value: '5' } });

      expect(screen.getByText(/Please fix validation errors before starting the simulation/i)).toBeInTheDocument();
    });

    it('should not display validation error banner when all fields are valid', () => {
      render(
        <ConfigurationPanel
          currentConfig={defaultConfig}
          onConfigChange={mockOnConfigChange}
        />
      );

      expect(screen.queryByText(/Please fix validation errors before starting the simulation/i)).not.toBeInTheDocument();
    });

    it('should display multiple error messages simultaneously', () => {
      render(
        <ConfigurationPanel
          currentConfig={defaultConfig}
          onConfigChange={mockOnConfigChange}
        />
      );

      const bandwidthInput = screen.getByLabelText(/Total Bandwidth/i);
      const latencyInput = screen.getByLabelText(/Base Latency/i);

      fireEvent.change(bandwidthInput, { target: { value: '5' } });
      fireEvent.change(latencyInput, { target: { value: '150' } });

      expect(screen.getByText(/Bandwidth must be between 10 and 1000 Mbps/i)).toBeInTheDocument();
      expect(screen.getByText(/Base latency must be between 1 and 100 ms/i)).toBeInTheDocument();
    });

    it('should clear error message when field becomes valid', () => {
      render(
        <ConfigurationPanel
          currentConfig={defaultConfig}
          onConfigChange={mockOnConfigChange}
        />
      );

      const input = screen.getByLabelText(/Total Bandwidth/i);
      
      // Set invalid value
      fireEvent.change(input, { target: { value: '5' } });
      expect(screen.getByText(/Bandwidth must be between 10 and 1000 Mbps/i)).toBeInTheDocument();

      // Set valid value
      fireEvent.change(input, { target: { value: '100' } });
      expect(screen.queryByText(/Bandwidth must be between 10 and 1000 Mbps/i)).not.toBeInTheDocument();
    });

    it('should display inline error message below each invalid field', () => {
      render(
        <ConfigurationPanel
          currentConfig={defaultConfig}
          onConfigChange={mockOnConfigChange}
        />
      );

      const input = screen.getByLabelText(/Total Bandwidth/i);
      fireEvent.change(input, { target: { value: '5' } });

      const errorMessage = screen.getByText(/Bandwidth must be between 10 and 1000 Mbps/i);
      expect(errorMessage).toHaveClass('text-xs', 'mt-1');
    });
  });

  describe('Disabled state', () => {
    it('should disable all inputs when disabled prop is true', () => {
      render(
        <ConfigurationPanel
          currentConfig={defaultConfig}
          onConfigChange={mockOnConfigChange}
          disabled={true}
        />
      );

      const bandwidthInput = screen.getByLabelText(/Total Bandwidth/i);
      const latencyInput = screen.getByLabelText(/Base Latency/i);
      const congestionInput = screen.getByLabelText(/Congestion Factor/i);
      const packetLossInput = screen.getByLabelText(/Packet Loss Rate/i);

      expect(bandwidthInput).toBeDisabled();
      expect(latencyInput).toBeDisabled();
      expect(congestionInput).toBeDisabled();
      expect(packetLossInput).toBeDisabled();
    });

    it('should display disabled state message when disabled', () => {
      render(
        <ConfigurationPanel
          currentConfig={defaultConfig}
          onConfigChange={mockOnConfigChange}
          disabled={true}
        />
      );

      expect(screen.getByText(/Configuration is locked while simulation is running/i)).toBeInTheDocument();
    });

    it('should not display disabled state message when enabled', () => {
      render(
        <ConfigurationPanel
          currentConfig={defaultConfig}
          onConfigChange={mockOnConfigChange}
          disabled={false}
        />
      );

      expect(screen.queryByText(/Configuration is locked while simulation is running/i)).not.toBeInTheDocument();
    });
  });

  describe('Input handling', () => {
    it('should not update config for non-numeric input', () => {
      render(
        <ConfigurationPanel
          currentConfig={defaultConfig}
          onConfigChange={mockOnConfigChange}
        />
      );

      const input = screen.getByLabelText(/Total Bandwidth/i);
      fireEvent.change(input, { target: { value: 'abc' } });

      expect(mockOnConfigChange).not.toHaveBeenCalled();
    });

    it('should handle decimal values correctly', () => {
      render(
        <ConfigurationPanel
          currentConfig={defaultConfig}
          onConfigChange={mockOnConfigChange}
        />
      );

      const input = screen.getByLabelText(/Total Bandwidth/i);
      fireEvent.change(input, { target: { value: '123.45' } });

      expect(mockOnConfigChange).toHaveBeenCalledWith(
        expect.objectContaining({ total_bandwidth: 123.45 })
      );
    });

    it('should update local state when currentConfig prop changes', () => {
      const { rerender } = render(
        <ConfigurationPanel
          currentConfig={defaultConfig}
          onConfigChange={mockOnConfigChange}
        />
      );

      const newConfig: SimulationConfig = {
        ...defaultConfig,
        total_bandwidth: 200,
      };

      rerender(
        <ConfigurationPanel
          currentConfig={newConfig}
          onConfigChange={mockOnConfigChange}
        />
      );

      const input = screen.getByLabelText(/Total Bandwidth/i) as HTMLInputElement;
      expect(input.value).toBe('200');
    });
  });

  describe('Random seed handling', () => {
    it('should handle random seed input', () => {
      render(
        <ConfigurationPanel
          currentConfig={defaultConfig}
          onConfigChange={mockOnConfigChange}
        />
      );

      const input = screen.getByLabelText(/Random Seed/i);
      fireEvent.change(input, { target: { value: '123' } });

      expect(mockOnConfigChange).toHaveBeenCalledWith(
        expect.objectContaining({ random_seed: 123 })
      );
    });

    it('should handle empty random seed input', () => {
      render(
        <ConfigurationPanel
          currentConfig={defaultConfig}
          onConfigChange={mockOnConfigChange}
        />
      );

      const input = screen.getByLabelText(/Random Seed/i);
      fireEvent.change(input, { target: { value: '' } });

      expect(mockOnConfigChange).toHaveBeenCalledWith(
        expect.objectContaining({ random_seed: undefined })
      );
    });

    it('should not validate random seed (optional field)', () => {
      render(
        <ConfigurationPanel
          currentConfig={defaultConfig}
          onConfigChange={mockOnConfigChange}
        />
      );

      const input = screen.getByLabelText(/Random Seed/i);
      fireEvent.change(input, { target: { value: '999999' } });

      // Should not show any validation errors for random seed
      expect(mockOnConfigChange).toHaveBeenCalled();
    });
  });

  describe('Component structure', () => {
    it('should render all configuration fields', () => {
      render(
        <ConfigurationPanel
          currentConfig={defaultConfig}
          onConfigChange={mockOnConfigChange}
        />
      );

      expect(screen.getByLabelText(/Total Bandwidth/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Base Latency/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Congestion Factor/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Packet Loss Rate/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Random Seed/i)).toBeInTheDocument();
    });

    it('should display range hints for each field', () => {
      render(
        <ConfigurationPanel
          currentConfig={defaultConfig}
          onConfigChange={mockOnConfigChange}
        />
      );

      expect(screen.getByText(/Range: 10 - 1000 Mbps/i)).toBeInTheDocument();
      expect(screen.getByText(/Range: 1 - 100 ms/i)).toBeInTheDocument();
      expect(screen.getByText(/Range: 1.0 - 10.0/i)).toBeInTheDocument();
      expect(screen.getByText(/Range: 0 - 100%/i)).toBeInTheDocument();
    });

    it('should render with correct heading', () => {
      render(
        <ConfigurationPanel
          currentConfig={defaultConfig}
          onConfigChange={mockOnConfigChange}
        />
      );

      expect(screen.getByText('Simulation Configuration')).toBeInTheDocument();
    });
  });
});
