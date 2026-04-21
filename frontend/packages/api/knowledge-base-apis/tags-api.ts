import api from ".."

export interface Tag {
    id: number;
    name: string;
}

export const tags = {
    create: async (name: string) => {
        try {
            const response = await api.post<Tag>('/kb/tags/', { name });
            return {
                data: response.data,
                status: 200,
                message: 'Tag Created successfully'
            }
        } catch (error) {
            console.error('Error creating tag:', error);
            throw error;
        }
    },

    getAll: async () => {
        try {
            const response = await api.get<Tag[] | { results: Tag[] }>('/kb/tags/');
            // Handle both simple array and paginated response
            const responseData = response.data;
            const data = Array.isArray(responseData) ? responseData : (responseData as any).results || responseData;
            
            return {
                data: data,
                status: 200,
                message: 'Tags Fetched successfully'
            }
        } catch (error) {
            console.error('Error fetching tags:', error);
            throw error;
        }
    }
}

