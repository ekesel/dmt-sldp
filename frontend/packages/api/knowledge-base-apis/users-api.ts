import api from ".."

export interface KnowledgeManager {
  id: number;
  username: string;
}

const mockManagers: KnowledgeManager[] = [
  { id: 1, username: "rahul" },
  { id: 2, username: "john_doe" }
];

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const users = {
  // Only managers in that tenant per screenshot
  listKnowledgeManagers: async (): Promise<KnowledgeManager[]> => {
    await delay(200);
    return [...mockManagers];
  }
};
