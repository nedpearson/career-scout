import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import type { DailyAction } from "@shared/schema";
import { 
  Mail, 
  Phone, 
  Search, 
  Users, 
  Send,
  FileText,
  Clock,
  CheckCircle2,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface ActionItemProps {
  action: DailyAction;
  onComplete?: (action: DailyAction) => void;
  onStartAction?: (action: DailyAction) => void;
  onDelete?: (action: DailyAction) => void;
}

const actionTypeIcons: Record<string, typeof Mail> = {
  apply: Send,
  follow_up: Mail,
  network: Users,
  research: Search,
  call: Phone,
  email: Mail,
};

function getPriorityColor(priority: string) {
  if (priority === "high") return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800";
  if (priority === "medium") return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800";
  return "bg-muted text-muted-foreground";
}

export function ActionItem({ action, onComplete, onStartAction, onDelete }: ActionItemProps) {
  const Icon = actionTypeIcons[action.actionType] || FileText;
  
  return (
    <Card 
      className={cn(
        "hover-elevate transition-opacity",
        action.isCompleted && "opacity-60"
      )}
      data-testid={`card-action-${action.id}`}
    >
      <CardContent className="p-2.5 md:p-4">
        <div className="flex items-start gap-2 md:gap-4">
          <Checkbox
            checked={action.isCompleted || false}
            onCheckedChange={() => onComplete?.(action)}
            className="mt-1 shrink-0"
            data-testid={`checkbox-action-${action.id}`}
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 md:gap-2 flex-wrap">
              <h4 className={cn(
                "font-medium text-xs md:text-base truncate max-w-[150px] md:max-w-none",
                action.isCompleted && "line-through text-muted-foreground"
              )}>
                {action.title}
              </h4>
              <Badge 
                variant="outline" 
                className={cn("no-default-hover-elevate no-default-active-elevate text-[10px] md:text-xs h-4 shrink-0", getPriorityColor(action.priority || "low"))}
              >
                {action.priority?.toUpperCase()}
              </Badge>
            </div>
            {action.description && (
              <p className="text-[10px] md:text-sm text-muted-foreground mt-0.5 md:mt-1 truncate">{action.description}</p>
            )}
            <div className="flex items-center gap-2 md:gap-4 mt-1.5 md:mt-2 text-[10px] md:text-xs text-muted-foreground">
              <div className="flex items-center gap-1 min-w-0">
                <Icon className="h-2.5 w-2.5 shrink-0" />
                <span className="capitalize truncate">{action.actionType.replace("_", " ")}</span>
              </div>
              {action.dueDate && (
                <div className="flex items-center gap-1 min-w-0">
                  <Clock className="h-2.5 w-2.5 shrink-0" />
                  <span className="truncate">Due: {format(new Date(action.dueDate), "MMM d, h:mm a")}</span>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 md:gap-2 shrink-0">
            {!action.isCompleted && (
              <Button 
                size="sm" 
                variant="outline"
                className="h-7 px-2 text-[10px] md:h-9 md:px-4 md:text-sm"
                onClick={() => onStartAction?.(action)}
                data-testid={`button-start-action-${action.id}`}
              >
                Start
              </Button>
            )}
            {onDelete && (
              <Button 
                size="icon" 
                variant="ghost"
                className="h-7 w-7 md:h-10 md:w-10 text-destructive hover:text-destructive"
                onClick={() => onDelete(action)}
                data-testid={`button-delete-action-${action.id}`}
              >
                <Trash2 className="h-3.5 w-3.5 md:h-4 md:w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
