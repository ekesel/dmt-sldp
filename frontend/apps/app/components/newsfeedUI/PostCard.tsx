import React, { useState } from "react";
import { Edit3, Trash2, MessageCircle } from "lucide-react";
import { Post } from "../../hooks/useNewsfeedData";
import { useAuth } from "../../context/AuthContext";
import ReactionBar from "./ReactionBar";
import CommentSection from "./CommentSection";
import { cn } from "@/lib/utils";
import { useComments } from "../../hooks/useComments";
import { useReactions } from "../../hooks/useReactions";
import { formatDistanceToNow } from 'date-fns';

const formatTimestamp = (timestamp?: string) => {
  if (!timestamp) return "Recently";
  try {
    const raw = timestamp.toString().trim();
    // If timestamp doesn't have timezone info, assume it is UTC and manually append Z
    const dateStr = (raw.includes('Z') || raw.includes('+') || raw.includes('GMT'))
      ? raw
      : `${raw.replace(' ', 'T')}Z`;

    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return "Recently";

    const relative = formatDistanceToNow(date, { addSuffix: true });
    const absolute = date.toLocaleString([], {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    return `${absolute} • ${relative}`;
  } catch (e) {
    return "Recently";
  }
};

const PostCard = ({
  post,
  onEdit,
  onDelete
}: {
  post: Post;
  onEdit?: (post: Post) => void;
  onDelete?: (id: number) => void;
}) => {
  const { user } = useAuth();
  const [isDeleting, setIsDeleting] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const { reactions, toggleReaction } = useReactions(post.post_id);

  const {
    author,
    title,
    created_at,
    content,
    media_file: image,
    likes = 0,
    comments: initialComments = 0,
  } = post;

  const { totalComments } = useComments(post.post_id, { enabled: showComments });
  const displayCommentCount = totalComments || initialComments;



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
              {author?.username || "Unknown User"}
            </span>
            <div className="flex items-center gap-2 text-muted-foreground text-xs mt-0.5">
              <span>{formatTimestamp(created_at)}</span>
              <span>•</span>
              {post.category && (
                <>
                  <span className={cn(
                    "px-2 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wider",
                    post.category.toLowerCase() === 'tech' && "bg-primary/10 text-primary border border-primary/20",
                    post.category.toLowerCase() === 'news' && "bg-accent/10 text-accent border border-accent/20",
                    post.category.toLowerCase() === 'general' && "bg-secondary text-secondary-foreground border border-border",
                    !['tech', 'news', 'general'].includes(post.category.toLowerCase()) && "bg-muted text-muted-foreground border border-border"
                  )}>
                    {post.category}
                  </span>
                  <span>•</span>
                </>
              )}
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
        <div className="flex items-center gap-1">
          {user?.is_manager && (
            <div className="flex items-center gap-1 mr-1">
              <button
                onClick={() => onEdit?.(post)}
                className="text-muted-foreground hover:bg-primary/10 hover:text-primary p-2 rounded-full transition-all active:scale-90"
                title="Edit Post"
              >
                <Edit3 className="w-4 h-4" />
              </button>
              <button
                onClick={async () => {
                  if (window.confirm("Are you sure you want to delete this post?")) {
                    setIsDeleting(true);
                    try {
                      await onDelete?.(post.post_id);
                    } finally {
                      setIsDeleting(false);
                    }
                  }
                }}
                disabled={isDeleting}
                className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive p-2 rounded-full transition-all active:scale-90 disabled:opacity-50"
                title="Delete Post"
              >
                {isDeleting ? (
                  <div className="w-4 h-4 border-2 border-destructive border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Post Content */}
      <div className="px-4 pb-3 space-y-2">
        <h2 className="text-lg font-bold text-foreground leading-tight">
          {title || "No Title Available"}
        </h2>
        <p className="text-foreground text-[15px] leading-relaxed">{content}</p>
      </div>

      {image && (
        <div className="relative group cursor-pointer border-t border-b border-border/50 bg-muted/50">
          <img
            src={(() => {
              const MEDIA_BASE = (process.env.NEXT_PUBLIC_MEDIA_BASE_URL || "").replace(/\/$/, "");
              const fullUrl = image.startsWith("http") ? image : `${MEDIA_BASE}${image}`;

              return fullUrl;
            })()}
            alt="post media"
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
          <span className="ml-1 group-hover:underline">{reactions[post.post_id]?.total_reactions || 0}</span>
        </div>
        <div className="flex gap-3">
          <span className="hover:underline cursor-pointer">
            {displayCommentCount} comments
          </span>
        </div>
      </div>

      {/* Post Actions & Reactions */}
      <div className="flex flex-col border-t border-border/50">
        <div className="flex items-center px-1 py-1">
          <div className="flex-1">
            <ReactionBar
              postId={post.post_id}
              summary={reactions[post.post_id]}
              toggleReaction={toggleReaction}
            />
          </div>
          <button
            onClick={() => setShowComments(!showComments)}
            className={cn(
              "flex items-center justify-center gap-2 py-3 px-6 text-muted-foreground font-semibold hover:bg-muted rounded-xl transition-all active:scale-95",
              showComments && "text-primary bg-primary/5"
            )}
          >
            <MessageCircle className="w-5 h-5" />
            <span className="text-sm">Comment</span>
          </button>
        </div>

        {/* Comment Section (Collapsible) */}
        {showComments && (
          <CommentSection postId={post.post_id} postAuthor={post.author} />
        )}
      </div>
    </div>
  );
};

export default PostCard;
