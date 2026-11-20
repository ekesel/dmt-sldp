"use client";
import React, { useRef } from "react";
import { Upload, CheckCircle2, FileText, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRecordVersions } from "@/features/knowledge-base/hooks/useKnowledgeRecords";
import { useUsers } from "@/features/knowledge-base/hooks/useUsers";

interface AssetUploaderProps {
  mode: "create" | "edit";
  recordId: string | number | null;
  assets: {
    fileName: string;
    fileUrl: string;
    size?: string;
  }[];
  currentFile: File | null;
  onFileChange: (file: File | null) => void;
}

export const AssetUploader: React.FC<AssetUploaderProps> = ({
  mode,
  recordId,
  assets,
  currentFile,
  onFileChange,
}) => {
  const { versions, isLoading: isHistoryLoading, isError: isHistoryError } = useRecordVersions(recordId);
  const { managers } = useUsers();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    onFileChange(file);
  };

  return (
    <div className="flex-1 flex flex-col xl:flex-row gap-8">
      {/* Left side: Upload area and existing assets */}
      <div className="flex-1 space-y-8 lg:space-y-12">
        {/* Upload Area */}
        <div
          onClick={() => fileInputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              fileInputRef.current?.click();
            }
          }}
          role="button"
          tabIndex={0}
          className={cn(
            "border-2 border-dashed rounded-2xl sm:rounded-3xl lg:rounded-[2rem] p-6 sm:p-10 lg:p-20 flex flex-col items-center justify-center text-center bg-secondary/50 hover:border-primary/40 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 w-full",
            currentFile ? "border-primary/60 bg-primary/5" : "border-border/40"
          )}
        >
          <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileUpload} />
          <div
            className={cn(
              "w-12 h-12 lg:w-16 lg:h-16 rounded-2xl shadow-xl flex items-center justify-center mb-4 sm:mb-6 transition-colors",
              currentFile ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground"
            )}
          >
            {currentFile ? (
              <CheckCircle2 className="w-6 h-6 lg:w-8 lg:h-8" />
            ) : (
              <Upload className="w-6 h-6 lg:w-8 lg:h-8" />
            )}
          </div>
          <h3 className="text-base sm:text-xl lg:text-3xl font-black text-foreground mb-2 sm:mb-3 break-words [overflow-wrap:anywhere] whitespace-normal max-w-[95%] sm:max-w-[90%] mx-auto">
            {currentFile ? currentFile.name : mode === "edit" ? "Upload New Version" : "Drop files here"}
          </h3>
          <button className="text-xs sm:text-sm lg:text-lg font-black text-primary hover:underline transition-all">
            {currentFile ? "Change file" : mode === "edit" ? "Select New File" : "Browse files"}
          </button>
          {currentFile && (
            <span className="mt-3 sm:mt-4 text-[0.6875rem] sm:text-xs font-bold text-muted-foreground uppercase tracking-widest">
              {(currentFile.size / (1024 * 1024)).toFixed(2)} MB
            </span>
          )}
        </div>

        {/* Existing Assets */}
        {mode === "edit" && assets.length > 0 && (
          <div className="bg-secondary/60 border border-border/40 rounded-xl sm:rounded-[1.5rem] lg:rounded-[2.5rem] p-4 sm:p-6 lg:p-10 space-y-4 sm:space-y-6 lg:space-y-8 w-full">
            <h3 className="text-[0.625rem] font-bold text-muted-foreground uppercase tracking-[0.2em]">
              Existing Assets ({assets.length})
            </h3>
            <div className="space-y-3 sm:space-y-4">
              {assets.map((asset, index) => (
                <div
                  key={`${asset.fileName}-${index}`}
                  className="flex items-center justify-between p-3 sm:p-4 lg:p-6 bg-background border border-border/20 rounded-xl sm:rounded-2xl lg:rounded-3xl shadow-sm transition-all group gap-2"
                >
                  <div className="flex items-center gap-3 sm:gap-4 lg:gap-6 min-w-0 flex-1">
                    <FileText className="w-5 h-5 lg:w-6 lg:h-6 text-muted-foreground shrink-0" />
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="text-xs sm:text-sm lg:text-lg font-bold text-foreground break-words [overflow-wrap:anywhere] whitespace-normal leading-snug">
                        {asset.fileName}
                      </span>
                      <span className="text-[0.625rem] lg:text-sm font-medium text-muted-foreground/60 uppercase">
                        {asset.size}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 lg:gap-4 shrink-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        fileInputRef.current?.click();
                      }}
                      className="px-3 sm:px-4 py-1.5 sm:py-2 bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground rounded-lg sm:rounded-xl text-[0.5625rem] sm:text-[0.625rem] font-black uppercase tracking-widest transition-all shadow-sm active:scale-95"
                    >
                      Update
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Right side: Version History (only in Edit mode) */}
      {mode === "edit" && (
        <aside className="w-full xl:w-64 bg-background border-t xl:border-t-0 xl:border-l border-border/40 flex flex-col shrink-0 no-scrollbar overflow-y-visible xl:overflow-y-auto">
          <div className="p-4 sm:p-6 space-y-6 sm:space-y-8">
            <div className="flex items-center justify-between">
              <h3 className="text-[0.625rem] font-bold text-muted-foreground uppercase tracking-[0.2em]">Version History</h3>
              {isHistoryLoading && <Loader2 className="w-3 h-3 text-primary animate-spin" />}
            </div>

            <div className="space-y-8">
              {versions.length > 0 ? (
                versions.map((item, index) => {
                  const authorName =
                    managers.find((m) => String(m.id) === String(item.author))?.username ||
                    (item.author.startsWith("User #") ? item.author : `User #${item.author}`);

                  return (
                    <div key={item.version} className="flex">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-black text-foreground">{item.version}</span>
                          <span className="text-[0.625rem] font-bold text-muted-foreground uppercase">{item.date}</span>
                        </div>
                        <p className="text-[0.625rem] font-bold text-muted-foreground mb-1">{authorName}</p>
                      </div>
                    </div>
                  );
                })
              ) : (
                !isHistoryLoading &&
                (isHistoryError ? (
                  <p className="text-[0.625rem] font-medium text-destructive italic">Failed to load version history.</p>
                ) : (
                  <p className="text-[0.625rem] font-medium text-muted-foreground italic">No versions found.</p>
                ))
              )}
            </div>
          </div>
        </aside>
      )}
    </div>
  );
};
