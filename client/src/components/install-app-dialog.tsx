import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Monitor, Smartphone, Download, Share, MoreVertical } from "lucide-react";

export function InstallAppDialog() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [platform, setPlatform] = useState<"desktop" | "mobile">("desktop");

  useEffect(() => {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || window.innerWidth < 768;
    setPlatform(isMobile ? "mobile" : "desktop");

    window.addEventListener("beforeinstallprompt", (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    });
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setDeferredPrompt(null);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto overflow-hidden">
      <Tabs value={platform} onValueChange={(v) => setPlatform(v as any)} className="w-full">
        <CardHeader className="pb-0">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="desktop" className="flex items-center gap-2">
              <Monitor className="h-4 w-4" />
              Desktop
            </TabsTrigger>
            <TabsTrigger value="mobile" className="flex items-center gap-2">
              <Smartphone className="h-4 w-4" />
              Mobile
            </TabsTrigger>
          </TabsList>
        </CardHeader>
        
        <CardContent className="pt-6">
          <TabsContent value="desktop" className="mt-0 space-y-6">
            <div className="text-center space-y-2">
              <CardTitle>Install Career Scout AI on your desktop</CardTitle>
              <p className="text-muted-foreground">Get quick access from your dock or taskbar with a native app experience.</p>
            </div>
            
            {deferredPrompt ? (
              <div className="flex justify-center">
                <Button size="lg" onClick={handleInstall} className="h-12 px-8 text-lg font-semibold gap-2">
                  <Download className="h-5 w-5" />
                  Install App
                </Button>
              </div>
            ) : (
              <div className="bg-muted/50 rounded-lg p-6 space-y-4">
                <h4 className="font-semibold text-center">Manual Installation</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="space-y-2 p-3 bg-background rounded border">
                    <p className="font-medium">Google Chrome / Edge</p>
                    <p className="text-muted-foreground">Click the install icon in the address bar, or go to Menu <MoreVertical className="h-3 w-3 inline" /> → Apps → Install this site.</p>
                  </div>
                  <div className="space-y-2 p-3 bg-background rounded border">
                    <p className="font-medium">Safari (macOS)</p>
                    <p className="text-muted-foreground">Click File → Add to Dock, or Share → Add to Dock.</p>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="mobile" className="mt-0 space-y-6">
            <div className="text-center space-y-2">
              <CardTitle>Install Career Scout AI on your phone</CardTitle>
              <p className="text-muted-foreground">Launch instantly from your home screen just like a native app.</p>
            </div>

            {deferredPrompt ? (
              <div className="flex justify-center">
                <Button size="lg" onClick={handleInstall} className="h-12 w-full max-w-sm text-lg font-semibold gap-2">
                  <Download className="h-5 w-5" />
                  Install Now
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-4 bg-muted/50 rounded-lg space-y-3">
                  <h4 className="font-semibold flex items-center gap-2">
                    <Smartphone className="h-4 w-4 text-primary" />
                    iOS / Safari
                  </h4>
                  <ol className="list-decimal list-inside text-sm space-y-2 text-muted-foreground">
                    <li>Tap the Share icon <Share className="h-3 w-3 inline mx-1" /> at the bottom of the screen</li>
                    <li>Scroll down and tap <span className="text-foreground font-medium">"Add to Home Screen"</span></li>
                    <li>Tap <span className="text-foreground font-medium">"Add"</span> in the top right corner</li>
                  </ol>
                </div>
                
                <div className="p-4 bg-muted/50 rounded-lg space-y-3">
                  <h4 className="font-semibold flex items-center gap-2">
                    <Monitor className="h-4 w-4 text-primary" />
                    Android / Chrome
                  </h4>
                  <ol className="list-decimal list-inside text-sm space-y-2 text-muted-foreground">
                    <li>Tap the menu icon <MoreVertical className="h-3 w-3 inline mx-1" /> near the address bar</li>
                    <li>Select <span className="text-foreground font-medium">"Install app"</span> or <span className="text-foreground font-medium">"Add to Home screen"</span></li>
                    <li>Follow the on-screen prompts to confirm</li>
                  </ol>
                </div>
              </div>
            )}
          </TabsContent>
        </CardContent>
      </Tabs>
    </Card>
  );
}
