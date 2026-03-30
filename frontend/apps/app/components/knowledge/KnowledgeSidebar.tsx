"use client";
import React from "react";
import { User, Box, Tag, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Team {
  name: string;
  count: number;
  icon?: React.ReactNode;
}

const teams: Team[] = [
  { name: "Engineering", count: 24 },
  { name: "Platform", count: 12 },
  { name: "Backend", count: 18 },
  { name: "Design", count: 9 },
  { name: "Marketing", count: 7 },
];

interface KnowledgeSidebarProps {
  activeTeam: string;
  onTeamChange: (team: string) => void;
  activeCategory: string;
  onCategoryChange: (category: string) => void;
  isOpen?: boolean;
  onClose?: () => void;
}

export const KnowledgeSidebar: React.FC<KnowledgeSidebarProps> = ({ activeTeam, onTeamChange, activeCategory, onCategoryChange, isOpen, onClose }) => {

  return (
    <aside className={cn(
      "fixed inset-y-0 left-0 z-50 w-72 bg-card/95 border-r border-border/50 flex flex-col h-full backdrop-blur-2xl transition-all duration-300 xl:static lg:w-64 lg:bg-card/40 lg:backdrop-blur-sm xl:translate-x-0 xl:z-auto",
      isOpen ? "translate-x-0" : "-translate-x-full"
    )}>
      <div className="p-8 pb-12 flex-1 flex flex-col min-h-0 overflow-y-auto">
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
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
              Browse By
            </h3>
            <div className="grid grid-cols-3 gap-2">
              <button
                title="Team"
                onClick={() => onCategoryChange("TEAM")}
                className={cn(
                  "relative flex flex-col items-center justify-center p-3 rounded-xl border border-border/40 transition-all group",
                  activeCategory === "TEAM" ? "bg-white shadow-xl shadow-primary/5 border-primary/20" : "bg-white/50 hover:bg-white hover:border-primary/30"
                )}
              >
                <User className={cn("w-5 h-5", activeCategory === "TEAM" ? "text-primary" : "text-muted-foreground group-hover:text-primary")} />
                <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-foreground text-white text-[10px] rounded-lg opacity-0 group-hover:opacity-100 transition-all group-hover:-bottom-10 pointer-events-none whitespace-nowrap z-50 shadow-lg shadow-black/10 font-bold tracking-wider uppercase">
                  Team
                </span>
              </button>
              <button
                title="Project"
                onClick={() => onCategoryChange("PROJECT")}
                className={cn(
                  "relative flex flex-col items-center justify-center p-3 rounded-xl border border-border/40 transition-all group",
                  activeCategory === "PROJECT" ? "bg-white shadow-xl shadow-primary/5 border-primary/20" : "bg-white/50 hover:bg-white hover:border-primary/30"
                )}
              >
                <Box className={cn("w-5 h-5", activeCategory === "PROJECT" ? "text-primary" : "text-muted-foreground group-hover:text-primary")} />
                <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-foreground text-white text-[10px] rounded-lg opacity-0 group-hover:opacity-100 transition-all group-hover:-bottom-10 pointer-events-none whitespace-nowrap z-50 shadow-lg shadow-black/10 font-bold tracking-wider uppercase">
                  Project
                </span>
              </button>
              <button
                title="Type"
                onClick={() => onCategoryChange("TYPE")}
                className={cn(
                  "relative flex flex-col items-center justify-center p-3 rounded-xl border border-border/40 transition-all group",
                  activeCategory === "TYPE" ? "bg-white shadow-xl shadow-primary/5 border-primary/20" : "bg-white/50 hover:bg-white hover:border-primary/30"
                )}
              >
                <Tag className={cn("w-5 h-5", activeCategory === "TYPE" ? "text-primary" : "text-muted-foreground group-hover:text-primary")} />
                <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-foreground text-white text-[10px] rounded-lg opacity-0 group-hover:opacity-100 transition-all group-hover:-bottom-10 pointer-events-none whitespace-nowrap z-50 shadow-lg shadow-black/10 font-bold tracking-wider uppercase">
                  Type
                </span>
              </button>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Active Teams
              </h3>
              <button className="p-1 hover:bg-secondary rounded-md text-muted-foreground">
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-1">
              {teams.map((team) => (
                <button
                  key={team.name}
                  onClick={() => onTeamChange(team.name)}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all group",
                    activeTeam === team.name
                      ? "bg-primary text-white shadow-lg shadow-primary/20"
                      : "text-muted-foreground hover:bg-white hover:text-foreground"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold",
                        activeTeam === team.name ? "bg-white/20" : "bg-secondary"
                      )}
                    >
                      {team.name[0].toUpperCase()}
                    </div>
                    <span className="text-sm font-medium">{team.name}</span>
                  </div>
                  <span
                    className={cn(
                      "text-xs font-bold px-2 py-0.5 rounded-full",
                      activeTeam === team.name ? "bg-white/20" : "bg-secondary text-foreground/70"
                    )}
                  >
                    {team.count}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>


    </aside>
  );
};
