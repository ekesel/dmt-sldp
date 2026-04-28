import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RecordEditor } from '../RecordEditor';
import { useQueryClient } from '@tanstack/react-query';
import { useTags } from '@/features/knowledge-base/hooks/useTags';
import { useUsers } from '@/features/knowledge-base/hooks/useUsers';
import { useMetadata } from '@/features/knowledge-base/hooks/useMetadata';
import { useRecordVersions } from '@/features/knowledge-base/hooks/useKnowledgeRecords';
import { knowledgeRecords } from '@dmt/api';
import { toast } from 'react-hot-toast';

// Mock hooks
vi.mock('@tanstack/react-query', () => ({
  useQueryClient: vi.fn(() => ({
    invalidateQueries: vi.fn(),
  })),
}));
vi.mock('@/features/knowledge-base/hooks/useTags', () => ({
  useTags: vi.fn(),
}));
vi.mock('@/features/knowledge-base/hooks/useUsers', () => ({
  useUsers: vi.fn(),
}));
vi.mock('@/features/knowledge-base/hooks/useMetadata', () => ({
  useMetadata: vi.fn(),
}));
vi.mock('@/features/knowledge-base/hooks/useKnowledgeRecords', () => ({
  useRecordVersions: vi.fn(),
}));
vi.mock('@dmt/api', () => ({
  knowledgeRecords: {
    create: vi.fn(),
    update: vi.fn(),
    uploadVersion: vi.fn(),
  },
}));
vi.mock('react-hot-toast', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

// Factory function for generating mock record data
const createMockRecord = (overrides = {}) => ({
  id: '1',
  title: 'Existing Doc',
  owner: '1',
  tags: ['TECH'],
  metadata: [{ category: 1, category_name: 'Team', value: 'Alpha', id: 10 }],
  versionCount: 1,
  assets: [],
  ...overrides,
});

describe('RecordEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useTags as any).mockReturnValue({
      tags: [{ id: 100, name: 'TECH' }],
      createTag: vi.fn(),
      isLoading: false,
      isCreating: false,
    });
    (useUsers as any).mockReturnValue({
      managers: [{ id: '1', username: 'User1' }],
      isLoading: false,
    });
    (useMetadata as any).mockReturnValue({
      categories: [{ id: 1, name: 'Team' }],
      allValues: [{ id: 10, category: 1, value: 'Alpha' }],
      isLoading: false,
    });
    (useRecordVersions as any).mockReturnValue({
      versions: [],
      isLoading: false,
    });
  });

  describe('initialization', () => {
    it('renders the creation header when in create mode', () => {
      // ARRANGE
      render(<RecordEditor mode="create" onBack={vi.fn()} />);

      // ASSERT
      expect(screen.getByText(/NEW DOCUMENT/i)).toBeInTheDocument();
    });

    it('renders the edit header and pre-fills data when in edit mode', () => {
      // ARRANGE
      const record = createMockRecord({ title: 'Edit Me' });
      render(<RecordEditor mode="edit" record={record as any} onBack={vi.fn()} />);

      // ASSERT
      expect(screen.getByText(/EDIT DOCUMENT/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/ENTER DOCUMENT TITLE.../i)).toHaveValue('Edit Me');
    });
  });

  describe('form updates', () => {
    it('updates the title field value when the user types', () => {
      // ARRANGE
      render(<RecordEditor mode="create" onBack={vi.fn()} />);

      // ACT
      const input = screen.getByPlaceholderText(/ENTER DOCUMENT TITLE.../i);
      fireEvent.change(input, { target: { value: 'New Doc Title' } });

      // ASSERT
      expect(input).toHaveValue('New Doc Title');
    });

    it('displays the metadata options correctly based on categories', () => {
      // ARRANGE
      render(<RecordEditor mode="create" onBack={vi.fn()} />);

      // ASSERT
      expect(screen.getByText('Team')).toBeInTheDocument();
      expect(screen.getByText(/SELECT TEAM.../i)).toBeInTheDocument();
      expect(screen.getByText(/ALPHA/i)).toBeInTheDocument();
    });

    it('adds a tag to the list when selected from the dropdown', () => {
      // ARRANGE
      render(<RecordEditor mode="create" onBack={vi.fn()} />);

      // ACT
      const input = screen.getByPlaceholderText(/SEARCH OR TYPE.../i);
      fireEvent.focus(input);
      const tagOption = screen.getByText(/#TECH/i);
      fireEvent.click(tagOption);

      // ASSERT
      expect(screen.getByText('TECH')).toBeInTheDocument();
    });
  });

  describe('actions', () => {
    it('calls onBack when the back to library link is clicked', () => {
      // ARRANGE
      const onBack = vi.fn();
      render(<RecordEditor mode="create" onBack={onBack} />);

      // ACT
      const backBtn = screen.getByText(/BACK TO LIBRARY/i);
      fireEvent.click(backBtn);

      // ASSERT
      expect(onBack).toHaveBeenCalled();
    });

    it('shows a validation alert when trying to publish without a file in create mode', () => {
      // ARRANGE
      render(<RecordEditor mode="create" onBack={vi.fn()} />);

      // ACT
      const saveBtn = screen.getByText(/PUBLISH/i);
      fireEvent.click(saveBtn);

      // ASSERT
      expect(toast.error).toHaveBeenCalledWith("Please select a file to upload.");
      expect(knowledgeRecords.create).not.toHaveBeenCalled();
    });
  });
});
