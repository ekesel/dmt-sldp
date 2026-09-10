export const resourceAllocationKeys = {
  all: ['resourceAllocations'] as const,
  overview: (month: number, year: number) => [...resourceAllocationKeys.all, 'overview', month, year] as const,
  developers: () => [...resourceAllocationKeys.all, 'developers'] as const,
  projects: () => [...resourceAllocationKeys.all, 'projects'] as const,
};
