import { useQuery } from "@tanstack/react-query";
import { RecordSearchParams } from "@dmt/api";
import { recordsOptions, recordDetailOptions, recordVersionsOptions } from "../api/query-options";

const STABLE_EMPTY_ARRAY: never[] = [];

/**
 * useRecords — fetches knowledge base records via endpoint-ready API integration.
 *
 * Params are forwarded directly to GET /documents/:
 *   - category  : metadata category id  → GET /documents/?category=1
 *   - tag       : tag id (preferred)    → GET /documents/?tag=1
 *   - mine      : true                  → GET /documents/?mine=true
 *
 * React Query will automatically re-fetch whenever params change, giving
 * instant reactivity to the search input in KnowledgeHeader.
 */
export const useRecords = (params: RecordSearchParams = {}) => {
  const recordsQuery = useQuery(recordsOptions(params));

  return {
    records:   recordsQuery.data ?? STABLE_EMPTY_ARRAY,
    isLoading: recordsQuery.isLoading,
    isFetching: recordsQuery.isFetching, // useful for showing a subtle loading indicator
    isError:   recordsQuery.isError,
    error:     recordsQuery.error,
  };
};

/**
 * useRecord — fetches a single knowledge base record's DEEP details
 * using the GET /documents/:id/ endpoint.
 *
 * This hook is preferred for the RecordDetail sidebar to ensure
 * all version history and metadata are fully loaded.
 */
export const useRecord = (id: string | number | null) => {
  const recordQuery = useQuery(recordDetailOptions(id));

  return {
    record:    recordQuery.data ?? null,
    isLoading: recordQuery.isLoading,
    isError:   recordQuery.isError,
    error:     recordQuery.error,
  };
};

/**
 * useReviewCount — returns the count of documents where the user is the owner
 * and they are not yet Approved (i.e., pending review).
 */
export const useReviewCount = () => {
  const { records, isLoading, isError } = useRecords({ mine: true });
  
  const pendingCount = records.filter(r => r.status !== "Approved" && r.status !== "Rejected").length;

  return {
    count: pendingCount,
    isLoading,
    isError,
  };
};

/**
 * useRecordVersions — fetches the full version history for a document.
 */
export const useRecordVersions = (id: string | number | null) => {
  const versionsQuery = useQuery(recordVersionsOptions(id));

  return {
    versions:  versionsQuery.data ?? STABLE_EMPTY_ARRAY,
    isLoading: versionsQuery.isLoading,
    isError:   versionsQuery.isError,
    error:     versionsQuery.error,
  };
};
