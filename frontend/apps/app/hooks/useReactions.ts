import { useState, useEffect, useCallback, useRef } from 'react';
import { reactions as reactionsApi, ReactionSummary, ReactionType } from '@dmt/api';
import { toast } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

type ReactionUserRef = number | string | { id: number | string };

interface ReactionItem {
  user: ReactionUserRef;
  reaction_type: ReactionType;
}

type ReactionSummaryApiResponse =
  Omit<ReactionSummary, 'reactions'> & {
    reactions?: ReactionItem[];
  };

export function useReactions(postId: number) {
  const [reactions, setReactions] = useState<Record<number, ReactionSummary>>({});
  const [loading, setLoading] = useState(false);
  const pendingFetches = useRef<Set<number>>(new Set());
  // Tracks postIds that have already been fetched for the current user session.
  // Using a ref avoids putting `reactions` in the effect dep array, which would
  // cause a re-fetch loop on every setReactions() call.
  const fetchedIds = useRef<Set<number>>(new Set());
  
  const { user } = useAuth();
  const userId = user?.id;
  const prevUserIdRef = useRef<number | string | undefined>(userId);

  const fetchReactions = useCallback(async (id: number, force = false) => {
    if (id > 1e11) return; // Skip optimistic IDs
    if (pendingFetches.current.has(id) && !force) {

      return;
    }


    pendingFetches.current.add(id);
    setLoading(true);

    try {
      const data = (await reactionsApi.getSummary(id)) as ReactionSummaryApiResponse;

      const loggedInUserReaction = data.reactions?.find(
        (r) => {
          const rUserId = typeof r.user === 'object' && r.user !== null ? r.user.id : r.user;
          return Number(rUserId) === Number(userId);
        }
      );
      const userReaction = loggedInUserReaction?.reaction_type;

      setReactions(prev => {
        const current = prev[id];

        // ANTI-RESET LOGIC: 
        if (data.total_reactions === 0 && current && current.total_reactions > 0) {
          console.warn(`[useReactions] Ignoring suspected outdated response (0) for ID: ${id} when current is ${current.total_reactions}`);
          return prev;
        }


        return {
          ...prev,
          [id]: {
            ...current, // Keep previous state if any
            types: { like: 0, love: 0, haha: 0, sad: 0 }, // fallback defaults
            reactions: [], // fallback defaults
            ...data, // overwrite with actual API data
            user_reaction: userReaction
          }
        };
      });
    } catch (err: unknown) {
      console.error(`[useReactions] Failed to fetch reactions for ID: ${id}`, err);
    } finally {
      pendingFetches.current.delete(id);
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (postId === 0) return;

    const userSwitched = prevUserIdRef.current !== userId;
    prevUserIdRef.current = userId;

    if (userSwitched) {
      // User changed — clear cached state and the fetch-tracking ref so the
      // new user gets a fresh load, then force-fetch for this postId.
      setReactions({});
      fetchedIds.current.clear();
      fetchedIds.current.add(postId);
      fetchReactions(postId, true);
    } else if (!fetchedIds.current.has(postId)) {
      // First time seeing this postId in the current user session — fetch once.
      fetchedIds.current.add(postId);
      fetchReactions(postId);
    }
    // `reactions` is intentionally NOT listed as a dependency here.
    // It was previously used as a guard (`!reactions[postId]`) but that caused
    // a re-run loop: setReactions() → new object reference → effect fires again.
    // The fetchedIds ref provides the same "fetch once" guarantee without
    // triggering extra renders.
  }, [postId, fetchReactions, userId]);

  const addReaction = async (type: ReactionType) => {
    const currentPostReactions = reactions[postId];
    const isSame = currentPostReactions?.user_reaction === type;

    if (isSame) return;

    const previousReactions = { ...reactions };

    // Optimistic UI update

    setReactions(prev => {
      const current = prev[postId] || {
        total_reactions: 0,
        types: { like: 0, love: 0, haha: 0, sad: 0 },
        reactions: []
      };
      const newTypes = { ...current.types };
      if (current.user_reaction) {
        newTypes[current.user_reaction] = Math.max(0, (newTypes[current.user_reaction] || 0) - 1);
      }
      newTypes[type] = (newTypes[type] || 0) + 1;

      return {
        ...prev,
        [postId]: {
          ...current,
          total_reactions: current.user_reaction ? current.total_reactions : current.total_reactions + 1,
          types: newTypes,
          user_reaction: type
        }
      };
    });

    try {
      await reactionsApi.create({ post: postId, reaction_type: type });
      // Call fetchReactions(post_id) after mutation
      await fetchReactions(postId, true); // Force fetch after mutation
    } catch (err: unknown) {
      setReactions(previousReactions);
      toast.error(err instanceof Error ? err.message : 'Failed to add reaction');
    }
  };

  const removeReaction = async () => {
    if (!reactions[postId]?.user_reaction) return;

    const previousReactions = { ...reactions };
    const currentType = reactions[postId].user_reaction!;


    setReactions(prev => {
      const current = prev[postId];
      if (!current) return prev;
      const newTypes = { ...current.types };
      newTypes[currentType] = Math.max(0, (newTypes[currentType] || 0) - 1);

      return {
        ...prev,
        [postId]: {
          ...current,
          total_reactions: Math.max(0, current.total_reactions - 1),
          types: newTypes,
          user_reaction: undefined
        }
      };
    });

    try {
      await reactionsApi.delete(postId);
      // Call fetchReactions(post_id) after mutation
      await fetchReactions(postId, true);
    } catch (err: unknown) {
      setReactions(previousReactions);
      toast.error(err instanceof Error ? err.message : 'Failed to remove reaction');
    }
  };

  const toggleReaction = (type: ReactionType) => {
    if (reactions[postId]?.user_reaction === type) {
      removeReaction();
    } else {
      addReaction(type);
    }
  };

  return {
    reactions,
    summary: reactions[postId] || null, // Export summary for backward compatibility or easier use
    loading,
    addReaction,
    removeReaction,
    toggleReaction,
    fetchReactions
  };
}
