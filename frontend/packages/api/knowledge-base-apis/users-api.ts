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
    const responseData = (response as any).data || response;
    
    // Handle both flat array and paginated results ({ results: [...] })
    if (Array.isArray(responseData)) {
      return responseData;
    }
    if (responseData && typeof responseData === "object" && Array.isArray(responseData.results)) {
      return responseData.results;
    }
    if (responseData && typeof responseData === "object" && Array.isArray(responseData.data)) {
      return responseData.data;
    }
    
    return [];
  }
};
