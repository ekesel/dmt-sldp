import React, { useState } from 'react';
import { Comment, User } from '@dmt/api';
import { Author } from '../../hooks/useNewsfeedData';
import { formatDistanceToNow } from 'date-fns';
import { Edit2, Trash2, Reply, Check, X, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { cn } from "@/lib/utils";

interface CommentItemProps {
  comment: Comment;
  postAuthor?: User | Author | null;
  depth?: number;
  onUpdate: (id: number, text: string) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
  onReply: (text: string, parentId: number) => Promise<void>;
}

const CommentItem: React.FC<CommentItemProps> = ({ 
  comment, 
  postAuthor,
  depth = 0, 
  onUpdate, 
  onDelete, 
  onReply 
}) => {
  const { user: currentUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(comment.comment_text);
  const [isReplying, setIsReplying] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  
  const commentUserId = typeof comment.user === 'object' ? comment.user.id : comment.user;
  const isCommentOwner = currentUser?.id === commentUserId;
  const isPostAuthor = currentUser && postAuthor && currentUser.id === postAuthor.id;
  const canDelete = isCommentOwner || isPostAuthor;
  const isAuthor = isCommentOwner; // Keep for edit permission check
  
  const handleUpdate = async () => {
    if (editText.trim() === comment.comment_text) {
      setIsEditing(false);
      return;
    }
    await onUpdate(comment.comment_id, editText);
    setIsEditing(false);
  };

  const handleReply = async () => {
    if (!replyText.trim()) return;
    await onReply(replyText, comment.comment_id);
    setReplyText("");
    setIsReplying(false);
  };

  // Determine which user data to show
  let displayUser = {
    username: "Unknown User",
    avatar_url: "https://images.unsplash.com/photo-1531427186611-ecfd6d936c79?ixlib=rb-1.2.1&auto=format&fit=crop&w=80&q=80"
  };

  if (typeof comment.user === 'object' && comment.user.username) {
    displayUser = {
      username: comment.user.username,
      avatar_url: comment.user.avatar_url || displayUser.avatar_url
    };
  } else if (comment.user_name) {
    displayUser = {
      username: comment.user_name,
      avatar_url: comment.user_avatar || displayUser.avatar_url
    };
  } else if (comment.user) {
    displayUser.username = `User #${commentUserId}`;
  }

  // If IDs match with current session or post author, we might have fresher data
  if (currentUser && commentUserId === currentUser.id) {
    displayUser = {
      username: currentUser.username || displayUser.username,
      avatar_url: currentUser.avatar_url || displayUser.avatar_url
    };
  } else if (postAuthor && commentUserId === postAuthor.id) {
    displayUser = {
      username: postAuthor.username || displayUser.username,
      avatar_url: postAuthor.avatar_url || displayUser.avatar_url
    };
  }

  return (
    <div className={cn("flex flex-col gap-2 mt-4", depth > 0 && "ml-4 pl-4 border-l border-border/50")}>
      <div className="flex items-start gap-3">
        <img
          src={displayUser.avatar_url}
          alt={displayUser.username}
          className="w-8 h-8 rounded-full border border-border"
        />
        <div className="flex-1 min-w-0 bg-muted/30 rounded-2xl p-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-bold text-foreground">
              {displayUser.username}
            </span>
            <span className="text-[10px] text-muted-foreground whitespace-nowrap">
              {(() => {
                try {
                  const raw = comment.created_at?.toString().trim();
                  if (!raw) return 'Just now';

                  // Handle timezone mismatch: if no Z/+/GMT, assume UTC
                  const dateStr = (raw.includes('Z') || raw.includes('+') || raw.includes('GMT')) 
                    ? raw 
                    : `${raw.replace(' ', 'T')}Z`;

                  const date = new Date(dateStr);
                  if (date && !isNaN(date.getTime())) {
                    const relative = formatDistanceToNow(date, { addSuffix: true });
                    const absolute = date.toLocaleString([], { 
                      month: 'short', 
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    });
                    return `${absolute} • ${relative}`;
                  }
                  return 'Just now';
                } catch (e) {
                  return 'Just now';
                }
              })()}
            </span>
          </div>

          {isEditing ? (
            <div className="flex flex-col gap-2">
              <textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                className="w-full bg-background border border-border rounded-lg p-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                rows={2}
              />
              <div className="flex items-center gap-2 justify-end">
                <button onClick={() => setIsEditing(false)} className="p-1 hover:bg-muted rounded text-muted-foreground">
                  <X className="w-4 h-4" />
                </button>
                <button onClick={handleUpdate} className="p-1 hover:bg-primary/20 hover:text-primary rounded text-primary">
                  <Check className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-foreground leading-relaxed break-words">
              {comment.comment_text}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4 ml-11 text-xs text-muted-foreground">
        <button 
          onClick={() => setIsReplying(!isReplying)}
          className="hover:underline flex items-center gap-1 transition-colors"
        >
          <Reply className="w-3 h-3" /> Reply
        </button>
        
        {canDelete && (
          <>
            {isAuthor && (
              <button 
                onClick={() => setIsEditing(true)}
                disabled={isDeleting}
                className="hover:text-primary flex items-center gap-1 transition-colors disabled:opacity-50"
              >
                <Edit2 className="w-3 h-3" /> Edit
              </button>
            )}
            <button 
              onClick={async () => {
                if (!comment.comment_id) return;
                if(window.confirm("Are you sure you want to delete this comment?")) {
                  setIsDeleting(true);
                  try {
                    await onDelete(comment.comment_id);
                  } finally {
                    setIsDeleting(false);
                  }
                }
              }}
              disabled={isDeleting}
              className="hover:text-destructive flex items-center gap-1 transition-colors disabled:opacity-50"
            >
              {isDeleting ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Trash2 className="w-3 h-3" />
              )}
              {isDeleting ? "Deleting..." : "Delete"}
            </button>
          </>
        )}
      </div>

      {isReplying && (
        <div className="flex items-center gap-2 ml-11 mt-2">
          <input
            autoFocus
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleReply()}
            placeholder="Write a reply..."
            className="flex-1 bg-muted/50 border-none rounded-full px-4 py-1.5 text-xs focus:ring-1 focus:ring-primary"
          />
          <button 
            disabled={!replyText.trim()}
            onClick={handleReply}
            className="p-2 text-primary hover:bg-primary/10 rounded-full disabled:opacity-50"
          >
            <Check className="w-4 h-4" />
          </button>
          <button 
            onClick={() => setIsReplying(false)}
            className="p-2 text-muted-foreground hover:bg-muted rounded-full"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {comment.replies && comment.replies.length > 0 && (
        <div className="flex flex-col">
          {comment.replies.map((reply, idx) => (
            <CommentItem 
              key={reply.comment_id || `reply-${idx}`} 
              comment={reply} 
              postAuthor={postAuthor}
              depth={depth + 1}
              onUpdate={onUpdate}
              onDelete={onDelete}
              onReply={onReply}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default CommentItem;
