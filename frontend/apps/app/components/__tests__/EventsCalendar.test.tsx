/**
 * @vitest-environment jsdom
 */
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import EventsCalendar from "../EventsCalendar";
import { dashboard } from "@dmt/api";

vi.mock("@dmt/api", () => ({
  dashboard: {
    getHolidays: vi.fn(),
  },
}));

describe("EventsCalendar Component", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2023, 9, 25)); // 25 Oct 2023
    (dashboard.getHolidays as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      holidays: [
        { id: 1, name: "Autumn Festival", date: "2023-10-29" },
      ],
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    cleanup();
    vi.clearAllMocks();
  });

  it("renders the correct month and year", () => {
    render(<EventsCalendar />);
    expect(screen.getByText(/October\s+2023/)).toBeDefined();
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

  it("renders an event marker for days with events", async () => {
    render(<EventsCalendar />);
    
    await waitFor(() => {
      const holidayDay = screen.getByText("29");
      expect(holidayDay.className).toContain("bg-accent");
    });
  });
});
