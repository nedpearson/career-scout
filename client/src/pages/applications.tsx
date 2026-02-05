import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  ClipboardList,
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  Mail,
  Phone,
  ExternalLink,
  MoreHorizontal,
} from "lucide-react";
import type { Application, Job } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format, formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { Link } from "wouter";

type ApplicationWithJob = Application & { job?: Job };

const statusConfig: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  pending: { label: "Pending", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400", icon: Clock },
  applied: { label: "Applied", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400", icon: Mail },
  interviewing: { label: "Interviewing", color: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400", icon: Calendar },
  offered: { label: "Offered", color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400", icon: CheckCircle2 },
  rejected: { label: "Rejected", color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400", icon: XCircle },
  withdrawn: { label: "Withdrawn", color: "bg-muted text-muted-foreground", icon: XCircle },
};

export default function Applications() {
  const { toast } = useToast();

  const { data: applications, isLoading } = useQuery<ApplicationWithJob[]>({
    queryKey: ["/api/applications"],
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      return apiRequest("PATCH", `/api/applications/${id}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/applications"] });
      toast({ title: "Status updated!" });
    },
  });

  const pendingApps = applications?.filter(a => a.status === "pending") || [];
  const appliedApps = applications?.filter(a => a.status === "applied") || [];
  const interviewingApps = applications?.filter(a => a.status === "interviewing") || [];
  const completedApps = applications?.filter(a => ["offered", "rejected", "withdrawn"].includes(a.status || "")) || [];

  const renderApplicationRow = (app: ApplicationWithJob) => {
    const status = statusConfig[app.status || "pending"];
    const StatusIcon = status.icon;

    return (
      <TableRow key={app.id} className="hover-elevate" data-testid={`row-application-${app.id}`}>
        <TableCell>
          <div>
            <Link 
              href="/search" 
              className="font-medium hover:underline cursor-pointer text-foreground"
              data-testid={`link-job-title-${app.id}`}
            >
              {app.job?.title || "Unknown Position"}
            </Link>
            <p className="text-sm text-muted-foreground">{app.job?.company || "Unknown Company"}</p>
          </div>
        </TableCell>
        <TableCell>
          <Badge 
            className={cn("no-default-hover-elevate no-default-active-elevate", status.color)}
          >
            <StatusIcon className="h-3 w-3 mr-1" />
            {status.label}
          </Badge>
        </TableCell>
        <TableCell className="text-muted-foreground">
          {app.appliedAt ? format(new Date(app.appliedAt), "MMM d, yyyy") : "Not yet"}
        </TableCell>
        <TableCell className="text-muted-foreground">
          {app.followUpDate ? format(new Date(app.followUpDate), "MMM d") : "-"}
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-2">
            {app.job?.contactEmail && (
              <Button size="icon" variant="ghost" asChild>
                <a href={`mailto:${app.job.contactEmail}`}>
                  <Mail className="h-4 w-4" />
                </a>
              </Button>
            )}
            {app.job?.contactPhone && (
              <Button size="icon" variant="ghost" asChild>
                <a href={`tel:${app.job.contactPhone}`}>
                  <Phone className="h-4 w-4" />
                </a>
              </Button>
            )}
            {app.job?.sourceUrl && (
              <Button size="icon" variant="ghost" asChild>
                <a href={app.job.sourceUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
            )}
          </div>
        </TableCell>
        <TableCell>
          <Select
            value={app.status || "pending"}
            onValueChange={(value) => updateMutation.mutate({ id: app.id, status: value })}
          >
            <SelectTrigger className="w-32" data-testid={`select-status-${app.id}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="applied">Applied</SelectItem>
              <SelectItem value="interviewing">Interviewing</SelectItem>
              <SelectItem value="offered">Offered</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="withdrawn">Withdrawn</SelectItem>
            </SelectContent>
          </Select>
        </TableCell>
      </TableRow>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Application Tracker</h1>
        <p className="text-muted-foreground mt-1">
          Track and manage all your job applications
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{pendingApps.length}</p>
              <p className="text-sm text-muted-foreground">Pending</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
              <Mail className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{appliedApps.length}</p>
              <p className="text-sm text-muted-foreground">Applied</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{interviewingApps.length}</p>
              <p className="text-sm text-muted-foreground">Interviewing</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{completedApps.filter(a => a.status === "offered").length}</p>
              <p className="text-sm text-muted-foreground">Offers</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-primary" />
            All Applications
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : applications && applications.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Position</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Applied</TableHead>
                  <TableHead>Follow-up</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Update</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {applications.map(renderApplicationRow)}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12">
              <ClipboardList className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-xl font-medium mb-2">No applications yet</h3>
              <p className="text-muted-foreground">
                Start applying to jobs and track your progress here.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
