/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SprintSelector } from '../SprintSelector';
import { sprints } from '@dmt/api';

vi.mock('@dmt/api', () => ({
    sprints: {
        list: vi.fn(),
    },
}));

describe('SprintSelector Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('returns null (hidden) when All Projects is selected (projectId is null)', () => {
        const { container } = render(
            <SprintSelector
                projectId={null}
                selectedSprintId={null}
                onSelect={vi.fn()}
                allowAll={true}
            />
        );

        expect(container.firstChild).toBeNull();
        expect(sprints.list).not.toHaveBeenCalled();
    });

    it('fetches sprints associated with the selected project', async () => {
        const mockSprints = [
            { id: 101, name: 'Sprint 101', start_date: '2026-01-01', end_date: '2026-01-14', status: 'closed' },
            { id: 102, name: 'Sprint 102', start_date: '2026-01-15', end_date: '2026-01-28', status: 'active' },
        ];
        (sprints.list as any).mockResolvedValue(mockSprints);

        render(
            <SprintSelector
                projectId={1}
                selectedSprintId={null}
                onSelect={vi.fn()}
                autoSelectLatest={false}
                allowAll={true}
            />
        );

        expect(sprints.list).toHaveBeenCalledWith(1);
        await waitFor(() => {
            expect(screen.getByText('All Sprints')).toBeDefined();
        });
    });

    it('clears stale sprint data and fetches new sprints when project changes', async () => {
        const project1Sprints = [
            { id: 101, name: 'Project 1 - Sprint Alpha', start_date: '2026-01-01', end_date: '2026-01-14', status: 'active' },
        ];
        const project2Sprints = [
            { id: 201, name: 'Project 2 - Sprint Beta', start_date: '2026-02-01', end_date: '2026-02-14', status: 'active' },
        ];

        (sprints.list as any).mockImplementation((projId: number) => {
            if (projId === 1) return Promise.resolve(project1Sprints);
            if (projId === 2) return Promise.resolve(project2Sprints);
            return Promise.resolve([]);
        });

        const handleSelect = vi.fn();
        const { rerender } = render(
            <SprintSelector
                projectId={1}
                selectedSprintId={101}
                onSelect={handleSelect}
                autoSelectLatest={false}
                allowAll={true}
            />
        );

        await waitFor(() => {
            expect(screen.getByText('Project 1 - Sprint Alpha')).toBeDefined();
        });

        // Switch to Project 2 with selectedSprintId reset to null
        rerender(
            <SprintSelector
                projectId={2}
                selectedSprintId={null}
                onSelect={handleSelect}
                autoSelectLatest={false}
                allowAll={true}
            />
        );

        // Stale sprint from project 1 should be gone
        expect(screen.queryByText('Project 1 - Sprint Alpha')).toBeNull();

        // New project sprints should be fetched
        expect(sprints.list).toHaveBeenCalledWith(2);
        await waitFor(() => {
            expect(screen.getByText('All Sprints')).toBeDefined();
        });

        // Open dropdown to verify Project 2 sprint is present and Project 1 sprint is absent
        const button = screen.getByRole('button');
        fireEvent.click(button);

        expect(screen.getByText('Project 2 - Sprint Beta')).toBeDefined();
        expect(screen.queryByText('Project 1 - Sprint Alpha')).toBeNull();
    });

    it('hides dropdown when switching to All Projects (projectId = null)', async () => {
        const project1Sprints = [
            { id: 101, name: 'Sprint 101', start_date: null, end_date: null, status: 'active' },
        ];
        (sprints.list as any).mockResolvedValue(project1Sprints);

        const { rerender, container } = render(
            <SprintSelector
                projectId={1}
                selectedSprintId={101}
                onSelect={vi.fn()}
                autoSelectLatest={false}
                allowAll={true}
            />
        );

        await waitFor(() => {
            expect(screen.getByText('Sprint 101')).toBeDefined();
        });

        // Switch to All Projects
        rerender(
            <SprintSelector
                projectId={null}
                selectedSprintId={null}
                onSelect={vi.fn()}
                allowAll={true}
            />
        );

        expect(container.firstChild).toBeNull();
    });
});
