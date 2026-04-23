import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RecordList } from '../RecordList';
import { useRecords } from '@/features/knowledge-base/hooks/useKnowledgeRecords';
import { usePermissions } from '@/hooks/usePermissions';
import { useUsers } from '@/features/knowledge-base/hooks/useUsers';
import { useAuth } from '@/context/AuthContext';
import { useQueryClient, useMutation } from '@tanstack/react-query';

// Mock hooks
vi.mock('@tanstack/react-query', () => ({
  useQueryClient: vi.fn(() => ({
    invalidateQueries: vi.fn(),
  })),
  useMutation: vi.fn(),
}));
vi.mock('@/features/knowledge-base/hooks/useKnowledgeRecords', () => ({
  useRecords: vi.fn(),
}));
vi.mock('@/hooks/usePermissions', () => ({
  usePermissions: vi.fn(),
}));
vi.mock('@/features/knowledge-base/hooks/useUsers', () => ({
  useUsers: vi.fn(),
}));
vi.mock('@/context/AuthContext', () => ({
  useAuth: vi.fn(),
}));
vi.mock('@dmt/api', () => ({
  knowledgeRecords: {
    updateStatus: vi.fn(),
    deleteDocument: vi.fn(),
    downloadFile: vi.fn(),
    getById: vi.fn(),
  },
}));

// Factory functions for generating mock data
const createMockRecord = (overrides = {}) => ({
  id: '1',
  title: 'Doc One',
  status: 'Approved',
  version: 'v1.0',
  author: '1',
  owner: '1',
  date: 'Jan 01, 2023',
  filesPreview: { total: 1, firstFileName: 'file.pdf', totalSize: '1MB' },
  tags: ['Tag1'],
  metadata: [{ category: 1, category_name: 'Team', value: 'Alpha' }],
  assets: [],
  versionCount: 1,
  ...overrides,
});

describe('RecordList', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock implementations
    (useRecords as any).mockReturnValue({
      records: [
        createMockRecord({ id: '1', title: 'Doc One', metadata: [{ value: 'Alpha' }] }),
        createMockRecord({ id: '2', title: 'Doc Two', status: 'Draft', author: '2', metadata: [{ value: 'Beta' }], versionCount: 0 })
      ],
      isLoading: false,
      isFetching: false,
      isError: false,
    });
    (usePermissions as any).mockReturnValue({ isManager: true });
    (useUsers as any).mockReturnValue({ managers: [{ id: '1', username: 'User1' }] });
    (useAuth as any).mockReturnValue({ user: { id: '1' } });
    (useMutation as any).mockReturnValue({ mutate: vi.fn(), isPending: false });
  });

  describe('rendering', () => {
    it('renders a list of records with correctly resolved author names', () => {
      // ARRANGE
      render(<RecordList selectedId={null} onSelect={vi.fn()} />);

      // ASSERT
      expect(screen.getByText('Doc One')).toBeInTheDocument();
      expect(screen.getByText('Doc Two')).toBeInTheDocument();
      expect(screen.getAllByText('User1')[0]).toBeInTheDocument(); // Match the author label
      expect(screen.getAllByText('User #2')[0]).toBeInTheDocument(); // Fallback for ID 2
    });

    it('filters the displayed records when activeTeam is provided', () => {
      // ARRANGE
      render(<RecordList selectedId={null} onSelect={vi.fn()} activeTeam="Alpha" />);

      // ASSERT
      expect(screen.getByText('Doc One')).toBeInTheDocument();
      expect(screen.queryByText('Doc Two')).not.toBeInTheDocument();
    });

    it('displays the empty state when no records match the search criteria', () => {
      // ARRANGE
      (useRecords as any).mockReturnValue({ records: [], isLoading: false });
      render(<RecordList selectedId={null} onSelect={vi.fn()} search="nothing" />);

      // ASSERT
      expect(screen.getByText(/NO RECORDS MATCH YOUR SEARCH/i)).toBeInTheDocument();
    });

    it('highlights the currently selected record card', () => {
      // ARRANGE
      render(<RecordList selectedId="1" onSelect={vi.fn()} />);

      // ASSERT
      const card = screen.getByText('Doc One').closest('.group');
      expect(card).toHaveClass('bg-primary/10');
    });

    it('renders Approve and Reject buttons for managers on Draft records', () => {
      // ARRANGE
      render(<RecordList selectedId={null} onSelect={vi.fn()} />);

      // ASSERT
      const approveButtons = screen.getAllByTitle(/APPROVE DOCUMENT/i);
      expect(approveButtons).toHaveLength(1); // Only for Doc Two (Draft)

      const rejectButtons = screen.getAllByTitle(/REJECT DOCUMENT/i);
      expect(rejectButtons).toHaveLength(1);
    });
  });

  describe('interactions', () => {
    it('calls onSelect when a record card is clicked', () => {
      // ARRANGE
      const onSelect = vi.fn();
      render(<RecordList selectedId={null} onSelect={onSelect} />);

      // ACT
      fireEvent.click(screen.getByText('Doc One'));

      // ASSERT
      expect(onSelect).toHaveBeenCalled();
    });

    it('triggers the delete mutation after user confirmation', () => {
      // ARRANGE
      const mockDelete = vi.fn();
      (useMutation as any).mockReturnValue({ mutate: mockDelete, isPending: false });
      window.confirm = vi.fn(() => true);
      render(<RecordList selectedId={null} onSelect={vi.fn()} />);

      // ACT
      const deleteBtn = screen.getAllByTitle(/DELETE DOCUMENT/i)[0];
      fireEvent.click(deleteBtn);

      // ASSERT
      expect(window.confirm).toHaveBeenCalled();
      expect(mockDelete).toHaveBeenCalledWith('1');
    });
  });
});
