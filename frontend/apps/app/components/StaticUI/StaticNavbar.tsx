import React from 'react';

const StaticNavbar = () => {
    return (
        <nav className="sticky top-0 z-50 flex items-center justify-between bg-slate-900 border-b border-white/10 px-4 h-14 shadow-md">
            {/* Left Section */}
            <div className="flex items-center gap-2 flex-grow sm:flex-grow-0">
                <div className="bg-blue-600 rounded-full w-10 h-10 flex items-center justify-center shadow-lg">
                    <span className="text-white font-bold text-2xl tracking-tighter">f</span>
                </div>
                <div className="hidden sm:flex items-center bg-slate-800 rounded-full px-3 py-2 w-64 border border-white/5 focus-within:ring-2 focus-within:ring-blue-500 transition-all">
                    <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input 
                        type="text" 
                        placeholder="Search Facebook" 
                        className="bg-transparent border-none outline-none text-slate-200 ml-2 w-full text-sm placeholder-slate-500"
                    />
                </div>
            </div>

            {/* Middle Section - Navigation Icons */}
            <div className="hidden md:flex items-center justify-center flex-grow max-w-[600px] h-full">
                <div className="flex items-center h-full">
                    {[
                        { icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6", active: true },
                        { icon: "M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z", active: false },
                        { icon: "M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z", active: false },
                        { icon: "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z", active: false },
                        { icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z", active: false }
                    ].map((item, idx) => (
                        <div key={idx} className={`relative px-8 h-full flex items-center cursor-pointer group`}>
                            <svg className={`w-7 h-7 ${item.active ? 'text-blue-500' : 'text-slate-400 group-hover:text-slate-200'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
                            </svg>
                            {item.active && <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-500 rounded-t-full" />}
                            {!item.active && <div className="absolute inset-x-2 inset-y-1 bg-white/5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity" />}
                        </div>
                    ))}
                </div>
            </div>

            {/* Right Section */}
            <div className="flex items-center gap-2">
                <button className="hidden xl:flex items-center gap-2 px-3 py-1.5 rounded-full hover:bg-white/10 transition-colors">
                    <img 
                        src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?ixlib=rb-1.2.1&auto=format&fit=crop&w=80&q=80" 
                        alt="Profile" 
                        className="w-7 h-7 rounded-full object-cover"
                    />
                    <span className="text-sm font-semibold text-slate-200">Alex</span>
                </button>
                
                {[
                    "M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4", // Menu
                    "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z", // Messenger
                    "M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" // Notifications
                ].map((icon, idx) => (
                    <button key={idx} className="bg-slate-800 p-2.5 rounded-full hover:bg-slate-700 transition-colors text-slate-200">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icon} />
                        </svg>
                    </button>
                ))}
                
                <button className="bg-slate-800 p-2.5 rounded-full hover:bg-slate-700 transition-colors text-slate-200">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </button>
            </div>
        </nav>
    );
};

export default StaticNavbar;
