"use client";
import React, { useState } from "react";
import {
  ChevronLeft,
  ChevronDown,
  Type,
  Bold,
  Italic,
  Quote,
  Link2,
  Image as ImageIcon,
  Paperclip,
  CheckCircle2,
  Tag,
  X,
  Plus,
  Search,
  Upload,
  FileText,
  Loader2,
  MoreHorizontal,
  Settings,
  XCircle,
  Save,
  Globe
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Record as KBRecord } from "./RecordList";
import { knowledgeRecords } from "@dmt/api";
import { useQueryClient } from "@tanstack/react-query";
import { RECORD_QUERY_KEYS } from "@/features/knowledge-base/api/query-keys";
import { toast } from "react-hot-toast";


import { useTags } from "@/features/knowledge-base/hooks/useTags";
import { useUsers } from "@/features/knowledge-base/hooks/useUsers";
import { useMetadata } from "@/features/knowledge-base/hooks/useMetadata";
import { useRecordVersions } from "@/features/knowledge-base/hooks/useKnowledgeRecords";

interface RecordEditorProps {
  mode: "create" | "edit";
  record?: KBRecord | null;
  onBack: () => void;
}

interface FormData {
  title: string;
  lifecycle_status: "DRAFT" | "UNDER_REVIEW" | "APPROVED" | "REJECTED";
  tags: string[];
  assets: {
    fileName: string;
    fileUrl: string;
    size?: string;
  }[];
  version: number;
  file: File | null;
  owner_id: string | number;
}

