"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { KnowledgeSidebar, Team } from "@/components/knowledge/KnowledgeSidebar";
import { KnowledgeHeader } from "@/components/knowledge/KnowledgeHeader";
import { RecordList, Record } from "@/components/knowledge/RecordList";
import { RecordDetail } from "@/components/knowledge/RecordDetail";
import { MetadataCategory as Category } from "@dmt/api";
import { useMetadata, useAllMetadataValues } from "@/features/knowledge-base/hooks/useMetadata";
import { useRecord, useReviewCount, useRecords } from "@/features/knowledge-base/hooks/useKnowledgeRecords";
import { useTags } from "@/features/knowledge-base/hooks/useTags";
import { usePermissions } from "@/hooks/usePermissions";
import { useAuth } from "@/context/AuthContext";
import { toast } from "react-hot-toast";

export default function KnowledgeBasePage() {
  const router = useRouter();
  const [activeTeam, setActiveTeam] = useState<string>("");
  const [activeCategory, setActiveCategory] = useState<number>(1);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // isCreating state removed in favor of page-based navigation
  // Editor state removed in favor of page-based navigation
  const [searchTerm, setSearchTerm] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [showAddTeam, setShowAddTeam] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [isReviewActive, setIsReviewActive] = useState(false);
  const [activeTag, setActiveTag] = useState<{ id: number | string, name: string } | null>(null);

  const {
    categories,
    allMetadata,
    allValues,
    addValue,
    addCategory,
    isAdding: isSubmittingValue,
    isAddingCategory: isSubmittingCategory,
    isLoading: isMetadataLoading
  } = useMetadata(activeCategory);
  const { record: selectedRecord, isLoading: isRecordLoading } = useRecord(selectedId);
  const { count: reviewCount } = useReviewCount();
  const { records: allCategoryRecords } = useRecords({ category: activeCategory });
  const { tags } = useTags();
  const { allValues: globalValues } = useAllMetadataValues();
  const { isManager } = usePermissions();
  const { user } = useAuth();

  // Derive teams list with real counts from metadata values
  const teams = React.useMemo(() =>
    allValues.map(v => ({
      name: v.value,
      count: allCategoryRecords.filter(r =>
        r.metadata.some(m => m.value.trim().toLowerCase() === v.value.trim().toLowerCase())
      ).length
    })),
    [allValues, allCategoryRecords, activeCategory]
  );

  // Derive header title dynamically to prevent state desynchronization
  const headerTitle = React.useMemo(() => {
    if (isMetadataLoading && categories.length === 0) return "Loading...";
    if (isReviewActive) return "Review Inbox";
    if (activeTag) return activeTag.name;
    if (activeTeam) return activeTeam;
    
    const category = categories.find(c => c.id === activeCategory);
    return category?.name || "Records";
  }, [isMetadataLoading, categories, isReviewActive, activeTag, activeTeam, activeCategory]);

  // Set initial active team once data loads if none selected
  useEffect(() => {
    if (!activeTeam && allValues.length > 0) {
      const firstVal = allValues[0].value;
      setActiveTeam(firstVal);
    }
  }, [allValues, activeTeam]);

  // Show a "Welcome" toast if there are pending reviews on initial land
  useEffect(() => {
    if (isManager && reviewCount > 0) {
      toast(`You have ${reviewCount} documents pending review.`, {
        icon: '✉️',
        duration: 5000,
        id: 'review-notification', // Prevent duplicate toasts
      });
    }
  }, [isManager, reviewCount]); // Triggers when count or role changes

  // Debounce search input to prevent excessive API calls
  useEffect(() => {
    if (!searchInput) {
      setSearchTerm("");
      return;
    }

    const handler = setTimeout(() => {
      setSearchTerm(searchInput);
      setActiveTag(null); // Clear tag filter when performing text search
    }, 300);

    return () => {
      clearTimeout(handler);
    };
  }, [searchInput]);

  const handleAddValueSubmit = async () => {
    if (!newTeamName.trim() || !isManager) return;

    try {
      await addValue({
        category: activeCategory,
        value: newTeamName
      });
      setNewTeamName("");
      setShowAddTeam(false);
    } catch (error) {
      console.error("Failed to add value:", error);
    }
  };

  const handleAddCategorySubmit = async () => {
    if (!newCategoryName.trim() || !isManager) return;

    try {
      await addCategory({
        name: newCategoryName
      });
      setNewCategoryName("");
      setShowAddCategory(false);
    } catch (error) {
      console.error("Failed to add category:", error);
    }
  };

  const handleCategoryChange = (categoryId: number) => {
    setActiveCategory(categoryId);
    setSearchTerm(""); // Reset search on category change
    setSearchInput("");
    setSelectedId(null); // Clear detail view on context switch

    const category = categories.find(c => c.id === categoryId);

    if (category?.name.toUpperCase() !== "TEAM") {
      setActiveTeam("");
    }
    setActiveTag(null); // Clear tag on category change
    setIsReviewActive(false);
  };

  const handleTeamChange = (team: string) => {
    setActiveTeam(team);
    setSearchTerm("");
    setSearchInput("");
    setActiveTag(null); // Clear tag on team change
    setSelectedId(null);
    setIsSidebarOpen(false); // Close sidebar on selection (mobile)
    setIsReviewActive(false);
  };

  const handleTagClick = (tag: { id: number | string; name: string }) => {
    setActiveTag(tag);
    setSearchTerm("");
    setSearchInput("");
    setActiveCategory(1); // Default to project or clear? Clear is better for "all"
    setActiveTeam("");
    setSelectedId(null);
    setIsSidebarOpen(false);
    setIsReviewActive(false);
  };

  const handleSearchChange = (query: string) => {
    setSearchInput(query);

    if (!query) {
      setSearchTerm("");
      return;
    }

    // Check if query matches a tag (case-insensitive)
    const matchingTag = tags.find(t => t.name.toLowerCase() === query.toLowerCase());

    if (matchingTag) {
      handleTagClick(matchingTag);
      setSearchInput("");
      setSearchTerm("");
      toast.success(`Filtering by tag: ${matchingTag.name}`, { duration: 2000, id: 'tag-filter-match' });
      return;
    }

    // Check if query matches a metadata value (case-insensitive)
    const matchingValue = globalValues.find(v => v.value.toLowerCase() === query.toLowerCase());

    if (matchingValue) {
      const category = categories.find(c => c.id === matchingValue.category);
      const categoryName = category?.name || matchingValue.category_name || "Record";

      // Pivot context
      setActiveCategory(matchingValue.category);
      if (categoryName.toUpperCase() === "TEAM") {
        setActiveTeam(matchingValue.value);
      }
      setSearchInput("");
      setSearchTerm("");
      setActiveTag(null);
      setIsReviewActive(false);
      setSelectedId(null);

      toast.success(`Switching to ${categoryName}: ${matchingValue.value}`, {
        duration: 2000,
        id: 'category-filter-match'
      });
    }
  };

  const handleReviewClick = () => {
    setIsReviewActive(true);
    setActiveTeam("");
    setSearchTerm("");
    setSearchInput("");
    setSelectedId(null); // Clear detail view when switching to review
    setIsSidebarOpen(false);
  };

  const currentUser = user ? `${user.first_name} ${user.last_name || ""}`.trim() : "Unknown User";

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-background overflow-hidden animate-in fade-in duration-700 relative">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 xl:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <KnowledgeSidebar
        categories={categories}
        teams={teams}
        activeTeam={activeTeam}
        onTeamChange={handleTeamChange}
        activeCategory={activeCategory}
        onCategoryChange={handleCategoryChange}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        isAddingTeam={showAddTeam}
        newTeamName={newTeamName}
        onAddTeamClick={() => {
          if (isManager) setShowAddTeam(true);
        }}
        onNewTeamChange={setNewTeamName}
        onAddTeamSubmit={handleAddValueSubmit}
        onAddTeamCancel={() => {
          setShowAddTeam(false);
          setNewTeamName("");
        }}
        isAddingCategory={showAddCategory}
        newCategoryName={newCategoryName}
        onAddCategoryClick={() => {
          if (isManager) setShowAddCategory(true);
        }}
        onNewCategoryChange={setNewCategoryName}
        onAddCategorySubmit={handleAddCategorySubmit}
        onAddCategoryCancel={() => {
          setShowAddCategory(false);
          setNewCategoryName("");
        }}
        isSubmittingCategory={isSubmittingCategory}
        isAddingValue={isSubmittingValue}
        isManager={isManager}
        isReviewActive={isReviewActive}
        onReviewClick={handleReviewClick}
        reviewCount={reviewCount}
      />

      <div className="flex-1 flex flex-col h-full overflow-hidden min-w-0">
        <KnowledgeHeader
          activeItem={headerTitle}
          searchTerm={searchInput || activeTag?.name || ""}
          onSearchChange={handleSearchChange}
          onNewRecord={() => {
            if (isManager) router.push("/knowledge-base/new");
          }}
          onMenuToggle={() => setIsSidebarOpen(!isSidebarOpen)}
        />

        <div className="flex-1 flex overflow-hidden">
          <main className="flex-1 overflow-y-auto scroll-smooth">
            <RecordList
              selectedId={selectedRecord?.id || null}
              activeTeam={activeTeam}
              search={searchTerm}
              category={activeCategory}
              tag={activeTag?.id}
              mine={isReviewActive}
              onSelect={(record) => {
                setSelectedId(record.id);
                if (searchTerm) {
                  const teamMeta = record.metadata.find(m => m.category === 1)?.value || "";
                  setActiveTeam(teamMeta);
                  setActiveCategory(1);
                  setSearchTerm("");
                }
              }}
              onTagClick={handleTagClick}
              onDeleteSuccess={(deletedId) => {
                if (selectedId === String(deletedId)) {
                  setSelectedId(null);
                }
              }}
            />
          </main>

          <RecordDetail
            record={selectedRecord}
            isLoading={isRecordLoading}
            currentUser={currentUser}
            onClose={() => setSelectedId(null)}
            onEdit={(record) => router.push(`/knowledge-base/edit/${record.id}`)}
            onTagClick={handleTagClick}
          />
        </div>
      </div>
    </div>
  );
}
