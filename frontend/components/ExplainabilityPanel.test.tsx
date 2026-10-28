/**
 * Unit tests for ExplainabilityPanel component
 * Tests rendering with explanation, placeholder state, and timestamp formatting
 * Requirements: 11.1, 11.2, 11.3, 11.4, 11.5
 */

import { render, screen } from '@testing-library/react';
import ExplainabilityPanel from './ExplainabilityPanel';

describe('ExplainabilityPanel', () => {
  describe('Rendering with explanation', () => {
    it('should display explanation text when provided', () => {
      const explanation = 'AI allocator prioritized latency-sensitive traffic due to high gaming demand';
      const timestamp = 1234567890;

      render(
        <ExplainabilityPanel
          explanation={explanation}
          timestamp={timestamp}
        />
      );

      expect(screen.getByText(explanation)).toBeInTheDocument();
    });

    it('should display timestamp when explanation is provided', () => {
      const explanation = 'Test explanation';
      const timestamp = 1234567890; // Unix timestamp in seconds

      render(
        <ExplainabilityPanel
          explanation={explanation}
          timestamp={timestamp}
        />
      );

      // Check that "Last updated:" text is present
      expect(screen.getByText(/Last updated:/i)).toBeInTheDocument();
    });

    it('should display additional context text when explanation is provided', () => {
      const explanation = 'Test explanation';
      const timestamp = 1234567890;

      render(
        <ExplainabilityPanel
          explanation={explanation}
          timestamp={timestamp}
        />
      );

      expect(
        screen.getByText(/The AI allocator uses weighted priority heuristics/i)
      ).toBeInTheDocument();
    });

    it('should apply correct styling to explanation text', () => {
      const explanation = 'Test explanation';
      const timestamp = 1234567890;

      render(
        <ExplainabilityPanel
          explanation={explanation}
          timestamp={timestamp}
        />
      );

      const explanationElement = screen.getByText(explanation);
      expect(explanationElement).toHaveStyle({ fontSize: '14px' });
      expect(explanationElement).toHaveClass('text-gray-800', 'leading-relaxed');
    });

    it('should render with purple-themed background for explanation', () => {
      const explanation = 'Test explanation';
      const timestamp = 1234567890;

      const { container } = render(
        <ExplainabilityPanel
          explanation={explanation}
          timestamp={timestamp}
        />
      );

      const explanationContainer = container.querySelector('.bg-purple-50');
      expect(explanationContainer).toBeInTheDocument();
      expect(explanationContainer).toHaveClass('border-purple-200');
    });
  });

  describe('Rendering with placeholder', () => {
    it('should display placeholder when explanation is null', () => {
      render(
        <ExplainabilityPanel
          explanation={null}
          timestamp={null}
        />
      );

      expect(screen.getByText('Waiting for AI analysis...')).toBeInTheDocument();
    });

    it('should display placeholder when explanation is undefined', () => {
      render(
        <ExplainabilityPanel
          explanation={undefined}
          timestamp={undefined}
        />
      );

      expect(screen.getByText('Waiting for AI analysis...')).toBeInTheDocument();
    });

    it('should display placeholder when explanation is empty string', () => {
      render(
        <ExplainabilityPanel
          explanation=""
          timestamp={1234567890}
        />
      );

      expect(screen.getByText('Waiting for AI analysis...')).toBeInTheDocument();
    });

    it('should apply correct styling to placeholder text', () => {
      render(
        <ExplainabilityPanel
          explanation={null}
          timestamp={null}
        />
      );

      const placeholderElement = screen.getByText('Waiting for AI analysis...');
      expect(placeholderElement).toHaveStyle({ fontSize: '14px' });
      expect(placeholderElement).toHaveClass('text-gray-500', 'italic');
    });

    it('should not display timestamp when explanation is not provided', () => {
      render(
        <ExplainabilityPanel
          explanation={null}
          timestamp={null}
        />
      );

      expect(screen.queryByText(/Last updated:/i)).not.toBeInTheDocument();
    });

    it('should not display additional context when explanation is not provided', () => {
      render(
        <ExplainabilityPanel
          explanation={null}
          timestamp={null}
        />
      );

      expect(
        screen.queryByText(/The AI allocator uses weighted priority heuristics/i)
      ).not.toBeInTheDocument();
    });
  });

  describe('Timestamp formatting', () => {
    it('should format timestamp correctly in 12-hour format with AM/PM', () => {
      const explanation = 'Test explanation';
      // January 1, 2024, 14:30:45 UTC (2:30:45 PM)
      const timestamp = 1704119445;

      render(
        <ExplainabilityPanel
          explanation={explanation}
          timestamp={timestamp}
        />
      );

      // The timestamp should be formatted with 12-hour time and AM/PM
      const timestampText = screen.getByText(/Last updated:/i).textContent;
      expect(timestampText).toMatch(/\d{1,2}:\d{2}:\d{2}\s*(AM|PM)/i);
    });

    it('should not display timestamp section when timestamp is null', () => {
      const explanation = 'Test explanation';

      render(
        <ExplainabilityPanel
          explanation={explanation}
          timestamp={null}
        />
      );

      // Timestamp section should not be rendered when timestamp is null
      expect(screen.queryByText(/Last updated:/i)).not.toBeInTheDocument();
    });

    it('should not display timestamp section when timestamp is undefined', () => {
      const explanation = 'Test explanation';

      render(
        <ExplainabilityPanel
          explanation={explanation}
          timestamp={undefined}
        />
      );

      // Timestamp section should not be rendered when timestamp is undefined
      expect(screen.queryByText(/Last updated:/i)).not.toBeInTheDocument();
    });

    it('should not display timestamp section when timestamp is 0', () => {
      const explanation = 'Test explanation';

      render(
        <ExplainabilityPanel
          explanation={explanation}
          timestamp={0}
        />
      );

      // Timestamp section should not be rendered when timestamp is 0 (falsy)
      expect(screen.queryByText(/Last updated:/i)).not.toBeInTheDocument();
    });

    it('should format different timestamps correctly', () => {
      const explanation = 'Test explanation';
      const timestamps = [
        1704119445, // 2024-01-01 14:30:45 UTC
        1704105600, // 2024-01-01 10:40:00 UTC
        1704088800, // 2024-01-01 06:00:00 UTC
      ];

      timestamps.forEach((timestamp) => {
        const { unmount } = render(
          <ExplainabilityPanel
            explanation={explanation}
            timestamp={timestamp}
          />
        );

        const timestampText = screen.getByText(/Last updated:/i).textContent;
        // Verify it contains time in HH:MM:SS format with AM/PM
        expect(timestampText).toMatch(/\d{1,2}:\d{2}:\d{2}\s*(AM|PM)/i);

        unmount();
      });
    });

    it('should convert Unix timestamp from seconds to milliseconds', () => {
      const explanation = 'Test explanation';
      // Unix timestamp in seconds (as provided by backend)
      const timestamp = 1704119445;

      render(
        <ExplainabilityPanel
          explanation={explanation}
          timestamp={timestamp}
        />
      );

      // Should successfully format the timestamp (conversion happens internally)
      const timestampElement = screen.getByText(/Last updated:/i);
      expect(timestampElement).toBeInTheDocument();
      expect(timestampElement.textContent).not.toContain('Invalid Date');
    });
  });

  describe('Component structure', () => {
    it('should render with correct heading', () => {
      render(
        <ExplainabilityPanel
          explanation={null}
          timestamp={null}
        />
      );

      expect(screen.getByText('AI Explainability')).toBeInTheDocument();
    });

    it('should have proper semantic structure', () => {
      const { container } = render(
        <ExplainabilityPanel
          explanation="Test"
          timestamp={1234567890}
        />
      );

      // Check for heading
      const heading = screen.getByRole('heading', { name: /AI Explainability/i });
      expect(heading).toBeInTheDocument();

      // Check for main container
      const mainContainer = container.querySelector('.bg-white.rounded-lg.shadow-sm');
      expect(mainContainer).toBeInTheDocument();
    });

    it('should apply minimum font size of 14px as per requirements', () => {
      const explanation = 'Test explanation';

      render(
        <ExplainabilityPanel
          explanation={explanation}
          timestamp={1234567890}
        />
      );

      const explanationElement = screen.getByText(explanation);
      const fontSize = window.getComputedStyle(explanationElement).fontSize;
      
      // fontSize will be in pixels, extract the number
      const fontSizeValue = parseInt(fontSize);
      expect(fontSizeValue).toBeGreaterThanOrEqual(14);
    });
  });

  describe('Edge cases', () => {
    it('should handle very long explanation text', () => {
      const longExplanation = 'A'.repeat(1000);
      const timestamp = 1234567890;

      render(
        <ExplainabilityPanel
          explanation={longExplanation}
          timestamp={timestamp}
        />
      );

      expect(screen.getByText(longExplanation)).toBeInTheDocument();
    });

    it('should handle explanation with special characters', () => {
      const explanation = 'AI allocator: 50% gaming, 30% video, 15% IoT, 5% VoIP';
      const timestamp = 1234567890;

      render(
        <ExplainabilityPanel
          explanation={explanation}
          timestamp={timestamp}
        />
      );

      expect(screen.getByText(explanation)).toBeInTheDocument();
    });

    it('should handle explanation with line breaks', () => {
      const explanation = 'Line 1\nLine 2\nLine 3';
      const timestamp = 1234567890;

      const { container } = render(
        <ExplainabilityPanel
          explanation={explanation}
          timestamp={timestamp}
        />
      );

      // Check that the explanation is rendered (line breaks are preserved in the DOM)
      const explanationElement = container.querySelector('.text-gray-800.leading-relaxed');
      expect(explanationElement).toBeInTheDocument();
      expect(explanationElement?.textContent).toContain('Line 1');
      expect(explanationElement?.textContent).toContain('Line 2');
      expect(explanationElement?.textContent).toContain('Line 3');
    });

    it('should handle very recent timestamp', () => {
      const explanation = 'Test explanation';
      const recentTimestamp = Math.floor(Date.now() / 1000); // Current time in seconds

      render(
        <ExplainabilityPanel
          explanation={explanation}
          timestamp={recentTimestamp}
        />
      );

      const timestampText = screen.getByText(/Last updated:/i).textContent;
      expect(timestampText).toMatch(/\d{1,2}:\d{2}:\d{2}\s*(AM|PM)/i);
    });

    it('should handle negative timestamp gracefully', () => {
      const explanation = 'Test explanation';
      const negativeTimestamp = -1000;

      render(
        <ExplainabilityPanel
          explanation={explanation}
          timestamp={negativeTimestamp}
        />
      );

      // Should still render without crashing
      expect(screen.getByText(explanation)).toBeInTheDocument();
    });
  });
});
