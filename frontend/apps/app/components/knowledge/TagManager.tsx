"use client";
import React, { useState, useRef, useEffect } from "react";
import { Tag, Search, X, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTags } from "@/features/knowledge-base/hooks/useTags";

interface TagManagerProps {
  selectedTags: string[];
  onChange: (tags: string[]) => void;
}

export const TagManager: React.FC<TagManagerProps> = ({ selectedTags, onChange }) => {
  const [newTag, setNewTag] = useState("");
  const [isTagDropdownOpen, setIsTagDropdownOpen] = useState(false);
  const tagDropdownRef = useRef<HTMLDivElement>(null);
  const { tags, createTag, isCreating: isTagsCreating } = useTags();

  const availableTags = tags.map((t) => t.name.toUpperCase());

  // Handle clicking outside of tag dropdown to close it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (tagDropdownRef.current && !tagDropdownRef.current.contains(event.target as Node)) {
        setIsTagDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const addTag = async (tagToMaybeAdd?: string) => {
    const isCustom = !tagToMaybeAdd;
    const tagName = (tagToMaybeAdd || newTag).trim();
    if (!tagName) return;

    const tagToDisplay = tagName.toUpperCase();

    if (!selectedTags.includes(tagToDisplay)) {
      if (isCustom) {
        try {
          await createTag(tagName);
        } catch (error) {
          console.error("Error creating tag:", error);
        }
      }
      onChange([...selectedTags, tagToDisplay]);
      if (isCustom) setNewTag("");
    }
    setIsTagDropdownOpen(false);
  };

  const removeTag = (tagToRemove: string) => {
    onChange(selectedTags.filter((t) => t !== tagToRemove));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">Tags</h3>
        <Tag className="w-3 h-3 text-muted-foreground" />
      </div>

      <div className="space-y-6">
        {/* Current Tags */}
        {selectedTags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {selectedTags.map((tag) => (
              <span
                key={tag}
                className="flex items-center gap-1.5 px-2 py-1.5 bg-primary/5 text-primary border border-primary/20 rounded-lg text-[9px] font-black uppercase tracking-widest shadow-sm"
              >
                {tag}
                <X
                  className="w-2.5 h-2.5 cursor-pointer hover:text-foreground transition-colors"
                  onClick={() => removeTag(tag)}
                />
              </span>
            ))}
          </div>
        )}

        {/* Unified Searchable Tag Input */}
        <div className="space-y-2 relative" ref={tagDropdownRef}>
          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.1em]">Add Tags</label>
          <div
            className={cn(
              "flex items-center gap-2 px-3 py-2 bg-background border rounded-xl shadow-sm transition-all group",
              isTagDropdownOpen ? "border-primary/40 ring-2 ring-primary/10" : "border-border/60 hover:border-primary/30"
            )}
          >
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
                if (e.key === "Enter" && !isTagsCreating && newTag.trim()) {
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
                  .filter((tag) => !selectedTags.includes(tag) && (newTag.trim() === "" || tag.includes(newTag.toUpperCase())))
                  .map((tag) => (
                    <button
                      key={tag}
                      onClick={() => addTag(tag)}
                      className="w-full text-left px-4 py-2.5 hover:bg-secondary flex items-center gap-3 transition-colors"
                    >
                      <Tag className="w-3 h-3 text-muted-foreground" />
                      <span className="text-[10px] font-black uppercase tracking-widest">#{tag}</span>
                    </button>
                  ))}

                {/* Create New Option */}
                {newTag.trim() !== "" && !availableTags.includes(newTag.toUpperCase()) && (
                  <button
                    onClick={() => addTag()}
                    className="w-full text-left px-4 py-2.5 hover:bg-primary/5 group border-t border-border/10 flex items-center justify-between transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Plus className="w-3 h-3 text-primary" />
                      <span className="text-[10px] font-black text-primary uppercase tracking-widest">
                        Create &quot;{newTag.toUpperCase()}&quot;
                      </span>
                    </div>
                    <span className="text-[8px] font-bold text-muted-foreground/40 group-hover:text-primary/40">ENTER</span>
                  </button>
                )}

                {/* Empty State */}
                {newTag.trim() === "" && availableTags.filter((tag) => !selectedTags.includes(tag)).length === 0 && (
                  <div className="px-4 py-6 text-center">
                    <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">
                      No tags available
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
