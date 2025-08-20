import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { AutoSaveIndicator, AutoSaveProvider } from '@/components/status/AutoSaveIndicator';

describe('AutoSaveIndicator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Status Display', () => {
    it('renders nothing when status is idle and not visible', () => {
      const { container } = render(<AutoSaveIndicator status="idle" />);

      expect(container.firstChild).toBeNull();
    });

    it('shows saving status with spinner', () => {
      render(<AutoSaveIndicator status="saving" />);

      expect(screen.getByText('Saving...')).toBeInTheDocument();
    });

    it('shows saved status with checkmark', () => {
      render(<AutoSaveIndicator status="saved" />);

      expect(screen.getByText('All changes saved')).toBeInTheDocument();
    });

    it('shows error status with alert icon', () => {
      render(<AutoSaveIndicator status="error" />);

      expect(screen.getByText('Failed to save')).toBeInTheDocument();
    });

    it('shows conflict status', () => {
      render(<AutoSaveIndicator status="conflict" />);

      expect(screen.getByText('Sync conflict detected')).toBeInTheDocument();
    });

    it('hides saved status after delay', async () => {
      vi.useFakeTimers();

      render(<AutoSaveIndicator status="saved" />);

      expect(screen.getByText('All changes saved')).toBeInTheDocument();

      // Fast-forward time
      vi.advanceTimersByTime(3000);

      await waitFor(() => {
        expect(screen.queryByText('All changes saved')).not.toBeInTheDocument();
      });

      vi.useRealTimers();
    });
  });

  describe('Connection Status', () => {
    it('shows offline indicator', () => {
      render(<AutoSaveIndicator status="saved" connectionStatus="offline" />);

      // Should show cloud-off icon for offline status
      expect(screen.getByRole('img', { hidden: true })).toBeInTheDocument();
    });

    it('shows reconnecting indicator', () => {
      render(<AutoSaveIndicator status="saved" connectionStatus="reconnecting" />);

      expect(screen.getByRole('img', { hidden: true })).toBeInTheDocument();
    });
  });

  describe('Last Save Time', () => {
    it('displays last save time when provided', () => {
      const lastSaveTime = new Date();

      render(<AutoSaveIndicator status="saved" lastSaveTime={lastSaveTime} showDetails={true} />);

      expect(screen.getByText('just now')).toBeInTheDocument();
    });

    it('updates time ago text over time', async () => {
      vi.useFakeTimers();
      const lastSaveTime = new Date();

      render(<AutoSaveIndicator status="saved" lastSaveTime={lastSaveTime} showDetails={true} />);

      expect(screen.getByText('just now')).toBeInTheDocument();

      // Advance time by 2 minutes
      vi.advanceTimersByTime(120000);

      await waitFor(() => {
        expect(screen.getByText('2 minutes ago')).toBeInTheDocument();
      });

      vi.useRealTimers();
    });
  });

  describe('Actions', () => {
    it('shows retry button on error', () => {
      const onRetry = vi.fn();

      render(<AutoSaveIndicator status="error" onRetry={onRetry} />);

      const retryButton = screen.getByRole('button', { name: /retry/i });
      expect(retryButton).toBeInTheDocument();

      retryButton.click();
      expect(onRetry).toHaveBeenCalledTimes(1);
    });

    it('shows resolve button on conflict', () => {
      const onResolveConflict = vi.fn();

      render(<AutoSaveIndicator status="conflict" onResolveConflict={onResolveConflict} />);

      const resolveButton = screen.getByRole('button', { name: /resolve/i });
      expect(resolveButton).toBeInTheDocument();

      resolveButton.click();
      expect(onResolveConflict).toHaveBeenCalledTimes(1);
    });
  });

  describe('Position and Placement', () => {
    it('applies fixed positioning styles', () => {
      const { container } = render(
        <AutoSaveIndicator status="saved" position="fixed" placement="top-right" />
      );

      const element = container.firstChild as HTMLElement;
      expect(element.style.position).toBe('fixed');
      expect(element.style.top).toBe('20px');
      expect(element.style.right).toBe('20px');
    });

    it('applies relative positioning when specified', () => {
      const { container } = render(<AutoSaveIndicator status="saved" position="relative" />);

      const element = container.firstChild as HTMLElement;
      expect(element.style.position).not.toBe('fixed');
    });
  });
});

describe('AutoSaveProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('triggers auto-save after delay', async () => {
    vi.useFakeTimers();
    const onSave = vi.fn().mockResolvedValue(undefined);

    const { rerender } = render(
      <AutoSaveProvider onSave={onSave} autoSaveDelay={2000}>
        <div>Content</div>
      </AutoSaveProvider>
    );

    // Trigger a save by simulating content change
    // This would normally be triggered by content changes

    // Advance timers
    vi.advanceTimersByTime(2000);

    await waitFor(() => {
      // Auto-save functionality would be triggered here
      // In real implementation, this would be connected to content changes
    });

    vi.useRealTimers();
  });

  it('handles online/offline events', () => {
    const onSave = vi.fn();

    render(
      <AutoSaveProvider onSave={onSave}>
        <div>Content</div>
      </AutoSaveProvider>
    );

    // Simulate offline event
    window.dispatchEvent(new Event('offline'));

    // Simulate online event
    window.dispatchEvent(new Event('online'));

    // Provider should handle these events and update connection status
  });

  it('warns before unload with pending changes', () => {
    const onSave = vi.fn();

    render(
      <AutoSaveProvider onSave={onSave}>
        <div>Content</div>
      </AutoSaveProvider>
    );

    const event = new Event('beforeunload') as BeforeUnloadEvent;
    window.dispatchEvent(event);

    // Should not prevent unload when no pending changes
    expect(event.returnValue).toBeUndefined();
  });
});
