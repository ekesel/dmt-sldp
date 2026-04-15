import api from ".."

export interface Tag {
    id: number;
    name: string;
}

let MOCK_TAGS: Tag[] = [
    { id: 1, name: "ui" },
    { id: 2, name: "backend" },
    { id: 3, name: "uixi" }
];

export const tags = {
    create: async (name: string) => {
        const newTag = {
            id: Math.floor(Math.random() * 100) + 10,
            name: name
        };
        MOCK_TAGS.push(newTag);
        return {
            data: newTag,
            status: 200,
            message: 'Tag Created succesfully;'
        }
    },

    getAll: async () => {

        return {
            data: MOCK_TAGS,
            status: 200,
            message: 'Tag Fetched succesfully;'

        }
    }
}
