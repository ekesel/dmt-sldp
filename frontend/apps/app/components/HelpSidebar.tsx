import React, { useEffect, useRef, useState, useMemo } from "react";
import { X, Search } from "lucide-react";
import { dmtTerms } from "../constants/dmtTerms";
import { cn } from "@dmt/ui";

type TermId = typeof dmtTerms[number]["id"];

interface HelpSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  activeTermId: string | null;
}

export const HelpSidebar = React.memo(({
  isOpen,
  onClose,
  activeTermId,
}: HelpSidebarProps) => {
  const sidebarRef = useRef<HTMLDivElement>(null);
  const termRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const highlightedSubElementRef = useRef<HTMLElement | null>(null);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Lock body scroll when open on mobile/tablet to prevent background scrolling
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Reset search when activeTermId changes so the term is guaranteed to be in view
  useEffect(() => {
    if (activeTermId) {
      setSearchQuery("");
    }
  }, [activeTermId]);

  // Prioritize common metrics first, followed by remaining terms
  const prioritizedTerms = useMemo(() => {
    const priorityIds = ["velocity", "cycle_time", "dmt_compliance", "objective_ai", "bugs_resolved"];
    const priorityList = priorityIds
      .map((id) => dmtTerms.find((t) => t.id === id))
      .filter((term): term is typeof dmtTerms[0] => term !== undefined);
    const remainingList = dmtTerms.filter((t) => !priorityIds.includes(t.id));
    return [...priorityList, ...remainingList];
  }, []);

  // Filtered terms based on search query
  const filteredTerms = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return prioritizedTerms;
    return prioritizedTerms.filter((term) =>
      term.title.toLowerCase().includes(query) ||
      term.id.toLowerCase().includes(query)
    );
  }, [prioritizedTerms, searchQuery]);

  // Handle scrolling and highlighting when open and activeTermId changes
  useEffect(() => {
    let scrollTimeout: NodeJS.Timeout | undefined;
    let highlightTimeout: NodeJS.Timeout | undefined;

    // Ensure we clean up any previously applied sub-element classes
    if (highlightedSubElementRef.current) {
      highlightedSubElementRef.current.classList.remove("bg-primary/20", "ring-2", "ring-primary", "shadow-lg");
      highlightedSubElementRef.current = null;
    }

    if (isOpen && activeTermId) {
      // Clear any existing highlight immediately when the term changes
      setHighlightedId(null);
      // Small delay to ensure the DOM has rendered the sidebar content
      scrollTimeout = setTimeout(() => {
        const element = termRefs.current[activeTermId] || document.getElementById(activeTermId);
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "center" });

          if (termRefs.current[activeTermId]) {
            setHighlightedId(activeTermId);
          } else {
            element.classList.add("bg-primary/20", "ring-2", "ring-primary", "shadow-lg");
            highlightedSubElementRef.current = element;
          }

          // Remove highlight after a few seconds
          highlightTimeout = setTimeout(() => {
            setHighlightedId(null);
            if (highlightedSubElementRef.current) {
              highlightedSubElementRef.current.classList.remove("bg-primary/20", "ring-2", "ring-primary", "shadow-lg");
              highlightedSubElementRef.current = null;
            }
          }, 3500);
        }
      }, 300);
    } else {
      setHighlightedId(null);
    }

    return () => {
      if (scrollTimeout) clearTimeout(scrollTimeout);
      if (highlightTimeout) clearTimeout(highlightTimeout);
      if (highlightedSubElementRef.current) {
        highlightedSubElementRef.current.classList.remove("bg-primary/20", "ring-2", "ring-primary", "shadow-lg");
        highlightedSubElementRef.current = null;
      }
    };
  }, [isOpen, activeTermId]);

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-background/60 backdrop-blur-sm z-40 transition-opacity animate-in fade-in duration-200"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        ref={sidebarRef}
        role="dialog"
        aria-modal="true"
        aria-label="DMT Terms Guide"
        className={cn(
          "fixed inset-y-0 right-0 z-50 flex flex-col bg-card shadow-2xl transition-transform duration-300 ease-in-out border-l border-border/60",
          "w-full sm:w-[26rem] md:w-[30rem] lg:w-[34rem] xl:w-[38rem] max-w-full sm:max-w-[90vw] md:max-w-[85vw] lg:max-w-[640px] xl:max-w-[700px]",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-2.5 p-3.5 sm:p-4 md:p-5 bg-card/95 backdrop-blur-md sticky top-0 z-10 border-b border-border/40 shrink-0">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base sm:text-lg md:text-xl font-bold text-foreground truncate">
                DMT Terms
              </h2>
              <span className="text-[10px] sm:text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 shrink-0">
                {dmtTerms.length} Terms
              </span>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 truncate">
              Understanding metrics, formulas &amp; definitions
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close DMT Terms Sidebar"
            className="p-1.5 sm:p-2 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors shrink-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/40"
          >
            <X size={20} className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="px-3.5 sm:px-4 md:px-5 py-2.5 sm:py-3 bg-muted/20 border-b border-border/30 shrink-0">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search terms, formulas, rules..."
              className="w-full bg-background border border-border/70 hover:border-border focus:border-primary rounded-lg sm:rounded-xl pl-8 sm:pl-9 pr-8 py-1.5 sm:py-2 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground/70 transition-colors focus:outline-none focus:ring-1 focus:ring-primary"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                aria-label="Clear search query"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Content list */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-5 space-y-3 sm:space-y-4 md:space-y-5 post-scrollbar">
          {filteredTerms.length === 0 ? (
            <div className="text-center py-10 sm:py-14 px-4">
              <p className="text-xs sm:text-sm text-muted-foreground mb-2.5">
                No DMT terms found matching &quot;{searchQuery}&quot;
              </p>
              <button
                onClick={() => setSearchQuery("")}
                className="text-xs sm:text-sm text-primary hover:underline font-medium cursor-pointer"
              >
                Clear search query
              </button>
            </div>
          ) : (
            filteredTerms.map((term) => (
              <div
                key={term.id}
                ref={(el) => {
                  termRefs.current[term.id] = el;
                }}
                id={`term-${term.id}`}
                className={cn(
                  "p-3 sm:p-4 md:p-4.5 rounded-xl sm:rounded-2xl border transition-all duration-300 w-full min-w-0 break-words",
                  highlightedId === term.id
                    ? "bg-primary/10 border-primary/60 ring-2 ring-primary/30 shadow-md"
                    : "bg-card/70 hover:bg-card border-border/60 hover:border-border shadow-xs"
                )}
              >
                <h3 className="text-sm sm:text-base md:text-lg font-bold text-accent mb-2 sm:mb-2.5 break-words [overflow-wrap:anywhere] leading-snug">
                  {term.title}
                </h3>
                <div className="text-xs sm:text-sm text-foreground/90 leading-relaxed break-words [overflow-wrap:anywhere] space-y-2">
                  {term.description}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 bg-card/95 border-t border-border/40 flex items-center justify-between text-[11px] sm:text-xs text-muted-foreground shrink-0">
          <span className="truncate">Need more info? Check DMT Guidelines</span>
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg bg-muted hover:bg-muted/80 text-foreground font-medium text-xs transition-colors shrink-0 cursor-pointer sm:hidden"
          >
            Close
          </button>
        </div>
      </aside>
    </>
  );
});

HelpSidebar.displayName = 'HelpSidebar';
