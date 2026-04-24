'use client';

import React from 'react';
import Image from 'next/image';
import { MoreHorizontal, Heart, MessageSquare } from 'lucide-react';

/**
 * SocialNewsFeed component matching the reference image.
 * Features a highlighted news section with an alert banner and a social media post with gallery.
 */
export const SocialNewsFeed: React.FC = () => {
    return (
        <div className="w-full h-full flex flex-col">
            {/* Main Card Container */}
            <div className="bg-card rounded-[1.5rem] border border-border shadow-[0_0.25rem_1.25rem_rgba(0,0,0,0.05)] p-2 sm:p-3 w-full h-full xl:max-h-[20rem] space-y-1 mx-auto flex-1 flex flex-col overflow-hidden">
                {/* Section 1: Latest News */}
                <div className="space-y-1 sm:space-y-1.5">
                    <div className="flex justify-between items-center px-1">
                        <h3 className="text-[0.875rem] sm:text-[0.9375rem] font-bold text-card-foreground">Latest News</h3>
                        <button className="text-muted-foreground hover:text-foreground transition-colors">
                            <MoreHorizontal size="1rem" className="sm:w-[1.125rem] sm:h-[1.125rem]" />
                        </button>
                    </div>

                    {/* Featured Image with Banner */}
                    <div className="relative w-full h-[5rem] sm:h-[5.625rem] md:h-[9rem] lg:h-[5.625rem] rounded-[0.625rem] overflow-hidden group">
                        <Image
                            src="/assets/news_header.png"
                            alt="Latest News"
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-500"
                            priority
                        />
                        {/* Urgent Alert Banner */}
                        <div className="absolute bottom-1 inset-x-0 mx-2 bg-accent py-0.5 px-2 rounded-[0.375rem] flex items-center shadow-lg border border-white/20">
                            <p className="text-accent-foreground text-[0.5rem] sm:text-[0.5625rem] font-black uppercase tracking-wide leading-none truncate">
                                <span className="opacity-80">URGENT</span>
                            </p>
                        </div>
                    </div>
                </div>

                {/* Section 2: Social Post */}
                <div className="space-y-1 pt-1 sm:pt-1.5 flex-1 flex flex-col justify-between overflow-hidden">
                    <div className="overflow-hidden">
                        {/* Post Header */}
                        <div className="flex justify-between items-start">
                            <div className="flex items-center gap-1.5 sm:gap-2">
                                <div className="relative w-7 h-7 sm:w-8 sm:h-8 rounded-full overflow-hidden border border-border">
                                    <Image
                                        src="https://i.pravatar.cc/150?u=david"
                                        alt="David Sanana"
                                        fill
                                        className="object-cover"
                                        unoptimized
                                    />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[0.7rem] sm:text-[0.75rem] font-bold text-card-foreground leading-tight">David Sanana</span>
                                    <span className="text-[0.5625rem] sm:text-[0.625rem] text-muted-foreground font-medium">13 hours ago</span>
                                </div>
                            </div>
                            <button className="text-muted-foreground hover:text-foreground transition-colors">
                                <MoreHorizontal size="1rem" className="sm:w-[1.125rem] sm:h-[1.125rem]" />
                            </button>
                        </div>

                        {/* Post Content */}
                        <div className="space-y-1 sm:space-y-1.5 mt-1 sm:mt-1.5">
                            <p className="text-[0.8125rem] sm:text-[0.875rem] font-bold text-card-foreground truncate">Company Picnic Photos!</p>

                            {/* Image Gallery */}
                            <div className="grid grid-cols-3 gap-1 sm:gap-1.5">
                                {[1, 2, 3].map((num) => (
                                    <div key={num} className="relative aspect-[4/3] rounded-[0.5rem] overflow-hidden border border-border hover:opacity-90 transition-opacity cursor-pointer">
                                        <Image
                                            src={`/assets/picnic_${num}.png`}
                                            alt={`Picnic Photo ${num}`}
                                            fill
                                            className="object-cover"
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Interaction Buttons */}
                    <div className="flex gap-3 sm:gap-4 pt-1 mb-0.5 sm:mb-1">
                        <button className="flex items-center gap-1 text-muted-foreground hover:text-destructive transition-all font-medium text-[0.7rem] sm:text-[0.75rem] group">
                            <Heart size="0.875rem" className="sm:w-[1rem] sm:h-[1rem] group-hover:fill-destructive transition-all" />
                            <span>Like</span>
                        </button>
                        <button className="flex items-center gap-1 text-muted-foreground hover:text-primary transition-all font-medium text-[0.7rem] sm:text-[0.75rem] group">
                            <MessageSquare size="0.875rem" className="sm:w-[1rem] sm:h-[1rem] group-hover:fill-primary transition-all" />
                            <span>Comments</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SocialNewsFeed;
