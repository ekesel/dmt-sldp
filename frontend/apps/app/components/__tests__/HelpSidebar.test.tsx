/**
 * @vitest-environment jsdom
 */
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { HelpSidebar } from "../HelpSidebar";

describe("HelpSidebar Component", () => {
  it("renders DMT Terms when open", () => {
    render(
      <HelpSidebar
        isOpen={true}
        onClose={vi.fn()}
        activeTermId={null}
      />
    );

    expect(screen.getByText("DMT Terms")).toBeDefined();
    expect(screen.getByText("Understanding metrics, formulas & definitions")).toBeDefined();
    expect(screen.getByText("Sprint Velocity")).toBeDefined();
    expect(screen.getByText("Cycle Time")).toBeDefined();
  });

  it("calls onClose when the close button is clicked", () => {
    const handleClose = vi.fn();
    render(
      <HelpSidebar
        isOpen={true}
        onClose={handleClose}
        activeTermId={null}
      />
    );

    const closeButton = screen.getByLabelText("Close DMT Terms Sidebar");
    fireEvent.click(closeButton);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it("filters terms when typing into the search bar", () => {
    render(
      <HelpSidebar
        isOpen={true}
        onClose={vi.fn()}
        activeTermId={null}
      />
    );

    const searchInput = screen.getByPlaceholderText("Search terms, formulas, rules...");
    fireEvent.change(searchInput, { target: { value: "Velocity" } });

    expect(screen.getByText("Sprint Velocity")).toBeDefined();
    expect(screen.queryByText("Cycle Time")).toBeNull();
  });

  it("calls onClose on Escape key press", () => {
    const handleClose = vi.fn();
    render(
      <HelpSidebar
        isOpen={true}
        onClose={handleClose}
        activeTermId={null}
      />
    );

    fireEvent.keyDown(window, { key: "Escape" });
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});

