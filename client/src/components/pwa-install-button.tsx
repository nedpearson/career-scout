import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { InstallAppDialog } from "./install-app-dialog";

export function PWAInstallButton() {
  const [showInstall, setShowInstall] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setShowInstall(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setShowInstall(false);
    }

    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
  }, []);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className="gap-2 hidden md:flex"
          data-testid="button-install-pwa"
        >
          <Download className="h-4 w-4" />
          <span>Install App</span>
        </Button>
      </DialogTrigger>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="icon" 
          className="md:hidden"
          data-testid="button-install-pwa-mobile"
        >
          <Download className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl p-0 border-none bg-transparent">
        <InstallAppDialog />
      </DialogContent>
    </Dialog>
  );
}
