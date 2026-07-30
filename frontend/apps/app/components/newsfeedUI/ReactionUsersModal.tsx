"use client";

import React, { useEffect } from "react";
import { ReactionItem } from "@dmt/api";
import { getFileUrl } from "@dmt/api";
import { X } from "lucide-react";
import { formatTimestamp } from "@/lib/utils";

interface ReactionUsersModalProps {
  isOpen: boolean;
  onClose: () => void;
  reactions: ReactionItem[];
}

const ReactionUsersModal: React.FC<ReactionUsersModalProps> = ({
  isOpen,
  onClose,
  reactions,
}) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-background/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className="relative w-full max-w-sm bg-popover border border-border rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-bold text-foreground flex-1 text-center">Reactions</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-muted/80 transition-colors text-muted-foreground hover:text-foreground absolute right-4"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-2 max-h-[60vh] overflow-y-auto">
          {reactions.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              No reactions yet.
            </div>
          ) : (
            <div className="flex flex-col">
              {reactions.map((reaction, idx) => (
                <div key={reaction.reaction_id || idx} className="flex items-center gap-3 p-3 hover:bg-muted/50 rounded-lg transition-colors">
                  <div className="relative">
                    <img
                      src={reaction.avatar_url ? getFileUrl(reaction.avatar_url) : "https://images.unsplash.com/photo-1531427186611-ecfd6d936c79?ixlib=rb-1.2.1&auto=format&fit=crop&w=80&q=80"}
                      alt={reaction.username || "User"}
                      className="w-10 h-10 rounded-full object-cover border border-border"
                    />
                    <div className="absolute -bottom-1 -right-1 bg-background rounded-full p-0.5">
                      {reaction.reaction_type === 'like' && (
                        <div className="bg-blue-500/10 text-blue-500 rounded-full p-0.5 shadow-sm">
                          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" />
                          </svg>
                        </div>
                      )}
                      {reaction.reaction_type === 'love' && (
                        <div className="bg-red-500/10 text-red-500 rounded-full p-0.5 shadow-sm">
                          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                      {reaction.reaction_type === 'haha' && (
                        <div className="bg-yellow-500/10 text-yellow-500 rounded-full p-0.5 shadow-sm">
                          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M8 9.05v-.1"></path><path d="M16 9.05v-.1"></path><path d="M16 14c-.5 1.5-1.79 3-4 3s-3.5-1.5-4-3"></path></svg>
                        </div>
                      )}
                      {reaction.reaction_type === 'sad' && (
                        <div className="bg-orange-500/10 text-orange-500 rounded-full p-0.5 shadow-sm">
                          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M8 9.05v-.1"></path><path d="M16 9.05v-.1"></path><path d="M16 16c-.5-1.5-1.79-3-4-3s-3.5 1.5-4 3"></path></svg>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-foreground">
                      {reaction.username || `User ${reaction.user}`}
                    </span>
                    {reaction.created_at && (
                      <span className="text-xs text-muted-foreground">
                        {formatTimestamp(reaction.created_at)}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReactionUsersModal;
