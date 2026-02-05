import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";
import { Link } from "wouter";

interface StatsCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
  href?: string;
}

export function StatsCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
  className,
  href,
}: StatsCardProps) {
  const cardContent = (
    <Card className={cn(href && "cursor-pointer hover-elevate", className)}>
      <CardContent className="p-3 md:p-6">
        <div className="flex items-start justify-between gap-2 md:gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-xs md:text-sm font-medium text-muted-foreground truncate">{title}</p>
            <p className="text-xl md:text-3xl font-bold mt-0.5 md:mt-1 truncate">{value}</p>
            {description && (
              <p className="text-[10px] md:text-sm text-muted-foreground mt-0.5 md:mt-1 truncate">{description}</p>
            )}
            {trend && (
              <div className="flex items-center gap-1 mt-2">
                {trend.isPositive ? (
                  <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400" />
                )}
                <span
                  className={cn(
                    "text-sm font-medium",
                    trend.isPositive
                      ? "text-green-600 dark:text-green-400"
                      : "text-red-600 dark:text-red-400"
                  )}
                >
                  {trend.isPositive ? "+" : ""}{trend.value}%
                </span>
                <span className="text-sm text-muted-foreground">vs last week</span>
              </div>
            )}
          </div>
          <div className="flex h-8 w-8 md:h-12 md:w-12 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Icon className="h-4 w-4 md:h-6 md:w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (href) {
    return (
      <Link href={href} data-testid={`link-stat-${title.toLowerCase().replace(/\s+/g, '-')}`}>
        {cardContent}
      </Link>
    );
  }

  return cardContent;
}
