import { useQuery } from '@tanstack/react-query';
import { dashboard } from '@dmt/api';
import { learningAndDevelopmentKeys } from './query-keys';

export interface LearningData {
    id: number;
    learning_and_development_file: string;
}

export const useLearningAndDevelopmentQuery = () => {
    return useQuery({
        queryKey: learningAndDevelopmentKeys.all,
        queryFn: async () => {
            const data = await dashboard.getLearningAndDevelopment();
            if (data && Array.isArray(data)) {
                // Sort by ID descending so that the latest uploaded document appears at the top
                return [...data].sort((a, b) => b.id - a.id) as LearningData[];
            }
            return [];
        }
    });
};
