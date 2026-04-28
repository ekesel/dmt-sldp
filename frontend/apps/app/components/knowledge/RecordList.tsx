"use client";
import React, { useState } from "react";
import { FileText, ArrowUpRight, Loader2, Paperclip, Download, Trash2, Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { useRecords } from "@/features/knowledge-base/hooks/useKnowledgeRecords";
import { usePermissions } from "@/hooks/usePermissions";
import { useAuth } from "@/context/AuthContext";
import { KnowledgeRecord, RecordSearchParams, knowledgeRecords } from "@dmt/api";
import { RECORD_QUERY_KEYS } from "@/features/knowledge-base/api/query-keys";
import { CheckCircle2, XCircle } from "lucide-react";
import { useUsers } from "@/features/knowledge-base/hooks/useUsers";
import { toast } from "react-hot-toast";

// Re-export KnowledgeRecord as Record so the rest of the app keeps compiling
export type { KnowledgeRecord as Record } from "@dmt/api";


interface RecordCardProps {
  record: KnowledgeRecord;
  isSelected: boolean;
  onDownload: (e: React.MouseEvent) => void;
  onView: (e: React.MouseEvent) => void;
  onDelete: (e: React.MouseEvent) => void;
  isDownloading: boolean;
  isViewing: boolean;
  isDeleting: boolean;
  isManager: boolean;
  isOwner: boolean;
  onApprove: (e: React.MouseEvent) => void;
  onReject: (e: React.MouseEvent) => void;
  isUpdatingStatus: boolean;
  onClick: () => void;
  onTagClick?: (tag: { id: number | string; name: string }) => void;
  resolveUserName: (userId: string | number) => string;
}

const RecordCard: React.FC<RecordCardProps> = ({
  record,
  isSelected,
  onClick,
  onDownload,
  onView,
  onDelete,
  isDownloading,
  isViewing,
  isDeleting,
  isManager,
  isOwner,
  onApprove,
  onReject,
  isUpdatingStatus,
  onTagClick,
  resolveUserName
}) => {
  return (
    <div
      onClick={onClick}
      className={cn(
        "group relative p-3 lg:p-4 border rounded-lg transition-all duration-300 cursor-pointer hover:shadow-md hover:shadow-primary/5",
        isSelected
          ? "bg-primary/10 border-primary/40 shadow-sm"
          : "bg-background/60 border-border/40 hover:bg-background/80 hover:border-primary/20"
      )}
    >
      <div className="flex items-center gap-3 lg:gap-4">
        <div className={cn(
          "w-8 h-8 lg:w-10 lg:h-10 rounded-lg flex items-center justify-center transition-all duration-300 shadow-sm shrink-0",
          isSelected ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary group-hover:bg-primary/15"
        )}>
          <FileText className="w-4 h-4 lg:w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mb-1.5 sm:mb-0.5">
            <h3 className="text-sm lg:text-base font-bold text-foreground truncate group-hover:text-foreground/80 transition-colors duration-300">
              {record.title}
            </h3>
            <span className="text-[9px] lg:text-[10px] font-bold px-1.5 py-0.5 bg-primary/10 text-primary/70 rounded border border-primary/20 uppercase tracking-tighter shrink-0 self-start sm:self-auto">
              {record.version}
            </span>
            <span className={cn(
              "text-[9px] lg:text-[10px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-tighter shrink-0 self-start sm:self-auto shadow-sm",
              record.status === "Approved" ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" :
                record.status === "Rejected" ? "bg-rose-500/10 text-rose-600 border-rose-500/20" :
                  "bg-primary/10 text-primary border-primary/20"
            )}>
              {record.status}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-x-3 lg:gap-x-4 gap-y-1 text-[9px] lg:text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            <span className="flex items-center gap-1">
              <span className="text-foreground/40 font-bold">By</span> {resolveUserName(record.author)}
            </span>
            <span className="hidden sm:inline w-1 h-1 bg-border rounded-full" />
            <span className="flex items-center gap-1">
              <span className="text-foreground/40 font-bold">Updated</span> {record.date}
            </span>
            <span className="hidden sm:inline w-1 h-1 bg-border rounded-full" />
            <span className="flex items-center gap-1 min-w-0">
              <Paperclip className="w-3 h-3 shrink-0" />
              <span className="text-foreground/40 font-bold">Files</span>
              <span className="truncate normal-case tracking-normal">
                {record.filesPreview.total > 0
                  ? `${record.filesPreview.total} • ${record.filesPreview.firstFileName ?? "Attached"} • ${record.filesPreview.totalSize}`
                  : "No files"}
              </span>
            </span>
          </div>

          {/* Tags Section added back */}
          {record.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {record.tags.map(tag => (
                <button
                  key={tag}
                  onClick={(e) => {
                    e.stopPropagation();
                    onTagClick?.({ id: tag, name: tag }); // Fallback for string-based tags
                  }}
                  className="px-2 py-0.5 bg-secondary/50 text-[9px] font-bold text-muted-foreground hover:text-primary hover:bg-primary/10 rounded border border-border/40 transition-colors uppercase tracking-tight"
                >
                  {tag}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1">

            <button
              onClick={onView}
              disabled={record.versionCount === 0 || isViewing}
              className={cn(
                "p-2 rounded-lg transition-all border border-primary/10 bg-primary/5 hover:bg-primary/10 active:scale-95 disabled:opacity-50 text-primary",
                "shadow-sm"
              )}
              title={record.versionCount > 0 ? "View online" : "No file available to view"}
            >
              {isViewing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>

            <button
              onClick={onDownload}
              disabled={record.versionCount === 0 || isDownloading}
              className={cn(
                "p-2 rounded-lg transition-all border border-emerald-500/10 bg-emerald-500/5 hover:bg-emerald-500/10 active:scale-95 disabled:opacity-50 text-emerald-600",
                "shadow-sm"
              )}
              title={record.versionCount > 0 ? "Download latest version" : "No file available to download"}
            >
              {isDownloading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
            </button>
          </div>



          {isManager && record.status !== "Approved" && record.status !== "Rejected" && (
            <div className="flex items-center gap-1.5 ml-2 border-l border-border/40 pl-3">
              <button
                onClick={onApprove}
                disabled={isUpdatingStatus}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 rounded-lg border border-emerald-500/20 text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50"
                title="Approve document"
              >
                {isUpdatingStatus ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                )}
                Approve
              </button>
              <button
                onClick={onReject}
                disabled={isUpdatingStatus}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 rounded-lg border border-rose-500/20 text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50"
                title="Reject document"
              >
                {isUpdatingStatus ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <XCircle className="w-3.5 h-3.5" />
                )}
                Reject
              </button>
            </div>
          )}
          {isManager && (
            <button
              onClick={onDelete}
              disabled={isDeleting}
              className={cn(
                "p-2 rounded-lg transition-all border border-transparent hover:border-destructive/20 hover:bg-destructive/5 active:scale-95 disabled:opacity-50 text-muted-foreground hover:text-destructive"
              )}
              title="Delete document"
            >
              {isDeleting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
            </button>
          )}


        </div>
      </div>
    </div>
  );
};

interface RecordListProps {
  selectedId: string | null;
  /** Sidebar-selected team value — used when no search is active */
  activeTeam?: string;
  /** Forwarded directly to GET /records/?search= */
  search?: string;
  /** Forwarded directly to GET /records/?category= */
  category?: number;
  /** Forwarded directly to GET /documents/?tag= */
  tag?: number | string;
  /** Filter by ownership: GET /documents/?mine=true */
  mine?: boolean;
  onSelect: (record: KnowledgeRecord) => void;
  onTagClick?: (tag: { id: number | string; name: string }) => void;
  onDeleteSuccess?: (id: string | number) => void;
}

export const RecordList: React.FC<RecordListProps> = ({
  selectedId,
  activeTeam,
  search,
  category,
  tag,
  mine,
  onSelect,
  onTagClick,
  onDeleteSuccess,
}) => {
  const queryClient = useQueryClient();
  const { isManager } = usePermissions();
  const { managers } = useUsers();
  const { user } = useAuth();
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [viewingId, setViewingId] = useState<string | null>(null);

  // Helper to find username by ID
  const resolveUserName = (userId: string | number) => {
    if (!userId) return "Unknown";
    const user = managers.find(m => String(m.id) === String(userId));
    return user ? user.username : `User #${userId}`;
  };

  // Debug log to help identify why buttons might be missing
  React.useEffect(() => {
    if (user) console.log("Current User ID:", user.id);
  }, [user]);

  const workflowMutation = useMutation({
    mutationFn: ({ id, status }: { id: string | number; status: "APPROVED" | "REJECTED" | "UNDER_REVIEW" }) =>
      knowledgeRecords.updateStatus(id, status),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: RECORD_QUERY_KEYS.all });
      queryClient.invalidateQueries({ queryKey: RECORD_QUERY_KEYS.detail(variables.id) });
    },
    onError: (err) => {
      console.error("Workflow update failed:", err);
      toast.error("Failed to update status. Please try again.");
    }
  });

  const handleStatusChange = (e: React.MouseEvent, record: KnowledgeRecord, status: "APPROVED" | "REJECTED" | "UNDER_REVIEW") => {
    e.stopPropagation();
    workflowMutation.mutate({ id: record.id, status });
  };

  const deleteMutation = useMutation({
    mutationFn: (id: string | number) => knowledgeRecords.deleteDocument(id),
    onSuccess: (_, deletedId) => {
      queryClient.invalidateQueries({ queryKey: RECORD_QUERY_KEYS.all });
      onDeleteSuccess?.(deletedId);
    },
    onError: (error) => {
      console.error("Deletion failed:", error);
      toast.error("Failed to delete the document. Please check your permissions.");
    }
  });

  const handleDelete = async (e: React.MouseEvent, record: KnowledgeRecord) => {
    e.stopPropagation();
    if (!isManager) return;

    if (window.confirm(`Are you sure you want to delete "${record.title}"? This action cannot be undone.`)) {
      deleteMutation.mutate(record.id);
    }
  };


  const handleQuickDownload = async (e: React.MouseEvent, record: KnowledgeRecord) => {
    e.stopPropagation();
    setDownloadingId(record.id);
    try {
      let fileUrl = record.fileUrl;
      let fileName = record.filesPreview.firstFileName || record.title;

      // Lazy-load fileUrl if missing from list view
      if (!fileUrl && record.id) {
        const fullDetail = await knowledgeRecords.getById(record.id);
        fileUrl = fullDetail.fileUrl;
        fileName = fullDetail.filesPreview.firstFileName || fullDetail.title;
      }

      if (!fileUrl) {
        toast.error("Could not locate a file for this document.");
        return;
      }

      await knowledgeRecords.downloadFile(fileUrl, fileName);
    } catch (error) {
      console.error("Quick download failed:", error);
    } finally {
      setDownloadingId(null);
    }
  };

  const handleQuickView = async (e: React.MouseEvent, record: KnowledgeRecord) => {
    e.stopPropagation();
    setViewingId(record.id);
    try {
      let fileUrl = record.fileUrl;

      // Lazy-load fileUrl if missing from list view
      if (!fileUrl && record.id) {
        const fullDetail = await knowledgeRecords.getById(record.id);
        fileUrl = fullDetail.fileUrl;
      }

      if (!fileUrl) {
        toast.error("Could not locate a file for this document.");
        return;
      }

      await knowledgeRecords.viewFile(fileUrl);
    } catch (error) {
      console.error("Quick view failed:", error);
    } finally {
      setViewingId(null);
    }
  };

  const searchParams: RecordSearchParams = {
    category: category,
    tag: tag,
    mine: mine,
    search: search,
  };

  const { records, isLoading, isFetching, isError } = useRecords(searchParams);

  const isSearching = !!(search || category || tag);

  const displayRecords = React.useMemo(() => {
    // Start with the records from the API (which may be filtered by category, tag, or search term)
    let filtered = records;

    // Further refine by the specific metadata value (Team/Project/etc.) selected in the sidebar
    if (activeTeam) {
      filtered = filtered.filter((r) =>
        r.metadata.some(m => m.value.toLowerCase() === activeTeam.toLowerCase())
      );
    }

    // Sort "Under Review" to the top in Document Review mode
    if (mine) {
      filtered = [...filtered].sort((a, b) => {
        const aIsUnderReview = a.status === "Under Review";
        const bIsUnderReview = b.status === "Under Review";
        if (aIsUnderReview && !bIsUnderReview) return -1;
        if (!aIsUnderReview && bIsUnderReview) return 1;
        return 0;
      });
    }

    return filtered;
  }, [records, activeTeam, mine]);

  if (isLoading) {
    return (
      <div className="p-12 text-center">
        <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-12 text-center">
        <p className="text-sm font-bold text-destructive uppercase tracking-widest">Failed to load records</p>
      </div>
    );
  }

  return (
    <div className="p-2 lg:p-4 xl:p-6 space-y-3 max-w-5xl mx-auto">
      {isFetching && !isLoading && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground pb-1">
          <Loader2 className="w-3 h-3 animate-spin" />
          <span>Updating…</span>
        </div>
      )}
      <div className="space-y-3">
        {displayRecords.length > 0 ? (
          displayRecords.map((record) => (
            <RecordCard
              key={record.id}
              record={record}
              isSelected={selectedId === record.id}
              isManager={isManager}
              isOwner={String(user?.id) === record.owner}
              onClick={() => onSelect(record)}
              onDownload={(e) => handleQuickDownload(e, record)}
              isDownloading={downloadingId === record.id}
              onView={(e) => handleQuickView(e, record)}
              isViewing={viewingId === record.id}
              onDelete={(e) => handleDelete(e, record)}
              onApprove={(e) => handleStatusChange(e, record, "APPROVED")}
              onReject={(e) => handleStatusChange(e, record, "REJECTED")}
              isDeleting={deleteMutation.isPending && deleteMutation.variables === record.id}
              isUpdatingStatus={workflowMutation.isPending && workflowMutation.variables?.id === record.id}
              onTagClick={onTagClick}
              resolveUserName={resolveUserName}
            />
          ))
        ) : (
          <div className="p-12 text-center bg-background/40 rounded-3xl border border-dashed border-border/60">
            <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">
              {mine ? "No documents for review" : isSearching ? "No records match your search" : "No records found for this team"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
