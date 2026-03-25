import React from "react";

import { Post } from "../../hooks/useNewsfeedData";

const StaticPostCard = ({ post }: { post: Post }) => {
  const {
    author,
    created_at,
    content,
    media_file: image,
    likes = 0,
    comments = 0,
  } = post;
  return (
    <div className="bg-card border border-border rounded-xl shadow-lg mb-4 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Post Header */}
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <img
            src={
              author?.avatar_url ||
              "https://images.unsplash.com/photo-1531427186611-ecfd6d936c79?ixlib=rb-1.2.1&auto=format&fit=crop&w=80&q=80"
            }
            alt={author?.username}
            className="w-10 h-10 rounded-full object-cover border border-border cursor-pointer"
          />
          <div className="flex flex-col">
            <span className="text-foreground font-bold text-sm hover:underline cursor-pointer">
              {author?.username || "Unknown"}
            </span>
            <div className="flex items-center gap-1 text-muted-foreground text-xs">
              <span>{new Date(created_at).toLocaleString()}</span>
              <span>•</span>
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM4.332 8.027a6.012 6.012 0 011.912-2.706C6.512 5.73 6.974 6 7.5 6A1.5 1.5 0 019 7.5V8a2 2 0 004 0 2 2 0 012 2v1.5a.5.5 0 00.5.5.5.5 0 00.5-.5V10a5 5 0 00-10 0v.107l-1.668-2.08zM13.828 10.172l-3.656 3.656A2 2 0 0010 16v1a1 1 0 001 1h5.828a2 2 0 001.414-.586l.288-.288A2 2 0 0018 14.718V13a2 2 0 00-2-2h-1a2 2 0 00-1.172.172z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
          </div>
        </div>
        <button className="text-muted-foreground hover:bg-muted p-2 rounded-full transition-colors">
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
        </button>
      </div>

      {/* Post Content */}
      <div className="px-4 pb-3">
        <p className="text-foreground text-[15px] leading-relaxed">{content}</p>
      </div>

      {/* Post Image */}
      {image && (
        <div className="relative group cursor-pointer border-t border-b border-border/50 bg-muted/50">
          <img
            src={image}
            alt="Post media"
            className="w-full max-h-125 object-cover transition-transform duration-700 group-hover:scale-[1.01]"
          />
        </div>
      )}

      {/* Post Footer Stats */}
      <div className="px-4 py-2.5 flex items-center justify-between text-muted-foreground text-sm border-b border-border/50">
        <div className="flex items-center gap-1 group cursor-pointer">
          <div className="flex -space-x-1">
            <div className="bg-primary rounded-full p-1 border-2 border-card z-20 shadow-sm">
              <svg
                className="w-2.5 h-2.5 text-primary-foreground"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" />
              </svg>
            </div>
            <div className="bg-destructive rounded-full p-1 border-2 border-card z-10 shadow-sm">
              <svg
                className="w-2.5 h-2.5 text-destructive-foreground"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
          </div>
          <span className="ml-1 group-hover:underline">{likes}</span>
        </div>
        <div className="flex gap-3">
          <span className="hover:underline cursor-pointer">
            {comments} comments
          </span>
        </div>
      </div>

      {/* Post Actions */}
      <div className="px-1 py-1 flex items-center justify-between">
        {[
          { label: "Like", icon: "M14 9l-3.5 4.5-3-3.5-5.5 8.5h24l-12-16z" },
          {
            label: "Comment",
            icon: "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z",
          },
        ].map((action, idx) => (
          <button
            key={idx}
            className="flex-1 flex items-center justify-center gap-2 py-2 text-muted-foreground font-semibold hover:bg-muted rounded-lg mb-0.5 transition-all active:scale-95"
          >
            {action.label === "Like" ? (
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5"
                />
              </svg>
            ) : (
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
            )}
            <span className="text-sm">{action.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default StaticPostCard;
