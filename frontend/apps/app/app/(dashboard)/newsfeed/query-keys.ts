export const newsfeedKeys = {
    all: ['newsfeed'] as const,
    posts: () => [...newsfeedKeys.all, 'posts'] as const,
};
