"use client";
import React, { useEffect, useMemo, useRef } from "react";
import { ChevronDown } from "lucide-react";
import { useMetadata } from "@/features/knowledge-base/hooks/useMetadata";
import { Record as KBRecord } from "./RecordList";

interface MetadataFormProps {
  title: string;
  onTitleChange: (val: string) => void;
  metadataSelections: Record<number, string>;
  onMetadataChange: (categoryId: number, valueId: string) => void;
  mode: "create" | "edit";
  record?: KBRecord | null;
}

export const MetadataForm: React.FC<MetadataFormProps> = ({
  title,
  onTitleChange,
  metadataSelections,
  onMetadataChange,
  mode,
  record,
}) => {
  const { categories, allValues, isLoading: isMetadataLoading } = useMetadata();
  const didPrefillRef = useRef<string | null>(null);

  // Build a dynamic map of categoryId → values
  const valuesByCategory = useMemo(() => {
    return categories.reduce<Record<number, typeof allValues>>((acc, cat) => {
      acc[cat.id] = allValues.filter((v) => v.category === cat.id);
      return acc;
    }, {});
  }, [categories, allValues]);

  // Pre-fill metadata selections when in edit mode and values are loaded
  useEffect(() => {
    const recordKey = record ? String(record.id) : null;
    if (mode === "edit" && recordKey && allValues.length > 0 && didPrefillRef.current !== recordKey) {
      didPrefillRef.current = recordKey;
      
      record?.metadata?.forEach((item) => {
        let categoryId = item.category;

        // Fallback: if category ID is 0 or missing, try matching by name against categories list
        if ((!categoryId || categoryId === 0) && item.category_name && categories.length > 0) {
          const cat = categories.find((c) => c.name.toLowerCase() === item.category_name.toLowerCase());
          if (cat) categoryId = cat.id;
        }

        if (!categoryId || categoryId === 0) return;

        // Find the value object that matches this category and value
        const valObj = allValues.find((v) => {
          const isSameCategory = Number(v.category) === categoryId;
          if (!isSameCategory) return false;

          // Prefer matching by ID if available, otherwise match by string value
          if (item.value_id && String(v.id) === String(item.value_id)) return true;
          return v.value.toLowerCase() === item.value.toLowerCase();
        });

        if (valObj) {
          onMetadataChange(categoryId, String(valObj.id));
        }
      });
    }
  }, [mode, record, allValues, categories]);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.1em]">
          Document Title
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="Enter document title..."
          className="w-full px-4 py-3 bg-background border border-border/60 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all shadow-sm"
        />
      </div>

      {isMetadataLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
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
                  onChange={(e) => onMetadataChange(category.id, e.target.value)}
                  className="w-full appearance-none px-4 py-3 bg-background border border-border/60 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all shadow-sm pr-10"
                >
                  <option value="" disabled>
                    Select {category.name}...
                  </option>
                  {values.map((v) => (
                    <option key={v.id} value={String(v.id)}>
                      {v.value}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              </div>
            </div>
          );
        })
      )}
    </div>
  );
};
