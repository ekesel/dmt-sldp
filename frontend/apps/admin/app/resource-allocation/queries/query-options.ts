import { resourceAllocations } from '@dmt/api';
import { resourceAllocationKeys } from './query-keys';

export const getOverviewQueryOptions = (month: number, year: number) => ({
  queryKey: resourceAllocationKeys.overview(month, year),
  queryFn: async () => {
    const overviewRes = await resourceAllocations.getOverview({ month, year });
    return { overviewRes };
  },
});
