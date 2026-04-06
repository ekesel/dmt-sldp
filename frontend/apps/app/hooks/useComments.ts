import { useState, useCallback, useEffect } from 'react';
import { comments as commentsApi, Comment } from '@dmt/api';
import { toast } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

// Shared state for all instances of useComments
interface PostCommentsState {
  list: Comment[];
  total: number;
}

const commentsCache: Record<number, PostCommentsState> = {};
const listeners: Record<number, Set<(state: PostCommentsState) => void>> = {};

const buildCommentTree = (flatComments: Comment[]): Comment[] => {
  const commentMap: Record<number, Comment & { replies: Comment[] }> = {};
  const tree: Comment[] = [];

  // Initialize map and deep copy comments
  flatComments.forEach(comment => {
    commentMap[comment.comment_id] = { ...comment, replies: [] };
  });

  // Build tree
  flatComments.forEach(comment => {
    const node = commentMap[comment.comment_id];
    if (comment.parent_comment && commentMap[comment.parent_comment]) {
      commentMap[comment.parent_comment].replies.push(node);
    } else {
      tree.push(node);
    }
  });

  return tree;
};

const updateCache = (postId: number, newState: PostCommentsState) => {
  commentsCache[postId] = newState;
  if (listeners[postId]) {
    listeners[postId].forEach(listener => listener(newState));
  }
};

export function useComments(postId: number, options: { enabled?: boolean } = { enabled: true }) {
  const { user: currentUser } = useAuth();
  const [localState, setLocalState] = useState<PostCommentsState>(
    commentsCache[postId] || { list: [], total: 0 }
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);


  const fetchComments = useCallback(async () => {
    if (postId > 1e11) return; // Skip optimistic IDs
    setLoading(true);
    try {
      const data = await commentsApi.list(postId);


      const commentsArray = Array.isArray(data?.comments) ? data.comments : [];


      const newState = {
        list: buildCommentTree(commentsArray),
        total: data?.total_comments || 0
      };

      updateCache(postId, newState);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch comments');
    } finally {
      setLoading(false);
    }
  }, [postId]);

  const addComment = async (text: string, parentCommentId?: number | null) => {
    try {
      const response = await commentsApi.create({
        post: postId,
        comment_text: text,
        parent_comment: parentCommentId || null
      });

      // Handle potential nesting in response (e.g., { data: comment } or { comment: comment })
      const newCommentRaw: any = (response as any).data || (response as any).comment || response;

      // Ensure the comment has the text and user info for immediate display
      const newComment: Comment = {
        ...newCommentRaw,
        comment_text: newCommentRaw.comment_text || newCommentRaw.text || text,
        user: newCommentRaw.user || (currentUser ? {
          id: currentUser.id,
          username: currentUser.username,
          avatar_url: currentUser.avatar_url
        } : 0),
        replies: []
      };

      const current = commentsCache[postId] || { list: [], total: 0 };
      let newList: Comment[];

      if (parentCommentId) {
        const updateReplies = (list: Comment[]): Comment[] => {
          return list.map(c => {
            if (c.comment_id === parentCommentId) {
              return {
                ...c,
                replies: [...(Array.isArray(c.replies) ? c.replies : []), newComment]
              };
            }
            if (c.replies && c.replies.length > 0) {
              return { ...c, replies: updateReplies(c.replies) };
            }
            return c;
          });
        };
        newList = updateReplies(current.list);
      } else {
        newList = [newComment, ...current.list];
      }

      updateCache(postId, {
        list: newList,
        total: current.total + 1
      });

      toast.success('Comment added!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to add comment');
    }
  };

  const updateComment = async (commentId: number, text: string) => {
    try {
      const updated = await commentsApi.update(commentId, { comment_text: text });
      const current = commentsCache[postId] || { list: [], total: 0 };

      const updateList = (list: Comment[]): Comment[] => {
        if (!Array.isArray(list)) return [];
        return list.map(c => {
          if (c.comment_id === commentId) {
            return { ...c, comment_text: updated.comment_text, updated_at: updated.updated_at };
          }
          if (c.replies && c.replies.length > 0) {
            return { ...c, replies: updateList(c.replies) };
          }
          return c;
        });
      };

      updateCache(postId, {
        ...current,
        list: updateList(current.list)
      });

      toast.success('Comment updated!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update comment');
    }
  };

  const deleteComment = async (commentId: number) => {
    try {
      await commentsApi.delete(commentId);
      const current = commentsCache[postId] || { list: [], total: 0 };

      const removeFromList = (list: Comment[]): Comment[] => {
        if (!Array.isArray(list)) return [];
        return list
          .filter(c => c.comment_id !== commentId)
          .map(c => ({
            ...c,
            replies: c.replies ? removeFromList(Array.isArray(c.replies) ? c.replies : []) : []
          }));
      };

      updateCache(postId, {
        list: removeFromList(current.list),
        total: Math.max(0, current.total - 1)
      });

      toast.success('Comment deleted!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete comment');
    }
  };

  // Register listener for shared state updates
  useEffect(() => {
    if (!listeners[postId]) listeners[postId] = new Set();
    const listener = (state: PostCommentsState) => setLocalState(state);
    listeners[postId].add(listener);
    return () => {
      listeners[postId].delete(listener);
    };
  }, [postId]);

  // Auto-fetch comments on initial mount if not in cache and enabled
  useEffect(() => {
    if (options.enabled && !commentsCache[postId] && postId < 1e11) {
      fetchComments();
    }
  }, [postId, fetchComments, options.enabled]);

  return {
    comments: localState.list,
    totalComments: localState.total,
    loading,
    error,
    fetchComments,
    addComment,
    updateComment,
    deleteComment
  };
}
