import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { KnowledgeHeader } from '../KnowledgeHeader';
import { usePermissions } from '@/hooks/usePermissions';

// Mock the usePermissions hook
vi.mock('@/hooks/usePermissions', () => ({
  usePermissions: vi.fn(),
}));

// Factory function for generating mock props
const createMockProps = (overrides = {}) => ({
  activeItem: 'Team Alpha',
  searchTerm: '',
  onSearchChange: vi.fn(),
  onNewRecord: vi.fn(),
  onMenuToggle: vi.fn(),
  ...overrides,
});

describe('KnowledgeHeader', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default to manager permission
    (usePermissions as any).mockReturnValue({ isManager: true });
  });

  describe('rendering', () => {
    it('renders the active item records title when no search is active', () => {
      // ARRANGE
      const props = createMockProps();
      render(<KnowledgeHeader {...props} />);

      // ASSERT
      expect(screen.getByText(/TEAM ALPHA RECORDS/i)).toBeInTheDocument();
    });

    it('renders search results title when a search term is present', () => {
      // ARRANGE
      const props = createMockProps({ searchTerm: 'Report' });
      render(<KnowledgeHeader {...props} />);

      // ASSERT
      expect(screen.getByText(/SEARCH RESULTS FOR "REPORT"/i)).toBeInTheDocument();
    });

    it('shows the New Record button when the user is a manager', () => {
      // ARRANGE
      (usePermissions as any).mockReturnValue({ isManager: true });
      render(<KnowledgeHeader {...createMockProps()} />);

      // ASSERT
      expect(screen.getByRole('button', { name: /NEW RECORD/i })).toBeInTheDocument();
    });

    it('hides the New Record button when the user is not a manager', () => {
      // ARRANGE
      (usePermissions as any).mockReturnValue({ isManager: false });
      render(<KnowledgeHeader {...createMockProps()} />);

      // ASSERT
      expect(screen.queryByRole('button', { name: /NEW RECORD/i })).not.toBeInTheDocument();
    });
  });

  describe('interactions', () => {
    it('calls onMenuToggle when the menu button is clicked', () => {
      // ARRANGE
      const props = createMockProps();
      render(<KnowledgeHeader {...props} />);

      // ACT
      const buttons = screen.getAllByRole('button');
      fireEvent.click(buttons[0]); // The menu toggle is the first button

      // ASSERT
      expect(props.onMenuToggle).toHaveBeenCalledTimes(1);
    });

    it('updates input value and triggers onSearchChange after debounce when typing', async () => {
      // ARRANGE
      const props = createMockProps();
      render(<KnowledgeHeader {...props} />);

      // ACT
      const searchInput = screen.getByPlaceholderText(/QUICK SEARCH.../i);
      fireEvent.change(searchInput, { target: { value: 'test' } });

      // ASSERT
      expect(searchInput).toHaveValue('test');
      await waitFor(() => {
        expect(props.onSearchChange).toHaveBeenCalledWith('test');
      }, { timeout: 1000 });
    });

    it('clears the search term when the clear button is clicked', () => {
      // ARRANGE
      const props = createMockProps({ searchTerm: 'initial' });
      render(<KnowledgeHeader {...props} />);

      // ACT
      const clearButton = screen.getByLabelText(/CLEAR SEARCH/i);
      fireEvent.click(clearButton);

      // ASSERT
      expect(props.onSearchChange).toHaveBeenCalledWith('');
      expect(screen.getByPlaceholderText(/QUICK SEARCH.../i)).toHaveValue('');
    });

    it('calls onNewRecord when the New Record button is clicked', () => {
      // ARRANGE
      const props = createMockProps();
      render(<KnowledgeHeader {...props} />);

      // ACT
      const newRecordButton = screen.getByRole('button', { name: /NEW RECORD/i });
      fireEvent.click(newRecordButton);

      // ASSERT
      expect(props.onNewRecord).toHaveBeenCalledTimes(1);
    });
  });
});
