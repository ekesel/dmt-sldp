import React, { useState, useEffect } from 'react';
import { useComments } from '../../hooks/useComments';
import { useAuth } from '../../context/AuthContext';
import CommentItem from './CommentItem';
import { Send, Loader2 } from 'lucide-react';
import { cn } from "@/lib/utils";
import { Comment, User } from '@dmt/api';
import { Author } from '../../hooks/useNewsfeedData';

interface CommentSectionProps {
  postId: number;
  postAuthor?: User | Author | null;
}

const CommentSection: React.FC<CommentSectionProps> = ({ postId, postAuthor }) => {
  const { user } = useAuth();
  const {
    comments,
    loading,
    error,
    fetchComments,
    addComment,
    updateComment,
    deleteComment
  } = useComments(postId);

  const [newCommentText, setNewCommentText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await addComment(newCommentText);
      setNewCommentText("");
    } catch (error) {
      console.error('Failed to post comment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (error) {
    return (
      <div className="p-4 text-center text-sm text-destructive bg-destructive/10 rounded-lg mx-4 my-2">
        {error}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4 border-t border-border/50 animate-in slide-in-from-top-1 px-4 pb-6 bg-muted/20">
      {/* Input box */}
      <div className="flex items-center gap-3">
        <img
          src={user?.avatar_url || "https://images.unsplash.com/photo-1531427186611-ecfd6d936c79?ixlib=rb-1.2.1&auto=format&fit=crop&w=80&q=80"}
          alt="currentUser"
          className="w-8 h-8 rounded-full border border-border"
        />
        <form onSubmit={handleSubmit} className="flex-1 flex items-center bg-background border border-border rounded-full px-4 py-2 hover:border-primary/50 transition-all focus-within:border-primary focus-within:ring-1 focus-within:ring-primary shadow-sm">
          <input
            value={newCommentText}
            onChange={(e) => setNewCommentText(e.target.value)}
            placeholder="Write a comment..."
            className="flex-1 bg-transparent border-none text-sm focus:outline-none placeholder:text-muted-foreground mr-2"
          />
          <button
            type="submit"
            disabled={!newCommentText.trim() || isSubmitting}
            className="text-primary hover:bg-primary/10 p-1.5 rounded-full transition-all disabled:opacity-50 disabled:grayscale"
          >
            {isSubmitting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </form>
      </div>

      {loading && comments.length === 0 ? (
        <div className="flex flex-col gap-4 py-4">
          {[1, 2].map(i => (
            <div key={i} className="flex gap-3 animate-pulse">
              <div className="w-8 h-8 rounded-full bg-muted" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-muted rounded w-1/4" />
                <div className="h-4 bg-muted rounded w-3/4" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col divide-y divide-border/20">
          {(() => {

            if (!Array.isArray(comments) || comments.length === 0) {
              return (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  No comments yet. Be the first to share your thoughts!
                </div>
              );
            }
            return comments.map((comment, index) => (
              <CommentItem
                key={comment.comment_id || `comment-${index}`}
                comment={comment}
                postAuthor={postAuthor}
                onUpdate={updateComment}
                onDelete={deleteComment}
                onReply={addComment}
              />
            ));
          })()}
        </div>
      )}
    </div>
  );
};

export default CommentSection;
