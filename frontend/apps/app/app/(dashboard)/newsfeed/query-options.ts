import { newsfeedKeys } from './query-keys';
import { Post } from '../../../types/newsfeed';

export const getNewsfeedQueryOptions = (
    socket: any, 
    isConnected: boolean,
    handlers: { setPage: (page: number) => void; setHasNextPage: (hasNext: boolean) => void },
    postId?: number | null
) => ({
    queryKey: newsfeedKeys.posts(),
    queryFn: () => {
        return new Promise<Post[]>((resolve, reject) => {
            if (!socket) {
                return reject(new Error('WebSocket is not connected'));
            }

            let timeoutId: NodeJS.Timeout;

            const handlePosts = (payload: any) => {
                clearTimeout(timeoutId);
                socket.off('posts', handlePosts);
                socket.off('error', handleError);
                
                if (payload.error) {
                    reject(new Error(payload.error));
                } else {
                    handlers.setPage(payload.page || 1);
                    handlers.setHasNextPage(!!payload.has_next);
                    resolve(payload.data || []);
                }
            };

            const handleError = (err: any) => {
                clearTimeout(timeoutId);
                socket.off('posts', handlePosts);
                socket.off('error', handleError);
                reject(err);
            };

            socket.on('posts', handlePosts);
            socket.on('error', handleError);

            timeoutId = setTimeout(() => {
                socket.off('posts', handlePosts);
                socket.off('error', handleError);
                reject(new Error('Timeout: Server did not respond within 30 seconds'));
            }, 30000);

            socket.emit('get_posts', { page: 1, post_id: postId });
        });
    },
    enabled: !!socket && isConnected,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
});
