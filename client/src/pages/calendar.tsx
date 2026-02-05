import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CalendarDays,
  Plus,
  Clock,
  MapPin,
  Briefcase,
  Bell,
  Check,
  Trash2,
  CalendarPlus,
} from "lucide-react";
import { format, isToday, isTomorrow, isPast, addDays } from "date-fns";
import type { CalendarEvent, Job } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const eventTypeColors: Record<string, string> = {
  interview: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  follow_up: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  networking: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  deadline: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  reminder: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
};

const eventTypeLabels: Record<string, string> = {
  interview: "Interview",
  follow_up: "Follow-up",
  networking: "Networking",
  deadline: "Deadline",
  reminder: "Reminder",
};

export default function CalendarPage() {
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isAutoAssignOpen, setIsAutoAssignOpen] = useState(false);
  const [newEvent, setNewEvent] = useState({
    title: "",
    eventType: "interview",
    description: "",
    startTime: "",
    location: "",
    reminderMinutes: 30,
  });
  const [selectedJobId, setSelectedJobId] = useState<string>("");
  const [autoAssignType, setAutoAssignType] = useState("interview");
  const [autoAssignDateTime, setAutoAssignDateTime] = useState("");

  const { data: events, isLoading } = useQuery<CalendarEvent[]>({
    queryKey: ["/api/calendar-events"],
  });

  const { data: jobs } = useQuery<Job[]>({
    queryKey: ["/api/jobs"],
  });

  const createEventMutation = useMutation({
    mutationFn: (event: typeof newEvent) =>
      apiRequest("POST", "/api/calendar-events", {
        ...event,
        startTime: new Date(event.startTime),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/calendar-events"] });
      setIsAddDialogOpen(false);
      setNewEvent({
        title: "",
        eventType: "interview",
        description: "",
        startTime: "",
        location: "",
        reminderMinutes: 30,
      });
      toast({ title: "Event created", description: "Added to your calendar" });
    },
    onError: () => {
      toast({ title: "Failed to create event", variant: "destructive" });
    },
  });

  const autoAssignMutation = useMutation({
    mutationFn: ({ jobId, eventType, startTime }: { jobId: number; eventType: string; startTime: string }) =>
      apiRequest("POST", "/api/calendar-events/auto-assign", { jobId, eventType, startTime: new Date(startTime) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/calendar-events"] });
      setIsAutoAssignOpen(false);
      setSelectedJobId("");
      setAutoAssignDateTime("");
      toast({ title: "Event auto-created", description: "Event created from job details" });
    },
    onError: () => {
      toast({ title: "Failed to create event", variant: "destructive" });
    },
  });

  const completeEventMutation = useMutation({
    mutationFn: (id: number) =>
      apiRequest("PATCH", `/api/calendar-events/${id}`, { isCompleted: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/calendar-events"] });
      toast({ title: "Event completed" });
    },
  });

  const deleteEventMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/calendar-events/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/calendar-events"] });
      toast({ title: "Event deleted" });
    },
  });

  const upcomingEvents = events?.filter(e => !e.isCompleted && !isPast(new Date(e.startTime))) || [];
  const pastEvents = events?.filter(e => e.isCompleted || isPast(new Date(e.startTime))) || [];
  const todayEvents = upcomingEvents.filter(e => isToday(new Date(e.startTime)));
  const tomorrowEvents = upcomingEvents.filter(e => isTomorrow(new Date(e.startTime)));
  const laterEvents = upcomingEvents.filter(e => !isToday(new Date(e.startTime)) && !isTomorrow(new Date(e.startTime)));

  const activeJobs = jobs?.filter(j => j.isActive) || [];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEvent.title || !newEvent.startTime) {
      toast({ title: "Please fill required fields", variant: "destructive" });
      return;
    }
    createEventMutation.mutate(newEvent);
  };

  const handleAutoAssign = () => {
    if (!selectedJobId) {
      toast({ title: "Please select a job", variant: "destructive" });
      return;
    }
    if (!autoAssignDateTime) {
      toast({ title: "Please select a date and time", variant: "destructive" });
      return;
    }
    autoAssignMutation.mutate({ 
      jobId: parseInt(selectedJobId), 
      eventType: autoAssignType,
      startTime: autoAssignDateTime 
    });
  };

  const EventCard = ({ event }: { event: CalendarEvent }) => (
    <Card className="mb-3" data-testid={`event-card-${event.id}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <Badge className={eventTypeColors[event.eventType] || eventTypeColors.reminder}>
                {eventTypeLabels[event.eventType] || event.eventType}
              </Badge>
              {event.isCompleted && (
                <Badge variant="outline" className="text-muted-foreground">
                  Completed
                </Badge>
              )}
            </div>
            <h3 className="font-medium truncate" data-testid={`event-title-${event.id}`}>
              {event.title}
            </h3>
            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground flex-wrap">
              <div className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                <span>{format(new Date(event.startTime), "MMM d, h:mm a")}</span>
              </div>
              {event.location && (
                <div className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  <span className="truncate max-w-32">{event.location}</span>
                </div>
              )}
              {event.reminderMinutes && (
                <div className="flex items-center gap-1">
                  <Bell className="h-3.5 w-3.5" />
                  <span>{event.reminderMinutes}min before</span>
                </div>
              )}
            </div>
            {event.description && (
              <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{event.description}</p>
            )}
          </div>
          <div className="flex flex-col gap-1">
            {!event.isCompleted && (
              <Button
                size="icon"
                variant="ghost"
                onClick={() => completeEventMutation.mutate(event.id)}
                data-testid={`button-complete-event-${event.id}`}
              >
                <Check className="h-4 w-4" />
              </Button>
            )}
            <Button
              size="icon"
              variant="ghost"
              onClick={() => deleteEventMutation.mutate(event.id)}
              data-testid={`button-delete-event-${event.id}`}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-semibold">Calendar</h1>
          <p className="text-muted-foreground mt-1">
            Track interviews, follow-ups, and deadlines
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Dialog open={isAutoAssignOpen} onOpenChange={setIsAutoAssignOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" data-testid="button-auto-assign">
                <CalendarPlus className="h-4 w-4 mr-2" />
                Auto from Job
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Event from Job</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Select Job</Label>
                  <Select value={selectedJobId} onValueChange={setSelectedJobId}>
                    <SelectTrigger data-testid="select-job">
                      <SelectValue placeholder="Choose a job..." />
                    </SelectTrigger>
                    <SelectContent>
                      {activeJobs.map((job) => (
                        <SelectItem key={job.id} value={job.id.toString()}>
                          {job.title} - {job.company}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Event Type</Label>
                  <Select value={autoAssignType} onValueChange={setAutoAssignType}>
                    <SelectTrigger data-testid="select-event-type-auto">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="interview">Interview</SelectItem>
                      <SelectItem value="follow_up">Follow-up</SelectItem>
                      <SelectItem value="deadline">Application Deadline</SelectItem>
                      <SelectItem value="networking">Networking Call</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Date & Time *</Label>
                  <Input
                    type="datetime-local"
                    value={autoAssignDateTime}
                    onChange={(e) => setAutoAssignDateTime(e.target.value)}
                    data-testid="input-auto-assign-datetime"
                  />
                </div>
                <Button
                  className="w-full"
                  onClick={handleAutoAssign}
                  disabled={autoAssignMutation.isPending || !selectedJobId || !autoAssignDateTime}
                  data-testid="button-create-auto-event"
                >
                  {autoAssignMutation.isPending ? "Creating..." : "Create Event"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-event">
                <Plus className="h-4 w-4 mr-2" />
                Add Event
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>New Calendar Event</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    value={newEvent.title}
                    onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                    placeholder="Interview with Company X"
                    data-testid="input-event-title"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Event Type</Label>
                    <Select
                      value={newEvent.eventType}
                      onValueChange={(v) => setNewEvent({ ...newEvent, eventType: v })}
                    >
                      <SelectTrigger data-testid="select-event-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="interview">Interview</SelectItem>
                        <SelectItem value="follow_up">Follow-up</SelectItem>
                        <SelectItem value="deadline">Deadline</SelectItem>
                        <SelectItem value="networking">Networking</SelectItem>
                        <SelectItem value="reminder">Reminder</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Reminder</Label>
                    <Select
                      value={newEvent.reminderMinutes.toString()}
                      onValueChange={(v) => setNewEvent({ ...newEvent, reminderMinutes: parseInt(v) })}
                    >
                      <SelectTrigger data-testid="select-reminder">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="15">15 min before</SelectItem>
                        <SelectItem value="30">30 min before</SelectItem>
                        <SelectItem value="60">1 hour before</SelectItem>
                        <SelectItem value="1440">1 day before</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="startTime">Date & Time *</Label>
                  <Input
                    id="startTime"
                    type="datetime-local"
                    value={newEvent.startTime}
                    onChange={(e) => setNewEvent({ ...newEvent, startTime: e.target.value })}
                    data-testid="input-event-datetime"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={newEvent.location}
                    onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })}
                    placeholder="Address or Zoom link"
                    data-testid="input-event-location"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Notes</Label>
                  <Textarea
                    id="description"
                    value={newEvent.description}
                    onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                    placeholder="Preparation notes, contact info..."
                    className="resize-none"
                    data-testid="input-event-description"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={createEventMutation.isPending}
                  data-testid="button-submit-event"
                >
                  {createEventMutation.isPending ? "Creating..." : "Create Event"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-6 w-32 mb-2" />
                <Skeleton className="h-4 w-48" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : upcomingEvents.length === 0 && pastEvents.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <CalendarDays className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No events scheduled</h3>
            <p className="text-muted-foreground mb-4">
              Add interviews, follow-ups, and deadlines to stay organized
            </p>
            <Button onClick={() => setIsAddDialogOpen(true)} data-testid="button-add-first-event">
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Event
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            {todayEvents.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Badge variant="default">Today</Badge>
                  <span className="text-muted-foreground text-sm font-normal">
                    {todayEvents.length} event{todayEvents.length !== 1 ? "s" : ""}
                  </span>
                </h2>
                {todayEvents.map((event) => (
                  <EventCard key={event.id} event={event} />
                ))}
              </div>
            )}

            {tomorrowEvents.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold mb-3">Tomorrow</h2>
                {tomorrowEvents.map((event) => (
                  <EventCard key={event.id} event={event} />
                ))}
              </div>
            )}

            {laterEvents.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold mb-3">Upcoming</h2>
                {laterEvents.map((event) => (
                  <EventCard key={event.id} event={event} />
                ))}
              </div>
            )}

            {upcomingEvents.length === 0 && (
              <Card>
                <CardContent className="p-8 text-center">
                  <CalendarDays className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">No upcoming events</p>
                </CardContent>
              </Card>
            )}
          </div>

          <div>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Quick Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Today</span>
                  <Badge variant="secondary">{todayEvents.length}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">This Week</span>
                  <Badge variant="secondary">
                    {upcomingEvents.filter(e => {
                      const eventDate = new Date(e.startTime);
                      const weekFromNow = addDays(new Date(), 7);
                      return eventDate <= weekFromNow;
                    }).length}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Interviews</span>
                  <Badge variant="secondary">
                    {upcomingEvents.filter(e => e.eventType === "interview").length}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Follow-ups</span>
                  <Badge variant="secondary">
                    {upcomingEvents.filter(e => e.eventType === "follow_up").length}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {pastEvents.length > 0 && (
              <Card className="mt-4">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Recent Completed</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {pastEvents.slice(0, 5).map((event) => (
                    <div key={event.id} className="flex items-center gap-2 text-sm">
                      <Check className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="truncate text-muted-foreground">{event.title}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
