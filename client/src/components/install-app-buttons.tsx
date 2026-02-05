import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Download, Smartphone, Monitor, X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallAppButtons() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkDismissed = localStorage.getItem("installPromptDismissed");
    if (checkDismissed) {
      setDismissed(true);
    }

    setIsMobile(/iPhone|iPad|iPod|Android/i.test(navigator.userAgent));

    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
      return;
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === "accepted") {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
    setIsInstallable(false);
  };

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem("installPromptDismissed", "true");
  };

  if (isInstalled || dismissed || !isInstallable) {
    return null;
  }

  return (
    <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-primary/20">
              <Download className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">Install Career Scout AI</h3>
              <p className="text-xs text-muted-foreground">
                Get faster access and work offline
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={handleInstallClick}
              size="sm"
              className="gap-2"
              data-testid="button-install-app"
            >
              {isMobile ? (
                <>
                  <Smartphone className="h-4 w-4" />
                  <span className="hidden sm:inline">Install Mobile App</span>
                  <span className="sm:hidden">Install</span>
                </>
              ) : (
                <>
                  <Monitor className="h-4 w-4" />
                  <span className="hidden sm:inline">Install Desktop App</span>
                  <span className="sm:hidden">Install</span>
                </>
              )}
            </Button>
            <Button
              onClick={handleDismiss}
              size="icon"
              variant="ghost"
              data-testid="button-dismiss-install"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
