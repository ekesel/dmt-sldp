import { Card } from "@dmt/ui";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
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
}

export const KPICard = ({
  label,
  value,
  trend,
  description,
  icon,
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
    <Card className="flex flex-col gap-3 p-5 hover:border-primary/40 transition-colors duration-200 group bg-card border-border">
      <h3 className="text-muted-foreground text-sm font-medium group-hover:text-foreground/80 transition-colors uppercase tracking-wider">
        {label}
      </h3>
      <div className="flex items-end gap-3 flex-wrap">
        <p className="text-4xl font-bold text-foreground tracking-tight">
          {value}
        </p>
        {trend && (
          <div
            className={`flex items-center gap-1.5 text-sm mb-1 font-bold ${getSentimentColor()}`}
          >
            {trend.direction === "up" ? (
              <TrendingUp size={16} />
            ) : trend.direction === "down" ? (
              <TrendingDown size={16} />
            ) : (
              <Minus size={16} />
            )}
            <span>{trend.value}</span>
          </div>
        )}
      </div>
      {description && (
        <div className="text-muted-foreground text-xs mt-auto font-medium leading-relaxed border-t border-border pt-2">
          {description}
        </div>
      )}
    </Card>
  );
};
