import { tags as tagsApi, Tag, metadata as metadataApi } from "@dmt/api";

export function createTagMutationOptions() {
  return {
    mutationFn: async (name: string) => {
      const response = await tagsApi.create(name);
      return response.data as Tag;
    },
  };
}

export function addMetadataValueMutationOptions() {
  return {
    mutationFn: (body: { category: number; value: string }) =>
      metadataApi.addValue(body),
  };
}

export function createMetadataCategoryMutationOptions() {
  return {
    mutationFn: (body: { name: string }) =>
      metadataApi.createCategory(body),
  };
}
