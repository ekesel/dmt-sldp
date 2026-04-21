import api from "..";

export interface KnowledgeManager {
  id: number;
  username: string;
}

export const users = {
  /**
   * GET /kb/users/
   * Returns username and ID of all managers in that tenant.
   */
  listKnowledgeManagers: async (): Promise<KnowledgeManager[]> => {
    const response = await api.get<KnowledgeManager[] | { results: KnowledgeManager[] }>("/kb/users/");
    const data = response as any;
    
    // Handle both flat array and paginated results ({ results: [...] })
    if (Array.isArray(data)) {
      return data;
    }
    if (data && typeof data === "object" && Array.isArray(data.results)) {
      return data.results;
    }
    if (data && typeof data === "object" && Array.isArray(data.data)) {
      return data.data;
    }
    
    return [];
  }
};
