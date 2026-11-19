"use client";
import React, { useState, useEffect, useRef } from "react";
import { Search, Plus, X, Menu } from "lucide-react";
import { usePermissions } from "@/hooks/usePermissions";

// ---------------------------------------------------------------------------
// useDebouncedSearch — mock search hook
// Owns the raw input value, debounces 300 ms, then notifies the parent so the
// RecordList can filter. No hardcoded data; the hook only manages timing.
// ---------------------------------------------------------------------------
function useDebouncedSearch(
  onSearchChange?: (value: string) => void,
  externalValue?: string,
  delay = 300
) {
  const [query, setQuery] = useState(externalValue ?? "");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep internal state in sync when parent clears the term (e.g. on category change)
  useEffect(() => {
    if (externalValue !== undefined) setQuery(externalValue);
  }, [externalValue]);

  const handleChange = (value: string) => {
    setQuery(value);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      onSearchChange?.(value);
    }, delay);
  };

  const handleClear = () => {
    setQuery("");
    if (timerRef.current) clearTimeout(timerRef.current);
    onSearchChange?.("");
  };

  return { query, handleChange, handleClear };
}

// ---------------------------------------------------------------------------
// Props — activeCategory removed (was unused in this component)
// ---------------------------------------------------------------------------
interface KnowledgeHeaderProps {
  activeItem: string;
  searchTerm?: string;
  onSearchChange?: (value: string) => void;
  onNewRecord: () => void;
  onMenuToggle?: () => void;
}

export const KnowledgeHeader: React.FC<KnowledgeHeaderProps> = ({
  activeItem,
  searchTerm,
  onSearchChange,
  onNewRecord,
  onMenuToggle,
}) => {
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const { query, handleChange, handleClear } = useDebouncedSearch(
    onSearchChange,
    searchTerm
  );

  const { isManager } = usePermissions();

  return (
    <header className="flex flex-col bg-background/40 backdrop-blur-sm border-b border-border/40 transition-all">
      <div className="flex items-center justify-between px-3 sm:px-6 xl:px-8 py-3 sm:py-4 gap-2 sm:gap-4">
        <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
          <button
            onClick={onMenuToggle}
            className="p-2 hover:bg-secondary rounded-lg xl:hidden text-muted-foreground shrink-0 transition-colors"
            aria-label="Open sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>

          <h2 className="text-[0.6875rem] sm:text-xs font-bold text-muted-foreground uppercase tracking-[0.15em] sm:tracking-[0.2em] truncate">
            {query
              ? `Search Results for "${query}"`
              : activeItem
              ? `${activeItem} Records`
              : "Active Workspace Records"}
          </h2>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-3 lg:gap-4 shrink-0">
          {/* Desktop search */}
          <div className="relative group hidden md:flex items-center">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors pointer-events-none" />
            <input
              type="text"
              placeholder="Quick search..."
              value={query}
              onChange={(e) => handleChange(e.target.value)}
              className="pl-10 pr-8 py-2 bg-background/60 border border-border/40 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all w-44 lg:w-64 shadow-sm"
            />
            {query && (
              <button
                onClick={handleClear}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Mobile search toggle */}
          <button
            onClick={() => setIsMobileSearchOpen(!isMobileSearchOpen)}
            className="p-2 hover:bg-secondary rounded-lg md:hidden text-muted-foreground transition-colors shrink-0"
            aria-label={isMobileSearchOpen ? "Close search" : "Open search"}
          >
            <Search className="w-4 h-4" />
          </button>

          {isManager && (
            <button
              onClick={onNewRecord}
              className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 bg-foreground text-background rounded-xl hover:opacity-90 transition-all active:scale-[0.98] shadow-md shadow-foreground/5 text-xs sm:text-sm font-bold shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>New Record</span>
            </button>
          )}
        </div>
      </div>

      {/* Expandable Mobile Search */}
      {isMobileSearchOpen && (
        <div className="px-3 sm:px-6 pb-3 pt-1 md:hidden animate-in slide-in-from-top-1 duration-200">
          <div className="relative flex items-center">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              autoFocus
              placeholder="Quick search..."
              value={query}
              onChange={(e) => handleChange(e.target.value)}
              className="w-full pl-10 pr-8 py-2 bg-background/80 border border-border/60 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 shadow-sm"
            />
            {query && (
              <button
                onClick={handleClear}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

