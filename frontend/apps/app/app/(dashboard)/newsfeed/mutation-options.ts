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

        return new Promise((resolve, reject) => {
            const handleSuccess = (payload: any) => {
                socket.off('post_created', handleSuccess);
                socket.off('error', handleError);
                socket.off('message', handleMessage);
                resolve({ title, content, category, imageId });
            };

            const handleError = (err: any) => {
                socket.off('post_created', handleSuccess);
                socket.off('error', handleError);
                socket.off('message', handleMessage);
                reject(err.error ? new Error(err.error) : err);
            };

            const handleMessage = (payload: any) => {
                if (payload && payload.error) {
                    handleError(payload);
                }
            };

            socket.on('post_created', handleSuccess);
            socket.on('error', handleError);
            socket.on('message', handleMessage);

            socket.emit('create_post', {
                title,
                content,
                category,
                author: user.id,
                image_id: imageId || null
            });
        });
    }
});

export const getUpdatePostMutationOptions = (socket: any, user: any) => ({
    mutationFn: async ({ id, title, content, category, imageId }: { id: number, title?: string, content?: string, category?: string, imageId?: string | null }) => {
        if (!user?.is_manager) throw new Error('Only managers can perform this action');
        if (!socket || !socket.isConnected) throw new Error('WebSocket is not connected');

        return new Promise<void>((resolve, reject) => {
            const handleSuccess = (payload: any) => {
                if (!payload || !payload.post_id || payload.post_id === id) {
                    socket.off('post_updated', handleSuccess);
                    socket.off('error', handleError);
                    socket.off('message', handleMessage);
                    resolve();
                }
            };
            const handleError = (err: any) => {
                socket.off('post_updated', handleSuccess);
                socket.off('error', handleError);
                socket.off('message', handleMessage);
                reject(err.error ? new Error(err.error) : err);
            };
            const handleMessage = (payload: any) => {
                if (payload && payload.error) {
                    handleError(payload);
                }
            };

            socket.on('post_updated', handleSuccess);
            socket.on('error', handleError);
            socket.on('message', handleMessage);

            socket.emit('update_post', {
                id,
                ...(title && { title }),
                ...(content && { content }),
                ...(category && { category }),
                ...(imageId !== undefined && { image_id: imageId })
            });
        });
    }
});

export const getDeletePostMutationOptions = (socket: any, user: any) => ({
    mutationFn: async (id: number) => {
        if (!user?.is_manager) throw new Error('Only managers can perform this action');
        if (!socket || !socket.isConnected) throw new Error('WebSocket is not connected');

        return new Promise<void>((resolve, reject) => {
            const handleSuccess = (payload: any) => {
                if (!payload || !payload.id || payload.id === id) {
                    socket.off('post_deleted', handleSuccess);
                    socket.off('error', handleError);
                    socket.off('message', handleMessage);
                    resolve();
                }
            };
            const handleError = (err: any) => {
                socket.off('post_deleted', handleSuccess);
                socket.off('error', handleError);
                socket.off('message', handleMessage);
                reject(err.error ? new Error(err.error) : err);
            };
            const handleMessage = (payload: any) => {
                if (payload && payload.error) {
                    handleError(payload);
                }
            };

            socket.on('post_deleted', handleSuccess);
            socket.on('error', handleError);
            socket.on('message', handleMessage);

            socket.emit('delete_post', { id });
        });
    }
});
