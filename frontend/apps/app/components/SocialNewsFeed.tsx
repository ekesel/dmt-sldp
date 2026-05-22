'use client';

import React from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Heart, MessageSquare } from 'lucide-react';
import { useNewsfeedData } from '../hooks/useNewsfeedData';
import { useReactions } from '../hooks/useReactions';
import { useComments } from '../hooks/useComments';
import { getMediaUrl } from '../lib/media';
import { formatTimestamp } from '../lib/utils';
import { getFileUrl } from '@dmt/api';

/**
 * SocialNewsFeed component styled exactly like the user's reference theme screenshot.
 * Displays a clean, dedicated card for the latest live newsfeed post with real-time likes & comments.
 */
export const SocialNewsFeed: React.FC = () => {
    const router = useRouter();
    const { posts, loading } = useNewsfeedData();
    const latestPost = posts && posts.length > 0 ? posts[0] : null;

    // Fetch reactions and comments for the latest post
    const postId = latestPost ? latestPost.post_id : 0;
    const { reactions, toggleReaction } = useReactions(postId);
    const { totalComments } = useComments(postId);

    const postReactions = latestPost ? reactions[postId] : null;
    const likeCount = postReactions?.total_reactions || latestPost?.likes || 0;
    const isLiked = postReactions?.user_reaction === 'like';
    const commentCount = totalComments || latestPost?.comments || 0;

    const handleCommentsClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        router.push(`/newsfeed?openComments=${postId}`);
    };

    const handleLikeClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (latestPost) {
            toggleReaction('like');
        }
    };

    if (loading && !latestPost) {
        return (
            <div className="w-full h-full flex flex-col">
                <div className="bg-card rounded-[1.5rem] border border-border shadow-[0_0.25rem_1.25rem_rgba(0,0,0,0.05)] p-5 w-full h-full xl:max-h-[20rem] xl:h-[20rem] flex items-center justify-center mx-auto overflow-hidden">
                    <div className="flex flex-col items-center gap-2">
                        <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
                        <span className="text-xs text-muted-foreground font-semibold">Loading feed...</span>
                    </div>
                </div>
            </div>
        );
    }

    if (!latestPost) {
        return (
            <div className="w-full h-full flex flex-col">
                <div className="bg-card rounded-[1.5rem] border border-border shadow-[0_0.25rem_1.25rem_rgba(0,0,0,0.05)] p-5 w-full h-full xl:max-h-[20rem] xl:h-[20rem] flex items-center justify-center mx-auto overflow-hidden">
                    <span className="text-sm text-muted-foreground font-semibold">No posts available</span>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full h-full flex flex-col">
            {/* Main Card Container */}
            <div className="bg-card rounded-[1.5rem] border border-border shadow-[0_0.25rem_1.25rem_rgba(0,0,0,0.05)] p-3 sm:p-4 w-full h-full xl:max-h-[20rem] xl:h-[20rem] flex flex-col overflow-hidden">
                {/* Fixed Title Header */}
                <div className="flex justify-between items-center mb-2.5 flex-shrink-0">
                    <h2 className="text-[1rem] sm:text-[1.125rem] md:text-[1.25rem] font-black text-foreground tracking-tight">
                        Newsfeed
                    </h2>
                </div>

                {/* Scrollable Post Content */}
                <div
                    className="flex-1 overflow-y-auto pr-1 cursor-pointer select-none [&::-webkit-scrollbar]:w-[6px] [&::-webkit-scrollbar-track]:bg-muted/10 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-thumb]:bg-primary [&::-webkit-scrollbar-thumb]:rounded-full"
                    onClick={() => router.push(`/newsfeed?openComments=${postId}`)}
                >
                    {/* Post Author Header */}
                    <div className="flex items-center gap-2.5">
                        <div className="relative w-8 h-8 rounded-full overflow-hidden border border-border flex-shrink-0">
                            <Image
                                src={latestPost.author?.avatar_url ? getFileUrl(latestPost.author.avatar_url) : `https://i.pravatar.cc/150?u=${latestPost.author?.id || 'user'}`}
                                alt={latestPost.author?.username || "Author"}
                                fill
                                className="object-cover"
                                unoptimized
                            />
                        </div>
                        <div className="flex flex-col overflow-hidden">
                            <span className="text-[0.75rem] sm:text-[0.8125rem] font-black text-card-foreground leading-tight truncate hover:underline">
                                {latestPost.author ? (
                                    `${latestPost.author.first_name || ''} ${latestPost.author.last_name || ''}`.trim() ||
                                    latestPost.author.email ||
                                    latestPost.author.username
                                ) : "Unknown User"}
                            </span>
                            <span className="text-[0.5625rem] sm:text-[0.625rem] text-muted-foreground font-medium truncate mt-0.5">
                                {formatTimestamp(latestPost.created_at)}
                            </span>
                        </div>
                    </div>

                    {/* Post Content Body */}
                    <div className="space-y-1 mt-2.5 overflow-hidden">
                        <h3 className="text-[0.875rem] sm:text-[0.9375rem] font-black text-foreground leading-tight tracking-tight">
                            {latestPost.title}
                        </h3>
                        {latestPost.content && (
                            <p className="text-[0.75rem] sm:text-[0.8125rem] text-muted-foreground/75 leading-normal font-medium whitespace-pre-wrap">
                                {latestPost.content}
                            </p>
                        )}

                        {/* Image / Media Display */}
                        {latestPost.media_file && (
                            <div className="relative w-full aspect-[1.8/1] rounded-[0.625rem] overflow-hidden border border-border mt-2.5 bg-muted/20">
                                <Image
                                    src={getMediaUrl(latestPost.media_file)}
                                    alt="Post Image"
                                    fill
                                    className="object-cover"
                                    unoptimized
                                />
                            </div>
                        )}
                    </div>
                </div>

                {/* Fixed Interaction Buttons */}
                <div className="flex gap-4 pt-2.5 border-t border-border/40 mt-2.5 flex-shrink-0">
                    <button
                        onClick={handleLikeClick}
                        className={`flex items-center gap-1 transition-all font-bold text-[0.75rem] sm:text-[0.8125rem] ${isLiked ? 'text-rose-600' : 'text-muted-foreground hover:text-rose-600'}`}
                    >
                        <Heart
                            className={`w-4 h-4 transition-all ${isLiked ? 'fill-rose-600 text-rose-600' : 'text-muted-foreground'}`}
                        />
                        <span>Like{likeCount > 0 ? ` (${likeCount})` : ''}</span>
                    </button>
                    <button
                        onClick={handleCommentsClick}
                        className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-all font-bold text-[0.75rem] sm:text-[0.8125rem] group"
                    >
                        <MessageSquare className="w-4 h-4 group-hover:fill-muted-foreground/10 transition-all" />
                        <span>Comments</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SocialNewsFeed;
