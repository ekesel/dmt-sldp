import React, { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
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

  useEffect(() => {
    let scrollTimeout: any;
    let highlightTimeout: any;

    // Ensure we clean up any previously applied sub-element classes
    if (highlightedSubElementRef.current) {
      highlightedSubElementRef.current.classList.remove("bg-primary/20", "ring-2", "ring-primary", "shadow-lg");
      highlightedSubElementRef.current = null;
    }

    if (isOpen && activeTermId) {
      // Clear any existing highlight immediately when the term changes
      setHighlightedId(null);
      // Small delay to ensure the DOM has rendered the sidebar content
      scrollTimeout = window.setTimeout(() => {
        const element = termRefs.current[activeTermId] || document.getElementById(activeTermId);
        if (element) {
          element.scrollIntoView({ behavior: "auto", block: "center" });

          if (termRefs.current[activeTermId]) {
            setHighlightedId(activeTermId);
          } else {
            element.classList.add("bg-primary/20", "ring-2", "ring-primary", "shadow-lg");
            highlightedSubElementRef.current = element;
          }

          // Remove highlight after a few seconds
          highlightTimeout = window.setTimeout(() => {
            setHighlightedId(null);
            if (highlightedSubElementRef.current) {
              highlightedSubElementRef.current.classList.remove("bg-primary/20", "ring-2", "ring-primary", "shadow-lg");
              highlightedSubElementRef.current = null;
            }
          }, 3000);
        }
      }, 300);
    } else {
      setHighlightedId(null);
    }

    return () => {
      if (scrollTimeout) window.clearTimeout(scrollTimeout);
      if (highlightTimeout) window.clearTimeout(highlightTimeout);
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
          className="fixed inset-0 bg-background/50 backdrop-blur-sm z-40 transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div
        ref={sidebarRef}
        className={cn(
          "fixed inset-y-0 right-0 z-50 w-full md:w-96 bg-card shadow-2xl transform transition-transform duration-300 ease-in-out flex flex-col",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        <div className="flex items-center justify-between p-6 bg-card/80 backdrop-blur-md sticky top-0 z-10">
          <div>
            <h2 className="text-xl font-bold text-foreground">DMT Terms</h2>
            <p className="text-sm text-muted-foreground mt-1">Understanding the metrics</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {[
            ...["velocity", "cycle_time", "dmt_compliance", "objective_ai", "bugs_resolved"]
              .map((id) => dmtTerms.find((t) => t.id === id)),
            ...dmtTerms.filter(t => !["velocity", "cycle_time", "dmt_compliance", "objective_ai", "bugs_resolved"].includes(t.id))
          ]
            .filter((term): term is typeof dmtTerms[0] => term !== undefined)
            .map((term) => (
            <div
              key={term.id}
              ref={(el) => {
                termRefs.current[term.id] = el;
              }}
              className={cn(
                "p-4 transition-all duration-500",
                highlightedId === term.id
                  ? "bg-primary/10 rounded-xl ring-2 ring-primary/20 shadow-[0_0_15px_rgba(var(--primary),0.2)]"
                  : ""
              )}
            >
              <h3 className="text-lg font-bold text-accent mb-3">{term.title}</h3>
              <div className="text-sm text-primary leading-relaxed">
                {term.description}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
});

HelpSidebar.displayName = 'HelpSidebar';
