import axios from "axios";
import api from "..";

export interface MetadataCategory {
  id: number;
  name: string;
}

export interface MetadataValue {
  id: number;
  category: number;
  category_name?: string;
  value: string;
}

export interface Metadata {
  id: number;
  name: string;
  values: string[];
}

// Mock Data (Cleanup: categories and values moved to API)

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const metadata = {
  /** GET /kb/metadata/categories/ */
  getCategories: async (): Promise<MetadataCategory[]> => {
    try {
      const response = await api.get<MetadataCategory[] | { results: MetadataCategory[] }>("/kb/metadata/categories/");
      const responseData = response.data;
      return Array.isArray(responseData) ? responseData : (responseData as any).results || responseData;
    } catch (error) {
      console.error("Error fetching metadata categories:", error);
      throw error;
    }
  },

  /** Aggregated view of categories and their values */
  list: async (): Promise<Metadata[]> => {
    try {
      const categories = await metadata.getCategories();
      const results = await Promise.all(
        categories.map(async (category) => {
          const values = await metadata.listValues(category.id);
          return {
            id: category.id,
            name: category.name,
            values: values.map(v => v.value)
          };
        })
      );
      return results;
    } catch (error) {
      console.error("Error fetching aggregated metadata:", error);
      return [];
    }
  },

  /** GET /kb/metadata/values/?category=1 */
  listValues: async (category?: number): Promise<MetadataValue[]> => {
    try {
      const response = await api.get<MetadataValue[] | { results: MetadataValue[] }>("/kb/metadata/values/", {
        params: category !== undefined ? { category } : undefined,
      });
      const responseData = response.data;
      return Array.isArray(responseData) ? responseData : (responseData as any).results || responseData;
    } catch (error) {
      console.error("Error fetching metadata values:", error);
      throw error;
    }
  },

  /** Helper refactored to use listValues */
  getByCategory: async (categoryId: number): Promise<{ id: number, value: string }[]> => {
    const values = await metadata.listValues(categoryId);
    return values.map(v => ({ id: v.id, value: v.value }));
  },

  /** POST /kb/metadata/categories/ */
  createCategory: async (body: { name: string }): Promise<MetadataCategory> => {
    try {
      const response = await api.post<MetadataCategory>("/kb/metadata/categories/", body);
      return response.data;
    } catch (error) {
      console.error("Error creating metadata category:", error);
      throw error;
    }
  },

  /** POST /kb/metadata/values/ */
  addValue: async (body: { category: number; value: string }): Promise<MetadataValue> => {
    try {
      const response = await api.post<MetadataValue>("/kb/metadata/values/", body);
      return response.data;
    } catch (error) {
      console.error("Error adding metadata value:", error);
      throw error;
    }
  }
};


