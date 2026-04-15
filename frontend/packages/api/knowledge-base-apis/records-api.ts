import axios from "axios";
import api from "..";

// ---------------------------------------------------------------------------
// Records API — endpoint-ready adapter for GET /documents/
//
// Supported query params:
//   GET /documents/?search=<text>
//   GET /documents/?category=<id>
//   GET /documents/?tag=<id_or_name>
//
// Data flow:
//   endpoint payload -> mapDocumentToKnowledgeRecord() -> UI shape
// ---------------------------------------------------------------------------

export interface KnowledgeRecord {
  id: string;
  title: string;
  version: string;
  versionCount: number;
  author: string;
  owner: string;
  audience: string;
  type: string;
  date: string;
  status: "Approved" | "Draft" | "Rejected";
  description: string;
  project: string;
  team: string;
  uid: string;
  tags: string[];
  /** category_id → value pairs so we can filter by categoryId */
  metadata: { category: number; category_name: string; value: string }[];
  assets: { name: string; size: string }[];
  filesPreview: {
    total: number;
    firstFileName: string | null;
    totalSize: string;
  };
  history: {
    version: string;
    date: string;
    comment: string;
    author: string;
  }[];
}

// ---------------------------------------------------------------------------
// Endpoint-shaped mock data + mapper (swap-in ready for GET /documents/)
// ---------------------------------------------------------------------------
interface DocumentTagDetail {
  id: number;
  name: string;
}

interface DocumentMetadataValue {
  id: number;
  category: string;
  value: string;
}

interface DocumentFileDetail {
  id: number;
  name: string;
  size_bytes: number;
}

interface DocumentResponseItem {
  id: number;
  title: string;
  status: "APPROVED" | "DRAFT" | "REJECTED";
  description: string;
  created_by: number;
  owner: number;
  audience: string;
  type: string;
  created_at: string;
  uid: string;
  version: string;
  version_count: number;
  team: string;
  project: string;
  tags: number[];
  metadata_values: number[];
  tag_details: DocumentTagDetail[];
  metadata_details: DocumentMetadataValue[];
  file_details: DocumentFileDetail[];
  history: {
    version: string;
    date: string;
    comment: string;
    author: string;
  }[];
}

interface PaginatedDocumentsResponse {
  count?: number;
  next?: string | null;
  previous?: string | null;
  results?: DocumentResponseItem[];
}

const METADATA_CATEGORY_ID_BY_NAME: Record<string, number> = {
  project: 1,
  team: 2,
  type: 3,
};

const STATUS_LABEL_BY_API: Record<DocumentResponseItem["status"], KnowledgeRecord["status"]> = {
  APPROVED: "Approved",
  DRAFT: "Draft",
  REJECTED: "Rejected",
};

const formatFileSize = (sizeBytes: number): string => {
  if (sizeBytes >= 1024 * 1024) {
    return `${(sizeBytes / (1024 * 1024)).toFixed(2)} MB`;
  }
  if (sizeBytes >= 1024) {
    return `${(sizeBytes / 1024).toFixed(2)} KB`;
  }
  return `${sizeBytes} B`;
};

const formatDateLabel = (isoDate: string): string => {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) {
    return isoDate;
  }
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
};

const mapDocumentToKnowledgeRecord = (doc: DocumentResponseItem): KnowledgeRecord => {
  const totalFileBytes = doc.file_details.reduce((sum, file) => sum + file.size_bytes, 0);
  return {
    id: String(doc.id),
    title: doc.title,
    version: doc.version,
    versionCount: doc.version_count,
    author: String(doc.created_by),
    owner: String(doc.owner),
    audience: doc.audience,
    type: doc.type,
    date: formatDateLabel(doc.created_at),
    status: STATUS_LABEL_BY_API[doc.status],
    description: doc.description,
    project: doc.project,
    team: doc.team,
    uid: doc.uid,
    tags: doc.tag_details.map((tag) => tag.name),
    metadata: doc.metadata_details.map((item) => ({
      category: METADATA_CATEGORY_ID_BY_NAME[item.category.toLowerCase()] ?? 0,
      category_name: item.category.toLowerCase(),
      value: item.value,
    })),
    assets: doc.file_details.map((file) => ({
      name: file.name,
      size: formatFileSize(file.size_bytes),
    })),
    filesPreview: {
      total: doc.file_details.length,
      firstFileName: doc.file_details[0]?.name ?? null,
      totalSize: formatFileSize(totalFileBytes),
    },
    history: doc.history,
  };
};

const toDocumentItems = (
  payload: DocumentResponseItem[] | PaginatedDocumentsResponse | unknown
): DocumentResponseItem[] => {
  if (Array.isArray(payload)) {
    return payload as DocumentResponseItem[];
  }
  if (payload && typeof payload === "object" && Array.isArray((payload as PaginatedDocumentsResponse).results)) {
    return (payload as PaginatedDocumentsResponse).results as DocumentResponseItem[];
  }
  return [];
};

