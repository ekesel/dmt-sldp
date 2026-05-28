import React from "react";
import { Radio, ArrowRight, Heart, MessageSquare } from "lucide-react";

export interface FeaturedNewsProps {
  featured: {
    content: string;
    author: {
      name: string;
      role: string;
      avatar: string;
    };
    timestamp: string;
    likes: number;
    comments: number;
  };
}

export const FeaturedNews: React.FC<FeaturedNewsProps> = ({ featured }) => {
  return (
    <div 
      className="relative px-8 py-8 bg-primary text-primary-foreground w-full overflow-hidden"
    >
      {/* decorative top-left gradient */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,color-mix(in_srgb,var(--color-primary-foreground)_24%,transparent),transparent_32%)]" />

      {/* dotted background */}
      <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle,var(--color-primary-foreground)_1px,transparent_1px)] bg-[length:1.5rem_1.5rem]" />
      
      {/* floating circles (decorative glow elements) */}
      <div className="absolute -left-20 -top-20 w-[25rem] h-[25rem] bg-primary-foreground opacity-[0.08] rounded-full blur-[6.25rem]" />
      <div className="absolute -right-20 -bottom-20 w-[18.75rem] h-[18.75rem] bg-primary-foreground opacity-[0.05] rounded-full blur-[5rem]" />
      <div className="absolute right-[5%] top-[-10%] w-[15.625rem] h-[15.625rem] bg-primary-foreground opacity-[0.1] rounded-full blur-[3.75rem]" />

      {/* Structured background shapes */}
      <div className="absolute -left-4 -top-5 h-[4.5rem] w-[4.5rem] rounded-full bg-primary-foreground/20 shadow-[1.25rem_0.5rem_0_0_color-mix(in_srgb,var(--color-primary-foreground)_45%,transparent),2.5rem_1.125rem_0_0_color-mix(in_srgb,var(--color-primary-foreground)_28%,transparent)]" />
      <div className="absolute -right-4 top-3 h-14 w-14 rounded-full bg-primary-foreground/20 shadow-[-1.125rem_0.625rem_0_0_color-mix(in_srgb,var(--color-primary-foreground)_40%,transparent),-2.125rem_-0.25rem_0_0_color-mix(in_srgb,var(--color-primary-foreground)_28%,transparent)]" />


      <div className="relative z-10 w-full max-w-full">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2 bg-primary-foreground/20 px-4 py-1.5 rounded-full backdrop-blur-sm border border-primary-foreground/10">
            <Radio size={14} className="text-primary-foreground ml-1" />
            <span className="text-[0.6875rem] font-bold tracking-widest uppercase text-primary-foreground mr-1">
              Daily Brief
            </span>
          </div>
          <button className="bg-primary-foreground text-primary px-5 py-2.5 rounded-full text-sm font-bold flex items-center gap-2 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
            View all
            <ArrowRight size={16} />
          </button>
        </div>

        {/* Text */}
        <div className="mb-8 max-w-4xl">
          <h2 className="text-2xl md:text-[1.75rem] font-bold leading-tight mb-3">
            Excited to welcome everyone to our newly renovated headquarters! The modern design reflects our commitme...
          </h2>
          <p className="text-[0.9375rem] text-primary-foreground/90 leading-relaxed font-medium mt-2">
            {featured.content}
          </p>
        </div>

        {/* Author Card */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-primary-foreground/10 backdrop-blur-md p-3 px-4 rounded-2xl border border-primary-foreground/20 shadow-sm gap-6 md:w-max md:gap-12 lg:gap-32">
          <div className="flex items-center gap-4">
            <img
              src={featured.author.avatar}
              alt={featured.author.name}
              className="w-12 h-12 rounded-full border-2 border-primary-foreground/30 object-cover shadow-sm bg-primary-foreground/20"
            />
            <div>
              <p className="text-[1rem] font-bold text-primary-foreground mb-0.5">
                {featured.author.name}
              </p>
              <p className="text-primary-foreground/70 text-xs font-medium tracking-wide">
                {featured.author.role} • {featured.timestamp}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 sm:gap-6 self-end sm:self-auto w-full sm:w-auto justify-end sm:justify-start">
            <button className="w-9 h-9 rounded-full bg-primary-foreground/10 flex items-center justify-center hover:bg-primary-foreground/20 transition-colors shadow-sm ml-4 sm:ml-0">
              <ArrowRight size={18} className="text-primary-foreground" />
            </button>
            <div className="flex items-center gap-5 text-sm font-bold bg-primary-foreground/10 px-5 py-2 rounded-full shadow-sm">
              <div className="flex items-center gap-1.5 hover:text-primary-foreground transition-colors text-primary-foreground/90 cursor-pointer">
                <Heart size={15} />
                <span>{featured.likes}</span>
              </div>
              <div className="flex items-center gap-1.5 hover:text-primary-foreground transition-colors text-primary-foreground/90 cursor-pointer">
                <MessageSquare size={15} />
                <span>{featured.comments}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
