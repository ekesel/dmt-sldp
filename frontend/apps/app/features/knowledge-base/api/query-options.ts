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
 * Drives the KnowledgeHeader search input.
 *
 * Supported params:
 *  - search    : free-text matched against title + description
 *  - category  : metadata category id (e.g. 2 = team, 1 = project)
 *  - tag       : tag id (endpoint-ready), string name still supported in fallback
 *
 * Maps to: GET /documents/?search=&category=&tag=
 */
export function recordsOptions(params: RecordSearchParams = {}) {
  return queryOptions({
    queryKey: RECORD_QUERY_KEYS.search(params as Record<string, unknown>),
    queryFn:  () => recordsApi.search(params),
    // Keep previous results while new ones load (instant perceived performance)
    placeholderData: (prev) => prev,
  });
}
