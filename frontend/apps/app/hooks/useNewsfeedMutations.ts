'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useWebSocket } from './useWebSocket';
import { useAuth } from '../context/AuthContext';
import { 
    getUploadImageMutationOptions, 
    getCreatePostMutationOptions, 
    getUpdatePostMutationOptions, 
    getDeletePostMutationOptions 
} from '../app/(dashboard)/newsfeed/mutation-options';

export function useUploadImageMutation() {
    return useMutation(getUploadImageMutationOptions());
}

export function useCreatePostMutation() {
    const { client: socket } = useWebSocket();
    const { user } = useAuth();
    const queryClient = useQueryClient();

    return useMutation(getCreatePostMutationOptions(socket, user, queryClient));
}

export function useUpdatePostMutation() {
    const { client: socket } = useWebSocket();
    const { user } = useAuth();

    return useMutation(getUpdatePostMutationOptions(socket, user));
}

export function useDeletePostMutation() {
    const { client: socket } = useWebSocket();
    const { user } = useAuth();

    return useMutation(getDeletePostMutationOptions(socket, user));
}
