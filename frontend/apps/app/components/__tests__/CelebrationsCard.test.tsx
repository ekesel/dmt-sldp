/**
 * @vitest-environment jsdom
 */
import { render, screen, act, fireEvent, cleanup } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { CelebrationsCard } from "../CelebrationsCard";
import { dashboard } from "@dmt/api";

// Mock next/image to render a standard img tag
vi.mock("next/image", () => ({
  default: (props: any) => {
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img {...props} />;
  },
}));

// Mock framer-motion to avoid animation delays in tests
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock the lucide-react icons
vi.mock("lucide-react", () => ({
  Loader2: () => <div data-testid="loader">Loading...</div>,
}));

// Mock @dmt/api dashboard
vi.mock("@dmt/api", () => ({
  dashboard: {
    getEvents: vi.fn(),
  },
}));

describe("CelebrationsCard Component", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    cleanup();
  });

  it("renders loading state initially", async () => {
    // Return a promise that doesn't resolve immediately to keep it in loading state
    (dashboard.getEvents as any).mockReturnValue(new Promise(() => {}));

    render(<CelebrationsCard />);

    expect(screen.getByTestId("loader")).toBeDefined();
    expect(screen.getByText("Loading Celebrations...")).toBeDefined();
  });

  it("renders error state when API fails", async () => {
    (dashboard.getEvents as any).mockRejectedValue(new Error("API Error"));

    render(<CelebrationsCard />);

    await act(async () => {
      await Promise.resolve();
    });

    expect(screen.getByText("Couldn’t load celebrations right now. Please try again.")).toBeDefined();
    expect(screen.getByRole("button", { name: "Retry" })).toBeDefined();
  });

  it("renders 'No Celebrations Today' if there are no events today", async () => {
    (dashboard.getEvents as any).mockResolvedValue({
      today_birthdays: [],
      today_anniversaries: [],
      upcoming_birthdays: [],
      upcoming_anniversaries: [],
    });

    render(<CelebrationsCard />);

    await act(async () => {
      await Promise.resolve();
    });

    expect(screen.getByText("No Celebrations Today")).toBeDefined();
    expect(screen.getByText("No upcoming birthdays or anniversaries this month.")).toBeDefined();
  });

  it("renders today's birthdays and anniversaries correctly and allows navigation", async () => {
    (dashboard.getEvents as any).mockResolvedValue({
      today_birthdays: [
        { user: "Alice", days_left: 0 }
      ],
      today_anniversaries: [
        { user: "Bob", anniversary_count: 5, days_left: 0 }
      ],
      upcoming_birthdays: [],
      upcoming_anniversaries: [],
    });

    render(<CelebrationsCard />);

    await act(async () => {
      await Promise.resolve();
    });

    // Alice's birthday should show up first
    expect(screen.getByText("Alice")).toBeDefined();
    expect(screen.getByText("Birthday 🎂")).toBeDefined();
    
    // We should be able to navigate to Bob's anniversary using the "Next" button
    const nextButton = screen.getByLabelText("Next celebration");
    act(() => {
      fireEvent.click(nextButton);
    });

    expect(screen.getByText("Bob")).toBeDefined();
    expect(screen.getByText("5 Year Work Anniversary 🎉")).toBeDefined();
  });

  it("renders upcoming birthdays and anniversaries correctly", async () => {
    (dashboard.getEvents as any).mockResolvedValue({
      today_birthdays: [],
      today_anniversaries: [],
      upcoming_birthdays: [
        { user: "Charlie", next_birthday: "2023-10-15", days_left: 5 }
      ],
      upcoming_anniversaries: [
        { user: "Diana", next_anniversary: "2023-10-20", days_left: 10 }
      ],
    });

    render(<CelebrationsCard />);

    await act(async () => {
      await Promise.resolve();
    });

    expect(screen.getByText("Upcoming:")).toBeDefined();
    expect(screen.getByText("Charlie")).toBeDefined();
    expect(screen.getByText("🎂 Birthday")).toBeDefined();
    expect(screen.getByText("Diana")).toBeDefined();
    expect(screen.getByText("🎉work Anniversary")).toBeDefined();
  });

  it("auto-rotates highlighted users on interval", async () => {
    (dashboard.getEvents as any).mockResolvedValue({
      today_birthdays: [
        { user: "Alice", days_left: 0 },
        { user: "Bob", days_left: 0 }
      ],
      today_anniversaries: [],
      upcoming_birthdays: [],
      upcoming_anniversaries: [],
    });

    render(<CelebrationsCard />);

    await act(async () => {
      await Promise.resolve();
    });

    // Initial item is Alice
    expect(screen.getByText("Alice")).toBeDefined();

    // Fast-forward time by 4 seconds
    act(() => {
      vi.advanceTimersByTime(4000);
    });

    // Should transition to Bob
    expect(screen.getByText("Bob")).toBeDefined();

    // Fast-forward another 4 seconds
    act(() => {
      vi.advanceTimersByTime(4000);
    });

    // Should be back to Alice
    expect(screen.getByText("Alice")).toBeDefined();
  });
});
