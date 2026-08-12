/**
 * @vitest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import CommentItem from "../CommentItem";
import { useAuth } from "../../../context/AuthContext";

// Mock AuthContext
vi.mock("../../../context/AuthContext", () => ({
  useAuth: vi.fn(),
}));

// Mock API utilities
vi.mock("@dmt/api", () => ({
  getFileUrl: (url: string) => url,
  users: {
    list: vi.fn().mockResolvedValue([]),
  },
}));

// Mock utils
vi.mock("@/lib/utils", () => ({
  cn: (...inputs: any[]) => inputs.filter(Boolean).join(" "),
  formatTimestamp: (timestamp: string) => `formatted-${timestamp}`,
}));

describe("CommentItem Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useAuth as any).mockReturnValue({ user: null });
  });

  const mockComment = {
    comment_id: 1,
    post: 10,
    user: 101,
    comment_text: "This is a comment",
    created_at: "2023-10-01T12:00:00Z",
    updated_at: "2023-10-01T13:00:00Z",
  };

  it("renders comment text and uses created_at when not edited", () => {
    render(
      <CommentItem
        comment={{ ...mockComment, is_updated: false }}
        onUpdate={async () => {}}
        onDelete={async () => {}}
        onReply={async () => {}}
      />
    );

    expect(screen.getByText("This is a comment")).toBeDefined();
    expect(screen.getByText("formatted-2023-10-01T12:00:00Z")).toBeDefined();
  });

  it("renders 'Edited' text and uses updated_at when edited", () => {
    render(
      <CommentItem
        comment={{ ...mockComment, is_updated: true }}
        onUpdate={async () => {}}
        onDelete={async () => {}}
        onReply={async () => {}}
      />
    );

    expect(screen.getByText("This is a comment")).toBeDefined();
    expect(screen.getByText("Edited • formatted-2023-10-01T13:00:00Z")).toBeDefined();
  });
});
