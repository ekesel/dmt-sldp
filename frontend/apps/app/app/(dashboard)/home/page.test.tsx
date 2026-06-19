import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import HomePage from "./page";

// Mock the child components to isolate the HomePage testing
vi.mock("../../../components/WelcomeBanner", () => ({
  WelcomeBanner: () => <div data-testid="welcome-banner">Welcome Banner</div>,
}));

vi.mock("../../../components/StarPerformer", () => ({
  StarPerformer: () => <div data-testid="star-performer">Star Performer</div>,
}));

vi.mock("../../../components/CelebrationsCard", () => ({
  CelebrationsCard: () => <div data-testid="celebrations-card">Celebrations Card</div>,
}));

vi.mock("../../../components/SocialNewsFeed", () => ({
  SocialNewsFeed: () => <div data-testid="social-news-feed">Social NewsFeed</div>,
}));

vi.mock("../../../components/QuickAccessTiles", () => ({
  QuickAccessTiles: () => <div data-testid="quick-access-tiles">Quick Access Tiles</div>,
}));

vi.mock("../../../components/EventsCalendar", () => ({
  default: () => <div data-testid="events-calendar">Events Calendar</div>,
}));

describe("HomePage Component", () => {
  it("renders correctly with all child components", () => {
    render(<HomePage />);
    
    // Check if the main container is present
    const mainElement = screen.getByRole("main");
    expect(mainElement).toBeDefined();
    expect(mainElement.className).toContain("bg-[#F3F4F6]");
    
    // Check if all mocked child components are rendered
    expect(screen.getByTestId("welcome-banner")).toBeDefined();
    expect(screen.getByTestId("events-calendar")).toBeDefined();
    expect(screen.getByTestId("star-performer")).toBeDefined();
    expect(screen.getByTestId("quick-access-tiles")).toBeDefined();
    expect(screen.getByTestId("social-news-feed")).toBeDefined();
    expect(screen.getByTestId("celebrations-card")).toBeDefined();
  });
});
