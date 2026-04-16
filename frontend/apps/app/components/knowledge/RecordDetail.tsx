"use client";
import React, { useState } from "react";
import { FileText, X, Lock, Loader2, Download, CheckCircle2, XCircle } from "lucide-react";
import { Record } from "./RecordList";
import { cn } from "@/lib/utils";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { knowledgeRecords } from "@dmt/api";
import { usePermissions } from "@/hooks/usePermissions";
import { RECORD_QUERY_KEYS } from "@/features/knowledge-base/api/query-keys";
import { useRecordVersions } from "@/features/knowledge-base/hooks/useKnowledgeRecords";

interface RecordDetailProps {
  record: Record | null;
  onClose?: () => void;
  onEdit?: (record: Record) => void;
  currentUser: string;
  isLoading?: boolean;
}

export const RecordDetail: React.FC<RecordDetailProps> = ({ record, onClose, onEdit, currentUser, isLoading }) => {
  const queryClient = useQueryClient();
  const { isManager } = usePermissions();
  const [downloadingFileId, setDownloadingFileId] = useState<string | null>(null);

  const workflowMutation = useMutation({
    mutationFn: ({ id, status }: { id: string | number; status: "APPROVED" | "REJECTED" }) => 
      knowledgeRecords.updateStatus(id, status),
    onSuccess: () => {
      // Refresh list and detail to reflect the status change
      queryClient.invalidateQueries({ queryKey: RECORD_QUERY_KEYS.all });
      if (record?.id) {
        queryClient.invalidateQueries({ queryKey: RECORD_QUERY_KEYS.detail(record.id) });
      }
    },
    onError: (err) => {
      console.error("Workflow update failed:", err);
      alert("Failed to update status. Please try again.");
    }
  });

  const handleStatusChange = (status: "APPROVED" | "REJECTED") => {
    if (!record) return;
    workflowMutation.mutate({ id: record.id, status });
  };

  const handleDownload = async (fileId: string | number) => {
    if (!record) return;
    setDownloadingFileId(String(fileId));
    try {
      await knowledgeRecords.downloadFile(record.id, fileId);
    } catch (error) {
      console.error("Download failed:", error);
    } finally {
      setDownloadingFileId(null);
    }
  };

  if (!record) {
    return (
      <div className="hidden xl:flex w-[300px] flex-shrink-0 bg-background/40 backdrop-blur-sm border-l border-border/40 p-8 flex-col items-center justify-center text-center">
        <div className="w-20 h-20 bg-primary/5 rounded-full flex items-center justify-center mb-6">
          <FileText className="w-10 h-10 text-primary/20" />
        </div>
        <h3 className="text-lg font-bold text-foreground">Select a record</h3>
        <p className="text-sm text-muted-foreground mt-2 max-w-[200px]">
          Select a record from the list to view its details and version history.
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Mobile Backdrop */}
      <div
        className={cn(
          "fixed inset-0 bg-background/80 backdrop-blur-sm z-40 xl:hidden transition-opacity duration-300",
          record ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      />

      <aside className={cn(
        "fixed inset-y-0 right-0 z-50 w-full sm:w-[300px] bg-background border-l border-border/40 flex flex-col h-full overflow-y-auto transition-transform duration-300 transform shadow-2xl xl:shadow-none xl:static xl:translate-x-0 relative",
        record || isLoading ? "translate-x-0" : "translate-x-full"
      )}>
        {isLoading && (
          <div className="absolute inset-0 bg-background/50 backdrop-blur-[1px] z-10 flex flex-col items-center justify-center p-8 text-center">
            <Loader2 className="w-8 h-8 text-primary animate-spin mb-4" />
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
              Fetching details...
            </p>
          </div>
        )}
        <div className="p-6">
          {/* Mobile Close Button */}
          <button
            onClick={onClose}
            className="xl:hidden absolute top-4 right-4 p-2 hover:bg-secondary rounded-full text-muted-foreground mb-4"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Top Label and Action Buttons */}
          <div className="flex items-center justify-between mb-6">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.2em]">
              Document
            </span>
            <div className="flex gap-2">
              {isManager && (
                <button
                  onClick={() => record && onEdit?.(record)}
                  className="px-4 py-1.5 bg-secondary/50 hover:bg-secondary text-foreground rounded-lg border border-border/40 text-sm font-semibold transition-all active:scale-95 shadow-sm"
                >
                  Edit
                </button>
              )}
            </div>
          </div>

          {/* Title and Description */}
          <div className="mb-6">
            <h3 className="text-xl font-semibold text-foreground leading-tight mb-2">
              {record.title}
            </h3>
            <p className="text-[13px] text-muted-foreground leading-snug">
              {record.description}
            </p>
          </div>

          {/* Info Grid (Status, Updated, Type, Versions) */}
          <div className="grid grid-cols-2 gap-x-12 gap-y-5 py-5 border-t border-border/40">
            <div>
              <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.2em] mb-2 text-foreground/40">Status</h3>
              <div className={cn(
                "inline-flex items-center gap-2 px-3 py-1 rounded-md text-[11px] font-semibold",
                record.status === "Approved" && "bg-emerald-500/10 text-emerald-600",
                record.status === "Rejected" && "bg-rose-500/10 text-rose-600",
                record.status === "Draft" && "bg-primary/10 text-primary"
              )}>
                {record.status}
              </div>
            </div>
            <div>
              <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.2em] mb-2 text-foreground/40">Updated</h3>
              <span className="text-sm font-semibold text-foreground">{record.date.split(',')[0]}</span>
            </div>
            <div>
              <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.2em] mb-2 text-foreground/40">Type</h3>
              <span className="text-sm font-semibold text-foreground">{record.type}</span>
            </div>
            <div>
              <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.2em] mb-2 text-foreground/40">Versions</h3>
              <span className="text-sm font-semibold text-foreground">{record.versionCount}</span>
            </div>
          </div>

          {/* Metadata Section */}
          <div className="pt-6 border-t border-border/40">
            <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.2em] mb-4 text-foreground/40">Metadata</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.2em]">Owner</span>
                <span className="text-sm font-semibold text-foreground text-right">{record.owner}</span>
              </div>
              <div className="flex items-center justify-between pt-3 border-t border-border/20">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.2em]">Audience</span>
                <span className="text-sm font-semibold text-foreground text-right">{record.audience}</span>
              </div>
              <div className="flex items-center justify-between pt-3 border-t border-border/20">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.2em]">Project</span>
                <span className="text-sm font-semibold text-foreground text-right">{record.project}</span>
              </div>
              <div className="flex items-center justify-between pt-3 border-t border-border/20">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.2em]">Team</span>
                <span className="text-sm font-semibold text-foreground text-right">{record.team}</span>
              </div>
              <div className="flex items-center justify-between pt-3 border-t border-border/20">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.2em]">Document ID</span>
                <span className="text-sm font-semibold text-foreground text-right">{record.uid}</span>
              </div>
            </div>
          </div>

          {/* Tags Section */}
          <div className="mt-8 pt-6 border-t border-border/40">
            <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.2em] mb-4 text-foreground/40">Tags</h3>
            <div className="flex flex-wrap gap-2">
              {record.tags.map(tag => (
                <span key={tag} className="px-3 py-1 bg-background text-[12px] font-medium text-foreground rounded-lg border border-border/60 cursor-default">
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* Assets Section */}
          <div className="mt-8 pt-6 border-t border-border/40">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.2em] text-foreground/40">Assets</h3>
              {!record.status.includes("Approved") && (
                <span className="text-[9px] font-bold text-primary/60 uppercase tracking-widest bg-primary/5 px-2 py-0.5 rounded border border-primary/10">Private Draft</span>
              )}
            </div>

            <div className="space-y-3">
              {record.status === "Approved" || record.owner === currentUser ? (
                record.assets.length > 0 ? (
                  record.assets.map((asset, index) => {
                    const isDownloading = downloadingFileId === String(asset.name); // Using name as ID for mock
                    return (
                      <div 
                        key={asset.name} 
                        onClick={() => !isDownloading && handleDownload(asset.name)}
                        className={cn(
                          "group/asset flex items-center justify-between py-2 px-2 -mx-2 rounded-lg transition-all cursor-pointer hover:bg-secondary/50 active:scale-[0.98]",
                          index !== record.assets.length - 1 && "mb-1"
                        )}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-md bg-secondary flex items-center justify-center shrink-0">
                            {isDownloading ? (
                              <Loader2 className="w-4 h-4 text-primary animate-spin" />
                            ) : (
                              <FileText className="w-4 h-4 text-muted-foreground group-hover/asset:text-primary transition-colors" />
                            )}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="text-[13px] font-semibold text-foreground truncate max-w-[180px]">
                              {asset.name}
                            </span>
                            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-tight">
                              {asset.size}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 opacity-0 group-hover/asset:opacity-100 transition-opacity">
                          <Download className="w-4 h-4 text-muted-foreground hover:text-primary transition-colors" />
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-sm text-muted-foreground italic">No assets available</p>
                )
              ) : (
                <div className="p-5 bg-secondary/20 rounded-2xl border border-border/10 flex flex-col items-center text-center">
                  <div className="w-10 h-10 bg-background rounded-full flex items-center justify-center mb-3 shadow-sm border border-border/10">
                    <Lock className="w-4 h-4 text-muted-foreground/40" />
                  </div>
                  <h4 className="text-[11px] font-bold text-foreground uppercase tracking-widest mb-1.5">Restricted Access</h4>
                  <p className="text-[10px] font-medium text-muted-foreground/60 leading-relaxed max-w-[180px]">
                    Assets are private during the review phase. Only the owner can approve them for public view.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Version History Section */}
          <VersionHistoryList recordId={record.id} initialHistory={record.history} />
        </div>
      </aside>
    </>
  );
};

/**
 * Sub-component to handle dynamic version history fetching and rendering.
 */
const VersionHistoryList: React.FC<{ recordId: string | number; initialHistory: any[] }> = ({ recordId, initialHistory }) => {
  const { versions, isLoading, isError } = useRecordVersions(recordId);

  // Fallback to initial history from the list fetch if versions are still loading or errored,
  // but show a subtle loading indicator if we're actually fetching live data.
  const displayHistory = isLoading ? initialHistory : versions;

  return (
    <div className="mt-8 pt-6 border-t border-border/40">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.2em] text-foreground/40">
          Version History
        </h3>
        {isLoading && (
          <Loader2 className="w-3 h-3 text-primary animate-spin" />
        )}
      </div>
      
      <div className="space-y-6">
        {displayHistory.length > 0 ? (
          displayHistory.map((item: any, index: number) => (
            <div key={item.version} className={cn(
              "space-y-2.5",
              index !== displayHistory.length - 1 && "pb-5 border-b border-border/20"
            )}>
              <div className="flex items-center justify-between">
                <span className="text-lg font-semibold text-foreground">{item.version}</span>
                <span className="text-sm font-medium text-muted-foreground">{item.date}</span>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">
                  {item.author}
                </p>
                <p className="text-[14px] text-foreground font-medium leading-snug">
                  {item.comment}
                </p>
              </div>
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground italic">No version history found.</p>
        )}
      </div>
    </div>
  );
};


