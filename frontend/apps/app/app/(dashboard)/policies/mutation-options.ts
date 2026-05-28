import { QueryClient } from '@tanstack/react-query';
import { dashboard } from '@dmt/api';
import { policiesKeys } from './query-keys';

export const getUploadMutationOptions = (queryClient: QueryClient) => ({
    mutationFn: (formData: FormData) => dashboard.uploadPolicy(formData),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: policiesKeys.all })
});

export const getUpdateMutationOptions = (queryClient: QueryClient) => ({
    mutationFn: ({ id, formData }: { id: number; formData: FormData }) => dashboard.updatePolicy(id, formData),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: policiesKeys.all })
});

export const getDeleteMutationOptions = (queryClient: QueryClient) => ({
    mutationFn: (id: number) => dashboard.deletePolicy(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: policiesKeys.all })
});
