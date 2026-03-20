import React from 'react';

const StaticRightSideBar = () => {
    const contacts = [
        { name: "John Doe", img: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?ixlib=rb-1.2.1&auto=format&fit=crop&w=80&q=80", online: true },
        { name: "Jane Smith", img: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-1.2.1&auto=format&fit=crop&w=80&q=80", online: false },
        { name: "Mike Johnson", img: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-1.2.1&auto=format&fit=crop&w=80&q=80", online: true },
        { name: "Emily Brown", img: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?ixlib=rb-1.2.1&auto=format&fit=crop&w=80&q=80", online: true },
        { name: "David Wilson", img: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&auto=format&fit=crop&w=80&q=80", online: false },
    ];

    return (
        <aside className="hidden xl:flex flex-col w-[300px] xl:w-[360px] p-2 overflow-y-auto sticky top-14 h-[calc(100vh-56px)] divide-y divide-white/10">
            <div className="pb-4 pt-2">
                <h3 className="text-slate-400 font-semibold px-2 mb-2">Sponsored</h3>
                <div className="p-2 flex items-center gap-3 rounded-xl hover:bg-white/10 cursor-pointer group transition-all duration-200">
                    <img 
                        src="https://images.unsplash.com/photo-1622675363200-752119f39504?ixlib=rb-1.2.1&auto=format&fit=crop&w=150&q=80" 
                        alt="Ad" 
                        className="w-24 h-24 rounded-xl object-cover shadow-md"
                    />
                    <div className="flex flex-col">
                        <span className="text-slate-200 font-semibold text-sm">Level up your coding skills</span>
                        <span className="text-slate-500 text-xs">codingacademy.com</span>
                    </div>
                </div>
            </div>

            <div className="py-4">
                <div className="flex items-center justify-between px-2 mb-2">
                    <h3 className="text-slate-400 font-semibold">Contacts</h3>
                    <div className="flex gap-2">
                        {["M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z", "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z", "M5 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"].map((icon, idx) => (
                            <button key={idx} className="p-1.5 rounded-full hover:bg-white/10 text-slate-400">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icon} />
                                </svg>
                            </button>
                        ))}
                    </div>
                </div>
                
                {contacts.map((contact, idx) => (
                    <div key={idx} className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/10 cursor-pointer group relative">
                        <div className="relative">
                            <img 
                                src={contact.img} 
                                alt={contact.name} 
                                className="w-9 h-9 rounded-full object-cover shadow-sm border border-white/5" 
                            />
                            {contact.online && (
                                <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-slate-900" />
                            )}
                        </div>
                        <span className="text-slate-200 font-medium group-hover:text-white transition-colors">{contact.name}</span>
                    </div>
                ))}
            </div>

            <div className="py-4">
                <h3 className="text-slate-400 font-semibold px-2 mb-2">Group conversations</h3>
                <div className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/10 cursor-pointer group">
                    <div className="bg-slate-800 p-2 rounded-full text-slate-300">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                    </div>
                    <span className="text-slate-200 font-medium">Create New Group</span>
                </div>
            </div>
        </aside>
    );
};

export default StaticRightSideBar;
