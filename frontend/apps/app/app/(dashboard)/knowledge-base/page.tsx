"use client";
import React, { useState, useEffect } from "react";
import { KnowledgeSidebar, Team } from "@/components/knowledge/KnowledgeSidebar";
import { KnowledgeHeader } from "@/components/knowledge/KnowledgeHeader";
import { RecordList, Record, mockRecords } from "@/components/knowledge/RecordList";
import { RecordDetail } from "@/components/knowledge/RecordDetail";
import { RecordEditor } from "@/components/knowledge/RecordEditor";
import { metadata as metadataAPI, MetadataCategory as Category, Metadata as MetadataResponse } from "@dmt/api";


export default function KnowledgeBasePage() {
  const [selectedRecord, setSelectedRecord] = useState<Record | null>(mockRecords[0]);
  const [isCreating, setIsCreating] = useState(false);
  const [editingRecord, setEditingRecord] = useState<Record | null>(null);
  const [activeTeam, setActiveTeam] = useState<string>("Engineering");
  const [activeCategory, setActiveCategory] = useState<number>(1);
  const [headerTitle, setHeaderTitle] = useState<string>("Engineering");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [allMetadata, setAllMetadata] = useState<MetadataResponse[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [isAddingTeam, setIsAddingTeam] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");

  const fetchData = async () => {
    const rawCategories = await metadataAPI.getCategories();
    setCategories(rawCategories);
    
    const metadata = await metadataAPI.list();
    setAllMetadata(metadata);
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Sync sidebar list with active category
  useEffect(() => {
    if (allMetadata.length === 0) return;

    const currentMetadata = allMetadata.find(m => m.id === activeCategory);
    
    if (currentMetadata) {
      setTeams(currentMetadata.values.map(val => ({
        name: val,
        count: 0 // Provide 0 as default count for all categories
      })));
    }
  }, [activeCategory, allMetadata]);

  const handleAddValueSubmit = async () => {
    if (!newTeamName.trim()) return;
    
    const currentCategory = categories.find((cat) => cat.id === activeCategory);

    if (!currentCategory) {
      console.error(`Category with ID "${activeCategory}" not found in metadata.`);
      return;
    }
    
    try {
      const newValue = await metadataAPI.addValue({
        category_id: currentCategory.id,
        value: newTeamName
      });
      
      // Update local state instead of full data fetch for better UX
      setAllMetadata(prev => prev.map(cat => {
        if (cat.id === activeCategory) {
          return {
            ...cat,
            values: [...cat.values, newValue.value]
          };
        }
        return cat;
      }));

      setNewTeamName("");
      setIsAddingTeam(false);
    } catch (error: any) {
      console.error("Failed to add value:", error.message);
      // Optional: Show error to user
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

  const currentUser = "Himanshu Rathore";

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
        isAddingTeam={isAddingTeam}
        newTeamName={newTeamName}
        onAddTeamClick={() => setIsAddingTeam(true)}
        onNewTeamChange={setNewTeamName}
        onAddTeamSubmit={handleAddValueSubmit}
        onAddTeamCancel={() => {
          setIsAddingTeam(false);
          setNewTeamName("");
        }}
      />

      <div className="flex-1 flex flex-col h-full overflow-hidden min-w-0">
        <KnowledgeHeader
          activeItem={headerTitle}
          activeCategory={activeCategory}
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
              searchTerm={searchTerm}
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
