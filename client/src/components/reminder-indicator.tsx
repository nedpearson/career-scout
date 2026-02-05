import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Bell, CalendarDays, Clock } from "lucide-react";
import { Link } from "wouter";
import { format, isToday, isTomorrow, addHours, parseISO } from "date-fns";
import type { CalendarEvent } from "@shared/schema";

export function ReminderIndicator() {
  const { data: events } = useQuery<CalendarEvent[]>({
    queryKey: ["/api/calendar-events"],
    refetchInterval: 60000,
  });

  const parseEventDate = (dateValue: Date | string): Date => {
    if (dateValue instanceof Date) return dateValue;
    return parseISO(dateValue);
  };

  const upcomingEvents = events?.filter(e => {
    const eventTime = parseEventDate(e.startTime);
    const now = new Date();
    const next24Hours = addHours(now, 24);
    return !e.isCompleted && eventTime > now && eventTime <= next24Hours;
  }) || [];

  const todayEvents = upcomingEvents.filter(e => isToday(parseEventDate(e.startTime)));
  const tomorrowEvents = upcomingEvents.filter(e => isTomorrow(parseEventDate(e.startTime)));
  const totalCount = upcomingEvents.length;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button 
          size="icon" 
          variant="ghost" 
          className="relative"
          data-testid="button-reminders"
        >
          <Bell className="h-4 w-4" />
          {totalCount > 0 && (
            <span 
              className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center"
              data-testid="reminder-count"
            >
              {totalCount > 9 ? "9+" : totalCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">Upcoming Events</h4>
            <Link href="/calendar">
              <Button variant="ghost" size="sm" data-testid="link-view-calendar">
                View All
              </Button>
            </Link>
          </div>
          
          {upcomingEvents.length === 0 ? (
            <div className="py-4 text-center text-sm text-muted-foreground">
              <CalendarDays className="h-8 w-8 mx-auto mb-2 opacity-50" />
              No upcoming events in the next 24 hours
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {todayEvents.length > 0 && (
                <>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Today
                  </p>
                  {todayEvents.map(event => (
                    <EventItem key={event.id} event={event} />
                  ))}
                </>
              )}
              {tomorrowEvents.length > 0 && (
                <>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mt-3">
                    Tomorrow
                  </p>
                  {tomorrowEvents.map(event => (
                    <EventItem key={event.id} event={event} />
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function EventItem({ event }: { event: CalendarEvent }) {
  const eventTypeLabels: Record<string, string> = {
    interview: "Interview",
    follow_up: "Follow-up",
    networking: "Networking",
    deadline: "Deadline",
    reminder: "Reminder",
  };

  const eventDate = event.startTime instanceof Date 
    ? event.startTime 
    : parseISO(event.startTime as unknown as string);

  return (
    <div 
      className="flex items-start gap-2 p-2 rounded-md bg-muted/50"
      data-testid={`reminder-event-${event.id}`}
    >
      <Clock className="h-3.5 w-3.5 mt-0.5 text-muted-foreground shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{event.title}</p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{format(eventDate, "h:mm a")}</span>
          <Badge variant="secondary" className="text-xs px-1.5 py-0">
            {eventTypeLabels[event.eventType] || event.eventType}
          </Badge>
        </div>
      </div>
    </div>
  );
}
