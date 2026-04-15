export const TAG_QUERY_KEYS = {
  all: ["tags"] as const,
};

export const METADATA_QUERY_KEYS = {
  all: ["metadata"] as const,
  categories: ["metadata", "categories"] as const,
  values: ["metadata", "values"] as const,
};

export const USER_QUERY_KEYS = {
  managers: ["users", "managers"] as const,
};

export const RECORD_QUERY_KEYS = {
  all:    ["records"] as const,
  search: (params: Record<string, unknown>) => ["records", "search", params] as const,
};
