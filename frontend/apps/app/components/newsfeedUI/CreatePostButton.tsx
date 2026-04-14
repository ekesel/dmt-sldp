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
                "flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-5 py-2.5 rounded-xl font-bold transition-all active:scale-[0.98] shadow-lg shadow-primary/20 group",
                className
            )}
        >
            <Plus className="w-5 h-5 transition-transform group-hover:rotate-90 duration-300" strokeWidth={3} />
            <span>Create Post</span>
        </button>
    );
};

export default CreatePostButton;
