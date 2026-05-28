"use client";
import React, { useState } from "react";
import { FileText, X, Lock, Loader2, Download, CheckCircle2, XCircle, ArrowUpRight, Eye } from "lucide-react";
import { Record } from "./RecordList";
import { cn } from "@/lib/utils";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { knowledgeRecords, RecordVersionUI } from "@dmt/api";
import { usePermissions } from "@/hooks/usePermissions";
import { RECORD_QUERY_KEYS } from "@/features/knowledge-base/api/query-keys";
import { useRecordVersions } from "@/features/knowledge-base/hooks/useKnowledgeRecords";
import { useUsers } from "@/features/knowledge-base/hooks/useUsers";
import { toast } from "react-hot-toast";

interface RecordDetailProps {
  record: Record | null;
  onClose?: () => void;
  onEdit?: (record: Record) => void;
  currentUser: string;
  isLoading?: boolean;
  onTagClick?: (tag: { id: number | string; name: string }) => void;
}

export const RecordDetail: React.FC<RecordDetailProps> = ({ record, onClose, onEdit, currentUser, isLoading, onTagClick }) => {
  const queryClient = useQueryClient();
  const { isManager } = usePermissions();
  const [downloadingFileId, setDownloadingFileId] = useState<string | null>(null);
  const [viewingFileId, setViewingFileId] = useState<string | null>(null);
  const { versions, isLoading: isLoadingVersions, isError: isErrorVersions } = useRecordVersions(record?.id ?? null);
  const { managers } = useUsers();

  const authorName = managers.find(m => String(m.id) === record?.author)?.username || 
                    (record?.author ? `User #${record.author}` : "Unknown");

  const handleDownload = async (fileUrl: string, assetName: string) => {
    if (!record || !fileUrl) return;
    setDownloadingFileId(assetName);
    try {
      await knowledgeRecords.downloadFile(fileUrl, assetName);
    } catch (error: any) {
      console.error("Download failed:", error);
      toast.error(error.message || "Failed to download the file.");
    } finally {
      setDownloadingFileId(null);
    }
  };

  const handleView = async (fileUrl: string) => {
    if (!record || !fileUrl) return;
    setViewingFileId(fileUrl);
    try {
      await knowledgeRecords.viewFile(fileUrl);
    } catch (error: any) {
      console.error("View failed:", error);
      toast.error(error.message || "Failed to view the file online.");
    } finally {
      setViewingFileId(null);
    }
  };

  if (!record) {
    return (
      <div className="hidden xl:flex w-[18.75rem] flex-shrink-0 bg-background/40 backdrop-blur-sm border-l border-border/40 p-8 flex-col items-center justify-center text-center">
        <div className="w-20 h-20 bg-primary/5 rounded-full flex items-center justify-center mb-6">
          <FileText className="w-10 h-10 text-primary/20" />
        </div>
        <h3 className="text-lg font-bold text-foreground">Select a record</h3>
        <p className="text-sm text-muted-foreground mt-2 max-w-[12.5rem]">
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
        "fixed inset-y-0 right-0 z-50 w-full sm:w-[18.75rem] bg-background border-l border-border/40 flex flex-col h-full overflow-y-auto transition-transform duration-300 transform shadow-2xl xl:shadow-none xl:static xl:translate-x-0 relative",
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
            aria-label="Close record"
            className="xl:hidden absolute top-4 right-4 p-2 hover:bg-secondary rounded-full text-muted-foreground mb-4"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Top Label and Action Buttons */}
          <div className="flex items-center justify-between mb-6">
            <span className="text-[0.625rem] font-semibold text-muted-foreground uppercase tracking-[0.2em]">
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
            <p className="text-[0.8125rem] text-muted-foreground leading-snug">
              {record.description}
            </p>
          </div>

          {/* Info Grid (Status, Updated, Type, Versions) */}
          <div className="grid grid-cols-2 gap-x-12 gap-y-5 py-5 border-t border-border/40">
            <div>
              <h3 className="text-[0.625rem] font-semibold text-muted-foreground uppercase tracking-[0.2em] mb-2 text-foreground/40">
                {record.updatedAt ? "Updated" : "Created"}
              </h3>
              <span className="text-sm font-semibold text-foreground">
                {new Date(record.updatedAt || record.createdAt).toLocaleDateString("en-US", { month: "short", day: "2-digit" })}
              </span>
            </div>
            <div>
              <h3 className="text-[0.625rem] font-semibold text-muted-foreground uppercase tracking-[0.2em] mb-2 text-foreground/40">Author</h3>
              <span className="text-sm font-semibold text-foreground block break-all">
                {authorName}
              </span>
            </div>
            <div>
              <h3 className="text-[0.625rem] font-semibold text-muted-foreground uppercase tracking-[0.2em] mb-2 text-foreground/40">Versions</h3>
              <span className="text-sm font-semibold text-foreground">{record.versionCount}</span>
            </div>
          </div>

          {/* Metadata Section */}
          <div className="pt-6 border-t border-border/40">
            <h3 className="text-[0.625rem] font-semibold text-muted-foreground uppercase tracking-[0.2em] mb-4 text-foreground/40">Metadata</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[0.625rem] font-semibold text-muted-foreground uppercase tracking-[0.2em]">Document ID</span>
                <span className="text-sm font-semibold text-foreground text-right">{record.uid}</span>
              </div>

              {/* Dynamically render all metadata entries from production */}
              {record.metadata.map((item, index) => (
                <div key={`${item.category}-${index}`} className="flex items-center justify-between pt-3 border-t border-border/20">
                  <span className="text-[0.625rem] font-semibold text-muted-foreground uppercase tracking-[0.2em]">{item.category_name}</span>
                  <span className="text-sm font-semibold text-foreground text-right">{item.value}</span>
                </div>
              ))}

              {record.metadata.length === 0 && (
                <div className="pt-3 border-t border-border/20">
                  <p className="text-[0.625rem] font-medium text-muted-foreground italic">No additional metadata specified.</p>
                </div>
              )}
            </div>
          </div>

          {/* Tags Section */}
          <div className="mt-8 pt-6 border-t border-border/40">
            <h3 className="text-[0.625rem] font-semibold text-muted-foreground uppercase tracking-[0.2em] mb-4 text-foreground/40">Tags</h3>
            <div className="flex flex-wrap gap-2">
              {record.tags.map(tag => (
                <button
                  key={tag}
                  onClick={() => onTagClick?.({ id: tag, name: tag })}
                  className="px-3 py-1 bg-background hover:bg-primary/5 hover:border-primary/40 text-[0.75rem] font-medium text-foreground hover:text-primary rounded-lg border border-border/60 transition-all active:scale-95 shadow-sm"
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Assets Section */}
          <div className="mt-8 pt-6 border-t border-border/40">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[0.625rem] font-semibold text-muted-foreground uppercase tracking-[0.2em] text-foreground/40">Assets</h3>
            </div>

            <div className="space-y-3">
              {(() => {
                const combinedAssets = [
                  ...record.assets,
                  ...(versions || []).map((v: RecordVersionUI) => ({
                    name: `${record.title} ${v.version}`,
                    url: v.fileUrl,
                    size: v.date,
                    isVersion: true
                  }))
                ];

                return combinedAssets.length > 0 ? (
                  combinedAssets.map((asset, index) => {
                    const isDownloading = downloadingFileId === asset.name;
                    const isViewing = viewingFileId === asset.url;
                    const assetUrl = asset.url || record.fileUrl;

                    return (
                      <div
                        key={`${asset.url || 'asset'}-${asset.name}-${index}`}
                        className={cn(
                          "group/asset flex items-center justify-between py-2 px-2 -mx-2 rounded-lg transition-all hover:bg-secondary/50",
                          index !== combinedAssets.length - 1 && "mb-1"
                        )}
                      >
                        <div
                          onClick={() => !isDownloading && assetUrl && handleDownload(assetUrl, asset.name)}
                          className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
                        >
                          <div className="w-8 h-8 rounded-md bg-secondary flex items-center justify-center shrink-0">
                            {isDownloading ? (
                              <Loader2 className="w-4 h-4 text-primary animate-spin" />
                            ) : (
                              <FileText className="w-4 h-4 text-muted-foreground group-hover/asset:text-primary transition-colors" />
                            )}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="text-[0.8125rem] font-semibold text-foreground truncate max-w-[11.25rem]">
                              {asset.name}
                            </span>
                            <span className="text-[0.625rem] font-medium text-muted-foreground uppercase tracking-tight">
                              {asset.size}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 opacity-0 group-hover/asset:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              assetUrl && handleView(assetUrl);
                            }}
                            disabled={isViewing}
                            className="p-1 hover:bg-primary/10 text-muted-foreground hover:text-primary rounded-md transition-all"
                            title="View online"
                          >
                            {isViewing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              assetUrl && handleDownload(assetUrl, asset.name);
                            }}
                            disabled={isDownloading}
                            className="p-1 hover:bg-primary/10 text-muted-foreground hover:text-primary rounded-md transition-all"
                            title="Download"
                          >
                            {isDownloading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-sm text-muted-foreground italic">No assets available</p>
                );
              })()}
            </div>
          </div>

          {/* Version History Section */}
          <VersionHistoryList
            versions={versions}
            isLoading={isLoadingVersions}
            isError={isErrorVersions}
            onDownload={(url, name) => handleDownload(url, name)}
            onView={(url) => handleView(url)}
          />
        </div>
      </aside>
    </>
  );
};

/**
 * Sub-component to handle dynamic version history fetching and rendering.
 */
const VersionHistoryList: React.FC<{
  versions: RecordVersionUI[];
  isLoading: boolean;
  isError: boolean;
  onDownload?: (url: string, name: string) => void;
  onView?: (url: string) => void;
}> = ({ versions, isLoading, isError, onDownload, onView }) => {
  const { managers } = useUsers();
  const displayHistory = versions;

  if (isError) {
    return (
      <div className="mt-8 pt-6 border-t border-border/40">
        <h3 className="text-[0.625rem] font-semibold text-muted-foreground uppercase tracking-[0.2em] text-foreground/40 mb-4">
          Version History
        </h3>
        <p className="text-sm text-destructive italic">Failed to load version history.</p>
      </div>
    );
  }

  return (
    <div className="mt-8 pt-6 border-t border-border/40">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-[0.625rem] font-semibold text-muted-foreground uppercase tracking-[0.2em] text-foreground/40">
          Version History
        </h3>
        {isLoading && (
          <Loader2 className="w-3 h-3 text-primary animate-spin" />
        )}
      </div>

      <div className="space-y-6">
        {displayHistory.length > 0 ? (
          displayHistory.map((item: RecordVersionUI, index: number) => {
            const authorName = managers.find(m => String(m.id) === String(item.author))?.username || 
                              (item.author?.startsWith("User #") ? item.author : `User #${item.author}`);

            return (
              <div key={item.version} className={cn(
                "space-y-2.5 group/version",
                index !== displayHistory.length - 1 && "pb-5 border-b border-border/20"
              )}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-semibold text-foreground">{item.version}</span>
                    {(() => {
                      const versionFileUrl = item.fileUrl;
                      if (!versionFileUrl) return null;
                      return (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => onView?.(versionFileUrl)}
                            className="p-1 hover:bg-primary/10 text-muted-foreground hover:text-primary rounded-md transition-all opacity-0 group-hover/version:opacity-100"
                            title="View version online"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onDownload?.(versionFileUrl, `${item.version}_file`)}
                            className="p-1 hover:bg-primary/10 text-muted-foreground hover:text-primary rounded-md transition-all opacity-0 group-hover/version:opacity-100"
                            title="Download version"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })()}
                  </div>
                  <div className="flex flex-wrap items-center gap-1 text-[0.6875rem] font-medium text-muted-foreground">
                    <span className="break-all">{authorName}</span>
                    <span className="shrink-0">• {item.date}</span>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <p className="text-sm text-muted-foreground italic">No version history found.</p>
        )}
      </div>
    </div>
  );
};


