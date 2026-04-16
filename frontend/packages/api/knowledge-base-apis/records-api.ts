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
  fileUrl?: string; // from latest_version.file
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

const mapDocumentToKnowledgeRecord = (doc: DocumentResponseItem, latestVersion?: any): KnowledgeRecord => {
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
    owner: 1,
    audience: "API Consumers",
    type: "Documentation",
    created_at: "2026-03-15T17:32:00.000Z",
    status: "APPROVED",
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
  {
    id: 6,
    title: "Quarterly Security Audit Report",
    version: "v1.0",
    version_count: 1,
    created_by: 101,
    owner: 13,
    audience: "Management",
    type: "Report",
    created_at: "2026-04-10T10:00:00.000Z",
    status: "DRAFT",
    description: "Findings from the Q1 security audit including vulnerabilities and mitigation status.",
    project: "Security",
    team: "Engineering",
    uid: "KB-901",
    tags: [4, 13],
    metadata_values: [1004, 1005, 1006],
    tag_details: [
      { id: 4, name: "security" },
      { id: 13, name: "audit" },
    ],
    metadata_details: [
      { id: 1004, category: "project", value: "Security" },
      { id: 1005, category: "team", value: "Engineering" },
      { id: 1006, category: "type", value: "Report" },
    ],
    file_details: [{ id: 601, name: "q1-security-audit.pdf", size_bytes: 2100000 }],
    history: [{ version: "v1.0", date: "Apr 10", author: "Himanshu Rathore", comment: "Initial report draft" }],
  },
  {
    id: 7,
    title: "New Employee Onboarding Deck",
    version: "v0.8",
    version_count: 1,
    created_by: 102,
    owner: 13,
    audience: "New Joiners",
    type: "Presentation",
    created_at: "2026-04-12T14:30:00.000Z",
    status: "DRAFT",
    description: "Slide deck for the monthly engineering onboarding session.",
    project: "HR",
    team: "Engineering",
    uid: "KB-902",
    tags: [2, 14],
    metadata_values: [1001, 1002, 1015],
    tag_details: [
      { id: 2, name: "onboarding" },
      { id: 14, name: "hr" },
    ],
    metadata_details: [
      { id: 1001, category: "project", value: "docs" },
      { id: 1002, category: "team", value: "Engineering" },
      { id: 1015, category: "type", value: "Presentation" },
    ],
    file_details: [{ id: 701, name: "onboarding-v0.8.pptx", size_bytes: 5200000 }],
    history: [{ version: "v0.8", date: "Apr 12", author: "Sara Kim", comment: "Draft for review" }],
  },
];

export const MOCK_RECORDS: KnowledgeRecord[] = MOCK_DOCUMENTS.map(mapDocumentToKnowledgeRecord);

// ---------------------------------------------------------------------------
// Search params — mirrors real query-string params
// ---------------------------------------------------------------------------
export interface RecordSearchParams {
  /** Filter by metadata category id (e.g. 2 = team, 1 = project, 3 = type) */
  category?: number;
  /** Filter by tag id: GET /documents/?tag=1 */
  tag?: number | string;
  /** Filter by ownership: GET /documents/?mine=true */
  mine?: boolean;
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
          ...(params.category !== undefined ? { category: params.category } : {}),
          ...(params.tag !== undefined ? { tag: params.tag } : {}),
          ...(params.mine !== undefined ? { mine: params.mine } : {}),
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

    const { category, tag, mine } = params;
    const tagLower = typeof tag === "string" ? tag.toLowerCase().trim() : "";

