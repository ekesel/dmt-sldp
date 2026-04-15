import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { categoriesOptions, metadataOptions, metadataValuesOptions } from "../api/query-options";
import { addMetadataValueMutationOptions, createMetadataCategoryMutationOptions } from "../api/mutation-options";
import { METADATA_QUERY_KEYS } from "../api/query-keys";

export const useMetadata = (activeCategory?: number) => {
  const queryClient = useQueryClient();

  const categoriesQuery = useQuery(categoriesOptions());
  const metadataQuery = useQuery(metadataOptions());
  const valuesQuery = useQuery(metadataValuesOptions(activeCategory));

  const addValueMutation = useMutation({
    ...addMetadataValueMutationOptions(),
    onSuccess: () => {
      // Invalidate and refetch metadata queries on success
      queryClient.invalidateQueries({ queryKey: METADATA_QUERY_KEYS.all });
      queryClient.invalidateQueries({ queryKey: METADATA_QUERY_KEYS.values });
    },
  });

  const createCategoryMutation = useMutation({
    ...createMetadataCategoryMutationOptions(),
    onSuccess: () => {
      // Invalidate all metadata queries so both categories and values
      // refresh everywhere (e.g. RecordEditor dropdowns update too)
      queryClient.invalidateQueries({ queryKey: METADATA_QUERY_KEYS.all });
      queryClient.invalidateQueries({ queryKey: METADATA_QUERY_KEYS.categories });
      queryClient.invalidateQueries({ queryKey: METADATA_QUERY_KEYS.values });
    },
  });

  return {
    categories: categoriesQuery.data || [],
    allMetadata: metadataQuery.data || [],
    allValues: valuesQuery.data || [],
    isLoading: categoriesQuery.isLoading || metadataQuery.isLoading || valuesQuery.isLoading,
    isError: categoriesQuery.isError || metadataQuery.isError || valuesQuery.isError,
    addValue: addValueMutation.mutateAsync,
    isAdding: addValueMutation.isPending,
    addCategory: createCategoryMutation.mutateAsync,
    isAddingCategory: createCategoryMutation.isPending,
  };
};
