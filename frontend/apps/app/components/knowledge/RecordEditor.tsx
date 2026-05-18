"use client";
import React, { useState } from "react";
import { ChevronLeft, Save, Globe } from "lucide-react";
import { Record as KBRecord } from "./RecordList";
import { knowledgeRecords } from "@dmt/api";
import { useQueryClient } from "@tanstack/react-query";
import { RECORD_QUERY_KEYS } from "@/features/knowledge-base/api/query-keys";
import { toast } from "react-hot-toast";

import { useTags } from "@/features/knowledge-base/hooks/useTags";
import { MetadataForm } from "./MetadataForm";
import { TagManager } from "./TagManager";
import { AssetUploader } from "./AssetUploader";

interface RecordEditorProps {
  mode: "create" | "edit";
  record?: KBRecord | null;
  onBack: () => void;
}

interface FormData {
  title: string;
  tags: string[];
  assets: {
    fileName: string;
    fileUrl: string;
    size?: string;
  }[];
  version: number;
  file: File | null;
}

export const RecordEditor: React.FC<RecordEditorProps> = ({ mode, record, onBack }) => {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<FormData>({
    title: record?.title || "",
    tags: record?.tags || [],
    assets:
      record?.assets?.map((a) => ({
        fileName: a.name,
        fileUrl: "",
        size: a.size,
      })) || [],
    version: mode === "create" ? 1 : (record?.versionCount || 0) + 1,
    file: null,
  });

  const [metadataSelections, setMetadataSelections] = useState<Record<number, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const { tags } = useTags();

  const handleChange = <K extends keyof FormData>(field: K, value: FormData[K]) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleMetadataChange = (categoryId: number, valueId: string) => {
    setMetadataSelections((prev) => ({ ...prev, [categoryId]: valueId }));
  };

  const handleSave = async () => {
    if (isSaving) return;

    if (!formData.title.trim()) {
      toast.error("Please enter a title.");
      return;
    }

    if (mode === "create" && !formData.file) {
      toast.error("Please select a file to upload.");
      return;
    }

    try {
      setIsSaving(true);
      if (mode === "edit" && record) {
        // 1. If a new file is attached, upload it as a new version first
        if (formData.file) {
          await knowledgeRecords.uploadVersion(record.id, formData.file);
        }

        // 2. Prepare JSON payload for metadata update
        const updatePayload = {
          title: formData.title,
          tags: formData.tags
            .map((tagName) => {
              // 1. Try finding in the global tags list (freshly loaded/created)
              const tagObj = tags.find((t) => t.name.toUpperCase() === tagName.toUpperCase());
              if (tagObj) return tagObj.id;

              // 2. Fallback: Check if the tag existed on the record originally
              const originalTag = record?.tagDetails?.find(t => t.name.toUpperCase() === tagName.toUpperCase());
              return originalTag?.id;
            })
            .filter((id) => id !== undefined) as number[],
          metadata: Object.values(metadataSelections)
            .map((id) => Number(id))
            .filter((id) => !isNaN(id)),
        };

        // 3. Patch metadata only if file upload succeeded (or wasn't needed)
        await knowledgeRecords.update(record.id, updatePayload);
      } else {
        // Create mode: use FormData for single-stage creation (Document + initial version)
        const formDataToSend = new FormData();
        formDataToSend.append("title", formData.title);
        formDataToSend.append("content", "");
        formDataToSend.append("version", formData.version.toString());

        Object.values(metadataSelections).forEach((valueId) => {
          if (valueId) formDataToSend.append("metadata", valueId);
        });

        formData.tags.forEach((tagName) => {
          const tagObj = tags.find((t) => t.name.toUpperCase() === tagName);
          if (tagObj) formDataToSend.append("tags", String(tagObj.id));
        });

        if (formData.file) {
          formDataToSend.append("file", formData.file);
        }

        await knowledgeRecords.create(formDataToSend);
      }

      // Invalidate queries to refresh the list and detail views
      queryClient.invalidateQueries({ queryKey: RECORD_QUERY_KEYS.all });
      if (mode === "edit" && record) {
        queryClient.invalidateQueries({ queryKey: RECORD_QUERY_KEYS.detail(record.id) });
      }

      toast.success(mode === "create" ? "Document uploaded successfully" : "Document updated successfully");
      onBack();
    } catch (error: any) {
      console.error("Error saving document:", error);
      const message = error.response?.data?.detail || 
                      error.message || 
                      "Failed to save document. Please check your permissions and try again.";
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="relative w-full h-full flex flex-col xl:flex-row overflow-y-auto xl:overflow-hidden animate-in fade-in duration-300 scroll-smooth">
      {/* Left Sidebar - Metadata */}
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
              <MetadataForm
                title={formData.title}
                onTitleChange={(val) => handleChange("title", val)}
                metadataSelections={metadataSelections}
                onMetadataChange={handleMetadataChange}
                mode={mode}
                record={record}
              />
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
              disabled={isSaving}
              className="flex items-center gap-2 px-6 xl:px-8 py-2 xl:py-3 rounded-xl xl:rounded-2xl text-xs xl:text-sm font-bold transition-all shadow-lg active:scale-95 text-primary-foreground bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? (
                <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              ) : mode === "create" ? (
                <Globe className="w-4 h-4" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {isSaving ? (mode === "create" ? "Publishing..." : "Saving...") : mode === "create" ? "Publish" : "Save"}
            </button>
          </div>
        </header>

        <div className="flex-1 flex bg-background">
          <div className="w-full flex flex-col min-h-[400px] xl:min-h-[600px] overflow-hidden">
            <div className="p-4 lg:p-8">
              <AssetUploader
                mode={mode}
                recordId={record?.id || null}
                assets={formData.assets}
                currentFile={formData.file}
                onFileChange={(file) => handleChange("file", file)}
              />
            </div>
          </div>
        </div>
      </main>

      {/* Right Sidebar - Tags */}
      <aside className="w-full xl:w-60 bg-background border-t xl:border-t-0 xl:border-l border-border/40 flex flex-col shrink-0 no-scrollbar overflow-y-visible xl:overflow-y-auto">
        <div className="p-6">
          <TagManager selectedTags={formData.tags} onChange={(tags) => handleChange("tags", tags)} />
        </div>
      </aside>
    </div>
  );
};
