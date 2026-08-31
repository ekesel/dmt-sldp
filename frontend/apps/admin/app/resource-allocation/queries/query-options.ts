import { resourceAllocations } from '@dmt/api';
import { resourceAllocationKeys } from './query-keys';

export const getOverviewQueryOptions = (month: number, year: number) => ({
  queryKey: resourceAllocationKeys.overview(month, year),
  queryFn: async () => {
    const [overviewRes, developersRes, projectsRes] = await Promise.all([
      resourceAllocations.getOverview({ month, year }),
      resourceAllocations.getDevelopers(),
      resourceAllocations.getProjects(),
    ]);
    return { overviewRes, developersRes, projectsRes };
  },
});
