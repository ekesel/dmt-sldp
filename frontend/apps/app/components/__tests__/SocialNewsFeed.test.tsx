/**
 * @vitest-environment jsdom
 */
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { SocialNewsFeed } from "../SocialNewsFeed";
import { useNewsfeedQuery } from "../../hooks/useNewsfeedQuery";
import { useReactions } from "../../hooks/useReactions";
import { useComments } from "../../hooks/useComments";
import { useRouter } from "next/navigation";

// Mock next/image
vi.mock("next/image", () => ({
  default: (props: any) => {
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img {...props} />;
  },
}));

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: vi.fn(),
}));

// Mock custom hooks
vi.mock("../../hooks/useNewsfeedQuery", () => ({
  useNewsfeedQuery: vi.fn(),
}));

vi.mock("../../hooks/useReactions", () => ({
  useReactions: vi.fn(),
}));

vi.mock("../../hooks/useComments", () => ({
  useComments: vi.fn(),
}));

// Mock utilities
vi.mock("../../lib/media", () => ({
  getMediaUrl: (url: string) => url,
}));

vi.mock("../../lib/utils", () => ({
  formatTimestamp: (timestamp: string) => "2 hours ago",
}));

describe("SocialNewsFeed Component", () => {
  const mockPush = vi.fn();
  const mockToggleReaction = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useRouter as any).mockReturnValue({ push: mockPush });
    (useNewsfeedQuery as any).mockReturnValue({ posts: [], loading: false });
    (useReactions as any).mockReturnValue({ reactions: {}, toggleReaction: mockToggleReaction });
    (useComments as any).mockReturnValue({ totalComments: 0 });
  });

  afterEach(() => {
    cleanup();
  });

  it("renders loading state when data is being fetched", () => {
    (useNewsfeedQuery as any).mockReturnValue({ posts: [], loading: true });
    
    render(<SocialNewsFeed />);
    
    expect(screen.getByText("Loading feed...")).toBeDefined();
  });

  it("renders 'No posts available' when there are no posts", () => {
    (useNewsfeedQuery as any).mockReturnValue({ posts: [], loading: false });
    
    render(<SocialNewsFeed />);
    
    expect(screen.getByText("No posts available")).toBeDefined();
  });

  it("renders the latest post correctly", () => {
    const mockPost = {
      post_id: 1,
      title: "Test Post Title",
      content: "Test Post Content",
      created_at: "2023-10-01T12:00:00Z",
      likes: 5,
      comments: 2,
      author: {
        id: 101,
        first_name: "John",
        last_name: "Doe",
        username: "johndoe",
        avatar_url: "john.jpg",
      },
    };

    (useNewsfeedQuery as any).mockReturnValue({ posts: [mockPost], loading: false });
    
    render(<SocialNewsFeed />);
    
    expect(screen.getByText("Newsfeed")).toBeDefined();
    expect(screen.getByText("Test Post Title")).toBeDefined();
    expect(screen.getByText("Test Post Content")).toBeDefined();
    expect(screen.getByText("John Doe")).toBeDefined();
    expect(screen.getByText("2 hours ago")).toBeDefined();
  });

  it("handles like button click correctly", () => {
    const mockPost = {
      post_id: 1,
      title: "Test Post Title",
      likes: 5,
    };

    (useNewsfeedQuery as any).mockReturnValue({ posts: [mockPost], loading: false });
    (useReactions as any).mockReturnValue({
      reactions: {
        1: { total_reactions: 5, user_reaction: null }
      },
      toggleReaction: mockToggleReaction
    });

    render(<SocialNewsFeed />);
    
    const likeButton = screen.getByRole("button", { name: /Like/i });
    expect(likeButton).toBeDefined();

    fireEvent.click(likeButton);
    expect(mockToggleReaction).toHaveBeenCalledWith("like");
  });

  it("handles comment button click and routes correctly", () => {
    const mockPost = {
      post_id: 123,
      title: "Test Post Title",
    };

    (useNewsfeedQuery as any).mockReturnValue({ posts: [mockPost], loading: false });

    render(<SocialNewsFeed />);
    
    const commentButton = screen.getByRole("button", { name: /Comments/i });
    expect(commentButton).toBeDefined();

    fireEvent.click(commentButton);
    expect(mockPush).toHaveBeenCalledWith("/newsfeed?openComments=123");
  });

  it("routes to comments section when clicking on the post body", () => {
    const mockPost = {
      post_id: 456,
      title: "Clickable Post Title",
    };

    (useNewsfeedQuery as any).mockReturnValue({ posts: [mockPost], loading: false });

    render(<SocialNewsFeed />);
    
    const postTitle = screen.getByText("Clickable Post Title");
    fireEvent.click(postTitle);

    expect(mockPush).toHaveBeenCalledWith("/newsfeed?openComments=456");
  });
});
