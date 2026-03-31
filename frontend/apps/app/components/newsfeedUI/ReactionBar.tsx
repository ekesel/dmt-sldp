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
    { type: 'like' as ReactionType, icon: <ThumbsUp className="w-4 h-4" />, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { type: 'love' as ReactionType, icon: <Heart className="w-4 h-4" />, color: 'text-red-500', bg: 'bg-red-500/10' },
    { type: 'haha' as ReactionType, icon: <Laugh className="w-4 h-4" />, color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
    { type: 'sad' as ReactionType, icon: <Frown className="w-4 h-4" />, color: 'text-orange-500', bg: 'bg-orange-500/10' },
  ];

  return (
    <div className="flex flex-col gap-2 w-full">
      {/* Reaction Summary */}
      {summary && summary.total_reactions > 0 && (
        <div className="flex items-center gap-2 px-4 py-1 text-xs text-muted-foreground border-b border-border/50">
          <div className="flex -space-x-1">
            {Object.entries(summary.types || {})
              .filter(([_, count]) => count > 0)
              .map(([type]) => {
                const reaction = reactions.find(r => r.type === type);
                return (
                  <div key={type} className={cn("p-1 rounded-full border border-card z-10", reaction?.bg)}>
                    {reaction?.icon}
                  </div>
                );
              })}
          </div>

        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center justify-between px-1 py-1">
        <div className="flex-1 flex gap-1">
          {reactions.map((r) => (
            <button
              key={r.type}
              onClick={() => toggleReaction(r.type)}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2 rounded-lg transition-all active:scale-95 hover:bg-muted",
                summary?.user_reaction === r.type ? cn(r.bg, r.color) : "text-muted-foreground"
              )}
            >
              {r.icon}
              <span className="text-xs font-semibold capitalize">{r.type}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ReactionBar;
