/**
 * @vitest-environment jsdom
 */
import { render, screen, cleanup } from "@testing-library/react";
import { describe, it, expect, afterEach } from "vitest";
import EventsCalendar from "../EventsCalendar";

describe("EventsCalendar Component", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders the correct month and year", () => {
    render(<EventsCalendar />);
    expect(screen.getByText("October 2023")).toBeDefined();
  });

  it("renders the days of the week headers correctly", () => {
    render(<EventsCalendar />);
    // The component slices the first 2 letters of "SUN", "MON", etc.
    const expectedHeaders = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];
    expectedHeaders.forEach((dayHeader) => {
      expect(screen.getByText(dayHeader)).toBeDefined();
    });
  });

  it("renders the active day highlighted", () => {
    render(<EventsCalendar />);
    const activeDay = screen.getByText("25");
    expect(activeDay.className).toContain("bg-primary");
    expect(activeDay.className).toContain("text-primary-foreground");
  });

  it("renders an event marker for days with events", () => {
    // We know day 29 has an event based on CALENDAR_DAYS in the component
    const { container } = render(<EventsCalendar />);
    
    // The event marker is a small div with bg-destructive
    const eventMarkers = container.querySelectorAll(".bg-destructive");
    expect(eventMarkers.length).toBeGreaterThan(0);
  });
});
