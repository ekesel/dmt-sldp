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
  date: string;
  createdAt: string;
  description: string;
  uid: string;
  tags: string[];
  /** category_id → value pairs */
  metadata: { category: number; category_name: string; value: string; value_id?: number | string }[];
  assets: { name: string; size: string; url?: string }[];
  filesPreview: {
    total: number;
    firstFileName: string | null;
    totalSize: string;
  };
  fileUrl?: string; // from latest_version.file
}

export interface RecordVersionUI {
  version: string;
  date: string;
  author: string;
  comment: string;
  fileUrl: string;
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
  file?: string;
  file_url?: string;
}

interface DocumentResponseItem {
  id: number;
  title: string;
  
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
  latest_version?: any;
  file?: string;
  file_url?: string;
}

interface PaginatedDocumentsResponse {
  count?: number;
  next?: string | null;
  previous?: string | null;
  results?: DocumentResponseItem[];
}


const formatFileSize = (sizeBytes: number): string => {
  if (sizeBytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(sizeBytes) / Math.log(k));
  return parseFloat((sizeBytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

/** Normalizes relative paths to absolute URLs using the API's base URL */
const ensureAbsoluteUrl = (url?: string): string | undefined => {
  if (!url) return undefined;

  // If it's already an absolute URL (http, https, blob, data, or //), use it as-is
  if (/^((https?|blob|data):|\/\/)/i.test(url)) return url;

  const apiBase = api.defaults.baseURL || "";
  const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
  const isLocal = hostname === 'localhost' || hostname === '127.0.0.1' || hostname.endsWith('.localhost');
  const protocol = typeof window !== 'undefined' ? window.location.protocol : 'https:';
  const cleanProtocol = protocol.endsWith(':') ? protocol : `${protocol}:`;

  let mediaBaseUrl = "";
  if (apiBase && apiBase.startsWith('http')) {
    const urlObj = new URL(apiBase);
    // Strip 'api.' from hostname as media is usually served from the main domain or tenant subdomain
    const cleanHost = urlObj.host.replace(/^api\./, "");
    mediaBaseUrl = `${urlObj.protocol}//${cleanHost}`;
  } else {
    mediaBaseUrl = isLocal 
      ? `${cleanProtocol}//${window.location.host}` 
      : "https://samta.elevate.samta.ai";
  }

  // Cleanly join to ensure no duplicate slashes
  const cleanBase = mediaBaseUrl.endsWith("/") ? mediaBaseUrl.slice(0, -1) : mediaBaseUrl;
  const cleanPath = url.startsWith("/") ? url : `/${url}`;

  const result = `${cleanBase}${cleanPath}`;
  return result;
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

  const record = {
    id: String(doc.id),
    title: doc.title,
    version: latestVersion?.version_number ? `v${latestVersion.version_number}.0` : (doc.version || "v1.0"),
    versionCount: doc.version_count || (latestVersion?.version_number || 1),
    author: String(doc.created_by),
    owner: String(doc.owner),
    date: formatDateLabel(doc.created_at),
    createdAt: doc.created_at,
    description: doc.description || "",
    uid: doc.uid || `KB-${doc.id}`,
    tags: (() => {
      const rawTags = (doc.tag_details && doc.tag_details.length > 0) ? doc.tag_details : (doc.tags || []);
      return (rawTags as any[]).map(t => {
        if (typeof t === 'string') return t;
        if (typeof t === 'object' && t !== null && 'name' in t) return t.name;
        return String(t);
      }).filter(t => t && t !== "[object Object]");
    })(),
    metadata: [
      ...rawMetadata.map((item) => ({
        category: item.category_id ?? 0,
        category_name: item.category,
        value: item.value,
        value_id: item.id,
      })),
      // Fallback for top-level legacy fields if missing from metadata_details
      ...((doc.project && !rawMetadata.some(m => m.category.toLowerCase() === 'project'))
        ? [{ category: 1, category_name: 'Project', value: doc.project }] : []),
      ...((doc.team && !rawMetadata.some(m => m.category.toLowerCase() === 'team'))
        ? [{ category: 2, category_name: 'Team', value: doc.team }] : []),
      ...((doc.type && !rawMetadata.some(m => m.category.toLowerCase() === 'type'))
        ? [{ category: 3, category_name: 'Type', value: doc.type }] : [])
    ],
    assets: fileDetails.map((file) => ({
      name: file.name,
      size: formatFileSize(file.size_bytes || 0),
      url: ensureAbsoluteUrl(file.file || file.file_url),
    })),
    filesPreview: {
      total: fileDetails.length,
      firstFileName: fileDetails[0]?.name ?? null,
      totalSize: formatFileSize(totalFileBytes),
    },
    fileUrl: ensureAbsoluteUrl(
      latestVersion?.file ||
      latestVersion?.file_url ||
      doc.latest_version?.file ||
      doc.latest_version?.file_url ||
      doc.file ||
      doc.file_url ||
      (doc as any).latest_version_file ||
      (doc as any).latest_version_file_url
    ),
  };

  // If fileDetails is empty but we identified a fileUrl OR versionCount > 0, update preview count
  if (record.filesPreview.total === 0 && (record.fileUrl || record.versionCount > 0)) {
    record.filesPreview.total = Math.max(1, record.versionCount);
    record.filesPreview.firstFileName = record.filesPreview.firstFileName || "Latest Version";
    record.filesPreview.totalSize = record.fileUrl ? "View File" : "Check for versions";
  }

  return record;
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
  /** Full text search: GET /kb/documents/?search=text */
  search?: string;
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
        ...(params.search !== undefined ? { search: params.search } : {}),
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

  /**
   * Robust document download - fetches file as blob and triggers browser download.
   * Ensures auth headers are included and handles absolute/relative URLs.
   */
  downloadFile: async (
    fileUrl: string,
    fileName?: string,
    onProgress?: (progress: number) => void
  ): Promise<void> => {

    if (!fileUrl) {
      throw new Error("Invalid download URL. Please ensure the file exists.");
    }

    const absoluteUrl = ensureAbsoluteUrl(fileUrl);
    if (!absoluteUrl) {
      throw new Error("Could not construct absolute URL");
    }

    try {
      const isCrossOrigin = absoluteUrl.startsWith("http") && !absoluteUrl.includes(window.location.host);
      
      // If cross-origin, we use plain axios to avoid sending Authorization headers 
      // that might trigger CORS preflight failures on media servers.
      const requester = isCrossOrigin ? axios : api;

      const response = await requester.get(absoluteUrl, {
        responseType: 'blob',
        onDownloadProgress: (progressEvent) => {
          if (progressEvent.total && onProgress) {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            onProgress(percentCompleted);
          }
        },
      });

      // Create a blob URL and trigger download
      const blob = new Blob([response.data], { type: response.headers['content-type'] });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');

      link.href = url;
      link.setAttribute('download', fileName || fileUrl.split('/').pop() || 'download');

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      // If it's a network error or CORS issue, try the simplest fallback: a direct link
      const isNetworkError = error.message === "Network Error" || !error.response;
      
      if (isNetworkError) {
        console.warn("Download failed via script (likely CORS), attempting direct browser download.");
      } else {
        console.error("Authenticated document download failed:", error);
      }

      try {
        const link = document.createElement('a');
        link.href = absoluteUrl;
        link.setAttribute('download', fileName || fileUrl.split('/').pop() || 'download');
        link.setAttribute('target', '_blank');

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        return;
      } catch (fallbackError) {
        console.error("Fallback download failed:", fallbackError);
      }

      let errorMsg = "Failed to download file.";
      if (error.response?.status === 403) {
        errorMsg = "Access denied. You do not have permission to download this file.";
      } else if (error.response?.status === 404) {
        errorMsg = "File not found on the server.";
      }
      throw new Error(errorMsg);
    }
  },


  /** GET /kb/documents/:id/versions/ */
  getVersions: async (id: string | number): Promise<RecordVersionUI[]> => {
    const response = await api.get<any>(`/kb/documents/${id}/versions/`);
    const payload = response.data;
    const items = Array.isArray(payload) ? payload : (payload.versions || payload.results || []);

    // Map production fields to the UI-expected shape
    return (Array.isArray(items) ? items : []).map(v => ({
      version: `v${v.version_number}`,
      date: new Date(v.created_at).toLocaleDateString(undefined, {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      }),
      author: String(v.uploaded_by),
      comment: v.comment || "",
      fileUrl: ensureAbsoluteUrl(v.file || v.file_url),
    }));
  },

  /** DELETE /kb/documents/:id/ */
  deleteDocument: async (id: string | number): Promise<void> => {
    await api.delete(`/kb/documents/${id}/`);
  },

  /** 
   * PATCH /kb/documents/:id/
   * Standard metadata update (JSON)
   */
  update: async (id: string | number, data: { title?: string; metadata?: number[]; tags?: number[] }): Promise<KnowledgeRecord> => {
    const response = await api.patch<DocumentResponseItem>(`/kb/documents/${id}/`, data);
    const payload = response.data as any;
    const doc = payload.data || payload;
    return mapDocumentToKnowledgeRecord(doc);
  },

  /** 
   * POST /kb/documents/:id/upload-version/
   * Upload a new binary file for an existing document
   */
  uploadVersion: async (id: string | number, file: File): Promise<void> => {
    const formData = new FormData();
    formData.append("file", file);
    await api.post(`/kb/documents/${id}/upload-version/`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },

  /**
   * View file in new tab - fetches file as blob and opens it.
   * Ensures auth headers are included.
   */
  viewFile: async (fileUrl: string): Promise<void> => {
    if (!fileUrl) {
      throw new Error("Invalid view URL. Please ensure the file exists.");
    }

    const absoluteUrl = ensureAbsoluteUrl(fileUrl);
    if (!absoluteUrl) {
      throw new Error("Could not construct absolute URL");
    }

    // Check if it's an Office document (Word, Excel, PowerPoint)
    const isOfficeDoc = /\.(docx|doc|xlsx|xls|pptx|ppt)$/i.test(absoluteUrl);
    
    // Treat API domain and localhost as "internal" so we send Authorization headers.
    let isInternal = absoluteUrl.includes(window.location.host);
    try {
      const apiHostname = new URL(api.defaults.baseURL || "").hostname;
      if (apiHostname && absoluteUrl.includes(apiHostname)) {
        isInternal = true;
      }
    } catch (e) { /* ignore URL parse errors */ }

    if (isOfficeDoc) {
      // Google Docs Viewer needs a public URL. 
      // If the file is on production (internal API) or localhost, Google will fail.
      if (!isInternal) {
        const viewerUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(absoluteUrl)}&embedded=true`;
        window.open(viewerUrl, '_blank');
      } else {
        // Internal/Protected Office doc - online preview is not possible without a viewer.
        // We trigger an authenticated download instead of opening a broken 404/401 tab.
        await knowledgeRecords.downloadFile(fileUrl);
      }
      return;
    }

    try {
      const requester = isInternal ? api : axios;

      const response = await requester.get(absoluteUrl, {
        responseType: 'blob',
      });

      const blob = new Blob([response.data], { type: response.headers['content-type'] });
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');
    } catch (error: any) {
      console.error("Authenticated document view failed, trying fallback:", error);
      window.open(absoluteUrl, '_blank');
    }
  },

  /** Helper to get the base site URL for asset resolution */
  getBaseUrl: () => api.defaults.baseURL || "",
};
