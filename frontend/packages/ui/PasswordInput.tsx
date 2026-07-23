import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from './index';

export interface IPasswordInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
    icon?: React.ReactNode;
}

export const PasswordInput = React.forwardRef<HTMLInputElement, IPasswordInputProps>(
    ({ className, icon, ...props }, ref) => {
        const [showPassword, setShowPassword] = useState(false);

        return (
            <div className="relative">
                {icon && (
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        {icon}
                    </div>
                )}
                <input
                    type={showPassword ? "text" : "password"}
                    ref={ref}
                    className={cn(
                        "w-full bg-background border border-border rounded-lg py-2.5 text-foreground placeholder:text-muted-foreground/50 focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all outline-none disabled:opacity-50",
                        icon ? "pl-10" : "pl-4",
                        "pr-10",
                        className
                    )}
                    {...props}
                />
                <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
            </div>
        );
    }
);
PasswordInput.displayName = "PasswordInput";
