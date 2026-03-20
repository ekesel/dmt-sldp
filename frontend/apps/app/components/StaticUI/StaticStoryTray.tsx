import React from 'react';

const StaticStoryTray = () => {
    const stories = [
        { name: "Create Story", img: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?ixlib=rb-1.2.1&auto=format&fit=crop&w=80&q=80", isOwn: true },
        { name: "Jane Smith", img: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-1.2.1&auto=format&fit=crop&w=80&q=80", storyImg: "https://images.unsplash.com/photo-1621609764180-2ca554a9d6f2?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&q=500" },
        { name: "Mike Johnson", img: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-1.2.1&auto=format&fit=crop&w=80&q=80", storyImg: "https://images.unsplash.com/photo-1512446816042-442d610367e5?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&q=500" },
        { name: "Emily Brown", img: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?ixlib=rb-1.2.1&auto=format&fit=crop&w=80&q=80", storyImg: "https://images.unsplash.com/photo-1517841905240-472988babdf9?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&q=500" },
        { name: "David Wilson", img: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&auto=format&fit=crop&w=80&q=80", storyImg: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&q=500" },
    ];

    return (
        <div className="flex gap-2 overflow-x-auto pb-4 no-scrollbar select-none">
            {stories.map((story, idx) => (
                <div 
                    key={idx} 
                    className="relative min-w-[110px] md:min-w-[140px] h-[200px] md:h-[250px] rounded-xl overflow-hidden cursor-pointer group shadow-lg flex-shrink-0"
                >
                    {story.isOwn ? (
                        <div className="flex flex-col h-full bg-slate-800">
                            <div className="h-[70%] overflow-hidden">
                                <img src={story.img} alt="Me" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                            </div>
                            <div className="relative h-[30%] flex flex-col items-center justify-center pt-5 pb-2 px-2 bg-slate-900">
                                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-blue-600 rounded-full p-1.5 border-4 border-slate-900 shadow-md transform group-hover:scale-110 transition-transform">
                                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" />
                                    </svg>
                                </div>
                                <span className="text-white text-xs font-semibold whitespace-nowrap">Create Story</span>
                            </div>
                        </div>
                    ) : (
                        <>
                            <img 
                                src={story.storyImg} 
                                alt={`${story.name}'s story`} 
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent group-hover:from-black/80 transition-all duration-300" />
                            <div className="absolute top-2 left-2 ring-4 ring-blue-600 rounded-full overflow-hidden w-9 h-9 border-2 border-slate-900 shadow-xl transform group-hover:scale-110 transition-transform duration-300">
                                <img src={story.img} alt={story.name} className="w-full h-full object-cover" />
                            </div>
                            <span className="absolute bottom-2 left-2 text-white text-xs font-semibold drop-shadow-md">
                                {story.name}
                            </span>
                        </>
                    )}
                </div>
            ))}
        </div>
    );
};

export default StaticStoryTray;
