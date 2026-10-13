/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { DatePicker } from '../DatePicker';

describe('DatePicker Component', () => {
    it('renders label and initial value correctly', () => {
        render(
            <DatePicker
                label="From"
                value="2026-09-13"
                onChange={vi.fn()}
            />
        );

        expect(screen.getByText('From')).toBeDefined();
        expect(screen.getByText('Sep 13, 2026')).toBeDefined();
    });

    it('opens popover when clicked and displays current month without auto-selecting on month change', () => {
        const handleChange = vi.fn();
        render(
            <DatePicker
                label="From"
                value="2026-09-13"
                onChange={handleChange}
            />
        );

        const triggerButton = screen.getByRole('button', { name: /from/i });
        fireEvent.click(triggerButton);

        // Popover is open: September 2026 is shown
        expect(screen.getByText('September')).toBeDefined();

        // Navigate backwards to June using Previous month button 3 times
        const prevButton = screen.getByTitle('Previous month');
        fireEvent.click(prevButton); // August
        fireEvent.click(prevButton); // July
        fireEvent.click(prevButton); // June

        // June should now be shown
        expect(screen.getByText('June')).toBeDefined();

        // Crucial test: Navigating to June must NOT trigger onChange!
        expect(handleChange).not.toHaveBeenCalled();

        // Now user clicks on day 5 of June
        const day5Button = screen.getByRole('button', { name: '5' });
        fireEvent.click(day5Button);

        // Now onChange is called with the chosen date in June
        expect(handleChange).toHaveBeenCalledWith('2026-06-05');
    });

    it('disables future dates beyond max or today', () => {
        render(
            <DatePicker
                label="To"
                value=""
                max="2026-06-15"
                onChange={vi.fn()}
            />
        );

        const triggerButton = screen.getByRole('button', { name: /to/i });
        fireEvent.click(triggerButton);

        // Day 16 (after max) should be disabled
        // Let's set view to June 2026
        const monthSelect = screen.getByLabelText('Select month');
        fireEvent.change(monthSelect, { target: { value: '5' } }); // June (index 5)

        const day16Button = screen.getByRole('button', { name: '16' });
        expect(day16Button.hasAttribute('disabled')).toBe(true);

        const day10Button = screen.getByRole('button', { name: '10' });
        expect(day10Button.hasAttribute('disabled')).toBe(false);
    });

    it('disables Next month button when at max date bounds', () => {
        render(
            <DatePicker
                label="To"
                value="2026-06-10"
                max="2026-06-25"
                onChange={vi.fn()}
            />
        );

        const triggerButton = screen.getByRole('button', { name: /to/i });
        fireEvent.click(triggerButton);

        const nextButton = screen.getByTitle('Next month');
        expect(nextButton.hasAttribute('disabled')).toBe(true);
    });

    it('disables Previous month button when at min date bounds', () => {
        render(
            <DatePicker
                label="From"
                value="2024-03-10"
                min="2024-03-01"
                onChange={vi.fn()}
            />
        );

        const triggerButton = screen.getByRole('button', { name: /from/i });
        fireEvent.click(triggerButton);

        const prevButton = screen.getByTitle('Previous month');
        expect(prevButton.hasAttribute('disabled')).toBe(true);
    });
});
