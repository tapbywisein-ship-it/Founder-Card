import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import React from 'react';

// ── Mocks ──────────────────────────────────────────────────────────────────────

// framer-motion is not used in the new single-page file, but keep the mock
// in case anything transitively imports it.
vi.mock('framer-motion', () => ({
  motion: {
    div: (props: unknown) => <div {...(props as React.HTMLAttributes<HTMLDivElement>)} />,
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/components/OrganizerLayout', () => ({
  OrganizerLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    onClick,
    disabled,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
  }) => (
    <button type="button" onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
}));

vi.mock('@/components/ui/input', () => ({
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
}));

vi.mock('@/hooks/useOrganizer', () => ({
  useCreateEvent: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  usePublishEvent: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
}));

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

// Import after mocks so the module under test picks them up.
import CreateEventPage from './CreateEvent';

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('CreateEvent - Event Type UI', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('shows only "In Person" (no "Virtual" or "Hybrid")', () => {
    render(
      <MemoryRouter>
        <CreateEventPage />
      </MemoryRouter>,
    );

    // Single-page form — location section is visible without any step navigation.
    // Click the location expandable to reveal the "In Person" label.
    fireEvent.click(screen.getByText(/Add Event Location/i));

    // "In Person" may appear in both the button label and the expanded chip — that's fine.
    const inPersonMatches = screen.getAllByText(/In Person/i);
    expect(inPersonMatches.length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText(/Virtual/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Hybrid/i)).not.toBeInTheDocument();
  });

  it('allocates seats by capacity (10/30/60) for multiple tiers', () => {
    render(
      <MemoryRouter>
        <CreateEventPage />
      </MemoryRouter>,
    );

    // The capacity input starts at 100 (the default). Find and confirm it.
    // No step navigation needed — all fields are on one page.

    // Enable multiple ticket tiers via the toggle label.
    const multiTierLabel = screen.getByText(/Multiple ticket tiers/i);
    fireEvent.click(multiTierLabel);

    // Default capacity is 100 → allocation should be 10 / 30 / 60.
    expect(screen.getByDisplayValue('10')).toBeInTheDocument();
    expect(screen.getByDisplayValue('30')).toBeInTheDocument();
    expect(screen.getByDisplayValue('60')).toBeInTheDocument();
    expect(screen.getByText(/Fully allocated/i)).toBeInTheDocument();
  });
});
