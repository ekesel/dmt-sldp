"use client";
import React from "react";
import { FileText, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Record {
  id: string;
  title: string;
  version: string;
  versionCount: number;
  author: string;
  owner: string;
  audience: string;
  type: string;
  date: string;
  status: "Approved" | "Pending" | "Draft";
  description: string;
  project: string;
  team: string;
  uid: string;
  tags: string[];
  assets: { name: string; size: string }[];
  history: {
    version: string;
    date: string;
    comment: string;
    author: string;
  }[];
}

export const mockRecords: Record[] = [
  {
    id: "1",
    title: "Frontend onboarding playbook",
    version: "v1.4",
    versionCount: 3,
    author: "HIMANSHU RATHORE",
    owner: "Himanshu Rathore",
    audience: "New joiners",
    type: "Onboarding",
    date: "MAR 20, 2026",
    status: "Approved",
    description: "Setup steps, conventions, and the first-week checklist for frontend engineers.",
    project: "Knowledge Base",
    team: "Engineering",
    uid: "KB-201",
    tags: ["frontend", "onboarding", "setup"],
    assets: [
      { name: "frontend-onboarding-checklist.pdf", size: "1.20 MB" },
      { name: "engineering-setup-template.docx", size: "0.48 MB" },
    ],
    history: [
      { version: "Version 3", date: "Mar 20", comment: "Updated setup steps for the new local environment and added first-week tasks.", author: "Himanshu Rathore" },
      { version: "Version 2", date: "Feb 28", comment: "Refined the contribution checklist and ownership notes.", author: "Sara Kim" },
      { version: "Version 1", date: "Feb 15", comment: "Initial playbook structure and core architecture overview.", author: "Himanshu Rathore" },
    ],
  },
  {
    id: "2",
    title: "Security Best Practices",
    version: "v2.1",
    versionCount: 5,
    author: "SARAH CHEN",
    owner: "Sarah Chen",
    audience: "Developers",
    type: "Guideline",
    date: "Mar 18, 2026",
    status: "Approved",
    description: "Comprehensive guide to secure coding standards and common vulnerability mitigation.",
    project: "Security",
    team: "Engineering",
    uid: "KB-105",
    tags: ["security", "best-practices"],
    assets: [
      { name: "security-audit-v2.pdf", size: "2.4 MB" },
    ],
    history: [
      { version: "Version 5", date: "Mar 18", comment: "Updated OWASP Top 10 references.", author: "Sarah Chen" },
    ],
  },
  {
    id: "3",
    title: "API Documentation V3",
    version: "v0.9",
    versionCount: 1,
    author: "MIKE ROSS",
    owner: "Mike Ross",
    audience: "API Consumers",
    type: "Documentation",
    date: "Mar 15, 2026",
    status: "Pending",
    description: "Internal documentation for the new microservices API endpoints.",
    project: "Infrastructure",
    team: "Backend",
    uid: "KB-302",
    tags: ["api", "backend"],
    assets: [],
    history: [
      { version: "Version 1", date: "Mar 15", comment: "Initial draft.", author: "Mike Ross" },
    ],
  },
  {
    id: "4",
    title: "Microservices Architecture",
    version: "v1.2",
    versionCount: 2,
    author: "ALEX RIVERA",
    owner: "Alex Rivera",
    audience: "Backend Engineers",
    type: "Technical Doc",
    date: "Mar 10, 2026",
    status: "Approved",
    description: "Overview of our distributed systems architecture and communication protocols.",
    project: "Infrastructure",
    team: "Backend",
    uid: "KB-401",
    tags: ["microservices", "architecture"],
    assets: [],
    history: [],
  },
  {
    id: "5",
    title: "Platform Scaling Guide",
    version: "v3.0",
    versionCount: 8,
    author: "JORDAN SMITH",
    owner: "Jordan Smith",
    audience: "Platform Ops",
    type: "Technical Doc",
    date: "Mar 05, 2026",
    status: "Approved",
    description: "How to scale our k8s clusters and optimize resource allocation.",
    project: "Infrastructure",
    team: "Platform",
    uid: "KB-501",
    tags: ["platform", "scaling", "k8s"],
    assets: [],
    history: [],
  },
];

interface RecordCardProps {
  record: Record;
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
  activeTeam?: string;
  searchTerm?: string;
  onSelect: (record: Record) => void;
}

export const RecordList: React.FC<RecordListProps> = ({ 
  selectedId, 
  activeTeam, 
  searchTerm = "",
  onSelect 
}) => {
  const filteredRecords = mockRecords.filter(r => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = !searchTerm || 
      r.title.toLowerCase().includes(searchLower) ||
      r.description.toLowerCase().includes(searchLower) ||
      r.tags.some(tag => tag.toLowerCase().includes(searchLower));
    
    // Global search: if searching, ignore team filter. Otherwise filter by team.
    if (searchTerm) return matchesSearch;
    
    const matchesTeam = !activeTeam || r.team === activeTeam;
    return matchesTeam;
  });

  return (
    <div className="p-2 lg:p-4 xl:p-6 space-y-3 max-w-5xl mx-auto">
      <div className="space-y-3">
        {filteredRecords.length > 0 ? (
          filteredRecords.map((record) => (
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
              {searchTerm ? "No records match your search" : "No records found for this team"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
