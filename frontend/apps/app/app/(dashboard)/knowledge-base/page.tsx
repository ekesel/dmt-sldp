"use client";
import React, { useState, useEffect } from "react";
import { KnowledgeSidebar, Team } from "@/components/knowledge/KnowledgeSidebar";
import { KnowledgeHeader } from "@/components/knowledge/KnowledgeHeader";
import { RecordList, Record, mockRecords } from "@/components/knowledge/RecordList";
import { RecordDetail } from "@/components/knowledge/RecordDetail";
import { RecordEditor } from "@/components/knowledge/RecordEditor";
import { MetadataCategory as Category } from "@dmt/api";
import { useMetadata } from "@/features/knowledge-base/hooks/useMetadata";
import { usePermissions } from "@/hooks/usePermissions";
import { useAuth } from "@/context/AuthContext";

export default function KnowledgeBasePage() {
  const [selectedRecord, setSelectedRecord] = useState<Record | null>(mockRecords[0]);
  const [isCreating, setIsCreating] = useState(false);
  const [editingRecord, setEditingRecord] = useState<Record | null>(null);
  const [activeTeam, setActiveTeam] = useState<string>("");
  const [activeCategory, setActiveCategory] = useState<number>(1);
  const [headerTitle, setHeaderTitle] = useState<string>("Loading...");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [teams, setTeams] = useState<Team[]>([]);
  const [showAddTeam, setShowAddTeam] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");

  const { 
    categories, 
    allMetadata, 
    allValues,
    addValue, 
    addCategory, 
    isAdding: isSubmittingValue,
    isAddingCategory: isSubmittingCategory 
  } = useMetadata(activeCategory);
  const { isManager } = usePermissions();
  const { user } = useAuth();

  // Sync sidebar list with active category
  useEffect(() => {
    if (allValues.length === 0) return;

    const filteredValues = allValues.filter(v => v.category === activeCategory);
    
    setTeams(filteredValues.map(v => ({
      name: v.value,
      count: 0 // Default count
    })));

    // Set initial active team once data loads if none selected
    if (!activeTeam && filteredValues.length > 0 && headerTitle === "Loading...") {
      const firstVal = filteredValues[0].value;
      setActiveTeam(firstVal);
      setHeaderTitle(firstVal);
    }
  }, [activeCategory, allValues, activeTeam, headerTitle]);

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
    
    const category = categories.find(c => c.id === categoryId);
    const title = category?.name || "Records";
    setHeaderTitle(title);
    
    if (category?.name.toUpperCase() !== "TEAM") {
      setActiveTeam("");
    }
  };

  const handleTeamChange = (team: string) => {
    setActiveTeam(team);
    setHeaderTitle(team);
    setSearchTerm(""); // Reset search on team change
    setIsSidebarOpen(false); // Close sidebar on selection (mobile)
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
              onSelect={(record) => {
                setSelectedRecord(record);
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
            currentUser={currentUser}
            onClose={() => setSelectedRecord(null)}
            onEdit={(record) => setEditingRecord(record)}
          />
        </div>
      </div>
    </div>
  );
}
