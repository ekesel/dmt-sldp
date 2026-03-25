'use client';

import { useState, useEffect, useCallback } from 'react';
import { useWebSocket } from './useWebSocket';

export interface NewsAuthor {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  tenant: string | null;
  is_platform_admin: boolean;
  is_staff: boolean;
  is_superuser: boolean;
  is_manager: boolean;
  is_active: boolean;
  date_joined: string;
  profile_picture: string | null;
  custom_title: string | null;
  competitive_title: string | null;
  competitive_title_reason: string | null;
  avatar_url: string;
}

export interface NewsPost {
  post_id: number;
  title: string;
  content: string;
  category: string;
  media_file: string | null;
  author: NewsAuthor;
  created_at: string;
  updated_at: string;
}

export function useNews() {
  const [posts, setPosts] = useState<NewsPost[]>([]);
  const [status, setStatus] = useState<'connecting' | 'open' | 'closed' | 'error'>('connecting');
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);

  const { client: socket } = useWebSocket();

  const handleMessage = useCallback((message: any) => {
    const { type, data } = message;

    if (message.error) {
      setError(message.error);
      return;
    }

    switch (type) {
      case 'posts':
        setPosts((prev) => (message.page === 1 ? data : [...prev, ...data]));
        setHasNext(message.has_next);
        setPage(message.page);
        break;
      case 'post_created':
        setPosts((prev) => [data, ...prev]);
        break;
      case 'post_updated':
        setPosts((prev) => prev.map((p) => (p.post_id === data.post_id ? data : p)));
        break;
      case 'post_deleted':
        setPosts((prev) => prev.filter((p) => p.post_id !== data.id));
        break;
      default:
        // Ignore unknown messages as they might be for other hooks
        break;
    }
  }, []);

  useEffect(() => {
    if (!socket) return;

    const onOpen = () => {
      setStatus('open');
      setError(null);
      // Automatically fetch initial posts when connection opens
      socket.emit('get_posts', { page: 1 });
    };

    const onClose = () => setStatus('closed');
    const onError = () => setStatus('error');

    // Listen for events
    socket.on('open', onOpen);
    socket.on('close', onClose);
    socket.on('error', onError);
    socket.on('posts', handleMessage);
    socket.on('post_created', handleMessage);
    socket.on('post_updated', handleMessage);
    socket.on('post_deleted', handleMessage);

    // Initial status check
    // Since the socket might already be open, we trigger the fetching manually if it's open

    return () => {
      socket.off('open', onOpen);
      socket.off('close', onClose);
      socket.off('error', onError);
      socket.off('posts', handleMessage);
      socket.off('post_created', handleMessage);
      socket.off('post_updated', handleMessage);
      socket.off('post_deleted', handleMessage);
    };
  }, [socket, handleMessage]);

  const fetchNextPage = () => {
    socket?.emit('get_posts', { page: page + 1 });
  };

  const createPost = (post: { title: string; content: string; category: string; author: number; media_file?: string | null }) => {
    socket?.emit('create_post', post);
  };

  const updatePost = (id: number, updates: Partial<{ title: string; content: string; category: string; media_file: string | null }>) => {
    socket?.emit('update_post', { id, ...updates });
  };

  const deletePost = (id: number) => {
    socket?.emit('delete_post', { id });
  };

  return {
    posts,
    status,
    error,
    hasNext,
    page,
    fetchNextPage,
    createPost,
    updatePost,
    deletePost
  };
}
