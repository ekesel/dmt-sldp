import React from 'react';
import { Plus } from 'lucide-react';
import { cn } from "@/lib/utils";

interface CreatePostButtonProps {
    onClick: () => void;
    className?: string;
}

const CreatePostButton: React.FC<CreatePostButtonProps> = ({ onClick, className }) => {
    return (
        <button 
            onClick={onClick}
            className={cn(
                "flex items-center gap-1.5 sm:gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all active:scale-[0.98] shadow-lg shadow-primary/20 group shrink-0 cursor-pointer",
                className
            )}
        >
            <Plus className="w-4 h-4 sm:w-5 sm:h-5 transition-transform group-hover:rotate-90 duration-300" strokeWidth={3} />
            <span>Create Post</span>
        </button>
    );
};

export default CreatePostButton;
