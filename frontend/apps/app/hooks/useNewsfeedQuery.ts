'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { useWebSocket } from './useWebSocket';
import { Post } from '../types/newsfeed';
import { newsfeedKeys } from '../app/(dashboard)/newsfeed/query-keys';
import { getNewsfeedQueryOptions } from '../app/(dashboard)/newsfeed/query-options';

export function useNewsfeedQuery(postId?: number | null) {
    const { client: socket, isConnected } = useWebSocket();
    const queryClient = useQueryClient();
    const queryKey = useMemo(() => [...newsfeedKeys.posts(), { postId }], [postId]);

    const [page, setPage] = useState(1);
    const [hasNextPage, setHasNextPage] = useState(false);

    const query = useQuery<Post[], Error>(
        getNewsfeedQueryOptions(socket, isConnected, { setPage, setHasNextPage }, postId)
    );

    useEffect(() => {
        if (!socket) return;

        const onPosts = (payload: any) => {
            if (payload.error) return;
            const incoming: Post[] = payload.data || [];
            const responsePage = payload.page || 1;

            setPage(responsePage);
            setHasNextPage(!!payload.has_next);

            if (responsePage === 1) {
                queryClient.setQueryData(queryKey, incoming);
            } else {
                queryClient.setQueryData<Post[]>(queryKey, (old) => {
                    const existingIds = new Set((old || []).map(p => p.post_id));
                    const newPosts = incoming.filter((p: Post) => !existingIds.has(p.post_id));
                    return [...(old || []), ...newPosts];
                });
            }
        };

        const onPostCreated = (payload: any) => {
            const newPost = payload.data || payload;
            if (!newPost || !newPost.post_id) return;
            
            queryClient.setQueryData<Post[]>(queryKey, (old) => {
                const filtered = (old || []).filter(p => p.post_id !== newPost.post_id);
                return [newPost, ...filtered];
            });
        };

        const onPostUpdated = (payload: any) => {
            const updated = payload.data || payload;
            queryClient.setQueryData<Post[]>(queryKey, (old) =>
                (old || []).map(p => p.post_id === updated.post_id ? updated : p)
            );
        };

        const onPostDeleted = (payload: any) => {
            const deletedId = payload.data?.id || payload.id;
            queryClient.setQueryData<Post[]>(queryKey, (old) =>
                (old || []).filter(p => p.post_id !== deletedId)
            );
        };

        // Listen for new posts
        socket.on('posts', onPosts);
        socket.on('post_created', onPostCreated);
        socket.on('post_updated', onPostUpdated);
        socket.on('post_deleted', onPostDeleted);

        // Fetch on reconnect or if already connected
        if (isConnected) {
            socket.emit('get_posts', { page: 1, post_id: postId });
        }

        return () => {
            socket.off('posts', onPosts);
            socket.off('post_created', onPostCreated);
            socket.off('post_updated', onPostUpdated);
            socket.off('post_deleted', onPostDeleted);
        };
    }, [socket, queryClient, queryKey, isConnected, postId]);

    const loadMorePosts = useCallback(() => {
        if (socket && hasNextPage) {
            const nextPage = page + 1;
            socket.emit('get_posts', { page: nextPage, post_id: postId });
        }
    }, [page, hasNextPage, socket, postId]);

    return {
        ...query,
        posts: query.data || [],
        loading: query.isLoading || query.isFetching,
        loadMorePosts,
        hasNextPage
    };
}
