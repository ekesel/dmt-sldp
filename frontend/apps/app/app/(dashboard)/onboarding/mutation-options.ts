import { useMutation, useQueryClient } from '@tanstack/react-query';
import { dashboard } from '@dmt/api';
import { onboardingKeys } from './query-keys';

export const useUploadOnboarding = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (formData: FormData) => dashboard.uploadOnboarding(formData),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: onboardingKeys.all });
        }
    });
};

export const useUpdateOnboarding = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, formData }: { id: number; formData: FormData }) => dashboard.updateOnboarding(id, formData),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: onboardingKeys.all });
        }
    });
};

export const useDeleteOnboarding = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: number) => dashboard.deleteOnboarding(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: onboardingKeys.all });
        }
    });
};
