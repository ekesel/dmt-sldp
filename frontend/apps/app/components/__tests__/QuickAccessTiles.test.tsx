/**
 * @vitest-environment jsdom
 */
import { render, screen, cleanup } from "@testing-library/react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { QuickAccessTiles } from "../QuickAccessTiles";

// Mock lucide-react icons to simplify testing
vi.mock("lucide-react", () => ({
  Network: () => <span data-testid="icon-network">Network Icon</span>,
  Palmtree: () => <span data-testid="icon-palmtree">Palmtree Icon</span>,
  CalendarHeart: () => <span data-testid="icon-calendar-heart">CalendarHeart Icon</span>,
  FileText: () => <span data-testid="icon-file-text">FileText Icon</span>,
  GraduationCap: () => <span data-testid="icon-graduation-cap">GraduationCap Icon</span>,
  Rocket: () => <span data-testid="icon-rocket">Rocket Icon</span>,
}));

describe("QuickAccessTiles Component", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders the main header correctly", () => {
    render(<QuickAccessTiles />);
    expect(screen.getByText("Quick Links")).toBeDefined();
  });

  it("renders all six quick access tiles with correct text and icons", () => {
    render(<QuickAccessTiles />);

    const tiles = [
      { text: "Org Chart", testId: "icon-network" },
      { text: "Holiday Calendar", testId: "icon-palmtree" },
      { text: "Employee Engagement Calendar", testId: "icon-calendar-heart" },
      { text: "Policies", testId: "icon-file-text" },
      { text: "Learning & Development", testId: "icon-graduation-cap" },
      { text: "Onboarding", testId: "icon-rocket" },
    ];

    tiles.forEach((tile) => {
      // Check if the title text is rendered
      expect(screen.getByText(tile.text)).toBeDefined();
      // Check if the corresponding mock icon is rendered
      expect(screen.getByTestId(tile.testId)).toBeDefined();
    });
  });

  it("has the correct navigation links wrapping the tiles", () => {
    render(<QuickAccessTiles />);
    
    // next/link renders as an <a> tag
    const links = screen.getAllByRole("link");
    expect(links.length).toBe(6);

    const expectedHrefs = [
      "/org-chart",
      "/holiday-calendar",
      "/engagement-calendar",
      "/policies",
      "/learning-and-development",
      "/onboarding",
    ];

    expectedHrefs.forEach((href) => {
      // Ensure there is a link element that contains the correct href attribute
      const matchingLink = links.find((link) => link.getAttribute("href") === href);
      expect(matchingLink).toBeDefined();
    });
  });
});
