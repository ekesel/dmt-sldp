import { QueryClient } from '@tanstack/react-query';
import api from '@dmt/api';
import { newsfeedKeys } from './query-keys';
import { Post } from '../../../types/newsfeed';

export const getUploadImageMutationOptions = () => ({
    mutationFn: async (file: File) => {
        const formData = new FormData();
        formData.append('file', file);
        const uploadUrl = 'news/upload-image/';
        const response = await api.post<{ image_id: string; file_url: string }>(uploadUrl, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    }
});

export const getCreatePostMutationOptions = (socket: any, user: any, queryClient: QueryClient) => ({
    mutationFn: async ({ title, content, category, imageId }: { title: string, content: string, category: string, imageId?: string }) => {
        if (!user?.is_manager) throw new Error('Only managers can perform this action');
        if (!socket || !socket.isConnected) throw new Error('WebSocket is not connected');

        socket.emit('create_post', {
            title,
            content,
            category,
            author: user.id,
            image_id: imageId || null
        });
        return { title, content, category, imageId };
    },
    onMutate: async (newPost: any) => {
        await queryClient.cancelQueries({ queryKey: newsfeedKeys.posts() });
        const previousPosts = queryClient.getQueryData<Post[]>(newsfeedKeys.posts());

        if (user) {
            const tempPost: Post = {
                post_id: Date.now(),
                title: newPost.title,
                content: newPost.content,
                category: newPost.category,
                author: {
                    id: user.id as number,
                    username: user.username as string,
                    avatar_url: (user as any).avatar_url || null
                },
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                likes: 0,
                comments: 0
            };
            queryClient.setQueryData<Post[]>(newsfeedKeys.posts(), (old) => [tempPost, ...(old || [])]);
        }
        return { previousPosts };
    },
    onError: (err: any, newPost: any, context: any) => {
        if (context?.previousPosts) {
            queryClient.setQueryData(newsfeedKeys.posts(), context.previousPosts);
        }
    }
});

export const getUpdatePostMutationOptions = (socket: any, user: any) => ({
    mutationFn: async ({ id, title, content, category, imageId }: { id: number, title?: string, content?: string, category?: string, imageId?: string | null }) => {
        if (!user?.is_manager) throw new Error('Only managers can perform this action');
        if (!socket || !socket.isConnected) throw new Error('WebSocket is not connected');

        socket.emit('update_post', {
            id,
            ...(title && { title }),
            ...(content && { content }),
            ...(category && { category }),
            ...(imageId !== undefined && { image_id: imageId })
        });
    }
});

export const getDeletePostMutationOptions = (socket: any, user: any) => ({
    mutationFn: async (id: number) => {
        if (!user?.is_manager) throw new Error('Only managers can perform this action');
        if (!socket || !socket.isConnected) throw new Error('WebSocket is not connected');

        socket.emit('delete_post', { id });
    }
});