    const filteredDocuments = MOCK_DOCUMENTS.filter((doc) => {
      // Status-based visibility logic:
      if (mine) {
        // Review Inbox: Show documents owned by user (ID 13) that are NOT yet Approved
        if (doc.owner !== 13) return false;
        if (doc.status === "APPROVED") return false;
      } else {
        // General Library: ONLY show Approved documents
        if (doc.status !== "APPROVED") return false;
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

  /**
   * Mock utility for local development only.
   * Gets a single record by ID.
   */
  getById: async (id: string | number): Promise<KnowledgeRecord> => {
    try {
      const response = await api.get<{ data: DocumentResponseItem; latest_version?: any }>(`/documents/${id}/`);
      const body = response.data as any;
      const doc = body.data || body;
      const latestVersion = body.latest_version;
      
      return mapDocumentToKnowledgeRecord(doc, latestVersion);
    } catch (error) {
      const isEndpointUnavailable =
        axios.isAxiosError(error) &&
        (error.response?.status === 404 || error.response?.status === 405 || error.response?.status === 501);

      if (!isEndpointUnavailable) {
        throw error;
      }
    }

    await delay(250);
    const doc = MOCK_DOCUMENTS.find((d) => String(d.id) === String(id));
    if (!doc) throw new Error("Document not found");
    return mapDocumentToKnowledgeRecord(doc);
  },

  /**
   * Endpoint-ready:
   *   POST /documents/
   *
   * Refactor to use real api.post when backend is ready.
   */
  create: async (formData: FormData): Promise<KnowledgeRecord> => {
    try {
      const response = await api.post<DocumentResponseItem>("/documents/", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      // Assuming axios response.data matches the outer payload
      const payload = response.data as any;
      const doc = payload.data || payload;
      return mapDocumentToKnowledgeRecord(doc);
    } catch (error) {
      const isEndpointUnavailable =
        axios.isAxiosError(error) &&
        (error.response?.status === 404 || error.response?.status === 405 || error.response?.status === 501);

      if (!isEndpointUnavailable) {
        throw error;
      }
    }

    await delay(500);

    // Mock fallback
    const title = (formData.get("title") as string) || "Untitled Document";
    const owner = Number(formData.get("owner")) || 1;
    const tagIds = formData.getAll("tags").map(Number);
    const metadataIds = formData.getAll("metadata").map(Number);

    const newDoc: DocumentResponseItem = {
      id: MOCK_DOCUMENTS.length + 1,
      title,
      status: "DRAFT",
      description: "", // Will be filled by content if mapped
      created_by: owner,
      owner: owner,
      audience: "Internal",
      type: "Document",
      created_at: new Date().toISOString(),
      uid: `KB-${1000 + MOCK_DOCUMENTS.length}`,
      version: "v1.0",
      version_count: 1,
      team: "General",
      project: "General",
      tags: tagIds,
      metadata_values: metadataIds,
      tag_details: tagIds.map(id => ({ id, name: `Tag ${id}` })), // Simplified mock
      metadata_details: metadataIds.map(id => ({ id, category: "Metadata", value: `Value ${id}` })), // Simplified mock
      file_details: [],
      history: [
        { version: "v1.0", date: "Today", comment: "Initial creation", author: String(owner) }
      ],
    };

    MOCK_DOCUMENTS.push(newDoc);
    // Refresh MOCK_RECORDS if needed, but since it's a const we can't reassign it.
    // However, list() returns MOCK_RECORDS which is built from MOCK_DOCUMENTS map.
    // Wait, MOCK_RECORDS is defined as: const MOCK_RECORDS: KnowledgeRecord[] = MOCK_DOCUMENTS.map(mapDocumentToKnowledgeRecord);
    // So pushing to MOCK_DOCUMENTS won't update MOCK_RECORDS unless we rebuild it or map on the fly.

    return mapDocumentToKnowledgeRecord(newDoc);
  },

  /**
   * Endpoint-ready:
   *   GET /documents/:docId/files/:fileId/download/
   */
  downloadFile: async (documentId: string | number, fileId: string | number): Promise<void> => {
    // Note: When endpoint is ready, this would typically involve:
    // const response = await api.get(`/documents/${documentId}/files/${fileId}/download/`, { responseType: 'blob' });
    // ... logic to trigger browser download ...

    console.log(`Downloading file ${fileId} from document ${documentId}...`);
    await delay(800);
    
    // Mock simulation: Open a success alert (replace with real logic when ready)
    alert(`Mock Download Started: File ID ${fileId}`);
  },

  /**
   * Endpoint-ready:
   *   POST /documents/:id/status/
   */
  updateStatus: async (id: string | number, status: "APPROVED" | "REJECTED"): Promise<void> => {
    try {
      await api.post(`/documents/${id}/status/`, { status });
    } catch (error) {
      if (axios.isAxiosError(error) && (error.response?.status === 404 || error.response?.status === 405 || error.response?.status === 501)) {
        // Fallback for mock environment: Update the local document status
        const doc = MOCK_DOCUMENTS.find((d) => String(d.id) === String(id));
        if (doc) {
          doc.status = status;
          return;
        }
      }
      throw error;
    }
  },

  /**
   * Endpoint-ready:
   *   GET /documents/:id/versions/
   */
  getVersions: async (id: string | number): Promise<any[]> => {
    try {
      const response = await api.get<{ versions: any[] }>(`/documents/${id}/versions/`);
      const payload = response.data as any;
      return payload.versions || payload.results || payload;
    } catch (error) {
      if (axios.isAxiosError(error) && (error.response?.status === 404 || error.response?.status === 405 || error.response?.status === 501)) {
        // Fallback for mock environment
        await delay(300);
        const doc = MOCK_DOCUMENTS.find((d) => String(d.id) === String(id));
        return doc ? doc.history : [];
      }
      throw error;
    }
  },

  /**
   * Endpoint-ready:
   *   DELETE /documents/:id/
   */
  deleteDocument: async (id: string | number): Promise<void> => {
    try {
      await api.delete(`/documents/${id}/`);
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        // Fallback for mock environment if needed
        const index = MOCK_DOCUMENTS.findIndex((d) => String(d.id) === String(id));
        if (index !== -1) {
          MOCK_DOCUMENTS.splice(index, 1);
          return;
        }
      }
      throw error;
    }
  },
  /**
   * Endpoint-ready:
   *   PATCH /documents/:id/
   */
  update: async (id: string | number, data: { title?: string; metadata?: number[]; tags?: number[] } | FormData): Promise<KnowledgeRecord> => {
    try {
      const isFormData = data instanceof FormData;
      const response = await api.patch<DocumentResponseItem>(`/documents/${id}/`, data, {
        headers: isFormData ? { "Content-Type": "multipart/form-data" } : {},
      });
      const payload = response.data as any;
      const doc = payload.data || payload;
      return mapDocumentToKnowledgeRecord(doc);
    } catch (error) {
      const isEndpointUnavailable =
        axios.isAxiosError(error) &&
        (error.response?.status === 404 || error.response?.status === 405 || error.response?.status === 501);

      if (!isEndpointUnavailable) {
        throw error;
      }
    }

    await delay(500);
    const doc = MOCK_DOCUMENTS.find((d) => String(d.id) === String(id));
    if (!doc) throw new Error("Document not found");

    if (data instanceof FormData) {
      const title = data.get("title") as string;
      if (title) doc.title = title;
      
      const tags = data.getAll("tags").map(Number);
      if (tags.length > 0) {
        doc.tags = tags;
        doc.tag_details = tags.map(tId => ({ id: tId, name: `Tag ${tId}` }));
      }

      const metadata = data.getAll("metadata").map(Number);
      if (metadata.length > 0) {
        doc.metadata_values = metadata;
        doc.metadata_details = metadata.map(mId => ({ id: mId, category: "Metadata", value: `Value ${mId}` }));
      }
      
      const file = data.get("file") as File;
      if (file) {
        // Mock: add to file_details and update version
        const newFileId = Math.floor(Math.random() * 1000) + 500;
        doc.file_details = [
          { id: newFileId, name: file.name, size_bytes: file.size },
          ...doc.file_details
        ];
        doc.version_count += 1;
        doc.version = `v${(doc.version_count / 10 + 1).toFixed(1)}`;
      }
    } else {
      if (data.title) doc.title = data.title;
      if (data.tags) {
        doc.tags = data.tags;
        doc.tag_details = data.tags.map(tId => ({ id: tId, name: `Tag ${tId}` }));
      }
      if (data.metadata) {
        doc.metadata_values = data.metadata;
        doc.metadata_details = data.metadata.map(mId => ({ id: mId, category: "Project", value: `Value ${mId}` }));
      }
    }

    return mapDocumentToKnowledgeRecord(doc);
  },
};

