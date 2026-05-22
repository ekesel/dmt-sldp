/**
 * @vitest-environment jsdom
 */
import { render, screen, act, fireEvent, cleanup } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { StarPerformer } from "../StarPerformer";
import { dashboard } from "@dmt/api";

// Mock next/image to render a standard img tag
vi.mock("next/image", () => ({
  default: (props: any) => {
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img {...props} />;
  },
}));

// Mock the @dmt/api dashboard module
vi.mock("@dmt/api", () => ({
  dashboard: {
    getStarPerformer: vi.fn(),
  },
}));

// Mock framer-motion to avoid animation delays in tests
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

describe("StarPerformer Component", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    cleanup();
  });

  it("renders default performers if API returns no data", async () => {
    (dashboard.getStarPerformer as any).mockResolvedValue({});

    render(<StarPerformer />);

    // Wait for the component to resolve the initial fetch
    await act(async () => {
      await Promise.resolve();
    });

    expect(screen.getByText("Star Performer")).toBeDefined();
    // Default performer
    expect(screen.getByText("David Chen")).toBeDefined();
    expect(screen.getByText("Sales")).toBeDefined();
  });

  it("renders API data correctly", async () => {
    (dashboard.getStarPerformer as any).mockResolvedValue({
      top_performers: {
        1: {
          name: "Alice Smith",
          title: "Developer",
          reason: "Excellent code quality",
          score: 10,
          avatar: "alice.jpg",
        },
      },
    });

    render(<StarPerformer />);

    await act(async () => {
      await Promise.resolve();
    });

    expect(screen.getByText("Alice Smith")).toBeDefined();
    expect(screen.getByText("Developer")).toBeDefined();
    expect(screen.getByText("Excellent code quality")).toBeDefined();
  });

  it("navigates through performers using next and previous buttons", async () => {
    const mockPerformers = [
      { name: "John", role: "Role 1", message: "Msg 1", rating: 5, avatar: "1.jpg" },
      { name: "Jane", role: "Role 2", message: "Msg 2", rating: 5, avatar: "2.jpg" },
    ];

    render(<StarPerformer performers={mockPerformers} />);

    await act(async () => {
      await Promise.resolve();
    });

    // Initially shows first person
    expect(screen.getByText("John")).toBeDefined();

    const nextButton = screen.getByLabelText("Next performer");
    const prevButton = screen.getByLabelText("Previous performer");

    // Click next
    act(() => {
      fireEvent.click(nextButton);
    });

    expect(screen.getByText("Jane")).toBeDefined();

    // Click previous
    act(() => {
      fireEvent.click(prevButton);
    });

    expect(screen.getByText("John")).toBeDefined();
  });

  it("auto-rotates performers based on a 4-second interval", async () => {
    const mockPerformers = [
      { name: "Person 1", role: "Role", message: "Msg", rating: 5, avatar: "1.jpg" },
      { name: "Person 2", role: "Role", message: "Msg", rating: 5, avatar: "2.jpg" },
    ];

    render(<StarPerformer performers={mockPerformers} />);

    await act(async () => {
      await Promise.resolve();
    });

    expect(screen.getByText("Person 1")).toBeDefined();

    // Fast-forward 4 seconds
    act(() => {
      vi.advanceTimersByTime(4000);
    });

    expect(screen.getByText("Person 2")).toBeDefined();

    // Fast-forward another 4 seconds
    act(() => {
      vi.advanceTimersByTime(4000);
    });

    expect(screen.getByText("Person 1")).toBeDefined();
  });
});
