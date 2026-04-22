"use client";
import React from "react";
import { useRouter } from "next/navigation";
import { RecordEditor } from "@/components/knowledge/RecordEditor";
import { usePermissions } from "@/hooks/usePermissions";

export default function NewRecordPage() {
  const router = useRouter();
  const { isManager } = usePermissions();

  // Security check: only managers can create records
  React.useEffect(() => {
    if (!isManager) {
      router.push("/knowledge-base");
    }
  }, [isManager, router]);

  if (!isManager) {
    return null; // or a loading spinner/unauthorized message
  }

  return (
    <RecordEditor 
      mode="create" 
      onBack={() => router.push("/knowledge-base")} 
    />
  );
}
