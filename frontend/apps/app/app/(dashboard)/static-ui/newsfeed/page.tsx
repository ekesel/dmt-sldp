"use client";

import React, { useState } from 'react';
import StaticPostCard from '../../../../components/StaticUI/StaticPostCard';
import StaticPostModal from '../../../../components/StaticUI/StaticPostModal';

const NewsfeedPage = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    
    const posts = [
        {
            user: { name: "John Doe", img: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?ixlib=rb-1.2.1&auto=format&fit=crop&w=80&q=80" },
            time: "2 hours ago",
            content: "Just finished building this amazing Facebook-style UI with React and Tailwind CSS! The developer experience is just next level. 🚀 #webdev #react #tailwindcss",
            image: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
            likes: 124,
            comments: 18,
            shares: 5
        },
        {
            user: { name: "Jane Smith", img: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-1.2.1&auto=format&fit=crop&w=80&q=80" },
            time: "5 hours ago",
            content: "Nothing beats a calm evening walk by the beach. Nature is truly the best healer. 🌊✨",
            image: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
            likes: 89,
            comments: 4,
            shares: 2
        },
        {
            user: { name: "Mike Johnson", img: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-1.2.1&auto=format&fit=crop&w=80&q=80" },
            time: "1 day ago",
            content: "Who's excited for the upcoming tech conference? Can't wait to see all the latest innovations in AI and robotics! 🤖🦾",
            likes: 56,
            comments: 12,
            shares: 1
        }
    ];

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
                        {posts.map((post, idx) => (
                            <StaticPostCard key={idx} {...post} />
                        ))}
                    </div>
                </div>
            </main>

            {/* Post Modal */}
            <StaticPostModal 
                isOpen={isModalOpen} 
                onClose={() => setIsModalOpen(false)} 
            />
        </div>
    );
};

export default NewsfeedPage;
