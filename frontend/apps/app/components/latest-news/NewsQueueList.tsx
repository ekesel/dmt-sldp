import React from "react";
import { Radio, Star } from "lucide-react";

export interface NewsQueueItem {
  id: number | string;
  content: string;
  author: string;
  timestamp: string;
  tag: string;
}

export interface NewsQueueListProps {
  items: NewsQueueItem[];
}

export const NewsQueueList: React.FC<NewsQueueListProps> = ({ items }) => {
  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="font-bold text-lg text-foreground tracking-tight">In the queue</h3>
          <p className="text-[13px] text-muted-foreground mt-1 font-medium">
            Recent updates arranged in a calmer reading flow.
          </p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-secondary/80 rounded-full text-secondary-foreground text-[13px] font-bold hover:bg-secondary transition-colors border border-border">
          <Star size={14} className="text-secondary-foreground/70" />
          News desk
        </button>
      </div>

      <div className="space-y-4">
        {items.map((item, index) => (
          <div
            key={item.id}
            className="flex items-center justify-between border border-border rounded-[20px] p-4 hover:shadow-sm hover:border-border/80 transition-all group bg-card"
          >
            <div className="flex items-start sm:items-center gap-4 sm:gap-5 w-full">
              {/* Left vertical bar */}
              <div
                className={`w-1.5 h-10 rounded-full shrink-0 hidden sm:block ${
                  index === 0 ? "bg-gradient-to-b from-primary to-primary/80" : "bg-primary/60"
                }`}
              />
              
              {/* Icon Circle */}
              <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center shrink-0 border border-border/50">
                <Radio size={16} className="text-primary" />
              </div>

              <div className="pr-4 sm:pr-0">
                <h4 className="text-[15px] font-bold text-foreground mb-1 group-hover:text-primary transition-colors line-clamp-1">
                  {item.content}
                </h4>
                <p className="text-[13px] text-muted-foreground font-medium flex items-center gap-1.5">
                  <span className="text-foreground/70">{item.author}</span>
                  <span>•</span>
                  <span>{item.timestamp}</span>
                </p>
              </div>
            </div>

            <span className={`text-[12px] px-4 py-1.5 rounded-full font-bold whitespace-nowrap transition-colors shrink-0 ${
               index === 0 
                ? "bg-primary/10 text-primary border border-primary/20" 
                : "bg-accent/10 leading-tight text-accent border border-accent/20"
            }`}>
              {item.tag}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