const MOCK_DOCUMENTS: DocumentResponseItem[] = [
  {
    id: 1,
    title: "Frontend onboarding playbook",
    version: "v1.4",
    version_count: 3,
    created_by: 101,
    owner: 101,
    audience: "New joiners",
    type: "Onboarding",
    created_at: "2026-03-20T10:15:00.000Z",
    status: "APPROVED",
    description: "Setup steps, conventions, and the first-week checklist for frontend engineers.",
    project: "docs",
    team: "Engineering",
    uid: "KB-201",
    tags: [1, 2, 3],
    metadata_values: [1001, 1002, 1003],
    tag_details: [
      { id: 1, name: "frontend" },
      { id: 2, name: "onboarding" },
      { id: 3, name: "setup" },
    ],
    metadata_details: [
      { id: 1001, category: "project", value: "docs" },
      { id: 1002, category: "team", value: "Engineering" },
      { id: 1003, category: "type", value: "Onboarding" },
    ],
    file_details: [
      { id: 101, name: "frontend-onboarding-checklist.pdf", size_bytes: 1258291 },
      { id: 102, name: "engineering-setup-template.docx", size_bytes: 503316 },
    ],
    history: [
      { version: "Version 3", date: "Mar 20", comment: "Updated setup steps for the new local environment and added first-week tasks.", author: "Himanshu Rathore" },
      { version: "Version 2", date: "Feb 28", comment: "Refined the contribution checklist and ownership notes.", author: "Sara Kim" },
      { version: "Version 1", date: "Feb 15", comment: "Initial playbook structure and core architecture overview.", author: "Himanshu Rathore" },
    ],
  },
  {
    id: 2,
    title: "Security Best Practices",
    version: "v2.1",
    version_count: 5,
    created_by: 102,
    owner: 102,
    audience: "Developers",
    type: "Guideline",
    created_at: "2026-03-18T08:00:00.000Z",
    status: "APPROVED",
    description: "Comprehensive guide to secure coding standards and common vulnerability mitigation.",
    project: "Security",
    team: "Engineering",
    uid: "KB-105",
    tags: [4, 5],
    metadata_values: [1004, 1005, 1006],
    tag_details: [
      { id: 4, name: "security" },
      { id: 5, name: "best-practices" },
    ],
    metadata_details: [
      { id: 1004, category: "project", value: "Security" },
      { id: 1005, category: "team", value: "Engineering" },
      { id: 1006, category: "type", value: "Guideline" },
    ],
    file_details: [
      { id: 201, name: "security-audit-v2.pdf", size_bytes: 2516582 },
      { id: 202, name: "secure-coding-checklist.xlsx", size_bytes: 798720 },
    ],
    history: [
      { version: "Version 5", date: "Mar 18", comment: "Updated OWASP Top 10 references.", author: "Sarah Chen" },
    ],
  },
  {
    id: 3,
    title: "API Documentation V3",
    version: "v0.9",
    version_count: 1,
    created_by: 103,
    owner: 103,
    audience: "API Consumers",
    type: "Documentation",
    created_at: "2026-03-15T17:32:00.000Z",
    status: "DRAFT",
    description: "Internal documentation for the new microservices API endpoints.",
    project: "Infrastructure",
    team: "Backend",
    uid: "KB-302",
    tags: [6, 7],
    metadata_values: [1007, 1008, 1009],
    tag_details: [
      { id: 6, name: "api" },
      { id: 7, name: "backend" },
    ],
    metadata_details: [
      { id: 1007, category: "project", value: "Infrastructure" },
      { id: 1008, category: "team", value: "Backend" },
      { id: 1009, category: "type", value: "Documentation" },
    ],
    file_details: [{ id: 301, name: "api-doc-v3-draft.md", size_bytes: 165432 }],
    history: [
      { version: "Version 1", date: "Mar 15", comment: "Initial draft.", author: "Mike Ross" },
    ],
  },
  {
    id: 4,
    title: "Microservices Architecture",
    version: "v1.2",
    version_count: 2,
    created_by: 104,
    owner: 104,
    audience: "Backend Engineers",
    type: "Technical Doc",
    created_at: "2026-03-10T14:42:00.000Z",
    status: "APPROVED",
    description: "Overview of our distributed systems architecture and communication protocols.",
    project: "Infrastructure",
    team: "Backend",
    uid: "KB-401",
    tags: [8, 9],
    metadata_values: [1010, 1011, 1012],
    tag_details: [
      { id: 8, name: "microservices" },
      { id: 9, name: "architecture" },
    ],
    metadata_details: [
      { id: 1010, category: "project", value: "Infrastructure" },
      { id: 1011, category: "team", value: "Backend" },
      { id: 1012, category: "type", value: "Technical Doc" },
    ],
    file_details: [
      { id: 401, name: "microservices-architecture.pdf", size_bytes: 1835008 },
      { id: 402, name: "service-topology.drawio", size_bytes: 542221 },
    ],
    history: [],
  },
  {
    id: 5,
    title: "Platform Scaling Guide",
    version: "v3.0",
    version_count: 8,
    created_by: 105,
    owner: 105,
    audience: "Platform Ops",
    type: "Technical Doc",
    created_at: "2026-03-05T09:10:00.000Z",
    status: "REJECTED",
    description: "How to scale our k8s clusters and optimize resource allocation.",
    project: "Infrastructure",
    team: "Platform",
    uid: "KB-501",
    tags: [10, 11, 12],
    metadata_values: [1013, 1014, 1015],
    tag_details: [
      { id: 10, name: "platform" },
      { id: 11, name: "scaling" },
      { id: 12, name: "k8s" },
    ],
    metadata_details: [
      { id: 1013, category: "project", value: "Infrastructure" },
      { id: 1014, category: "team", value: "Platform" },
      { id: 1015, category: "type", value: "Technical Doc" },
    ],
    file_details: [
      { id: 501, name: "platform-scaling-guide.pdf", size_bytes: 3145728 },
      { id: 502, name: "k8s-capacity-planning.xlsx", size_bytes: 1269760 },
      { id: 503, name: "autoscaling-runbook.md", size_bytes: 90212 },
    ],
    history: [],
  },
];

