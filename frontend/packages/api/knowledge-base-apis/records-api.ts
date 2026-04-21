import axios from "axios";
import api from "..";

// ---------------------------------------------------------------------------
// Records API — production adapter for GET /kb/documents/
//
// Supported query params:
//   GET /kb/documents/?search=<text>
//   GET /kb/documents/?category=<id>
//   GET /kb/documents/?tag=<id_or_name>
//   GET /kb/documents/?mine=true
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
  /** category_id → value pairs */
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
  fileUrl?: string; // from latest_version.file
}

// ---------------------------------------------------------------------------
// API Response Interfaces (Production Shapes)
// ---------------------------------------------------------------------------
interface DocumentTagDetail {
  id: number;
  name: string;
}

interface DocumentMetadataDetail {
  id?: number;
  category: string;
  value: string;
  category_id?: number;
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
  audience?: string;
  type?: string;
  created_at: string;
  uid?: string;
  version?: string;
  version_count?: number;
  team?: string;
  project?: string;
  tags?: number[];
  metadata_values?: number[];
  tag_details?: DocumentTagDetail[];
  metadata_details?: DocumentMetadataDetail[];
  metadata?: DocumentMetadataDetail[]; // For endpoints that return 'metadata' instead of 'metadata_details'
  file_details?: DocumentFileDetail[];
  history?: {
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

const STATUS_LABEL_BY_API: Record<string, KnowledgeRecord["status"]> = {
  APPROVED: "Approved",
  DRAFT: "Draft",
  REJECTED: "Rejected",
  approved: "Approved",
  draft: "Draft",
  rejected: "Rejected",
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

const mapDocumentToKnowledgeRecord = (doc: DocumentResponseItem, latestVersion?: any): KnowledgeRecord => {
  const fileDetails = doc.file_details || [];
  const totalFileBytes = fileDetails.reduce((sum, file) => sum + (file.size_bytes || 0), 0);
  
  // Backend sometimes returns 'metadata' and sometimes 'metadata_details'
  const rawMetadata = doc.metadata_details || doc.metadata || [];
  
  return {
    id: String(doc.id),
    title: doc.title,
    version: doc.version || "v1.0",
    versionCount: doc.version_count || 1,
    author: String(doc.created_by),
    owner: String(doc.owner),
    audience: doc.audience || "General",
    type: doc.type || "Document",
    date: formatDateLabel(doc.created_at),
    status: STATUS_LABEL_BY_API[doc.status] || "Draft",
    description: doc.description || "",
    project: doc.project || "General",
    team: doc.team || "General",
    uid: doc.uid || `KB-${doc.id}`,
    tags: (doc.tag_details || []).map((tag) => tag.name),
    metadata: rawMetadata.map((item) => ({
      category: item.category_id ?? 0,
      category_name: item.category,
      value: item.value,
    })),
    assets: fileDetails.map((file) => ({
      name: file.name,
      size: formatFileSize(file.size_bytes || 0),
    })),
    filesPreview: {
      total: fileDetails.length,
      firstFileName: fileDetails[0]?.name ?? null,
      totalSize: formatFileSize(totalFileBytes),
    },
    history: doc.history || [],
    fileUrl: latestVersion?.file || latestVersion?.file_url,
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

// ---------------------------------------------------------------------------
// Search params — mirrors real query-string params
// ---------------------------------------------------------------------------
export interface RecordSearchParams {
  /** Filter by metadata category id (e.g. 2 = team, 1 = project, 3 = type) */
  category?: number;
  /** Filter by tag id: GET /kb/documents/?tag=1 */
  tag?: number | string;
  /** Filter by ownership: GET /kb/documents/?mine=true */
  mine?: boolean;
}

// ---------------------------------------------------------------------------
// API object — interfaces with production /kb/documents/ endpoints
// ---------------------------------------------------------------------------
export const knowledgeRecords = {
  /**
   * GET /kb/documents/
   * Supports ?category=ID, ?tag=ID, ?mine=true
   */
  search: async (params: RecordSearchParams = {}): Promise<KnowledgeRecord[]> => {
    const response = await api.get<DocumentResponseItem[] | PaginatedDocumentsResponse>("/kb/documents/", {
      params: {
        ...(params.category !== undefined ? { category: params.category } : {}),
        ...(params.tag !== undefined ? { tag: params.tag } : {}),
        ...(params.mine !== undefined ? { mine: params.mine } : {}),
      },
    });
    return toDocumentItems(response.data).map(mapDocumentToKnowledgeRecord);
  },

  /** Simplified version of search with no filters */
  list: async (): Promise<KnowledgeRecord[]> => {
    const response = await api.get<DocumentResponseItem[] | PaginatedDocumentsResponse>("/kb/documents/");
    return toDocumentItems(response.data).map(mapDocumentToKnowledgeRecord);
  },

  /** GET /kb/documents/:id/ */
  getById: async (id: string | number): Promise<KnowledgeRecord> => {
    const response = await api.get<{ data: DocumentResponseItem; latest_version?: any }>(`/kb/documents/${id}/`);
    const body = response.data as any;
    const doc = body.data || body;
    const latestVersion = body.latest_version;
    return mapDocumentToKnowledgeRecord(doc, latestVersion);
  },

  /** POST /kb/documents/ (multipart/form-data) */
  create: async (formData: FormData): Promise<KnowledgeRecord> => {
    const response = await api.post<any>("/kb/documents/", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    const payload = response.data;
    const doc = payload.data || payload;
    return mapDocumentToKnowledgeRecord(doc);
  },

  /** GET /kb/documents/:docId/files/:fileId/download/ */
  downloadFile: async (documentId: string | number, fileId: string | number): Promise<void> => {
    // Note: This often redirects to a file URL or serves a blob. 
    // Usually handled by window.open if it's a direct download link.
    const url = `${api.defaults.baseURL}kb/documents/${documentId}/files/${fileId}/download/`;
    window.open(url, '_blank');
  },

  /** POST /kb/documents/:id/status/ */
  updateStatus: async (id: string | number, status: "APPROVED" | "REJECTED"): Promise<void> => {
    await api.post(`/kb/documents/${id}/status/`, { status });
  },

  /** GET /kb/documents/:id/versions/ */
  getVersions: async (id: string | number): Promise<any[]> => {
    const response = await api.get<{ versions: any[] }>(`/kb/documents/${id}/versions/`);
    const payload = response.data as any;
    return payload.versions || payload.results || payload;
  },

  /** DELETE /kb/documents/:id/ */
  deleteDocument: async (id: string | number): Promise<void> => {
    await api.delete(`/kb/documents/${id}/`);
  },

  /** PATCH /kb/documents/:id/ */
  update: async (id: string | number, data: { title?: string; metadata?: number[]; tags?: number[] } | FormData): Promise<KnowledgeRecord> => {
    const isFormData = data instanceof FormData;
    const response = await api.patch<DocumentResponseItem>(`/kb/documents/${id}/`, data, {
      headers: isFormData ? { "Content-Type": "multipart/form-data" } : {},
    });
    const payload = response.data as any;
    const doc = payload.data || payload;
    return mapDocumentToKnowledgeRecord(doc);
  },
};
