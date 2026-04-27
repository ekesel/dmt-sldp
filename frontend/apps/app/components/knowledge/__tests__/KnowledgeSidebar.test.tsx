import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { KnowledgeSidebar } from '../KnowledgeSidebar';

// Factory functions for generating mock data
const createMockCategory = (overrides = {}) => ({
  id: 1,
  name: 'Project',
  ...overrides,
});

const createMockTeam = (overrides = {}) => ({
  name: 'Alpha',
  count: 5,
  ...overrides,
});

const createMockProps = (overrides = {}) => ({
  categories: [createMockCategory({ id: 1, name: 'Project' }), createMockCategory({ id: 2, name: 'Team' })],
  teams: [createMockTeam({ name: 'Alpha', count: 5 }), createMockTeam({ name: 'Beta', count: 3 })],
  activeTeam: 'Alpha',
  onTeamChange: vi.fn(),
  activeCategory: 2,
  onCategoryChange: vi.fn(),
  isAddingTeam: false,
  newTeamName: '',
  onAddTeamClick: vi.fn(),
  onNewTeamChange: vi.fn(),
  onAddTeamSubmit: vi.fn(),
  onAddTeamCancel: vi.fn(),
  isAddingCategory: false,
  newCategoryName: '',
  onAddCategoryClick: vi.fn(),
  onNewCategoryChange: vi.fn(),
  onAddCategorySubmit: vi.fn(),
  onAddCategoryCancel: vi.fn(),
  isManager: true,
  ...overrides,
});

describe('KnowledgeSidebar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders categories and teams correctly with their counts', () => {
      // ARRANGE
      render(<KnowledgeSidebar {...createMockProps()} />);

      // ASSERT
      expect(screen.getByText('Project')).toBeInTheDocument();
      expect(screen.getByText('Team')).toBeInTheDocument();
      expect(screen.getByText('Alpha')).toBeInTheDocument();
      expect(screen.getByText('Beta')).toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('highlights the active category and team items', () => {
      // ARRANGE
      render(<KnowledgeSidebar {...createMockProps({ activeTeam: 'Alpha', activeCategory: 2 })} />);

      // ASSERT
      const activeCategoryBtn = screen.getByText('Team').closest('button');
      expect(activeCategoryBtn).toHaveClass('bg-primary/20');

      const activeTeamBtn = screen.getByText('Alpha').closest('button');
      expect(activeTeamBtn).toHaveClass('bg-primary/20');
    });

    it('shows the add buttons when the user is a manager', () => {
      // ARRANGE
      render(<KnowledgeSidebar {...createMockProps({ isManager: true })} />);

      // ASSERT
      expect(screen.getByTitle(/ADD CATEGORY/i)).toBeInTheDocument();
    });

    it('hides the add buttons when the user is not a manager', () => {
      // ARRANGE
      render(<KnowledgeSidebar {...createMockProps({ isManager: false })} />);

      // ASSERT
      expect(screen.queryByTitle(/ADD CATEGORY/i)).not.toBeInTheDocument();
    });
  });

  describe('interactions', () => {
    it('calls onCategoryChange when a category item is clicked', () => {
      // ARRANGE
      const props = createMockProps();
      render(<KnowledgeSidebar {...props} />);

      // ACT
      fireEvent.click(screen.getByText('Project'));

      // ASSERT
      expect(props.onCategoryChange).toHaveBeenCalledWith(1);
    });

    it('calls onTeamChange when a team item is clicked', () => {
      // ARRANGE
      const props = createMockProps();
      render(<KnowledgeSidebar {...props} />);

      // ACT
      fireEvent.click(screen.getByText('Beta'));

      // ASSERT
      expect(props.onTeamChange).toHaveBeenCalledWith('Beta');
    });

    it('shows the category addition form when isAddingCategory is true', () => {
      // ARRANGE
      const props = createMockProps({ isAddingCategory: true, newCategoryName: 'New Cat' });
      render(<KnowledgeSidebar {...props} />);

      // ASSERT
      const input = screen.getByPlaceholderText(/NEW CATEGORY NAME.../i);
      expect(input).toHaveValue('New Cat');
      expect(screen.getByRole('button', { name: /^ADD$/i })).toBeInTheDocument();
    });

    it('calls onAddCategorySubmit when the Enter key is pressed in the category input', () => {
      // ARRANGE
      const props = createMockProps({ isAddingCategory: true });
      render(<KnowledgeSidebar {...props} />);

      // ACT
      const input = screen.getByPlaceholderText(/NEW CATEGORY NAME.../i);
      fireEvent.keyDown(input, { key: 'Enter' });

      // ASSERT
      expect(props.onAddCategorySubmit).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when the mobile close button is clicked', () => {
      // ARRANGE
      const onClose = vi.fn();
      render(<KnowledgeSidebar {...createMockProps({ isOpen: true, onClose })} />);

      // ACT
      const closeBtn = screen.getByRole('button', { name: '' });
      fireEvent.click(closeBtn);

      // ASSERT
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });
});
