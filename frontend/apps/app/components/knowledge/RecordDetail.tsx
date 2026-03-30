"use client";
import React from "react";
import { FileText, X } from "lucide-react";
import { Record } from "./RecordList";
import { cn } from "@/lib/utils";

interface RecordDetailProps {
  record: Record | null;
  onClose?: () => void;
  onEdit?: (record: Record) => void;
}

export const RecordDetail: React.FC<RecordDetailProps> = ({ record, onClose, onEdit }) => {
  if (!record) {
    return (
      <div className="hidden xl:flex w-[300px] flex-shrink-0 bg-white/40 backdrop-blur-sm border-l border-border/40 p-8 flex-col items-center justify-center text-center">
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
          "fixed inset-0 bg-black/20 backdrop-blur-sm z-40 xl:hidden transition-opacity duration-300",
          record ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      />
      
      <aside className={cn(
        "fixed inset-y-0 right-0 z-50 w-full sm:w-[300px] bg-white border-l border-border/40 flex flex-col h-full overflow-y-auto transition-transform duration-300 transform shadow-2xl xl:shadow-none xl:static xl:translate-x-0",
        record ? "translate-x-0" : "translate-x-full"
      )}>
        <div className="p-6">
          {/* Mobile Close Button */}
          <button 
            onClick={onClose}
            className="xl:hidden absolute top-4 right-4 p-2 hover:bg-secondary rounded-full text-muted-foreground mb-4"
          >
            <X className="w-5 h-5" />
          </button>

        {/* Top Label and Edit Button */}
        <div className="flex items-center justify-between mb-6">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">
            Document
          </span>
          <button 
            onClick={() => record && onEdit?.(record)}
            className="px-4 py-1.5 bg-secondary/50 hover:bg-secondary text-foreground rounded-lg border border-border/40 text-sm font-bold transition-all active:scale-95 shadow-sm"
          >
            Edit
          </button>
        </div>

        {/* Title and Description */}
        <div className="mb-10">
          <h2 className="text-3xl font-bold text-foreground leading-tight mb-4">
            {record.title}
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {record.description}
          </p>
        </div>

        {/* Info Grid (Status, Updated, Type, Versions) */}
        <div className="grid grid-cols-2 gap-x-12 gap-y-8 py-8 border-t border-border/40">
          <div>
            <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] mb-3">Status</h3>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#E8F1FF] text-[#2563EB] rounded-md text-[11px] font-bold">
              {record.status}
            </div>
          </div>
          <div>
            <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] mb-3">Updated</h3>
            <span className="text-sm font-bold text-foreground">{record.date.split(',')[0]}</span>
          </div>
          <div>
            <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] mb-3">Type</h3>
            <span className="text-sm font-bold text-foreground">{record.type}</span>
          </div>
          <div>
            <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] mb-3">Versions</h3>
            <span className="text-sm font-bold text-foreground">{record.versionCount}</span>
          </div>
        </div>

        {/* Metadata Section */}
        <div className="pt-8 border-t border-border/40">
          <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] mb-6">Metadata</h3>
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">Owner</span>
              <span className="text-sm font-bold text-foreground text-right">{record.owner}</span>
            </div>
            <div className="flex items-center justify-between pt-5 border-t border-border/20">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">Audience</span>
              <span className="text-sm font-bold text-foreground text-right">{record.audience}</span>
            </div>
            <div className="flex items-center justify-between pt-5 border-t border-border/20">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">Project</span>
              <span className="text-sm font-bold text-foreground text-right">{record.project}</span>
            </div>
            <div className="flex items-center justify-between pt-5 border-t border-border/20">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">Team</span>
              <span className="text-sm font-bold text-foreground text-right">{record.team}</span>
            </div>
            <div className="flex items-center justify-between pt-5 border-t border-border/20">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">Document ID</span>
              <span className="text-sm font-bold text-foreground text-right">{record.uid}</span>
            </div>
          </div>
        </div>

        {/* Tags Section */}
        <div className="mt-10 pt-8 border-t border-border/40">
          <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] mb-4">Tags</h3>
          <div className="flex flex-wrap gap-2">
            {record.tags.map(tag => (
              <span key={tag} className="px-4 py-1.5 bg-white text-[13px] font-medium text-foreground rounded-lg border border-border/40 shadow-sm cursor-default">
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* Assets Section */}
        <div className="mt-10 pt-8 border-t border-border/40">
          <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] mb-4">Assets</h3>
          <div className="space-y-4">
            {record.assets.length > 0 ? (
              record.assets.map((asset, index) => (
                <div key={asset.name} className={cn(
                  "flex items-center justify-between py-1",
                  index !== record.assets.length - 1 && "pb-4 border-b border-border/20"
                )}>
                  <span className="text-[15px] font-medium text-foreground truncate max-w-[280px]">
                    {asset.name}
                  </span>
                  <span className="text-sm font-medium text-muted-foreground shrink-0 uppercase tracking-tight">
                    {asset.size}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground italic">No assets available</p>
            )}
          </div>
        </div>

        {/* Version History Section */}
        <div className="mt-10 pt-8 border-t border-border/40">
          <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] mb-6">Version History</h3>
          <div className="space-y-8">
            {record.history.map((item, index) => (
              <div key={item.version} className={cn(
                "space-y-3",
                index !== record.history.length - 1 && "pb-8 border-b border-border/20"
              )}>
                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold text-foreground">{item.version}</span>
                  <span className="text-sm font-medium text-muted-foreground">{item.date}</span>
                </div>
                <div className="space-y-4">
                  <p className="text-sm font-medium text-muted-foreground">
                    {item.author}
                  </p>
                  <p className="text-[15px] text-foreground font-medium leading-relaxed">
                    {item.comment}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      </aside>
    </>
  );
};
