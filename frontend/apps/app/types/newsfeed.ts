export interface Author {
    id: number;
    username: string;
    email?: string;
    first_name?: string;
    last_name?: string;
    avatar_url?: string | null;
}

export interface Post {
    post_id: number;
    title: string;
    content: string;
    category?: string;
    media_file?: string | null;
    author: Author;
    created_at: string;
    updated_at: string;
    likes?: number;
    comments?: number;
    shares?: number;
}
