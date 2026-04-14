import api from ".."

const MOCK_TAGS = [
    { id: 1, name: "ui" },
    { id: 2, name: "backend" },
    { id: 3, name: "uixi" }
];

export const tags = {
    create: async (name: string) => {

        return {
            data: {
                id: Math.floor(Math.random() * 100) + 10,
                name: name
            },
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
