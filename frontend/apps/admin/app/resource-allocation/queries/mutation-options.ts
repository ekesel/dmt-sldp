import { useMutation, useQueryClient } from '@tanstack/react-query';
import { resourceAllocations, SaveAllocationPayload, PublishAllocationPayload } from '@dmt/api';
import { resourceAllocationKeys } from './query-keys';

export const useSaveAllocationsMutation = (month: number, year: number) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (payload: SaveAllocationPayload) => resourceAllocations.save(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: resourceAllocationKeys.overview(month, year),
      });
    },
  });
};

export const usePublishAllocationsMutation = (month: number, year: number) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: PublishAllocationPayload) => resourceAllocations.publish(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: resourceAllocationKeys.overview(month, year),
      });
    },
  });
};
