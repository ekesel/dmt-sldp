"use client";
import React from "react";
import { Search, Plus, ChevronRight, Menu } from "lucide-react";

interface KnowledgeHeaderProps {
  activeItem: string;
  activeCategory: number;
  searchTerm?: string;
  onSearchChange?: (value: string) => void;
  onNewRecord: () => void;
  onMenuToggle?: () => void;
}

export const KnowledgeHeader: React.FC<KnowledgeHeaderProps> = ({
  activeItem,
  activeCategory,
  searchTerm = "",
  onSearchChange,
  onNewRecord,
  onMenuToggle
}) => {
  return (
    <header className="flex items-center justify-between px-4 xl:px-8 py-4 bg-background/40 backdrop-blur-sm border-b border-border/40">
      <div className="flex items-center gap-4 min-w-0">
        <button
          onClick={onMenuToggle}
          className="p-2 hover:bg-secondary rounded-lg xl:hidden text-muted-foreground shrink-0"
        >
          <Menu className="w-5 h-5" />
        </button>

        <h2 className="text-[10px] lg:text-xs font-bold text-muted-foreground uppercase tracking-[0.2em] truncate">
          {searchTerm ? `Search Results for "${searchTerm}"` : (activeItem ? `${activeItem} Records` : "Active Workspace Records")}
        </h2>
      </div>

      <div className="flex items-center gap-2 lg:gap-4">
        <div className="relative group hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <input
            type="text"
            placeholder="Quick search..."
            value={searchTerm}
            onChange={(e) => onSearchChange?.(e.target.value)}
            className="pl-10 pr-4 py-2 bg-background/60 border border-border/40 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all w-48 lg:w-64 shadow-sm"
          />
        </div>

        <button
          onClick={onNewRecord}
          className="flex items-center gap-2 px-3 lg:px-4 py-2 bg-foreground text-background rounded-xl hover:opacity-90 transition-all active:scale-[0.98] shadow-md shadow-foreground/5 text-xs lg:text-sm font-bold"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">New Record</span>
          <span className="sm:hidden text-[10px]">New</span>
        </button>
      </div>
    </header>
  );
};
