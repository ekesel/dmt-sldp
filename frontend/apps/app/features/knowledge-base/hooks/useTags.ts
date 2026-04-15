import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { tagsOptions, createTagMutationOptions, TAG_QUERY_KEYS } from "../api";

export const useTags = () => {
  const queryClient = useQueryClient();

  const tagsQuery = useQuery(tagsOptions());

  const createTagMutation = useMutation({
    ...createTagMutationOptions(),
    onSuccess: () => {
      // Invalidate and refetch tags query on success
      queryClient.invalidateQueries({ queryKey: TAG_QUERY_KEYS.all });
    },
  });

  return {
    tags: tagsQuery.data || [],
    isLoading: tagsQuery.isLoading,
    isError: tagsQuery.isError,
    error: tagsQuery.error,
    createTag: createTagMutation.mutateAsync,
    isCreating: createTagMutation.isPending,
  };
};
