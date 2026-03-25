"use client";

import React, { useState } from 'react';
import StaticPostCard from '../../../../components/StaticUI/StaticPostCard';
import StaticPostModal from '../../../../components/StaticUI/StaticPostModal';
import { useNewsfeedData } from '../../../../hooks/useNewsfeedData';

const NewsfeedPage = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const { posts, loading, currentUser, createPost, uploadImage, loadMorePosts, hasNextPage } = useNewsfeedData();

    if (loading && posts.length === 0) {
        return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading feed...</div>;
    }
    
    return (
        <div className="min-h-screen bg-background text-foreground selection:bg-primary/30">
            <main className="flex justify-center max-w-screen-xl mx-auto py-10 px-4">
                {/* Main Feed Content - Centered and focused */}
                <div className="w-full max-w-[680px]">
                    <div className="flex items-center justify-between mb-10">
                        <h1 className="text-3xl font-bold tracking-tight">Newsfeed</h1>
                        
                        {/* Standalone Create Post Button */}
                        <button 
                            onClick={() => setIsModalOpen(true)}
                            className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-5 py-2.5 rounded-xl font-bold transition-all active:scale-[0.98] shadow-lg shadow-primary/20 group"
                        >
                            <svg className="w-5 h-5 transition-transform group-hover:rotate-90 duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" />
                            </svg>
                            <span>Create Post</span>
                        </button>
                    </div>

                    {/* Posts List - Starts immediately after header now */}
                    <div className="flex flex-col">
                        {posts.length === 0 ? (
                            <div className="text-center p-8 bg-card border border-border rounded-xl shadow-sm text-muted-foreground w-full">No posts available</div>
                        ) : (
                            <>
                                {posts.map((post, idx) => (
                                    <StaticPostCard key={post.post_id || idx} post={post} />
                                ))}
                                {hasNextPage && (
                                    <div className="flex justify-center p-4 mb-8">
                                        <button onClick={loadMorePosts} className="bg-muted text-foreground hover:bg-muted/80 px-4 py-2 rounded-lg font-medium transition-colors">
                                            Load More
                                        </button>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </main>

            {/* Post Modal */}
            <StaticPostModal 
                isOpen={isModalOpen} 
                onClose={() => setIsModalOpen(false)} 
                userProfile={currentUser}
                createPost={createPost}
                uploadImage={uploadImage}
            />
        </div>
    );
};

export default NewsfeedPage;
