"use client";
import React, { useState } from "react";
import { KnowledgeSidebar } from "@/components/knowledge/KnowledgeSidebar";
import { KnowledgeHeader } from "@/components/knowledge/KnowledgeHeader";
import { RecordList, Record, mockRecords } from "@/components/knowledge/RecordList";
import { RecordDetail } from "@/components/knowledge/RecordDetail";
import { RecordEditor } from "@/components/knowledge/RecordEditor";

export default function KnowledgeBasePage() {
  const [selectedRecord, setSelectedRecord] = useState<Record | null>(mockRecords[0]);
  const [isCreating, setIsCreating] = useState(false);
  const [editingRecord, setEditingRecord] = useState<Record | null>(null);
  const [activeTeam, setActiveTeam] = useState<string>("Engineering");
  const [activeCategory, setActiveCategory] = useState<string>("TEAM");
  const [headerTitle, setHeaderTitle] = useState<string>("Engineering");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const handleCategoryChange = (category: string) => {
    setActiveCategory(category);
    setSearchTerm(""); // Reset search on category change
    const title = category.charAt(0).toUpperCase() + category.slice(1).toLowerCase();
    setHeaderTitle(title);
    if (category !== "TEAM") {
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
        activeTeam={activeTeam} 
        onTeamChange={handleTeamChange}
        activeCategory={activeCategory}
        onCategoryChange={handleCategoryChange}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
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
                  setActiveCategory("TEAM");
                  setSearchTerm(""); // Clear search after selection
                }
              }} 
            />
          </main>
          
          <RecordDetail 
            record={selectedRecord} 
            onClose={() => setSelectedRecord(null)} 
            onEdit={(record) => setEditingRecord(record)}
          />
        </div>
      </div>
    </div>
  );
}
