"use client";
import React from "react";
import { useRouter, useParams } from "next/navigation";
import { RecordEditor } from "@/components/knowledge/RecordEditor";
import { useRecord } from "@/features/knowledge-base/hooks/useKnowledgeRecords";
import { usePermissions } from "@/hooks/usePermissions";
import { Loader2 } from "lucide-react";

export default function EditRecordPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const { isManager } = usePermissions();
  const { record, isLoading, isError } = useRecord(id);

  // Security check: only managers can edit records
  React.useEffect(() => {
    if (!isManager) {
      router.push("/knowledge-base");
    }
  }, [isManager, router]);

  if (!isManager) return null;

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 text-primary animate-spin" />
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-[0.2em]">Preparing Editor...</p>
        </div>
      </div>
    );
  }

  if (isError || !record) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center">
          <h2 className="text-xl font-bold text-foreground mb-2">Record Not Found</h2>
          <button 
            onClick={() => router.push("/knowledge-base")}
            className="text-primary font-bold hover:underline"
          >
            Back to Library
          </button>
        </div>
      </div>
    );
  }

  return (
    <RecordEditor 
      mode="edit" 
      record={record} 
      onBack={() => router.push("/knowledge-base")} 
    />
  );
}
