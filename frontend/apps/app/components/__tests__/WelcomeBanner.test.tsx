/**
 * @vitest-environment jsdom
 */
import { render, screen, act, cleanup } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { WelcomeBanner } from "../WelcomeBanner";
import { useAuth } from "../../context/AuthContext";

// Mock next/image to render a standard img tag
vi.mock("next/image", () => ({
  default: (props: any) => {
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img {...props} />;
  },
}));

// Mock useAuth hook
vi.mock("../../context/AuthContext", () => ({
  useAuth: vi.fn(),
}));

describe("WelcomeBanner Component", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
    cleanup();
  });

  it("renders with guest user when no user data is provided", () => {
    (useAuth as any).mockReturnValue({ user: null });
    
    render(<WelcomeBanner />);
    
    // Act to ensure useEffect state changes are flushed
    act(() => {
      vi.runAllTimers();
    });

    expect(screen.getByText(/User!/)).toBeDefined();
    expect(screen.getByText("Guest User")).toBeDefined();
  });

  it("renders correct name when user data is provided", () => {
    (useAuth as any).mockReturnValue({ 
      user: { first_name: "John", last_name: "Doe", username: "johndoe" } 
    });
    
    render(<WelcomeBanner />);
    
    act(() => {
      vi.runAllTimers();
    });

    expect(screen.getByText(/John!/)).toBeDefined();
    expect(screen.getByText("John Doe")).toBeDefined();
  });

  it("renders correct name when only username is provided", () => {
    (useAuth as any).mockReturnValue({ 
      user: { username: "cooluser" } 
    });
    
    render(<WelcomeBanner />);
    
    act(() => {
      vi.runAllTimers();
    });

    expect(screen.getByText(/cooluser!/)).toBeDefined();
    expect(screen.getByText("cooluser")).toBeDefined();
  });

  it("renders 'Good Morning' in the morning (before 12 PM)", () => {
    (useAuth as any).mockReturnValue({ user: null });
    
    const morningDate = new Date(2023, 1, 1, 9, 0, 0); // 9 AM
    vi.setSystemTime(morningDate);

    render(<WelcomeBanner />);
    
    act(() => {
      vi.runAllTimers();
    });

    expect(screen.getByText(/Good Morning/)).toBeDefined();
  });

  it("renders 'Good Afternoon' in the afternoon (12 PM to 5 PM)", () => {
    (useAuth as any).mockReturnValue({ user: null });
    
    const afternoonDate = new Date(2023, 1, 1, 14, 0, 0); // 2 PM
    vi.setSystemTime(afternoonDate);

    render(<WelcomeBanner />);
    
    act(() => {
      vi.runAllTimers();
    });

    expect(screen.getByText(/Good Afternoon/)).toBeDefined();
  });

  it("renders 'Good Evening' in the evening (after 5 PM)", () => {
    (useAuth as any).mockReturnValue({ user: null });
    
    const eveningDate = new Date(2023, 1, 1, 20, 0, 0); // 8 PM
    vi.setSystemTime(eveningDate);

    render(<WelcomeBanner />);
    
    act(() => {
      vi.runAllTimers();
    });

    expect(screen.getByText(/Good Evening/)).toBeDefined();
  });
});
