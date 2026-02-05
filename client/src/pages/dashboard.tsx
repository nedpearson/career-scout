import { useQuery } from "@tanstack/react-query";
import { StatsCard } from "@/components/stats-card";
import { JobCard } from "@/components/job-card";
import { ActionItem } from "@/components/action-item";
import { InstallAppButtons } from "@/components/install-app-buttons";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Briefcase, 
  Send, 
  Calendar, 
  TrendingUp,
  Sparkles,
  ChevronRight,
  Target,
  Clock,
  CalendarDays,
  Users,
} from "lucide-react";
import type { Job, DailyAction, CalendarEvent, Contact } from "@shared/schema";
import { Link } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format, isToday, isTomorrow } from "date-fns";

export default function Dashboard() {
  const { toast } = useToast();

  const { data: stats, isLoading: statsLoading } = useQuery<{
    totalJobs: number;
    applied: number;
    interviews: number;
    responseRate: number;
    pendingActions: number;
  }>({
    queryKey: ["/api/stats"],
  });

  const { data: jobs, isLoading: jobsLoading } = useQuery<Job[]>({
    queryKey: ["/api/jobs"],
  });

  const { data: actions, isLoading: actionsLoading } = useQuery<DailyAction[]>({
    queryKey: ["/api/daily-actions"],
  });

  const { data: calendarEvents } = useQuery<CalendarEvent[]>({
    queryKey: ["/api/calendar-events"],
  });

  const { data: contacts } = useQuery<Contact[]>({
    queryKey: ["/api/contacts"],
  });

  const topJobs = jobs?.filter(j => j.isActive).slice(0, 4) || [];
  const pendingActions = actions?.filter(a => !a.isCompleted).slice(0, 4) || [];
  
  const upcomingEvents = calendarEvents
    ?.filter(e => new Date(e.startTime) >= new Date() && !e.isCompleted)
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
    .slice(0, 4) || [];

  const socialConnections = contacts?.filter(c => 
    c.source === "linkedin_import" || c.source === "facebook_import"
  ).slice(0, 6) || [];

  const handleRunSearch = async () => {
    try {
      toast({ title: "Starting job search...", description: "AI is searching for new opportunities" });
      await apiRequest("POST", "/api/jobs/search", { location: "Baton Rouge, LA" });
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({ title: "Search complete!", description: "New job opportunities have been found" });
    } catch (error) {
      toast({ title: "Search failed", description: "Please try again later", variant: "destructive" });
    }
  };

  const handleCompleteAction = async (action: DailyAction) => {
    try {
      await apiRequest("PATCH", `/api/daily-actions/${action.id}`, { isCompleted: true });
      queryClient.invalidateQueries({ queryKey: ["/api/daily-actions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({ title: "Action completed!", description: action.title });
    } catch (error) {
      toast({ title: "Failed to update", variant: "destructive" });
    }
  };

  const handleDeleteJob = async (job: Job) => {
    try {
      await apiRequest("DELETE", `/api/jobs/${job.id}`);
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({ title: "Job removed", description: `${job.title} has been deleted` });
    } catch (error) {
      toast({ title: "Failed to delete", variant: "destructive" });
    }
  };

  const handleDeleteAction = async (action: DailyAction) => {
    try {
      await apiRequest("DELETE", `/api/daily-actions/${action.id}`);
      queryClient.invalidateQueries({ queryKey: ["/api/daily-actions"] });
      toast({ title: "Action deleted" });
    } catch (error) {
      toast({ title: "Failed to delete", variant: "destructive" });
    }
  };

  const formatEventDate = (date: Date) => {
    if (isToday(date)) return `Today ${format(date, "h:mm a")}`;
    if (isTomorrow(date)) return `Tomorrow ${format(date, "h:mm a")}`;
    return format(date, "MMM d, h:mm a");
  };

  return (
    <div className="space-y-4 md:space-y-6 compact-dashboard mobile-compact">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl md:text-3xl font-semibold">Dashboard</h1>
          <p className="text-xs md:text-base text-muted-foreground mt-0.5 md:mt-1">
            Welcome back, Ned. Here's your job search overview.
          </p>
        </div>
        <Button onClick={handleRunSearch} data-testid="button-run-search" size="sm" className="mobile-touch-target">
          <Sparkles className="h-4 w-4 mr-2" />
          Run AI Search
        </Button>
      </div>

      <InstallAppButtons />

      <div className="grid gap-2 grid-cols-2 md:grid-cols-2 lg:grid-cols-4">
        {statsLoading ? (
          <>
            {[1, 2, 3, 4].map((i) => (
              <Card key={i}>
                <CardContent className="p-2 md:p-6">
                  <Skeleton className="h-3 w-16 mb-1" />
                  <Skeleton className="h-6 w-12" />
                </CardContent>
              </Card>
            ))}
          </>
        ) : (
          <>
            <StatsCard
              title="Job Opportunities"
              value={stats?.totalJobs || 0}
              description="Active matches"
              icon={Briefcase}
              trend={{ value: 12, isPositive: true }}
              href="/search"
            />
            <StatsCard
              title="Applications"
              value={stats?.applied || 0}
              description="This month"
              icon={Send}
              href="/applications"
            />
            <StatsCard
              title="Interviews"
              value={stats?.interviews || 0}
              description="Scheduled"
              icon={Calendar}
              href="/calendar"
            />
            <StatsCard
              title="Response Rate"
              value={`${stats?.responseRate || 0}%`}
              description="From applications"
              icon={TrendingUp}
              trend={{ value: 5, isPositive: true }}
              href="/applications"
            />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
        <Card className="h-auto md:h-[320px] flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 p-3 md:p-3 pb-2 md:pb-2">
            <CardTitle className="text-sm md:text-sm font-bold flex items-center gap-2">
              <Target className="h-4 w-4 text-primary shrink-0" />
              <span className="truncate">Priority Actions</span>
            </CardTitle>
            <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" asChild>
              <Link href="/actions">
                <ChevronRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="flex-1 md:overflow-auto p-3 md:p-3 pt-0 md:pt-0">
            <div className="space-y-1.5">
              {actionsLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : pendingActions.length > 0 ? (
                pendingActions.map((action) => (
                  <ActionItem
                    key={action.id}
                    action={action}
                    onComplete={handleCompleteAction}
                    onDelete={handleDeleteAction}
                  />
                ))
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  <Clock className="h-8 w-8 mx-auto mb-1 opacity-50" />
                  <p className="text-xs">All caught up!</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="h-auto md:h-[320px] flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 p-3 md:p-3 pb-2 md:pb-2">
            <CardTitle className="text-sm md:text-sm font-bold flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-primary shrink-0" />
              <span className="truncate">Top Job Matches</span>
            </CardTitle>
            <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" asChild>
              <Link href="/search">
                <ChevronRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="flex-1 md:overflow-auto p-3 md:p-3 pt-0 md:pt-0">
            <div className="space-y-2">
              {jobsLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-24 w-full" />
                  <Skeleton className="h-24 w-full" />
                </div>
              ) : topJobs.length > 0 ? (
                topJobs.map((job) => (
                  <JobCard key={job.id} job={job} onDelete={handleDeleteJob} compact />
                ))
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  <Briefcase className="h-8 w-8 mx-auto mb-1 opacity-50" />
                  <p className="text-xs">No matches found.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="h-auto md:h-[320px] flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 p-3 md:p-3 pb-2 md:pb-2">
            <CardTitle className="text-sm md:text-sm font-bold flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-primary shrink-0" />
              <span className="truncate">Upcoming Events</span>
            </CardTitle>
            <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" asChild>
              <Link href="/calendar">
                <ChevronRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="flex-1 md:overflow-auto p-3 md:p-3 pt-0 md:pt-0">
            <div className="space-y-1.5">
              {upcomingEvents.length > 0 ? (
                upcomingEvents.map((event) => (
                  <div key={event.id} className="p-1.5 rounded-md bg-muted/50 space-y-0.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-xs truncate">{event.title}</span>
                      <Badge variant="outline" className="text-[10px] py-0 h-4 shrink-0">
                        {event.eventType}
                      </Badge>
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      {formatEventDate(new Date(event.startTime))}
                    </p>
                  </div>
                ))
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  <CalendarDays className="h-8 w-8 mx-auto mb-1 opacity-50" />
                  <p className="text-xs">Clear schedule!</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="h-auto md:h-[320px] flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 p-3 md:p-3 pb-2 md:pb-2">
            <CardTitle className="text-sm md:text-sm font-bold flex items-center gap-2">
              <Users className="h-4 w-4 text-primary shrink-0" />
              <span className="truncate">Social Network</span>
            </CardTitle>
            <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" asChild>
              <Link href="/network">
                <ChevronRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="flex-1 md:overflow-auto p-3 md:p-3 pt-0 md:pt-0">
            <div className="space-y-1.5">
              {socialConnections.length > 0 ? (
                socialConnections.map((contact) => (
                  <div key={contact.id} className="flex items-center gap-2 p-1.5 rounded-md bg-muted/50">
                    <div className={`h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0 ${
                      contact.source === "linkedin_import" ? "bg-[#0A66C2]" : "bg-[#1877F2]"
                    }`}>
                      {contact.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold truncate">{contact.name}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{contact.company || "Professional"}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  <Users className="h-8 w-8 mx-auto mb-1 opacity-50" />
                  <p className="text-xs">No connections.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-2 grid-cols-2 md:grid-cols-2 lg:grid-cols-4">
        <Card className="p-2 md:p-2">
          <div className="flex items-center justify-between gap-2 min-w-0">
            <span className="text-xs text-muted-foreground truncate">Pending Actions</span>
            <Badge variant="secondary" className="text-[10px] h-4 shrink-0">{stats?.pendingActions || 0}</Badge>
          </div>
        </Card>
        <Card className="p-2 md:p-2">
          <div className="flex items-center justify-between gap-2 min-w-0">
            <span className="text-xs text-muted-foreground truncate">High Priority</span>
            <Badge variant="secondary" className="text-[10px] h-4 shrink-0">{jobs?.filter(j => j.priority === "high").length || 0}</Badge>
          </div>
        </Card>
        <Card className="p-2 md:p-2">
          <div className="flex items-center justify-between gap-2 min-w-0">
            <span className="text-xs text-muted-foreground truncate">Local Focus</span>
            <Badge variant="outline" className="text-[10px] h-4 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-none shrink-0">0-15mi</Badge>
          </div>
        </Card>
        <Card className="p-2 flex flex-col justify-center">
          <p className="text-sm font-bold truncate">{format(new Date(), "EEEE")}</p>
          <p className="text-[10px] text-muted-foreground truncate">{format(new Date(), "MMM d, yyyy")}</p>
        </Card>
      </div>
    </div>
  );
}
