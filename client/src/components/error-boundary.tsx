import React, { Component, ErrorInfo, ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCcw } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  name?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`ErrorBoundary [${this.props.name || "Global"}]:`, error, errorInfo);
    // Future: send to telemetry endpoint
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
          <Card className="w-full max-w-md shadow-lg border-destructive/20">
            <CardHeader className="text-center pb-2">
              <div className="flex justify-center mb-4">
                <div className="p-3 bg-destructive/10 rounded-full">
                  <AlertTriangle className="h-8 w-8 text-destructive" />
                </div>
              </div>
              <CardTitle className="text-xl font-bold">Something went wrong</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <p className="text-center text-muted-foreground text-sm">
                An unexpected error occurred in the {this.props.name || "application"}. 
                We've been notified and are looking into it.
              </p>
              {process.env.NODE_ENV === "development" && (
                <pre className="p-3 bg-muted rounded text-[10px] overflow-auto max-h-32 text-destructive font-mono">
                  {this.state.error?.message}
                  {"\n"}
                  {this.state.error?.stack}
                </pre>
              )}
              <Button 
                onClick={this.handleReset} 
                className="w-full flex items-center justify-center gap-2"
                variant="default"
              >
                <RefreshCcw className="h-4 w-4" />
                Reload Application
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
