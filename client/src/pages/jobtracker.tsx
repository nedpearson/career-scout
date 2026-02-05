import { useEffect } from "react";
import { Loader2 } from "lucide-react";

/**
 * Bridge route for client-side navigation.
 *
 * The JobTracker module is served by the Express server as a proxied Next.js app at `/jobtracker/*`.
 * When users navigate via wouter (client-side), we force a full page load so the server can hand
 * the request to JobTracker.
 */
export default function JobTrackerBridge() {
  useEffect(() => {
    // Force server navigation so the reverse proxy can serve JobTracker.
    window.location.assign(window.location.href);
  }, []);

  return (
    <div className="flex items-center justify-center min-h-[60vh] text-muted-foreground">
      <div className="flex items-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Loading Job Tracker…</span>
      </div>
    </div>
  );
}

