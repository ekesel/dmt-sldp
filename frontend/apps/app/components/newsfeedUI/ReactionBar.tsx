import React from 'react';
import { ReactionSummary, ReactionType } from '@dmt/api';
import { ThumbsUp, Heart, Laugh, Frown } from 'lucide-react';
import { cn } from "@/lib/utils";

interface ReactionBarProps {
  postId: number;
  summary: ReactionSummary | null;
  toggleReaction: (type: ReactionType) => void;
}

const ReactionBar: React.FC<ReactionBarProps> = ({ postId, summary, toggleReaction }) => {

  const reactions = [
    { type: 'like' as ReactionType, icon: <ThumbsUp className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />, color: 'text-primary', bg: 'bg-primary/10' },
    { type: 'love' as ReactionType, icon: <Heart className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />, color: 'text-destructive', bg: 'bg-destructive/10' },
    { type: 'haha' as ReactionType, icon: <Laugh className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />, color: 'text-warning', bg: 'bg-warning/10' },
    { type: 'sad' as ReactionType, icon: <Frown className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />, color: 'text-accent', bg: 'bg-accent/10' },
  ];

  return (
    <div className="flex flex-col gap-2 w-full">
      {/* Action Buttons */}
      <div className="flex items-center justify-between px-0.5 sm:px-1 py-1">
        <div className="flex-1 flex gap-0.5 sm:gap-1">
          {reactions.map((r) => (
            <button
              key={r.type}
              onClick={() => toggleReaction(r.type)}
              className={cn(
                "flex-1 flex items-center justify-center gap-1 sm:gap-2 py-1.5 sm:py-2 px-1 sm:px-2 rounded-lg transition-all active:scale-95 hover:bg-muted min-w-0 cursor-pointer",
                summary?.user_reaction === r.type ? cn(r.bg, r.color) : "text-muted-foreground"
              )}
              title={r.type.charAt(0).toUpperCase() + r.type.slice(1)}
            >
              {r.icon}
              <span className="text-xs font-semibold capitalize hidden md:inline">{r.type}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ReactionBar;
