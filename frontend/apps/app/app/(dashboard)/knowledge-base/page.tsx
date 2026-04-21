"use client";
import React, { useState, useEffect } from "react";
import { KnowledgeSidebar, Team } from "@/components/knowledge/KnowledgeSidebar";
import { KnowledgeHeader } from "@/components/knowledge/KnowledgeHeader";
import { RecordList, Record } from "@/components/knowledge/RecordList";
import { RecordDetail } from "@/components/knowledge/RecordDetail";
import { RecordEditor } from "@/components/knowledge/RecordEditor";
import { MetadataCategory as Category } from "@dmt/api";
import { useMetadata } from "@/features/knowledge-base/hooks/useMetadata";
import { useRecord, useReviewCount } from "@/features/knowledge-base/hooks/useKnowledgeRecords";
import { usePermissions } from "@/hooks/usePermissions";
import { useAuth } from "@/context/AuthContext";
import { toast } from "react-hot-toast";

export default function KnowledgeBasePage() {
  const [activeTeam, setActiveTeam] = useState<string>("");
  const [activeCategory, setActiveCategory] = useState<number>(1);
  const [headerTitle, setHeaderTitle] = useState<string>("Loading...");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [editingRecord, setEditingRecord] = useState<Record | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddTeam, setShowAddTeam] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [isReviewActive, setIsReviewActive] = useState(false);

  const {
    categories,
    allMetadata,
    allValues,
    addValue,
    addCategory,
    isAdding: isSubmittingValue,
    isAddingCategory: isSubmittingCategory
  } = useMetadata(activeCategory);
  const { record: selectedRecord, isLoading: isRecordLoading } = useRecord(selectedId);
  const { count: reviewCount } = useReviewCount();
  const { isManager } = usePermissions();
  const { user } = useAuth();

  // Derive teams list from metadata values
  const teams = React.useMemo(() => 
    allValues.map(v => ({
      name: v.value,
      count: 0 // Default count
    })), 
    [allValues]
  );

  // Set initial active team once data loads if none selected
  useEffect(() => {
    if (!activeTeam && allValues.length > 0 && headerTitle === "Loading...") {
      const firstVal = allValues[0].value;
      setActiveTeam(firstVal);
      setHeaderTitle(firstVal);
    }
  }, [allValues, activeTeam, headerTitle]);

  // Show a "Welcome" toast if there are pending reviews on initial land
  useEffect(() => {
    if (isManager && reviewCount > 0) {
      toast(`You have ${reviewCount} documents pending review.`, {
        icon: '✉️',
        duration: 5000,
        id: 'review-notification', // Prevent duplicate toasts
      });
    }
  }, [isManager, reviewCount > 0]); // Triggers when count or role changes and count is positive

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
    setSelectedId(null); // Clear detail view on context switch

    const category = categories.find(c => c.id === categoryId);
    const title = category?.name || "Records";
    setHeaderTitle(title);

    if (category?.name.toUpperCase() !== "TEAM") {
      setActiveTeam("");
    }
    setIsReviewActive(false);
  };

  const handleTeamChange = (team: string) => {
    setActiveTeam(team);
    setHeaderTitle(team);
    setSearchTerm(""); // Reset search on team change
    setSelectedId(null); // Clear detail view on selection change
    setIsSidebarOpen(false); // Close sidebar on selection (mobile)
    setIsReviewActive(false);
  };

  const handleReviewClick = () => {
    setIsReviewActive(true);
    setHeaderTitle("Review Inbox");
    setActiveTeam("");
    setSearchTerm("");
    setSelectedId(null); // Clear detail view when switching to review
    setIsSidebarOpen(false);
  };

  if (isCreating) {
    return <RecordEditor mode="create" onBack={() => setIsCreating(false)} />;
  }

  if (editingRecord) {
    return <RecordEditor mode="edit" record={editingRecord} onBack={() => setEditingRecord(null)} />;
  }

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
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          onNewRecord={() => setIsCreating(true)}
          onMenuToggle={() => setIsSidebarOpen(!isSidebarOpen)}
        />

        <div className="flex-1 flex overflow-hidden">
          <main className="flex-1 overflow-y-auto scroll-smooth">
            <RecordList
              selectedId={selectedRecord?.id || null}
              activeTeam={activeTeam}
              search={searchTerm}
              category={activeCategory}
              mine={isReviewActive}
              onSelect={(record) => {
                setSelectedId(record.id);
                if (searchTerm) {
                  // If we were searching, sync the UI to the selected record's team
                  setActiveTeam(record.team);
                  setHeaderTitle(record.team);
                  setActiveCategory(1);
                  setSearchTerm(""); // Clear search after selection
                }
              }}
            />
          </main>

          <RecordDetail
            record={selectedRecord}
            isLoading={isRecordLoading}
            currentUser={currentUser}
            onClose={() => setSelectedId(null)}
            onEdit={(record) => setEditingRecord(record)}
          />
        </div>
      </div>
    </div>
  );
}
