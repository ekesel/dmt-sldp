"use client";
import React from "react";
import { FileText, ArrowUpRight, Loader2, Paperclip } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRecords } from "@/features/knowledge-base/hooks/useRecords";
import type { KnowledgeRecord, RecordSearchParams } from "@dmt/api";

// Re-export KnowledgeRecord as Record so the rest of the app keeps compiling
export type { KnowledgeRecord as Record } from "@dmt/api";
// Re-export mock data for any consumers that still need it directly
export { MOCK_RECORDS as mockRecords } from "@dmt/api";


interface RecordCardProps {
  record: KnowledgeRecord;
  isSelected: boolean;
  onClick: () => void;
}

const RecordCard: React.FC<RecordCardProps> = ({ record, isSelected, onClick }) => {
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
            <span className="text-[9px] lg:text-[10px] font-bold px-1.5 py-0.5 bg-secondary/80 text-muted-foreground rounded border border-border/40 uppercase tracking-tighter shrink-0 self-start sm:self-auto">
              {record.type}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-x-3 lg:gap-x-4 gap-y-1 text-[9px] lg:text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            <span className="flex items-center gap-1">
              <span className="text-foreground/40 font-bold">By</span> {record.author}
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
        </div>
        <div className={cn(
            "p-2 rounded-lg lg:opacity-0 group-hover:opacity-100 transition-opacity shrink-0",
            isSelected ? "opacity-100 text-primary" : "text-muted-foreground"
        )}>
          <ArrowUpRight className="w-4 h-4 lg:w-5 lg:h-5" />
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
  onSelect: (record: KnowledgeRecord) => void;
}

export const RecordList: React.FC<RecordListProps> = ({
  selectedId,
  activeTeam,
  search,
  category,
  tag,
  onSelect,
}) => {
  const searchParams: RecordSearchParams = {};
  if (search)   searchParams.search   = search;
  if (category) searchParams.category = category;
  if (tag)      searchParams.tag      = tag;

  const { records, isLoading, isFetching, isError } = useRecords(searchParams);

  // When no API search is active, further filter by the sidebar-selected team
  const isSearching = !!(search || category || tag);
  const displayRecords = isSearching
    ? records
    : records.filter((r) => !activeTeam || r.team === activeTeam);

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
              onClick={() => onSelect(record)}
            />
          ))
        ) : (
          <div className="p-12 text-center bg-background/40 rounded-3xl border border-dashed border-border/60">
            <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">
              {isSearching ? "No records match your search" : "No records found for this team"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
