import { newsfeedKeys } from './query-keys';
import { Post } from '../../../types/newsfeed';

export const getNewsfeedQueryOptions = (
    socket: any, 
    handlers: { setPage: (page: number) => void; setHasNextPage: (hasNext: boolean) => void }
) => ({
    queryKey: newsfeedKeys.posts(),
    queryFn: () => {
        return new Promise<Post[]>((resolve, reject) => {
            if (!socket) {
                return reject(new Error('WebSocket is not connected'));
            }

            const handlePosts = (payload: any) => {
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
                socket.off('posts', handlePosts);
                socket.off('error', handleError);
                reject(err);
            };

            socket.on('posts', handlePosts);
            socket.on('error', handleError);

            socket.emit('get_posts', { page: 1 });
        });
    },
    enabled: !!socket && socket.isConnected,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
});
