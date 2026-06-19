import { useQuery } from '@tanstack/react-query';
import { dashboard } from '@dmt/api';
import { onboardingKeys } from './query-keys';

export interface OnboardingData {
    id: number;
    title?: string;
    onboarding_file: string;
}

export const useOnboardingQuery = () => {
    return useQuery({
        queryKey: onboardingKeys.all,
        queryFn: async () => {
            const data = await dashboard.getOnboarding();
            if (data && Array.isArray(data)) {
                // Sort by ID descending so that the latest uploaded document appears at the top
                return [...data].sort((a, b) => b.id - a.id) as OnboardingData[];
            }
            return [];
        }
    });
};
