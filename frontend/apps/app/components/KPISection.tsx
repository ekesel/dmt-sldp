import { Card, cn } from "@dmt/ui";
import { TrendingUp, TrendingDown, Minus, HelpCircle } from "lucide-react";
import React from "react";

interface KPIProps {
  label: string;
  value: string;
  trend?: {
    value: string;
    direction: "up" | "down" | "neutral";
    sentiment?: "positive" | "negative" | "neutral";
  };
  description?: React.ReactNode;
  icon?: React.ReactNode;
  valueClassName?: string;
  className?: string;
  labelClassName?: string;
  helpId?: string;
  onHelpClick?: (id: string) => void;
}

export const KPICard = React.memo(({
  label,
  value,
  trend,
  description,
  icon,
  valueClassName = "text-foreground",
  className,
  labelClassName,
  helpId,
  onHelpClick,
}: KPIProps) => {
  const getSentimentColor = () => {
    if (!trend) return "text-muted-foreground";
    if (trend.sentiment) {
      return trend.sentiment === "positive"
        ? "text-emerald-500"
        : trend.sentiment === "negative"
          ? "text-destructive"
          : "text-muted-foreground";
    }
    return trend.direction === "up"
      ? "text-emerald-500"
      : trend.direction === "down"
        ? "text-destructive"
        : "text-muted-foreground";
  };

  return (
    <Card className={cn("flex flex-col gap-2 sm:gap-3 p-3.5 sm:p-4 lg:p-5 transition-all duration-200 group bg-card border-border w-full min-w-0", className)}>
      <div className="flex items-center justify-between">
        <h3 className={cn("text-muted-foreground text-xs sm:text-sm font-medium group-hover:text-foreground/80 transition-colors uppercase tracking-wider flex items-center gap-1.5 sm:gap-2 break-words", labelClassName)}>
          <span>{label}</span>
          {helpId && onHelpClick && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onHelpClick(helpId);
              }}
              className="text-muted-foreground/50 hover:text-primary transition-colors focus:outline-none cursor-pointer shrink-0"
              title="Learn more about this metric"
            >
              <HelpCircle size={15} />
            </button>
          )}
        </h3>
      </div>
      <div className="flex items-baseline gap-2 sm:gap-3 flex-wrap">
        <p className={`text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight break-words [overflow-wrap:anywhere] ${valueClassName}`}>
          {value}
        </p>
        {trend && (
          <div
            className={`flex items-center gap-1 text-xs sm:text-sm mb-1 font-bold shrink-0 ${getSentimentColor()}`}
          >
            {trend.direction === "up" ? (
              <TrendingUp size={14} className="sm:w-4 sm:h-4" />
            ) : trend.direction === "down" ? (
              <TrendingDown size={14} className="sm:w-4 sm:h-4" />
            ) : (
              <Minus size={14} className="sm:w-4 sm:h-4" />
            )}
            <span>{trend.value}</span>
          </div>
        )}
      </div>
      {description && (
        <div className="text-muted-foreground text-[11px] sm:text-xs mt-auto font-medium leading-relaxed border-t border-border pt-2 break-words [overflow-wrap:anywhere]">
          {description}
        </div>
      )}
    </Card>
  );
});

KPICard.displayName = 'KPICard';
