/**
 * @vitest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import PostCard from "../PostCard";
import { useAuth } from "../../../context/AuthContext";
import { usePermissions } from "../../../hooks/usePermissions";
import { useReactions } from "../../../hooks/useReactions";
import { useComments } from "../../../hooks/useComments";

vi.mock("../../../context/AuthContext", () => ({
  useAuth: vi.fn(),
}));

vi.mock("../../../hooks/usePermissions", () => ({
  usePermissions: vi.fn(),
}));

vi.mock("../../../hooks/useReactions", () => ({
  useReactions: vi.fn(),
}));

vi.mock("../../../hooks/useComments", () => ({
  useComments: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@dmt/api", () => ({
  getFileUrl: (url: string) => url,
}));

describe("PostCard Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useAuth as any).mockReturnValue({ user: { id: 1 } });
    (usePermissions as any).mockReturnValue({ isManager: false });
    (useReactions as any).mockReturnValue({ reactions: {}, toggleReaction: vi.fn() });
    (useComments as any).mockReturnValue({ totalComments: 0 });
  });

  const basePost = {
    post_id: 1,
    title: "Test Post Title",
    content: "Test post body content",
    category: "Tech",
    created_at: "2023-10-01T12:00:00Z",
    updated_at: "2023-10-01T12:00:00Z",
  };

  it("renders author first and last name when available instead of email", () => {
    const post = {
      ...basePost,
      author: {
        id: 1,
        username: "john.doe@example.com",
        email: "john.doe@example.com",
        first_name: "John",
        last_name: "Doe",
      },
    };

    render(<PostCard post={post} />);

    expect(screen.getByText("John Doe")).toBeDefined();
    expect(screen.queryByText("john.doe@example.com")).toBeNull();
  });

  it("renders username without email domain if first and last name are not present", () => {
    const post = {
      ...basePost,
      author: {
        id: 2,
        username: "alex.smith@company.com",
        email: "alex.smith@company.com",
      },
    };

    render(<PostCard post={post} />);

    expect(screen.getByText("alex.smith")).toBeDefined();
    expect(screen.queryByText("alex.smith@company.com")).toBeNull();
  });
});
