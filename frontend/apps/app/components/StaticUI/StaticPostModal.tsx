"use client";

import React, { useEffect, useState, useRef } from 'react';

interface StaticPostModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const StaticPostModal: React.FC<StaticPostModalProps> = ({ isOpen, onClose }) => {
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Prevent scrolling when modal is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setSelectedImage(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const removeImage = () => {
        setSelectedImage(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6">
            {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-background/60 backdrop-blur-sm transition-opacity" 
                onClick={onClose}
            />

            {/* Modal Content */}
            <div className="relative w-full max-w-[500px] bg-popover border border-border rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-border">
                    <div className="w-8" /> {/* Spacer */}
                    <h2 className="text-xl font-bold text-foreground">Create Post</h2>
                    <button 
                        onClick={onClose}
                        className="bg-muted p-2 rounded-full hover:bg-muted/80 transition-colors text-muted-foreground hover:text-foreground"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Body */}
                <div className="p-4 space-y-6 max-h-[70vh] overflow-y-auto">
                    {/* User Info */}
                    <div className="flex items-center gap-3">
                        <img 
                            src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?ixlib=rb-1.2.1&auto=format&fit=crop&w=80&q=80" 
                            alt="Me" 
                            className="w-10 h-10 rounded-full object-cover border border-border" 
                        />
                        <div className="flex flex-col">
                            <span className="text-foreground font-semibold">Alex Sharma</span>
                            <div className="bg-muted rounded px-2 py-0.5 mt-0.5 flex items-center gap-1 w-fit">
                                <svg className="w-3 h-3 text-muted-foreground" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M10 18a8 8 0 100-16 8 8 0 000 16zM4.332 8.027a6.012 6.012 0 011.912-2.706C6.512 5.73 6.974 6 7.5 6A1.5 1.5 0 019 7.5V8a2 2 0 004 0 2 2 0 012 2v1.5a.5.5 0 00.5.5.5.5.5.5.5.5.5.5.5.5.5.5.5.5V10a5 5 0 00-10 0v.107l-1.668-2.08zM13.828 10.172l-3.656 3.656A2 2 0 0010 16v1a1 1 0 001 1h5.828a2 2 0 001.414-.586l.288-.288A2 2 0 0018 14.718V13a2 2 0 00-2-2h-1a2 2 0 00-1.172.172z" />
                                </svg>
                                <span className="text-[11px] font-bold text-muted-foreground">Public</span>
                            </div>
                        </div>
                    </div>

                    {/* Title Input */}
                    <div>
                        <input 
                            type="text" 
                            placeholder="Add a title..." 
                            className="w-full bg-muted/50 border border-border rounded-lg px-4 py-3 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all font-semibold text-lg"
                        />
                    </div>

                    {/* Category Selection */}
                    <div>
                        <label className="block text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider">Select Category</label>
                        <div className="flex gap-2">
                            {['General', 'Tech', 'News'].map((cat) => (
                                <button 
                                    key={cat}
                                    className="flex-1 px-3 py-2.5 rounded-lg bg-muted border border-border text-muted-foreground text-sm font-medium hover:bg-muted/80 hover:text-foreground transition-all active:scale-95"
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Content Area */}
                    <div className="space-y-4">
                        <textarea 
                            placeholder="What's on your mind, Alex?" 
                            className="w-full h-32 bg-transparent border-none outline-none text-xl text-foreground placeholder-muted-foreground resize-none py-2"
                        />

                        {/* Image Preview */}
                        {selectedImage && (
                            <div className="relative rounded-xl overflow-hidden border border-border bg-muted group">
                                <img 
                                    src={selectedImage} 
                                    alt="Preview" 
                                    className="w-full h-auto max-h-[300px] object-contain mx-auto" 
                                />
                                <button 
                                    onClick={removeImage}
                                    className="absolute top-2 right-2 p-1.5 bg-background/60 hover:bg-background/80 text-foreground rounded-full backdrop-blur-sm transition-all opacity-0 group-hover:opacity-100"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        )}

                        {/* Upload Trigger */}
                        <div className="flex items-center gap-2 pt-2">
                            <input 
                                type="file" 
                                accept="image/*" 
                                className="hidden" 
                                ref={fileInputRef}
                                onChange={handleImageChange}
                            />
                            <button 
                                onClick={() => fileInputRef.current?.click()}
                                className="flex items-center gap-2 px-4 py-2 rounded-full bg-muted border border-border text-muted-foreground text-sm font-semibold hover:bg-muted/80 hover:text-foreground transition-all"
                            >
                                <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                Photo/Video
                            </button>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 bg-muted/30">
                    <button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-3 rounded-lg transition-all active:scale-[0.98] shadow-lg shadow-primary/20 text-lg">
                        Post
                    </button>
                </div>
            </div>
        </div>
    );
};

export default StaticPostModal;
