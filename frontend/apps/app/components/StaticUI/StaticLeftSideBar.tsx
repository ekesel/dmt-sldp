import React from 'react';

const StaticLeftSideBar = () => {
    const items = [
        { name: "John Doe", img: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?ixlib=rb-1.2.1&auto=format&fit=crop&w=80&q=80", color: "text-slate-200" },
        { name: "Friends", icon: "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z", color: "text-blue-500" },
        { name: "Groups", icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z", color: "text-cyan-500" },
        { name: "Marketplace", icon: "M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z", color: "text-teal-500" },
        { name: "Watch", icon: "M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z", color: "text-blue-500" },
        { name: "Memories", icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z", color: "text-blue-400" },
        { name: "Saved", icon: "M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z", color: "text-purple-500" },
        { name: "Pages", icon: "M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9", color: "text-orange-500" },
        { name: "Events", icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2-2v12a2 2 0 002 2z", color: "text-red-500" },
    ];

    return (
        <aside className="hidden lg:flex flex-col w-[300px] xl:w-[360px] p-2 overflow-y-auto sticky top-14 h-[calc(100vh-56px)] select-none">
            {items.map((item, idx) => (
                <div key={idx} className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/10 cursor-pointer group transition-all duration-200">
                    {item.img ? (
                        <img src={item.img} alt={item.name} className="w-9 h-9 rounded-full object-cover shadow-sm" />
                    ) : (
                        <div className={`p-1 ${item.color}`}>
                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={item.icon} />
                            </svg>
                        </div>
                    )}
                    <span className="text-slate-200 font-medium group-hover:text-white">{item.name}</span>
                </div>
            ))}
            
            <div className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/10 cursor-pointer group mt-1">
                <div className="bg-slate-800 p-2 rounded-full text-slate-300">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </div>
                <span className="text-slate-200 font-medium group-hover:text-white">See more</span>
            </div>

            <hr className="my-4 border-white/10 mx-2" />

            <div className="px-2 mb-2 flex justify-between items-center group">
                <h3 className="text-slate-400 font-semibold text-lg">Your Shortcuts</h3>
                <button className="text-blue-500 text-sm hover:bg-white/5 px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">Edit</button>
            </div>
            
            <div className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/10 cursor-pointer group">
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-600 to-blue-500 flex items-center justify-center shadow-lg">
                    <span className="text-white text-xs font-bold">GAME</span>
                </div>
                <span className="text-slate-200 font-medium">Gaming Community</span>
            </div>
        </aside>
    );
};

export default StaticLeftSideBar;
