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

// Mock Data
let metadataValueIdCounter = 100;
let metadataCategoryIdCounter = 10;

let mockMetadataCategories: MetadataCategory[] = [
  { id: 1, name: "project" },
  { id: 2, name: "team" },
  { id: 3, name: "type" }
];

let mockMetadataValues: MetadataValue[] = [
  { id: 11, category: 1, value: "Knowledge Base" },
  { id: 12, category: 1, value: "Infrastructure" },
  { id: 13, category: 1, value: "docs" },
  { id: 14, category: 1, value: "Security" },

  { id: 21, category: 2, value: "Engineering" },
  { id: 22, category: 2, value: "Backend" },
  { id: 23, category: 2, value: "Design" },

  { id: 31, category: 3, value: "PPT" },
  { id: 32, category: 3, value: "DOC" },
  { id: 33, category: 3, value: "Onboarding" },
  { id: 34, category: 3, value: "Guideline" },
  { id: 35, category: 3, value: "Documentation" },
  { id: 36, category: 3, value: "Technical Doc" }
];

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const metadata = {
  // Replace with get('/metadata/categories/')
  getCategories: async (): Promise<MetadataCategory[]> => {
    await delay(200);
    return [...mockMetadataCategories];
  },

  // Replace with get('/metadata/')
  list: async (): Promise<Metadata[]> => {
    await delay(300);
    return mockMetadataCategories.map(category => ({
      id: category.id,
      name: category.name,
      values: mockMetadataValues
        .filter(v => v.category === category.id)
        .map(v => v.value)
    }));
  },

  // Endpoint-ready: GET /metadata/values/?category=1
  // Falls back to mock data until backend endpoint is available.
  listValues: async (category?: number): Promise<MetadataValue[]> => {
    try {
      const response = await api.get<MetadataValue[]>("/metadata/values/", {
        params: category !== undefined ? { category } : undefined,
      });
      return response.data;
    } catch (error) {
      const isEndpointUnavailable =
        axios.isAxiosError(error) &&
        (error.response?.status === 404 || error.response?.status === 405 || error.response?.status === 501);

      if (!isEndpointUnavailable) {
        throw error;
      }
    }

    await delay(200);

    if (category !== undefined) {
      return mockMetadataValues.filter((item) => item.category === category);
    }

    return [...mockMetadataValues];
  },

  // Replace with get(`/metadata/categories/${categoryId}/values/`)
  getByCategory: async (categoryId: number): Promise<{ id: number, value: string }[]> => {
    await delay(200);
    return mockMetadataValues
      .filter(v => v.category === categoryId)
      .map(v => ({ id: v.id, value: v.value }));
  },

  // Replace with post('/metadata/categories/', body)
  createCategory: async (body: { name: string }): Promise<MetadataCategory> => {
    await delay(200);
    if (!body.name || !body.name.trim()) {
      throw new Error("Category name is required");
    }
    const newCategory: MetadataCategory = {
      id: ++metadataCategoryIdCounter,
      name: body.name.trim()
    };
    mockMetadataCategories.push(newCategory);
    return newCategory;
  },

  // Replace with post('/metadata/values/', body)
  addValue: async (body: { category: number; value: string }): Promise<MetadataValue> => {
    await delay(200);
    if (!body.value || !body.value.trim()) {
      throw new Error("Value cannot be empty");
    }
    const categoryObj = mockMetadataCategories.find(cat => cat.id === body.category);
    if (!categoryObj) {
      throw new Error(`Category with ID ${body.category} does not exist`);
    }
    const isDuplicate = mockMetadataValues.some(
      v => v.category === body.category &&
        v.value.toLowerCase() === body.value.trim().toLowerCase()
    );
    if (isDuplicate) {
      throw new Error(`Value '${body.value}' already exists in this category`);
    }

    const newValue: MetadataValue = {
      id: ++metadataValueIdCounter,
      category: body.category,
      category_name: categoryObj.name,
      value: body.value.trim()
    };

    mockMetadataValues.push(newValue);
    return newValue;
  }
};
