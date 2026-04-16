import { queryOptions } from "@tanstack/react-query";
import { tags as tagsApi, Tag, metadata as metadataApi, knowledgeUsers as usersApi, knowledgeRecords as recordsApi, RecordSearchParams } from "@dmt/api";
import { TAG_QUERY_KEYS, METADATA_QUERY_KEYS, USER_QUERY_KEYS, RECORD_QUERY_KEYS } from "./query-keys";

export function tagsOptions() {
  return queryOptions({
    queryKey: TAG_QUERY_KEYS.all,
    queryFn: async () => {
      const response = await tagsApi.getAll();
      return response.data as Tag[];
    },
  });
}

export function categoriesOptions() {
  return queryOptions({
    queryKey: METADATA_QUERY_KEYS.categories,
    queryFn: () => metadataApi.getCategories(),
  });
}

export function metadataOptions() {
  return queryOptions({
    queryKey: METADATA_QUERY_KEYS.all,
    queryFn: () => metadataApi.list(),
  });
}

export function metadataValuesOptions(category?: number) {
  return queryOptions({
    queryKey: [...METADATA_QUERY_KEYS.values, category ?? "all"],
    queryFn: () => metadataApi.listValues(category),
  });
}

export function usersOptions() {
  return queryOptions({
    queryKey: USER_QUERY_KEYS.managers,
    queryFn: () => usersApi.listKnowledgeManagers(),
  });
}

/**
 * Drives the Knowledge Base list and filters.
 *
 * Supported params:
 *  - category  : metadata category id (e.g. 2 = team, 1 = project)
 *  - tag       : tag id (GET /documents/?tag=1)
 *  - mine      : true (GET /documents/?mine=true)
 *
 * Maps to: GET /documents/
 */
export function recordsOptions(params: RecordSearchParams = {}) {
  return queryOptions({
    queryKey: RECORD_QUERY_KEYS.search(params as Record<string, unknown>),
    queryFn:  () => recordsApi.search(params),
    // Keep previous results while new ones load (instant perceived performance)
    placeholderData: (prev) => prev,
  });
}

export function recordDetailOptions(id: string | number | null) {
  return queryOptions({
    queryKey: id ? RECORD_QUERY_KEYS.detail(id) : ["records", "detail", "null"],
    queryFn: () => (id ? recordsApi.getById(id) : null),
    enabled: !!id,
  });
}

export function recordVersionsOptions(id: string | number | null) {
  return queryOptions({
    queryKey: id ? [...RECORD_QUERY_KEYS.detail(id), "versions"] : ["records", "detail", "null", "versions"],
    queryFn: () => (id ? recordsApi.getVersions(id) : []),
    enabled: !!id,
  });
}
