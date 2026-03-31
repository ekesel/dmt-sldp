"use client";

import React, { useState } from 'react';
import StaticPostCard from '../../../components/newsfeedUI/StaticPostCard';
import StaticPostModal from '../../../components/newsfeedUI/StaticPostModal';
import CreatePostButton from '../../../components/newsfeedUI/CreatePostButton';
import { useNewsfeedData, Post } from '../../../hooks/useNewsfeedData';
import { useAuth } from '../../../context/AuthContext';

const NewsfeedPage = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingPost, setEditingPost] = useState<Post | null>(null);
    const { user } = useAuth();
    const { posts, loading, currentUser, createPost, updatePost, deletePost, uploadImage, loadMorePosts, hasNextPage } = useNewsfeedData();

    // Role-based access control check
    console.log("Current user from NewsfeedPage:", user);
    const isManager = user?.is_manager || user?.role?.toLowerCase() === "manager";
    console.log("Is manager check result:", isManager);

    const handleEdit = (post: Post) => {
        setEditingPost(post);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingPost(null);
    };

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

                        {/* Standalone Create Post Button - Only for managers */}
                        {isManager && (
                            <CreatePostButton
                                onClick={() => {
                                    setEditingPost(null);
                                    setIsModalOpen(true);
                                }}
                            />
                        )}
                    </div>

                    {/* Posts List - Starts immediately after header now */}
                    <div className="flex flex-col">
                        {posts.length === 0 ? (
                            <div className="text-center p-8 bg-card border border-border rounded-xl shadow-sm text-muted-foreground w-full">No posts available</div>
                        ) : (
                            <>
                                {posts.map((post, idx) => (
                                    <StaticPostCard
                                        key={post.post_id || idx}
                                        post={post}
                                        onEdit={handleEdit}
                                        onDelete={deletePost}
                                    />
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
                onClose={handleCloseModal}
                userProfile={currentUser}
                editingPost={editingPost}
                createPost={createPost}
                updatePost={updatePost}
                uploadImage={uploadImage}
            />
        </div>
    );
};

export default NewsfeedPage;