export const RecordEditor: React.FC<RecordEditorProps> = ({ mode, record, onBack }) => {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<FormData>({
    title: record?.title || "",
    lifecycle_status: mode === "create" ? "DRAFT" : (record?.rawStatus as any || "UNDER_REVIEW"),
    tags: record?.tags || [],
    assets: record?.assets?.map(a => ({
      fileName: a.name,
      fileUrl: "",
      size: a.size
    })) || [],
    version: mode === "create" ? 1 : (record?.versionCount || 0) + 1,
    file: null,
    owner_id: mode === "edit" ? record?.owner || "" : "",
  });

  const [newTag, setNewTag] = useState("");
  const [isTagDropdownOpen, setIsTagDropdownOpen] = useState(false);
  const tagDropdownRef = React.useRef<HTMLDivElement>(null);
  const { tags, createTag, isLoading: isTagsLoading, isError: isTagsError, isCreating: isTagsCreating } = useTags();
  const { managers, isLoading: isUsersLoading } = useUsers();
  const { categories, allValues, isLoading: isMetadataLoading } = useMetadata();
  const { versions, isLoading: isHistoryLoading } = useRecordVersions(record?.id || null);

  const availableTags = tags.map(t => t.name.toUpperCase());

  // Handle clicking outside of tag dropdown to close it
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (tagDropdownRef.current && !tagDropdownRef.current.contains(event.target as Node)) {
        setIsTagDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Build a dynamic map of categoryId → values, covering ALL categories
  // (not just hardcoded team/project/type). New categories added by a manager
  // in the KnowledgeSidebar will automatically appear here via shared React Query cache.
  const valuesByCategory = categories.reduce<Record<number, typeof allValues>>((acc, cat) => {
    acc[cat.id] = allValues.filter(v => v.category === cat.id);
    return acc;
  }, {});

  // Dynamic formData metadata map: categoryId → selected value id
  // Initialise from the record's existing data where possible.
  const [metadataSelections, setMetadataSelections] = React.useState<Record<number, string>>({});

  // Pre-fill metadata selections when in edit mode and values are loaded
  React.useEffect(() => {
    if (mode === "edit" && record?.metadata && allValues.length > 0) {
      const initialSelections: Record<number, string> = {};
      record.metadata.forEach(item => {
        let categoryId = item.category;

        // Fallback: if category ID is 0 or missing, try matching by name against categories list
        if ((!categoryId || categoryId === 0) && item.category_name && categories.length > 0) {
          const cat = categories.find(c => c.name.toLowerCase() === item.category_name.toLowerCase());
          if (cat) categoryId = cat.id;
        }

        if (!categoryId || categoryId === 0) return;

        // Find the value object that matches this category and value
        const valObj = allValues.find(v => {
          const isSameCategory = Number(v.category) === categoryId;
          if (!isSameCategory) return false;

          // Prefer matching by ID if available, otherwise match by string value
          if (item.value_id && String(v.id) === String(item.value_id)) return true;
          return v.value.toLowerCase() === item.value.toLowerCase();
        });

        if (valObj) {
          initialSelections[categoryId] = String(valObj.id);
        }
      });
      setMetadataSelections(prev => ({ ...prev, ...initialSelections }));
    }
  }, [mode, record, allValues, categories]);

  const handleMetadataChange = (categoryId: number, valueId: string) => {
    setMetadataSelections(prev => ({ ...prev, [categoryId]: valueId }));
  };

  const handleChange = (field: keyof FormData, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const addTag = async (tagToMaybeAdd?: string) => {
    const isCustom = !tagToMaybeAdd;
    const tagName = (tagToMaybeAdd || newTag).trim();
    if (!tagName) return;

    const tagToDisplay = tagName.toUpperCase();

    if (!formData.tags.includes(tagToDisplay)) {
      if (isCustom) {
        try {
          await createTag(tagName);
        } catch (error) {
          console.error("Error creating tag:", error);
        }
      }
      handleChange("tags", [...formData.tags, tagToDisplay]);
      if (isCustom) setNewTag("");
    }
    setIsTagDropdownOpen(false);
  };

  const removeTag = (tagToRemove: string) => {
    handleChange("tags", formData.tags.filter(t => t !== tagToRemove));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    handleChange("file", file);
  };

  const handleSave = async () => {
    if (mode === "create" && !formData.file) {
      toast.error("Please select a file to upload.");
      return;
    }

    try {
      if (mode === "edit" && record) {
        // 1. Prepare JSON payload for metadata update
        const updatePayload = {
          title: formData.title,
          tags: formData.tags.map(tagName => {
            const tagObj = tags.find(t => t.name.toUpperCase() === tagName);
            return tagObj?.id;
          }).filter(id => id !== undefined) as number[],
          metadata: Object.values(metadataSelections)
            .map(id => Number(id))
            .filter(id => !isNaN(id)),
        };

        // 2. Patch metadata
        await knowledgeRecords.update(record.id, updatePayload);
        console.log("Metadata updated via PATCH");

        // 3. If a new file is attached, upload it as a new version
        if (formData.file) {
          console.log("Uploading new version...");
          await knowledgeRecords.uploadVersion(record.id, formData.file);
          console.log("New version uploaded");
        }

        console.log("Document updated successfully");
      } else {
        // Create mode: use FormData for single-stage creation (Document + initial version)
        const formDataToSend = new FormData();
        formDataToSend.append("title", formData.title);

        const selectedOwnerId = formData.owner_id || (managers.length > 0 ? String(managers[0].id) : "1");
        formDataToSend.append("owner", String(selectedOwnerId));
        formDataToSend.append("lifecycle_status", formData.lifecycle_status);
        formDataToSend.append("content", "");
        formDataToSend.append("version", formData.version.toString());

        Object.values(metadataSelections).forEach((valueId) => {
          if (valueId) formDataToSend.append("metadata", valueId);
        });

        formData.tags.forEach((tagName) => {
          const tagObj = tags.find(t => t.name.toUpperCase() === tagName);
          if (tagObj) formDataToSend.append("tags", String(tagObj.id));
        });

        if (formData.file) {
          formDataToSend.append("file", formData.file);
        }

        const result = await knowledgeRecords.create(formDataToSend);
        console.log("Document created successfully:", result);
      }

      // Invalidate queries to refresh the list and detail views
      queryClient.invalidateQueries({ queryKey: RECORD_QUERY_KEYS.all });
      if (mode === "edit" && record) {
        queryClient.invalidateQueries({ queryKey: RECORD_QUERY_KEYS.detail(record.id) });
      }

      onBack();
    } catch (error) {
      console.error("Error saving document:", error);
      toast.error("Failed to save document. Please check your permissions and try again.");
    }
  };

  return (
    <div className="relative w-full h-full flex flex-col xl:flex-row overflow-y-auto xl:overflow-hidden animate-in fade-in duration-300 scroll-smooth">
      {/* Left Sidebar - Metadata (Stacked on Mobile, Fixed on Desktop) */}
      <aside className="w-full xl:w-64 bg-background border-b xl:border-b-0 xl:border-r border-border/40 flex flex-col shrink-0 no-scrollbar overflow-y-visible xl:overflow-y-auto">
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
                    value={formData.title}
                    onChange={(e) => handleChange("title", e.target.value)}
                    placeholder="Enter document title..."
                    className="w-full px-4 py-3 bg-background border border-border/60 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all shadow-sm"
                  />
                </div>

                {/* Dynamic category dropdowns — driven by whatever categories exist
                    in the store. New categories added by a manager in the sidebar
                    automatically appear here via shared React Query cache. */}
                {isMetadataLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="h-12 bg-secondary/40 rounded-xl animate-pulse" />
                    ))}
                  </div>
                ) : (
                  categories.map((category) => {
                    const values = valuesByCategory[category.id] ?? [];
                    const selectedVal = metadataSelections[category.id] ?? "";
                    return (
                      <div key={category.id} className="space-y-2">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.1em] capitalize">
                          {category.name}
                        </label>
                        <div className="relative">
                          <select
                            value={selectedVal}
                            onChange={(e) => handleMetadataChange(category.id, e.target.value)}
                            className="w-full appearance-none px-4 py-3 bg-background border border-border/60 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all shadow-sm pr-10"
                          >
                            <option value="" disabled>
                              Select {category.name}...
                            </option>
                            {values.map(v => (
                              <option key={v.id} value={String(v.id)}>{v.value}</option>
                            ))}
                          </select>
                          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                        </div>
                      </div>
                    );
                  })
                )}

                <div className={cn(
                  "space-y-2 p-3 -m-3 rounded-2xl transition-all duration-500",
                  formData.lifecycle_status === "UNDER_REVIEW" ? "bg-primary/5 ring-1 ring-primary/20 shadow-sm" : ""
                )}>
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.1em]">Ownership</label>
                    {formData.lifecycle_status === "UNDER_REVIEW" && (
                      <span className="text-[8px] font-black text-primary uppercase tracking-widest animate-pulse">Required</span>
                    )}
                  </div>
                  <div className="relative">
                    <select
                      value={formData.owner_id}
                      onChange={(e) => handleChange("owner_id", e.target.value)}
                      disabled={isUsersLoading}
                      className={cn(
                        "w-full appearance-none px-4 py-3 bg-background border rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all shadow-sm pr-10 disabled:opacity-50",
                        formData.lifecycle_status === "UNDER_REVIEW" ? "border-primary/40" : "border-border/60 focus:border-primary/40"
                      )}
                    >
                      {managers.length > 0 ? (
                        <option value={String(managers[0].id)}>You ({managers[0].username})</option>
                      ) : (
                        <option value="1">You</option>
                      )}
                      {managers.map(user => (
                        <option key={user.id} value={user.id}>{user.username}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] mb-4">Lifecycle</h3>
              <div className="flex bg-secondary/30 p-3 rounded-xl">
                <span className="text-[11px] font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                  <div className={cn(
                    "w-2 h-2 rounded-full",
                    formData.lifecycle_status === "APPROVED" ? "bg-emerald-500" :
                    formData.lifecycle_status === "REJECTED" ? "bg-rose-500" : "bg-primary"
                  )} />
                  {formData.lifecycle_status === "UNDER_REVIEW" ? "Under Review" : 
                   formData.lifecycle_status === "DRAFT" ? "Draft" : 
                   formData.lifecycle_status === "REJECTED" ? "Rejected" : "Approved"}
                </span>
              </div>
              <p className="text-[9px] text-muted-foreground mt-2 italic font-medium">Status is managed automatically by the system.</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 bg-background xl:bg-transparent overflow-y-visible xl:overflow-y-auto overflow-x-hidden">
        <header className="px-6 xl:px-10 py-4 sm:py-6 xl:py-8 flex flex-col sm:flex-row gap-4 sm:items-center justify-between bg-background border-b border-border/40 sticky top-0 z-10 transition-all">
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
                <span className="text-foreground/60">Assets</span>
              </div>
            </div>
            <h1 className="text-2xl lg:text-4xl font-black text-foreground tracking-tight ml-0 lg:ml-0">
              {mode === "create" ? "New document" : "Edit document"}
            </h1>
          </div>

          <div className="flex items-center gap-2 lg:gap-3 xl:gap-4">


            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-6 xl:px-8 py-2 xl:py-3 rounded-xl xl:rounded-2xl text-xs xl:text-sm font-bold transition-all shadow-lg active:scale-95 text-primary-foreground bg-primary hover:bg-primary/90"
            >
              {mode === "create" ? <Globe className="w-4 h-4" /> : <Save className="w-4 h-4" />}
              {mode === "create" ? "Publish" : "Save"}
            </button>
          </div>
        </header>

        <div className="flex-1 flex bg-background">
          <div className="w-full flex flex-col min-h-[400px] xl:min-h-[600px] overflow-hidden">
            <div className="p-4 lg:p-8">
              <div className="space-y-8 lg:space-y-12">
                {/* Upload Area */}
                <div
                  onClick={() => document.getElementById('file-upload')?.click()}
                  className={cn(
                    "border-2 border-dashed rounded-3xl lg:rounded-[32px] p-10 lg:p-20 flex flex-col items-center justify-center text-center bg-secondary/50 hover:border-primary/40 transition-all cursor-pointer",
                    formData.file ? "border-primary/60 bg-primary/5" : "border-border/40"
                  )}
                >
                  <input
                    id="file-upload"
                    type="file"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                  <div className={cn(
                    "w-12 h-12 lg:w-16 lg:h-16 rounded-2xl shadow-xl flex items-center justify-center mb-6 transition-colors",
                    formData.file ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground"
                  )}>
                    {formData.file ? <CheckCircle2 className="w-6 h-6 lg:w-8 lg:h-8" /> : <Upload className="w-6 h-6 lg:w-8 lg:h-8" />}
                  </div>
                  <h3 className="text-xl lg:text-3xl font-black text-foreground mb-3">
                    {formData.file ? formData.file.name : (mode === "edit" ? "Upload New Version" : "Drop files here")}
                  </h3>
                  <button className="text-sm lg:text-lg font-black text-primary hover:underline transition-all">
                    {formData.file ? "Change file" : (mode === "edit" ? "Select New File" : "Browse files")}
                  </button>
                  {formData.file && (
                    <span className="mt-4 text-xs font-bold text-muted-foreground uppercase tracking-widest">
                      {(formData.file.size / (1024 * 1024)).toFixed(2)} MB
                    </span>
                  )}
                </div>

                {/* Existing Assets */}
                {mode === "edit" && formData.assets.length > 0 && (
                  <div className="bg-secondary/60 border border-border/40 rounded-[24px] lg:rounded-[40px] p-6 lg:p-10 space-y-6 lg:space-y-8">
                    <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">Existing Assets ({formData.assets.length})</h3>
                    <div className="space-y-4">
                      {formData.assets.map((asset) => (
                        <div key={asset.fileName} className="flex items-center justify-between p-4 lg:p-6 bg-background border border-border/20 rounded-2xl lg:rounded-3xl shadow-sm transition-all group">
                          <div className="flex items-center gap-4 lg:gap-6">
                            <FileText className="w-5 h-5 lg:w-6 lg:h-6 text-muted-foreground" />
                            <div className="flex flex-col">
                              <span className="text-sm lg:text-lg font-bold text-foreground truncate max-w-[150px] sm:max-w-none">{asset.fileName}</span>
                              <span className="text-[10px] lg:text-sm font-medium text-muted-foreground/60 uppercase">{asset.size}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 lg:gap-4">
                            <button
                              onClick={() => document.getElementById('file-upload')?.click()}
                              className="px-4 py-2 bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm active:scale-95"
                            >
                              Update
                            </button>
                          </div>

                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Right Sidebar - Review/Tags (Stacked on Mobile, Fixed on Desktop) */}
      <aside className="w-full xl:w-60 bg-background border-t xl:border-t-0 xl:border-l border-border/40 flex flex-col shrink-0 no-scrollbar overflow-y-visible xl:overflow-y-auto">
        <div className="p-6 space-y-12">
          <div>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">Tags</h3>
              <Tag className="w-3 h-3 text-muted-foreground" />
            </div>

            <div className="space-y-6">
              {/* Current Tags */}
              {formData.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {formData.tags.map(tag => (
                    <span key={tag} className="flex items-center gap-1.5 px-2 py-1.5 bg-primary/5 text-primary border border-primary/20 rounded-lg text-[9px] font-black uppercase tracking-widest shadow-sm">
                      {tag}
                      <X className="w-2.5 h-2.5 cursor-pointer hover:text-foreground transition-colors" onClick={() => removeTag(tag)} />
                    </span>
                  ))}
                </div>
              )}

              {/* Unified Searchable Tag Input */}
              <div className="space-y-2 relative" ref={tagDropdownRef}>
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.1em]">Add Tags</label>
                <div className={cn(
                  "flex items-center gap-2 px-3 py-2 bg-background border rounded-xl shadow-sm transition-all group",
                  isTagDropdownOpen ? "border-primary/40 ring-2 ring-primary/10" : "border-border/60 hover:border-primary/30"
                )}>
                  <Search className="w-3 h-3 text-muted-foreground" />
                  <input
                    type="text"
                    value={newTag}
                    onFocus={() => setIsTagDropdownOpen(true)}
                    onChange={(e) => {
                      setNewTag(e.target.value);
                      setIsTagDropdownOpen(true);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !isTagsCreating && newTag.trim()) {
                        addTag();
                      }
                    }}
                    placeholder="Search or type..."
                    className="bg-transparent border-none outline-none w-full text-[10px] font-bold uppercase tracking-widest placeholder:text-muted-foreground/40"
                  />
                  {isTagsCreating && (
                    <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin shrink-0" />
                  )}
                </div>

                {/* Dropdown Menu */}
                {isTagDropdownOpen && (
                  <div className="absolute top-full left-0 w-full mt-2 bg-background border border-border/40 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                    <div className="max-h-[200px] overflow-y-auto no-scrollbar py-1">
                      {/* Filtered Results */}
                      {availableTags
                        .filter(tag =>
                          !formData.tags.includes(tag) &&
                          (newTag.trim() === "" || tag.includes(newTag.toUpperCase()))
                        )
                        .map(tag => (
                          <button
                            key={tag}
                            onClick={() => addTag(tag)}
                            className="w-full text-left px-4 py-2.5 hover:bg-secondary flex items-center gap-3 transition-colors"
                          >
                            <Tag className="w-3 h-3 text-muted-foreground" />
                            <span className="text-[10px] font-black uppercase tracking-widest">#{tag}</span>
                          </button>
                        ))
                      }

                      {/* Create New Option */}
                      {newTag.trim() !== "" && !availableTags.includes(newTag.toUpperCase()) && (
                        <button
                          onClick={() => addTag()}
                          className="w-full text-left px-4 py-2.5 hover:bg-primary/5 group border-t border-border/10 flex items-center justify-between transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <Plus className="w-3 h-3 text-primary" />
                            <span className="text-[10px] font-black text-primary uppercase tracking-widest">Create &quot;{newTag.toUpperCase()}&quot;</span>
                          </div>
                          <span className="text-[8px] font-bold text-muted-foreground/40 group-hover:text-primary/40">ENTER</span>
                        </button>
                      )}

                      {/* Empty State */}
                      {newTag.trim() === "" && availableTags.filter(tag => !formData.tags.includes(tag)).length === 0 && (
                        <div className="px-4 py-6 text-center">
                          <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">No tags available</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {mode === "edit" && (
            <div className="pt-8 border-t border-border/40">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">Version History</h3>
                {isHistoryLoading && (
                  <Loader2 className="w-3 h-3 text-primary animate-spin" />
                )}
              </div>

              <div className="space-y-8">
                {versions.length > 0 ? (
                  versions.map((item, index) => (
                    <div key={item.version} className="relative flex gap-4">
                      {/* Progress Line */}
                      {index !== versions.length - 1 && (
                        <div className="absolute left-[11px] top-6 bottom-[-32px] w-[2px] bg-border/20" />
                      )}

                      <div className={cn(
                        "w-6 h-6 rounded-full flex items-center justify-center shrink-0 shadow-lg",
                        index === 0 ? "bg-primary shadow-primary/20" : "bg-secondary border border-border/40"
                      )}>
                        {index === 0 ? (
                          <div className="w-2 h-2 rounded-full bg-background" />
                        ) : (
                          <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-black text-foreground">{item.version}</span>
                          <span className="text-[10px] font-bold text-muted-foreground uppercase">{item.date}</span>
                        </div>
                        <p className="text-[10px] font-bold text-muted-foreground mb-1">
                          {item.author.startsWith("User #") ? item.author : `User #${item.author}`}
                        </p>
                        {item.comment && (
                          <p className="text-[11px] font-medium text-foreground/60 leading-tight italic truncate">
                            &quot;{item.comment}&quot;
                          </p>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  !isHistoryLoading && <p className="text-[10px] font-medium text-muted-foreground italic">No versions found.</p>
                )}
              </div>
            </div>
          )}
        </div>
      </aside>

    </div>
  );
};
