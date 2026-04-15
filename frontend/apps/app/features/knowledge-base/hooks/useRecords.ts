import { useQuery } from "@tanstack/react-query";
import { RecordSearchParams } from "@dmt/api";
import { recordsOptions } from "../api/query-options";

/**
 * useRecords — fetches knowledge base records via endpoint-ready API integration.
 *
 * Params are forwarded directly to GET /documents/:
 *   - search    : free-text (title, description)
 *   - category  : metadata category id  → GET /records/?category=1
 *   - tag       : tag id (preferred)    → GET /documents/?tag=1
 *                 string value fallback remains for current mock data
 *
 * React Query will automatically re-fetch whenever params change, giving
 * instant reactivity to the search input in KnowledgeHeader.
 */
export const useRecords = (params: RecordSearchParams = {}) => {
  const recordsQuery = useQuery(recordsOptions(params));

  return {
    records:   recordsQuery.data ?? [],
    isLoading: recordsQuery.isLoading,
    isFetching: recordsQuery.isFetching, // useful for showing a subtle loading indicator
    isError:   recordsQuery.isError,
    error:     recordsQuery.error,
  };
};
