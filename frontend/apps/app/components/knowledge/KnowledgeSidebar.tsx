"use client";
import React from "react";
import { Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { MetadataCategory as Category } from "@dmt/api";

export interface Team {
  name: string;
  count: number;
  icon?: React.ReactNode;
}

interface KnowledgeSidebarProps {
  categories: Category[];
  teams: Team[];
  activeTeam: string;
  onTeamChange: (team: string) => void;
  activeCategory: number;
  onCategoryChange: (categoryId: number) => void;
  isOpen?: boolean;
  onClose?: () => void;
  isAddingTeam: boolean;
  newTeamName: string;
  onAddTeamClick: () => void;
  onNewTeamChange: (name: string) => void;
  onAddTeamSubmit: () => void;
  onAddTeamCancel: () => void;
  isAddingCategory: boolean;
  newCategoryName: string;
  onAddCategoryClick: () => void;
  onNewCategoryChange: (name: string) => void;
  onAddCategorySubmit: () => void;
  onAddCategoryCancel: () => void;
  isSubmittingCategory?: boolean;
  isAddingValue?: boolean;
  isManager?: boolean;
  isReviewActive?: boolean;
  onReviewClick?: () => void;
  reviewCount?: number;
}

export const KnowledgeSidebar: React.FC<KnowledgeSidebarProps> = ({
  categories,
  teams,
  activeTeam,
  onTeamChange,
  activeCategory,
  onCategoryChange,
  isOpen,
  onClose,
  isAddingTeam,
  newTeamName,
  onAddTeamClick,
  onNewTeamChange,
  onAddTeamSubmit,
  onAddTeamCancel,
  isAddingCategory,
  newCategoryName,
  onAddCategoryClick,
  onNewCategoryChange,
  onAddCategorySubmit,
  onAddCategoryCancel,
  isSubmittingCategory,
  isAddingValue,
  isManager,
  isReviewActive,
  onReviewClick,
  reviewCount
}) => {
  const currentCategoryObj = categories.find(c => c.id === activeCategory);
  const activeCategoryName = currentCategoryObj?.name || "";

  return (
    <aside className={cn(
      "fixed inset-y-0 left-0 z-50 w-64 bg-card/95 border-r border-border/50 flex flex-col h-full backdrop-blur-2xl transition-all duration-300 xl:static lg:w-56 lg:bg-card/40 lg:backdrop-blur-sm xl:translate-x-0 xl:z-auto",
      isOpen ? "translate-x-0" : "-translate-x-full"
    )}>
      <div className="pl-4 pr-6 pt-8 pb-12 flex-1 flex flex-col min-h-0 overflow-y-auto">
        <div className="flex items-center justify-end mb-6 shrink-0 xl:hidden">
          <button
            onClick={onClose}
            className="p-2 hover:bg-secondary rounded-lg text-muted-foreground"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-12">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Browse By
              </h3>
              {isManager && (
                <button
                  onClick={onAddCategoryClick}
                  className="p-1 hover:bg-secondary rounded-md text-muted-foreground transition-colors"
                  title="Add Category"
                >
                  <Plus className="w-4 h-4" />
                </button>
              )}
            </div>

            {isManager && isAddingCategory && (
              <div className="mb-4 p-3 bg-secondary/30 rounded-lg border border-dashed border-border/50 animate-in fade-in slide-in-from-top-1 duration-200">
                <input
                  autoFocus
                  value={newCategoryName}
                  onChange={(e) => onNewCategoryChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") onAddCategorySubmit();
                    if (e.key === "Escape") onAddCategoryCancel();
                  }}
                  className="w-full bg-background/50 border border-border/40 px-3 py-1.5 rounded-lg text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                  placeholder="New Category Name..."
                />
                <div className="flex gap-2">
                  <button
                    onClick={onAddCategorySubmit}
                    disabled={isSubmittingCategory}
                    className="flex-1 bg-primary text-xs font-bold text-primary-foreground py-1.5 rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmittingCategory ? "Adding..." : "Add"}
                  </button>
                  <button
                    onClick={onAddCategoryCancel}
                    disabled={isSubmittingCategory}
                    className="flex-1 bg-secondary text-xs font-bold text-foreground/70 py-1.5 rounded-lg hover:bg-secondary/80 transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-1">
              {categories.map((category) => {
                const isSelected = activeCategory === category.id;

                return (
                  <button
                    key={category.id}
                    onClick={() => onCategoryChange(category.id)}
                    className={cn(
                      "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg border transition-all duration-200 group",
                      isSelected
                        ? "bg-primary/20 text-primary border-primary/30 font-bold"
                        : "text-muted-foreground font-semibold border-transparent hover:text-foreground hover:border-primary/40"
                    )}
                  >
                    <span className="text-sm font-medium capitalize">{category.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Active {activeCategoryName}s
              </h3>
              {isManager && (
                <button
                  onClick={onAddTeamClick}
                  className="p-1 hover:bg-secondary rounded-md text-muted-foreground transition-colors"
                  title={`Add ${activeCategoryName}`}
                >
                  <Plus className="w-4 h-4" />
                </button>
              )}
            </div>

            {isManager && isAddingTeam && (
              <div className="mb-4 p-3 bg-secondary/30 rounded-lg border border-dashed border-border/50 animate-in fade-in slide-in-from-top-1 duration-200">
                <input
                  autoFocus
                  value={newTeamName}
                  onChange={(e) => onNewTeamChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") onAddTeamSubmit();
                    if (e.key === "Escape") onAddTeamCancel();
                  }}
                  className="w-full bg-background/50 border border-border/40 px-3 py-1.5 rounded-lg text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                  placeholder={`New ${activeCategoryName} Name...`}
                />
                <div className="flex gap-2">
                  <button
                    onClick={onAddTeamSubmit}
                    disabled={isAddingValue}
                    className="flex-1 bg-primary text-xs font-bold text-primary-foreground py-1.5 rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isAddingValue ? "Adding..." : `Add ${activeCategoryName}`}
                  </button>
                  <button
                    onClick={onAddTeamCancel}
                    disabled={isAddingValue}
                    className="flex-1 bg-secondary text-xs font-bold text-foreground/70 py-1.5 rounded-lg hover:bg-secondary/80 transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-1">
              {teams.map((item) => (
                <button
                  key={item.name}
                  onClick={() => onTeamChange(item.name)}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2 rounded-lg border transition-all duration-200 group",
                    activeTeam === item.name
                      ? "bg-primary/20 text-primary border-primary/30 font-bold"
                      : "text-muted-foreground font-semibold border-transparent hover:text-foreground hover:border-primary/40"
                  )}
                >
                  <span className="text-sm font-medium">{item.name}</span>
                  {item.count !== undefined && (
                    <span
                      className={cn(
                        "text-xs font-bold px-2 py-0.5 rounded-full transition-colors",
                        activeTeam === item.name ? "bg-primary/20 text-primary" : "bg-secondary text-foreground/70"
                      )}
                    >
                      {item.count}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Workspace / Personal section - Managers Only */}
          {isManager && (
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
                Workspace
              </h3>
              <div className="space-y-1">
                <button
                  onClick={onReviewClick}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg border transition-all duration-200 group",
                    isReviewActive
                      ? "bg-primary text-primary-foreground border-primary font-bold shadow-lg shadow-primary/20 scale-[1.02]"
                      : "text-muted-foreground font-semibold border-transparent hover:text-foreground hover:border-primary/40 hover:bg-secondary/50"
                  )}
                >
                  <span className="text-sm font-medium"> Documents Review</span>
                  {reviewCount !== undefined && reviewCount > 0 && (
                    <span className={cn(
                      "ml-auto text-[10px] font-black px-1.5 py-0.5 rounded-md transition-all animate-in zoom-in-50 duration-300",
                      isReviewActive
                        ? "bg-white text-primary"
                        : "bg-primary text-white shadow-lg shadow-primary/20"
                    )}>
                      {reviewCount}
                    </span>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>


    </aside>
  );
};
