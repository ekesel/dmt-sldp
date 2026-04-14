import { useState, useEffect, useCallback, useRef } from 'react';
import { reactions as reactionsApi, ReactionSummary, ReactionType } from '@dmt/api';
import { toast } from 'react-hot-toast';

/**
 * Hook to manage post reactions with optimistic UI updates and server synchronization.
 * @param postId The ID of the post to manage reactions for.
 */
export function useReactions(postId: number) {
  const [reactions, setReactions] = useState<Record<number, ReactionSummary>>({});
  const [loading, setLoading] = useState(false);
  const pendingFetches = useRef<Set<number>>(new Set());

  const fetchReactions = useCallback(async (id: number, force = false) => {
    if (id > 1e11) return; // Skip optimistic IDs
    if (pendingFetches.current.has(id) && !force) {

      return;
    }


    pendingFetches.current.add(id);
    setLoading(true);

    try {
      const data = await reactionsApi.getSummary(id);



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
          }
        };
      });
    } catch (err) {
      console.error(`[useReactions] Failed to fetch reactions for ID: ${id}`, err);
    } finally {
      pendingFetches.current.delete(id);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Only fetch if not already present in state
    if (!reactions[postId]) {
      fetchReactions(postId);
    } else {

    }
  }, [postId, fetchReactions, reactions[postId]]);

  // Log reactions state after update
  useEffect(() => {
    if (Object.keys(reactions).length > 0) {
      console.debug('[useReactions] Reactions state:', reactions);
    }
  }, [reactions]);

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
    } catch (err) {
      setReactions(previousReactions);
      const errorMessage = err instanceof Error ? err.message : 'Failed to add reaction';
      toast.error(errorMessage);
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
    } catch (err) {
      setReactions(previousReactions);
      const errorMessage = err instanceof Error ? err.message : 'Failed to remove reaction';
      toast.error(errorMessage);
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