export const MOCK_RECORDS: KnowledgeRecord[] = MOCK_DOCUMENTS.map(mapDocumentToKnowledgeRecord);

// ---------------------------------------------------------------------------
// Search params — mirrors real query-string params
// ---------------------------------------------------------------------------
export interface RecordSearchParams {
  /** Free-text: matched against title + description */
  search?: string;
  /** Filter by metadata category id (e.g. 2 = team, 1 = project, 3 = type) */
  category?: number;
  /** Filter by tag id (endpoint-ready) or tag name (fallback mock behavior) */
  tag?: number | string;
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// ---------------------------------------------------------------------------
// API object — swap delay()+mock logic with real api.get() calls when ready
// ---------------------------------------------------------------------------
export const knowledgeRecords = {
  /**
   * Endpoint-ready:
   *   GET /documents/?tag=<id>
   *
   * Also keeps existing compatibility for search/category while backend is
   * still in transition by falling back to local mock filtering.
   */
  search: async (params: RecordSearchParams = {}): Promise<KnowledgeRecord[]> => {
    try {
      const response = await api.get<DocumentResponseItem[] | PaginatedDocumentsResponse>("/documents/", {
        params: {
          ...(params.search ? { search: params.search } : {}),
          ...(params.category !== undefined ? { category: params.category } : {}),
          ...(params.tag !== undefined ? { tag: params.tag } : {}),
        },
      });
      return toDocumentItems(response.data).map(mapDocumentToKnowledgeRecord);
    } catch (error) {
      const isEndpointUnavailable =
        axios.isAxiosError(error) &&
        (error.response?.status === 404 || error.response?.status === 405 || error.response?.status === 501);

      if (!isEndpointUnavailable) {
        throw error;
      }
    }

    await delay(250); // simulate network latency for fallback only

    const { search, category, tag } = params;
    const searchLower = search?.toLowerCase().trim() ?? "";
    const tagLower = typeof tag === "string" ? tag.toLowerCase().trim() : "";

    const filteredDocuments = MOCK_DOCUMENTS.filter((doc) => {
      if (searchLower) {
        const inTitle = doc.title.toLowerCase().includes(searchLower);
        const inDescription = doc.description.toLowerCase().includes(searchLower);
        if (!inTitle && !inDescription) return false;
      }

      if (category !== undefined && category !== null) {
        const hasCategory = doc.metadata_details.some(
          (item) => (METADATA_CATEGORY_ID_BY_NAME[item.category.toLowerCase()] ?? -1) === category
        );
        if (!hasCategory) return false;
      }

      if (typeof tag === "number") {
        const hasTagId = doc.tag_details.some((item) => item.id === tag);
        if (!hasTagId) return false;
      } else if (tagLower) {
        const hasTagName = doc.tag_details.some((item) => item.name.toLowerCase().includes(tagLower));
        if (!hasTagName) return false;
      }

      return true;
    });

    return filteredDocuments.map(mapDocumentToKnowledgeRecord);
  },

  /**
   * Mock utility for local development only.
   * Returns all records (no filter).
   */
  list: async (): Promise<KnowledgeRecord[]> => {
    await delay(250);
    return [...MOCK_RECORDS];
  },
};
