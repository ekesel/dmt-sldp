import { queryOptions } from '@tanstack/react-query';
import { dashboard } from '@dmt/api';
import { policiesKeys } from './query-keys';

export const policiesQueryOptions = queryOptions({
    queryKey: policiesKeys.all,
    queryFn: async () => {
        const data = await dashboard.getPolicies();
        if (data && Array.isArray(data)) {
            // Sort by ID descending so that the latest uploaded document appears at the top
            return [...data].sort((a, b) => b.id - a.id);
        }
        return [];
    }
});
