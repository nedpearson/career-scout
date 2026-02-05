import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Job } from "@shared/schema";
import { 
  MapPin, 
  DollarSign, 
  Building2, 
  ExternalLink, 
  Mail, 
  Phone,
  Sparkles,
  Clock,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface JobCardProps {
  job: Job;
  onApply?: (job: Job) => void;
  onViewDetails?: (job: Job) => void;
  onGenerateScript?: (job: Job) => void;
  onDelete?: (job: Job) => void;
  compact?: boolean;
}

function getMatchColor(score: number) {
  if (score >= 85) return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
  if (score >= 70) return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
  return "bg-muted text-muted-foreground";
}

function getPriorityColor(priority: string) {
  if (priority === "high") return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
  if (priority === "medium") return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
  return "bg-muted text-muted-foreground";
}

export function JobCard({ job, onApply, onViewDetails, onGenerateScript, onDelete, compact = false }: JobCardProps) {
  const matchScore = job.matchScore || 0;
  
  if (compact) {
    return (
      <Card className="hover-elevate" data-testid={`card-job-${job.id}`}>
        <CardContent className="p-2 md:p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 md:gap-2 flex-wrap">
                <h3 className="font-medium text-xs md:text-base leading-tight truncate max-w-[150px] md:max-w-none">{job.title}</h3>
                <Badge className={cn("no-default-hover-elevate no-default-active-elevate text-[10px] md:text-xs h-4 shrink-0", getMatchColor(matchScore))}>
                  {matchScore}%
                </Badge>
              </div>
              <div className="flex items-center gap-1.5 mt-1 text-muted-foreground">
                <Building2 className="h-3 w-3 shrink-0" />
                <span className="text-[10px] md:text-sm truncate">{job.company}</span>
              </div>
              <div className="flex items-center gap-1.5 mt-0.5 text-muted-foreground">
                <MapPin className="h-3 w-3 shrink-0" />
                <span className="text-[10px] truncate">{job.location}</span>
                {job.salary && (
                  <>
                    <DollarSign className="h-3 w-3 shrink-0 ml-1.5" />
                    <span className="text-[10px] truncate">{job.salary}</span>
                  </>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {job.priority && job.priority === "high" && (
                <Badge variant="outline" className={cn("text-[10px] h-4", getPriorityColor(job.priority))}>
                  HIGH
                </Badge>
              )}
              {onDelete && (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-6 w-6 md:h-7 md:w-7"
                  onClick={(e) => {
                    e.preventDefault();
                    onDelete(job);
                  }}
                  data-testid={`button-delete-job-${job.id}`}
                >
                  <Trash2 className="h-3 w-3 md:h-3.5 md:w-3.5 text-destructive" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className="hover-elevate" data-testid={`card-job-${job.id}`}>
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0 pb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-lg leading-tight truncate">{job.title}</h3>
            <Badge className={cn("no-default-hover-elevate no-default-active-elevate", getMatchColor(matchScore))}>
              {matchScore}% match
            </Badge>
          </div>
          <div className="flex items-center gap-2 mt-1 text-muted-foreground">
            <Building2 className="h-4 w-4 shrink-0" />
            <span className="text-sm truncate">{job.company}</span>
          </div>
        </div>
        {job.priority && job.priority !== "medium" && (
          <Badge variant="outline" className={cn("shrink-0", getPriorityColor(job.priority))}>
            {job.priority.toUpperCase()}
          </Badge>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <MapPin className="h-4 w-4 shrink-0" />
            <span className="truncate">{job.location}</span>
          </div>
          {job.salary && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <DollarSign className="h-4 w-4 shrink-0" />
              <span className="truncate">{job.salary}</span>
            </div>
          )}
        </div>
        {job.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">{job.description}</p>
        )}
        {(job.contactName || job.contactEmail) && (
          <div className="flex items-center gap-4 pt-2 border-t border-border">
            {job.contactName && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">Contact:</span>
                <span className="font-medium">{job.contactName}</span>
              </div>
            )}
            {job.contactEmail && (
              <a
                href={`mailto:${job.contactEmail}`}
                className="flex items-center gap-1 text-sm text-primary hover:underline"
              >
                <Mail className="h-3 w-3" />
                Email
              </a>
            )}
            {job.contactPhone && (
              <a
                href={`tel:${job.contactPhone}`}
                className="flex items-center gap-1 text-sm text-primary hover:underline"
              >
                <Phone className="h-3 w-3" />
                Call
              </a>
            )}
          </div>
        )}
      </CardContent>
      <CardFooter className="flex flex-wrap gap-2 pt-0 justify-between">
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={() => onApply?.(job)} data-testid={`button-apply-${job.id}`}>
            Apply Now
          </Button>
          <Button size="sm" variant="outline" onClick={() => onGenerateScript?.(job)} data-testid={`button-script-${job.id}`}>
            <Sparkles className="h-4 w-4 mr-1" />
            Generate Script
          </Button>
          {job.sourceUrl && (
            <Button size="sm" variant="ghost" asChild>
              <a href={job.sourceUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4 mr-1" />
                View Posting
              </a>
            </Button>
          )}
        </div>
        {onDelete && (
          <Button 
            size="icon" 
            variant="ghost" 
            className="text-destructive hover:text-destructive"
            onClick={() => onDelete(job)}
            data-testid={`button-delete-job-${job.id}`}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
