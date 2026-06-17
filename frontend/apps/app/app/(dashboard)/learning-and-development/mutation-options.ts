import { useMutation, useQueryClient } from '@tanstack/react-query';
import { dashboard } from '@dmt/api';
import { learningAndDevelopmentKeys } from './query-keys';

export const useUploadLearningAndDevelopment = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (formData: FormData) => dashboard.uploadLearningAndDevelopment(formData),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: learningAndDevelopmentKeys.all });
        }
    });
};

export const useUpdateLearningAndDevelopment = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, formData }: { id: number, formData: FormData }) => dashboard.updateLearningAndDevelopment(id, formData),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: learningAndDevelopmentKeys.all });
        }
    });
};

export const useDeleteLearningAndDevelopment = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: number) => dashboard.deleteLearningAndDevelopment(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: learningAndDevelopmentKeys.all });
        }
    });
};
