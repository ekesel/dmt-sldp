import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RecordDetail } from '../RecordDetail';
import { usePermissions } from '@/hooks/usePermissions';
import { useUsers } from '@/features/knowledge-base/hooks/useUsers';
import { useRecordVersions } from '@/features/knowledge-base/hooks/useKnowledgeRecords';
import { useMutation, useQueryClient } from '@tanstack/react-query';

// Mock hooks
vi.mock('@tanstack/react-query', () => ({
  useQueryClient: vi.fn(() => ({
    invalidateQueries: vi.fn(),
  })),
  useMutation: vi.fn(),
}));
vi.mock('@/hooks/usePermissions', () => ({
  usePermissions: vi.fn(),
}));
vi.mock('@/features/knowledge-base/hooks/useUsers', () => ({
  useUsers: vi.fn(),
}));
vi.mock('@/features/knowledge-base/hooks/useKnowledgeRecords', () => ({
  useRecordVersions: vi.fn(),
}));
vi.mock('@dmt/api', () => ({
  knowledgeRecords: {
    updateStatus: vi.fn(),
    downloadFile: vi.fn(),
  },
}));

// Factory function for generating mock record data
const createMockRecord = (overrides = {}) => ({
  id: '1',
  title: 'Detailed Doc',
  status: 'Approved',
  version: 'v1.0',
  versionCount: 1,
  author: '1',
  owner: '1',
  date: 'Jan 01, 2023',
  description: 'This is a test description',
  uid: 'KB-1',
  tags: ['Tag1', 'Tag2'],
  metadata: [
    { category: 1, category_name: 'Team', value: 'Alpha' }
  ],
  assets: [
    { name: 'file.pdf', size: '1MB', url: 'http://example.com/file.pdf' }
  ],
  filesPreview: { total: 1, firstFileName: 'file.pdf', totalSize: '1MB' },
  fileUrl: 'http://example.com/file.pdf',
  ...overrides,
});

describe('RecordDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (usePermissions as any).mockReturnValue({ isManager: true });
    (useUsers as any).mockReturnValue({ managers: [{ id: '1', username: 'User1' }] });
    (useRecordVersions as any).mockReturnValue({ versions: [], isLoading: false });
    (useMutation as any).mockReturnValue({ mutate: vi.fn(), isPending: false });
  });

  describe('empty state', () => {
    it('renders the select record message when no record is provided', () => {
      // ARRANGE
      render(<RecordDetail record={null} currentUser="1" />);

      // ASSERT
      expect(screen.getByRole('heading', { name: /SELECT A RECORD/i })).toBeInTheDocument();
    });
  });

  describe('rendering', () => {
    it('renders the complete record details correctly', () => {
      // ARRANGE
      const record = createMockRecord();
      render(<RecordDetail record={record as any} currentUser="1" />);

      // ASSERT
      expect(screen.getByText('Detailed Doc')).toBeInTheDocument();
      expect(screen.getByText('This is a test description')).toBeInTheDocument();
      expect(screen.getByText('Approved')).toBeInTheDocument();
      expect(screen.getByText('KB-1')).toBeInTheDocument();
      expect(screen.getByText('User1')).toBeInTheDocument();
    });

    it('renders the tags and metadata sections correctly', () => {
      // ARRANGE
      const record = createMockRecord({ tags: ['Tag1', 'Tag2'], metadata: [{ category_name: 'Team', value: 'Alpha' }] });
      render(<RecordDetail record={record as any} currentUser="1" />);

      // ASSERT
      expect(screen.getByText('Tag1')).toBeInTheDocument();
      expect(screen.getByText('Tag2')).toBeInTheDocument();
      expect(screen.getByText('Team')).toBeInTheDocument();
      expect(screen.getByText('Alpha')).toBeInTheDocument();
    });

    it('renders the asset list correctly', () => {
      // ARRANGE
      const record = createMockRecord({ assets: [{ name: 'file.pdf', size: '1MB', url: 'http://example.com/file.pdf' }] });
      render(<RecordDetail record={record as any} currentUser="1" />);

      // ASSERT
      expect(screen.getByText('file.pdf')).toBeInTheDocument();
      expect(screen.getByText('1MB')).toBeInTheDocument();
    });
  });

  describe('interactions', () => {
    it('calls onClose when the close button is clicked', () => {
      // ARRANGE
      const onClose = vi.fn();
      const record = createMockRecord();
      render(<RecordDetail record={record as any} currentUser="1" onClose={onClose} />);

      // ACT
      const closeBtn = screen.getByRole('button', { name: '' });
      fireEvent.click(closeBtn);

      // ASSERT
      expect(onClose).toHaveBeenCalled();
    });

    it('calls onEdit when the edit button is clicked', () => {
      // ARRANGE
      const onEdit = vi.fn();
      const record = createMockRecord();
      render(<RecordDetail record={record as any} currentUser="1" onEdit={onEdit} />);

      // ACT
      const editBtn = screen.getByText(/EDIT/i);
      fireEvent.click(editBtn);

      // ASSERT
      expect(onEdit).toHaveBeenCalledWith(record);
    });

    it('displays the restricted access message for draft assets when not the owner', () => {
      // ARRANGE
      const draftRecord = createMockRecord({ status: 'Draft', owner: '2' });
      render(<RecordDetail record={draftRecord as any} currentUser="1" />);

      // ASSERT
      expect(screen.getByText(/RESTRICTED ACCESS/i)).toBeInTheDocument();
    });
  });
});
