import { useEffect, useRef } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { ReminderIndicator } from "@/components/reminder-indicator";
import { RefreshButton } from "@/components/refresh-button";
import { PWAInstallButton } from "@/components/pwa-install-button";
import { ErrorBoundary } from "@/components/error-boundary";
import { useAuth } from "@/hooks/use-auth";
import { useLoopWatchdog } from "@/hooks/use-loop-watchdog";
import { LoopTest } from "@/components/loop-test";
import Dashboard from "@/pages/dashboard";
import JobSearch from "@/pages/job-search";
import Applications from "@/pages/applications";
import CalendarPage from "@/pages/calendar";
import Network from "@/pages/network";
import Scripts from "@/pages/scripts";
import Actions from "@/pages/actions";
import Strategy from "@/pages/strategy";
import Settings from "@/pages/settings";
import AuthPage from "@/pages/auth-page";
import JobTrackerPage from "@/pages/jobtracker";
import NotFound from "@/pages/not-found";
import { Loader2 } from "lucide-react";

function AuthenticatedRoutes() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/jobtracker/:rest*" component={JobTrackerPage} />
      <Route path="/jobtracker" component={JobTrackerPage} />
      <Route path="/search" component={JobSearch} />
      <Route path="/applications" component={Applications} />
      <Route path="/calendar" component={CalendarPage} />
      <Route path="/network" component={Network} />
      <Route path="/scripts" component={Scripts} />
      <Route path="/actions" component={Actions} />
      <Route path="/strategy" component={Strategy} />
      <Route path="/settings" component={Settings} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  useLoopWatchdog({
    maxRendersPerRoute: 50,
    timeWindowMs: 4000,
  });
  return (
    <>
      <LoopTest />
      <AppContent />
    </>
  );
}

function AppContent() {
  const { user, isLoading, setUser, setLoading } = useAuth();
  const hasCheckedAuth = useRef(false);
  
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  useEffect(() => {
    // Only check auth once
    if (hasCheckedAuth.current) return;
    hasCheckedAuth.current = true;
    
    const checkAuth = async () => {
      try {
        const res = await fetch("/api/user");
        if (res.ok) {
          const userData = await res.json();
          setUser(userData);
        } else {
          setUser(null);
        }
      } catch (e) {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Show loading spinner while checking auth
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Not logged in - show auth page
  if (!user) {
    return (
      <QueryClientProvider client={queryClient}>
        <ErrorBoundary name="Auth">
          <TooltipProvider>
            <AuthPage />
            <Toaster />
          </TooltipProvider>
        </ErrorBoundary>
      </QueryClientProvider>
    );
  }

  // Logged in - show main app
  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary name="Global App Shell">
        <TooltipProvider>
          <SidebarProvider style={style as React.CSSProperties}>
            <div className="flex h-screen w-full">
              <AppSidebar />
              <div className="flex flex-col flex-1 min-w-0">
                <header className="flex items-center justify-between gap-4 p-2 md:p-3 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
                  <div className="flex items-center gap-2">
                    <SidebarTrigger 
                      data-testid="button-sidebar-toggle" 
                      className="h-11 w-24 flex items-center justify-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 shadow-md transition-all duration-300 animate-in fade-in zoom-in group relative overflow-visible"
                    >
                      <div className="absolute inset-0 rounded-md animate-pulse ring-2 ring-primary/50 group-hover:hidden pointer-events-none" />
                      <span className="font-bold text-sm">☰ Menu</span>
                    </SidebarTrigger>
                  </div>
                  <div className="flex items-center gap-1.5 md:gap-2">
                    <PWAInstallButton />
                    <RefreshButton />
                    <ReminderIndicator />
                    <ThemeToggle />
                  </div>
                </header>
                <main className="flex-1 overflow-auto p-6">
                  <AuthenticatedRoutes />
                </main>
              </div>
            </div>
          </SidebarProvider>
          <Toaster />
        </TooltipProvider>
      </ErrorBoundary>
    </QueryClientProvider>
  );
}

export default App;
