"use client";
import React, { useState } from "react";
import {
  ChevronLeft,
  ChevronDown,
  Eye,
  Save,
  Globe,
  Type,
  Bold,
  Italic,
  Quote,
  Link2,
  Image as ImageIcon,
  Paperclip,
  CheckCircle2,
  Circle,
  Tag,
  X,
  Plus,
  Upload,
  FileText,
  MoreHorizontal,
  Settings
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Record } from "./RecordList";

interface RecordEditorProps {
  mode: "create" | "edit";
  record?: Record | null;
  onBack: () => void;
}

export const RecordEditor: React.FC<RecordEditorProps> = ({ mode, record, onBack }) => {
  const [lifecycle, setLifecycle] = useState<string>(record?.status || "Draft");
  const [activeTab, setActiveTab] = useState<"Write" | "Upload">("Write");
  const [isInfoOpen, setIsInfoOpen] = useState(false);

  return (
    <div className="relative w-full h-full bg-[#F8FAFC] flex overflow-hidden animate-in fade-in duration-300">
      {/* Left Sidebar - Metadata (Fixed on Desktop, Drawer on Tablet/Mobile) */}
      <aside className="hidden xl:flex w-62 bg-white border-r border-border/40 flex-col overflow-y-auto shrink-0">
        <div className="p-6">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] hover:text-primary transition-colors mb-12"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to Library
          </button>

          <div className="space-y-10">
            <div>
              <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] mb-6">Metadata</h3>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.1em]">Document Title</label>
                  <input
                    type="text"
                    defaultValue={record?.title || ""}
                    placeholder="Enter document title..."
                    className="w-full px-4 py-3 bg-white border border-border/60 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all shadow-sm"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.1em]">Team</label>
                    <button className="text-[10px] font-bold text-primary hover:underline">Create</button>
                  </div>
                  <div className="relative">
                    <select
                      defaultValue={record?.team || "Engineering"}
                      className="w-full appearance-none px-4 py-3 bg-white border border-border/60 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all shadow-sm pr-10"
                    >
                      <option>Engineering</option>
                      <option>Product</option>
                      <option>Design</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.1em]">Project</label>
                    <button className="text-[10px] font-bold text-primary hover:underline">Create</button>
                  </div>
                  <div className="relative">
                    <select
                      defaultValue={record?.project || "Knowledge Base"}
                      className="w-full appearance-none px-4 py-3 bg-white border border-border/60 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all shadow-sm pr-10"
                    >
                      <option>Knowledge Base</option>
                      <option>Infrastructure</option>
                      <option>Security</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] mb-4">Lifecycle</h3>
              <div className="flex bg-secondary/30 p-1 rounded-xl gap-1">
                {(["Draft", "In Review", "Approved"] as const).map((status) => {
                  return (
                    <button
                      key={status}
                      onClick={() => setLifecycle(status)}
                      className={cn(
                        "flex-1 px-3 py-2 rounded-lg text-[10px] font-bold transition-all uppercase tracking-tighter",
                        lifecycle === status ? "bg-white text-foreground shadow-sm" : "text-muted-foreground hover:bg-white/50"
                      )}
                    >
                      {status}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 bg-white xl:bg-transparent overflow-y-auto">
        <header className="px-6 xl:px-10 py-6 xl:py-8 flex flex-col sm:flex-row gap-4 sm:items-center justify-between bg-white border-b border-border/40 sticky top-0 z-10 transition-all">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <button
                onClick={onBack}
                className="xl:hidden p-2 -ml-2 hover:bg-secondary rounded-lg text-muted-foreground transition-colors"
                title="Back to Library"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">
                <Globe className="w-3 h-3" />
                <span>{mode === "create" ? "Create" : "Edit"}</span>
                <span className="text-border">/</span>
                <span className="text-foreground/60">{activeTab === "Write" ? "Article" : "Upload"}</span>
              </div>
            </div>
            <h1 className="text-2xl lg:text-4xl font-black text-foreground tracking-tight ml-0 lg:ml-0">
              {mode === "create" ? "New document" : "Edit document"}
            </h1>
          </div>

          <div className="flex items-center gap-2 lg:gap-3 xl:gap-4">
            <button
              onClick={() => setIsInfoOpen(true)}
              className="xl:hidden p-2.5 bg-secondary/50 hover:bg-secondary rounded-xl text-muted-foreground transition-all"
              title="View Metadata & Tags"
            >
              <Settings className="w-5 h-5" />
            </button>
            <button className="flex items-center gap-2 px-4 xl:px-6 py-2 xl:py-3 bg-white border border-border/60 rounded-xl xl:rounded-2xl text-xs xl:text-sm font-bold text-foreground hover:bg-secondary transition-all shadow-sm">
              <Eye className="w-4 h-4" />
              <span className="hidden md:inline">Preview</span>
            </button>
            <button className="flex items-center gap-2 px-6 xl:px-8 py-2 xl:py-3 rounded-xl xl:rounded-2xl text-xs xl:text-sm font-bold transition-all shadow-lg active:scale-95 text-white bg-primary hover:bg-primary/90">
              {mode === "create" ? <Globe className="w-4 h-4" /> : <Save className="w-4 h-4" />}
              {mode === "create" ? "Publish" : "Save"}
            </button>
          </div>
        </header>

        <div className="flex-1 flex bg-white">
          <div className="w-full flex flex-col min-h-[400px] xl:min-h-[600px] overflow-hidden">
            {/* Tab Switcher */}
            <div className="flex items-center justify-between px-6 xl:px-10 py-4 xl:py-6 border-b border-border/10">
              <div className="flex gap-6 lg:gap-10">
                <button
                  onClick={() => setActiveTab("Write")}
                  className={cn(
                    "text-[10px] font-black uppercase tracking-[0.2em] pb-2 transition-all border-b-2",
                    activeTab === "Write" ? "text-foreground border-primary" : "text-muted-foreground border-transparent hover:text-foreground"
                  )}
                >
                  Write Content
                </button>
                <button
                  onClick={() => setActiveTab("Upload")}
                  className={cn(
                    "text-[10px] font-black uppercase tracking-[0.2em] pb-2 transition-all border-b-2",
                    activeTab === "Upload" ? "text-foreground border-primary" : "text-muted-foreground border-transparent hover:text-foreground"
                  )}
                >
                  Assets
                </button>
              </div>
            </div>

            <div className="p-4 lg:p-8">
              {activeTab === "Write" ? (
                <div className="prose prose-slate max-w-none px-2">
                  <textarea
                    className="w-full h-[300px] lg:h-[500px] resize-none focus:outline-none text-lg lg:text-2xl font-medium leading-relaxed bg-transparent border-none"
                    placeholder="Start writing..."
                    defaultValue={mode === "edit" ? record?.description : ""}
                  />
                </div>
              ) : (
                <div className="space-y-8 lg:space-y-12">
                  {/* Upload Area */}
                  <div className="border-2 border-dashed border-border/40 rounded-3xl lg:rounded-[32px] p-10 lg:p-20 flex flex-col items-center justify-center text-center bg-[#F8FAFC]/50 hover:border-primary/40 transition-all cursor-pointer">
                    <div className="w-12 h-12 lg:w-16 lg:h-16 bg-white rounded-2xl shadow-xl flex items-center justify-center mb-6 text-muted-foreground">
                      <Upload className="w-6 h-6 lg:w-8 lg:h-8" />
                    </div>
                    <h3 className="text-xl lg:text-3xl font-black text-foreground mb-3">Drop files here</h3>
                    <button className="text-sm lg:text-lg font-black text-primary hover:underline transition-all">Browse files</button>
                  </div>

                  {/* Existing Assets */}
                  {mode === "edit" && record?.assets && record.assets.length > 0 && (
                    <div className="bg-[#F8FAFC]/60 border border-border/40 rounded-[24px] lg:rounded-[40px] p-6 lg:p-10 space-y-6 lg:space-y-8">
                      <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">Existing Assets ({record.assets.length})</h3>
                      <div className="space-y-4">
                        {record.assets.map((asset) => (
                          <div key={asset.name} className="flex items-center justify-between p-4 lg:p-6 bg-white border border-border/20 rounded-2xl lg:rounded-3xl shadow-sm transition-all group">
                            <div className="flex items-center gap-4 lg:gap-6">
                              <FileText className="w-5 h-5 lg:w-6 lg:h-6 text-muted-foreground" />
                              <div className="flex flex-col">
                                <span className="text-sm lg:text-lg font-bold text-foreground truncate max-w-[150px] sm:max-w-none">{asset.name}</span>
                                <span className="text-[10px] lg:text-sm font-medium text-muted-foreground/60 uppercase">{asset.size}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 lg:gap-4">
                              <div className="hidden sm:block px-3 py-1 bg-secondary border border-border/20 text-muted-foreground/60 rounded text-[9px] font-black uppercase tracking-widest shadow-sm">
                                Current
                              </div>
                              <button className="p-2 hover:bg-secondary rounded-lg text-muted-foreground">
                                <MoreHorizontal className="w-5 h-5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Right Sidebar - Hide on tablet/mobile */}
      <aside className="hidden xl:flex w-52 bg-white border-l border-border/40 flex-col overflow-y-auto shrink-0">
        <div className="p-6 space-y-12">
          {mode === "create" ? (
            <div>
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">Review Checklist</h3>
                <CheckCircle2 className="w-4 h-4 text-primary" />
              </div>
              <div className="space-y-6">
                {["Title and metadata set", "Owner assigned", "Images alt-text added", "Ready for publish"].map((item, i) => (
                  <div key={item} className="flex items-center gap-4 group cursor-pointer">
                    <div className={cn(
                      "w-6 h-6 rounded-full flex items-center justify-center shadow-sm transition-all",
                      i < 2 ? "bg-primary/10 text-primary group-hover:bg-primary shadow-primary/20" : "border-2 border-border/40 text-border group-hover:border-primary"
                    )}>
                      {i < 2 ? <CheckCircle2 className="w-4 h-4" /> : <Circle className="w-3 h-3 opacity-0 group-hover:opacity-100" />}
                    </div>
                    <span className={cn("text-xs font-bold", i < 2 ? "text-foreground" : "text-muted-foreground")}>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-12">
              <div>
                <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] mb-6">Review</h3>
              </div>

              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">Version Preview</h3>
                  <button className="text-[10px] font-black text-primary uppercase tracking-widest leading-none text-right">View Current Draft</button>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-black text-foreground">Version 2</span>
                    <span className="text-xs font-medium text-muted-foreground">Feb 28</span>
                  </div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-4">Sara Kim</p>

                  <div className="p-4 bg-secondary/20 rounded-2xl border border-border/10">
                    <p className="text-[11px] font-medium text-foreground/70 leading-relaxed italic">
                      &quot;Use this guide during the first week. Install required tooling, review the branching model, and complete the onboarding checklist.&quot;
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div>
            <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] mb-6">Tags</h3>
            <div className="flex flex-wrap gap-2">
              {(record?.tags || ["FRONTEND", "ONBOARDING"]).map(tag => (
                <span key={tag} className="flex items-center gap-2 px-3 py-2 bg-white text-foreground border border-border/40 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-sm">
                  #{tag.toUpperCase()}
                  <X className="w-3 h-3 text-muted-foreground cursor-pointer hover:text-primary" />
                </span>
              ))}
              <span className="px-3 py-2 bg-white text-muted-foreground border border-border/40 border-dashed rounded-lg text-[10px] font-black uppercase tracking-widest shadow-sm cursor-pointer hover:bg-secondary/20">+ ADD TAG</span>
            </div>
          </div>

          {mode === "edit" && record?.history && (
            <div className="pt-8 border-t border-border/40">
              <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] mb-6">Version History</h3>
              <div className="relative flex gap-4">
                <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center shrink-0 shadow-lg shadow-primary/20">
                  <div className="w-2 h-2 rounded-full bg-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-black text-foreground">V2.1</span>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">Feb 28</span>
                  </div>
                  <p className="text-[10px] font-bold text-muted-foreground mb-4">Sara Kim</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Mobile Metadata Drawer */}
      {isInfoOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 xl:hidden animate-in fade-in duration-300"
            onClick={() => setIsInfoOpen(false)}
          />
          <aside className="fixed inset-y-0 right-0 z-50 w-full sm:w-[350px] bg-white shadow-2xl flex flex-col xl:hidden animate-in slide-in-from-right duration-300">
            <div className="p-6 border-b border-border/40 flex items-center justify-between">
              <h2 className="text-lg font-bold">Metadata & Review</h2>
              <button
                onClick={() => setIsInfoOpen(false)}
                className="p-2 hover:bg-secondary rounded-lg text-muted-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-10">
              {/* This mimics the left/right sidebars content */}
              <div>
                <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] mb-6">Metadata</h3>
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.1em]">Document Title</label>
                    <input
                      type="text"
                      defaultValue={record?.title || ""}
                      className="w-full px-4 py-3 bg-white border border-border/60 rounded-xl text-sm font-bold"
                    />
                  </div>
                  {/* ... other metadata components could be refactored into a separate shared component ... */}
                </div>
              </div>

              <div>
                <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] mb-4">Lifecycle</h3>
                <div className="flex bg-secondary/30 p-1 rounded-xl gap-1">
                  {(["Draft", "In Review", "Approved"] as const).map((status) => (
                    <button
                      key={status}
                      onClick={() => setLifecycle(status)}
                      className={cn(
                        "flex-1 px-3 py-2 rounded-lg text-[10px] font-bold transition-all uppercase tracking-tighter",
                        lifecycle === status ? "bg-white text-foreground shadow-sm" : "text-muted-foreground"
                      )}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] mb-6">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {(record?.tags || ["FRONTEND", "ONBOARDING"]).map(tag => (
                    <span key={tag} className="flex items-center gap-2 px-3 py-2 bg-white text-foreground border border-border/40 rounded-lg text-[10px] font-black uppercase tracking-widest">
                      #{tag.toUpperCase()}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-border/40 bg-secondary/10">
              <button
                onClick={() => setIsInfoOpen(false)}
                className="w-full py-3 bg-foreground text-white rounded-xl font-bold shadow-lg"
              >
                Apply Changes
              </button>
            </div>
          </aside>
        </>
      )}
    </div>
  );
};
