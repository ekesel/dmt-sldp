'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import api from '@dmt/api';
import { useAuth } from '../context/AuthContext';
import { useWebSocket } from './useWebSocket';

export interface Author {
    id: number;
    username: string;
    email?: string;
    first_name?: string;
    last_name?: string;
    avatar_url?: string | null;
}

export interface Post {
    post_id: number;
    title: string;
    content: string;
    category?: string;
    media_file?: string | null;
    author: Author;
    created_at: string;
    updated_at: string;
    likes?: number; // UI placeholder
    comments?: number; // UI placeholder
    shares?: number; // UI placeholder
}


export function useNewsfeedData() {
    const { token, user } = useAuth();
    const [posts, setPosts] = useState<Post[]>([]);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [hasNextPage, setHasNextPage] = useState(false);

    const { client: socket } = useWebSocket();



    useEffect(() => {
        if (!socket) return;

        const onOpen = () => {
            console.log('[Newsfeed] WebSocket connected successfully.');
            setError(null);
            socket.emit('get_posts', { page: 1 });
            // Loading will be set to false when posts arrive
        };

        const onError = (err: any) => {
            // Determine if we should be noisy based on environment
            const isLocal = typeof window !== 'undefined' && window.location.hostname === 'localhost';
            if (!isLocal) {
                console.error('[Newsfeed] WebSocket Error:', err);
            } else {
                console.warn('[Newsfeed] WebSocket connection failed (expected in local dev if backend is missing)');
            }
            setLoading(false);
        };

        const onClose = () => {
            console.log('[Newsfeed] WebSocket disconnected');
        };

        const onPosts = (payload: any) => {
            console.log("WS: posts received", payload);

            if (payload.error) {
                console.error('[Newsfeed WS Error]:', payload.error);
                setError(payload.error);
                return;
            }

            const incoming = payload.data || [];

            setPosts(prev => {
                const existingIds = new Set(prev.map(p => p.post_id));
                const newPosts = incoming.filter((p: Post) => !existingIds.has(p.post_id));

                return [...newPosts, ...prev];
            });

            if (payload.page) setPage(payload.page);
            setHasNextPage(!!payload.has_next);
            setLoading(false);
        };

        const onPostCreated = (payload: any) => {
            console.log("WS: post_created received", payload);

            const newPost = payload.data || payload;

            if (!newPost || !newPost.post_id) {
                console.error("Invalid post data:", payload);
                return;
            }

            setPosts(prev => {
                // Remove matching optimistic post (same content + author)
                const filtered = prev.filter(p =>
                    !(p.title === newPost.title &&
                      p.content === newPost.content &&
                      p.author?.id === newPost.author?.id)
                );

                return [newPost, ...filtered];
            });
        };

        const onPostUpdated = (payload: any) => {
            const updated = payload.data || payload;

            setPosts(prev =>
                prev.map(p => p.post_id === updated.post_id ? updated : p)
            );
        };

        const onPostDeleted = (payload: any) => {
            console.log("WS: post_deleted received", payload);
            const deletedId = payload.data?.id || payload.id;

            if (deletedId) {
                setPosts(prev =>
                    prev.filter(p => p.post_id !== deletedId)
                );
            }
        };

        const onActionError = (payload: any) => {
            const msg = payload.message || payload.error || 'Action failed';
            import('react-hot-toast').then(({ toast }) => toast.error(msg));
        };

        // Register listeners
        socket.on('open', onOpen);
        socket.on('error', onError);
        socket.on('close', onClose);
        socket.on('posts', onPosts);
        socket.on('post_created', onPostCreated);
        socket.on('post_updated', onPostUpdated);
        socket.on('post_deleted', onPostDeleted);
        socket.on('action_error', onActionError);

        // If socket is already open, trigger initial fetch
        if (socket.isConnected?.()) {
            onOpen();
        }

        return () => {
            socket.off('open', onOpen);
            socket.off('error', onError);
            socket.off('close', onClose);
            socket.off('posts', onPosts);
            socket.off('post_created', onPostCreated);
            socket.off('post_updated', onPostUpdated);
            socket.off('post_deleted', onPostDeleted);
            socket.off('action_error', onActionError);
        };
    }, [socket]);

    const uploadImage = async (file: File): Promise<{ image_id: string; file_url: string }> => {
        const formData = new FormData();
        formData.append('file', file); // Contract says "file": binary_img

        try {
            const uploadUrl = process.env.NEXT_PUBLIC_NEWS_IMAGE_UPLOAD_URL || 'news/upload-image/';
            const response = await api.post<{ image_id: string; file_url: string }>(uploadUrl, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            return response.data;
        } catch (error) {
            console.error('Failed to upload image:', error);
            throw error;
        }
    };

    const createPost = async (title: string, content: string, category: string, imageId?: string) => {
        if (!user) return;
        
        if (!user.is_manager) {
            import('react-hot-toast').then(({ toast }) => toast.error('Only managers can perform this action'));
            return;
        }

        if (!socket || !socket.isConnected?.()) {
            console.error("Socket not connected");
            return;
        }

        // Optimistic UI update
        const tempPost: Post = {
            post_id: Date.now(),
            title,
            content,
            category,
            author: {
                id: user.id,
                username: user.username,
                avatar_url: (user as any).avatar_url || null
            },
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            likes: 0,
            comments: 0
        };

        setPosts(prev => [tempPost, ...prev]);

        // Reverting to WebSocket emit as per the contract to ensure it shows up in the WebSocket tab
        socket.emit('create_post', {
            title,
            content,
            category,
            author: user.id,
            image_id: imageId || null
        });
    };

    const updatePost = useCallback(async (id: number, title?: string, content?: string, category?: string, imageId?: string | null) => {
        if (!user?.is_manager) {
            import('react-hot-toast').then(({ toast }) => toast.error('Only managers can perform this action'));
            return;
        }

        if (!socket) throw new Error('WebSocket is not connected');
        socket.emit('update_post', {
            id,
            ...(title && { title }),
            ...(content && { content }),
            ...(category && { category }),
            ...(imageId !== undefined && { image_id: imageId })
        });
    }, [socket, user]);

    const deletePost = useCallback(async (id: number) => {
        if (!user?.is_manager) {
            import('react-hot-toast').then(({ toast }) => toast.error('Only managers can perform this action'));
            return;
        }

        if (!socket) throw new Error('WebSocket is not connected');
        socket.emit('delete_post', { id });
    }, [socket, user]);

    const loadMorePosts = useCallback(() => {
        if (socket && hasNextPage) {
            const nextPage = page + 1;
            socket.emit('get_posts', { page: nextPage });
            setPage(nextPage);
        }
    }, [page, hasNextPage, socket]);

    return {
        posts,
        currentUser: user, // from useAuth
        loading,
        error,
        uploadImage,
        createPost,
        updatePost,
        deletePost,
        loadMorePosts,
        hasNextPage
    };
}
