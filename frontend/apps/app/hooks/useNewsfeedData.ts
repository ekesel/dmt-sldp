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

    const handleMessage = useCallback((payload: any) => {
        if (payload.error) {
            console.error('[Newsfeed WS Error]:', payload.error);
            setError(payload.error);
            return;
        }

        const type = payload.type;
        switch (type) {
            case 'posts':
                if (payload.page === 1 || !payload.page) {
                    setPosts(payload.data || []);
                } else {
                    setPosts(prev => {
                        // Deduplicate newly arriving posts
                        const existingIds = new Set(prev.map(p => p.post_id));
                        const newPosts = payload.data.filter((p: Post) => !existingIds.has(p.post_id));
                        return [...prev, ...newPosts];
                    });
                }
                if (payload.page) setPage(payload.page);
                setHasNextPage(!!payload.has_next);
                setLoading(false);
                break;
            case 'post_created':
                setPosts(prev => [payload.data, ...prev]);
                break;
            case 'post_updated':
                setPosts(prev => prev.map(p => p.post_id === payload.data.post_id ? payload.data : p));
                break;
            case 'post_deleted':
                setPosts(prev => prev.filter(p => p.post_id !== payload.data.post_id));
                break;
        }
    }, []);

    useEffect(() => {
        if (!socket) return;

        const onOpen = () => {
            console.log('[Newsfeed] WebSocket connected successfully.');
            setError(null);
            socket.emit('get_posts', { page: 1 });
            setLoading(false);
        };

        const onError = (err: any) => {
            console.error('[Newsfeed] WebSocket Error:', err);
            setError('WebSocket Connection Error');
            setLoading(false);
        };

        const onClose = () => {
            console.log('[Newsfeed] WebSocket disconnected');
        };

        // Register listeners
        socket.on('open', onOpen);
        socket.on('error', onError);
        socket.on('close', onClose);
        socket.on('posts', handleMessage);
        socket.on('post_created', handleMessage);
        socket.on('post_updated', handleMessage);
        socket.on('post_deleted', handleMessage);

        // If socket is already open, trigger initial fetch
        if (socket.isConnected?.()) {
            onOpen();
        }

        return () => {
            socket.off('open', onOpen);
            socket.off('error', onError);
            socket.off('close', onClose);
            socket.off('posts', handleMessage);
            socket.off('post_created', handleMessage);
            socket.off('post_updated', handleMessage);
            socket.off('post_deleted', handleMessage);
        };
    }, [socket, handleMessage]);

    const uploadImage = async (file: File): Promise<{ image_id: string; file_url: string }> => {
        const formData = new FormData();
        formData.append('file', file); // Contract says "file": binary_img

        try {
            // Using /api/news/ as it's a more standard pattern than the failing /api/news/upload-image/
            const response = await api.post<{ image_id: string; file_url: string }>('news/', formData, {
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
        if (!socket) throw new Error('WebSocket is not connected');
        socket.emit('update_post', {
            id,
            ...(title && { title }),
            ...(content && { content }),
            ...(category && { category }),
            ...(imageId !== undefined && { image_id: imageId })
        });
    }, [socket]);

    const deletePost = useCallback(async (id: number) => {
        if (!socket) throw new Error('WebSocket is not connected');
        socket.emit('delete_post', { id });
    }, [socket]);

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
