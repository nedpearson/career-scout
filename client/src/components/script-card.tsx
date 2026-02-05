import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Script } from "@shared/schema";
import { 
  Mail, 
  Phone, 
  Linkedin,
  Copy,
  CheckCircle2,
  FileText,
  Expand,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { format } from "date-fns";

interface ScriptCardProps {
  script: Script;
  onCopy?: (script: Script) => void;
  onEdit?: (script: Script) => void;
}

const scriptTypeIcons: Record<string, typeof Mail> = {
  email: Mail,
  linkedin_dm: Linkedin,
  phone: Phone,
  follow_up: Mail,
  thank_you: Mail,
};

function getScriptTypeColor(type: string) {
  switch (type) {
    case "email": return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
    case "linkedin_dm": return "bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-400";
    case "phone": return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
    case "follow_up": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
    case "thank_you": return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400";
    default: return "bg-muted text-muted-foreground";
  }
}

export function ScriptCard({ script, onCopy, onEdit }: ScriptCardProps) {
  const [copied, setCopied] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogCopied, setDialogCopied] = useState(false);
  const Icon = scriptTypeIcons[script.scriptType] || FileText;
  
  const handleCopy = async () => {
    await navigator.clipboard.writeText(script.content);
    setCopied(true);
    onCopy?.(script);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDialogCopy = async () => {
    await navigator.clipboard.writeText(script.content);
    setDialogCopied(true);
    setTimeout(() => setDialogCopied(false), 2000);
  };
  
  return (
    <Card className="hover-elevate" data-testid={`card-script-${script.id}`}>
      <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <Icon className="h-4 w-4 text-muted-foreground" />
          <h4 className="font-medium">{script.title}</h4>
          {script.isTemplate && (
            <Badge variant="secondary" className="no-default-hover-elevate no-default-active-elevate">
              Template
            </Badge>
          )}
        </div>
        <Badge 
          variant="outline" 
          className={cn("shrink-0 capitalize no-default-hover-elevate no-default-active-elevate", getScriptTypeColor(script.scriptType))}
        >
          {script.scriptType.replace("_", " ")}
        </Badge>
      </CardHeader>
      <CardContent>
        <div className="bg-muted/50 rounded-md p-3 max-h-48 overflow-y-auto">
          <pre className="text-sm whitespace-pre-wrap font-mono text-foreground/90">
            {script.content}
          </pre>
        </div>
        {script.createdAt && (
          <p className="text-xs text-muted-foreground mt-2">
            Created: {format(new Date(script.createdAt), "MMM d, yyyy h:mm a")}
          </p>
        )}
      </CardContent>
      <CardFooter className="flex gap-2 pt-0">
        <Button 
          size="sm" 
          onClick={handleCopy}
          data-testid={`button-copy-script-${script.id}`}
        >
          {copied ? (
            <>
              <CheckCircle2 className="h-4 w-4 mr-1" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="h-4 w-4 mr-1" />
              Copy
            </>
          )}
        </Button>
        <Button 
          size="sm" 
          variant="outline"
          onClick={() => setDialogOpen(true)}
          data-testid={`button-expand-script-${script.id}`}
        >
          <Expand className="h-4 w-4 mr-1" />
          View Full
        </Button>
      </CardFooter>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Icon className="h-5 w-5" />
              {script.title}
            </DialogTitle>
            <DialogDescription>
              {script.scriptType.replace("_", " ")} script
              {script.createdAt && ` - Created ${format(new Date(script.createdAt), "MMM d, yyyy")}`}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[50vh]">
            <div className="bg-muted/50 rounded-md p-4">
              <pre className="text-sm whitespace-pre-wrap font-mono text-foreground/90">
                {script.content}
              </pre>
            </div>
          </ScrollArea>
          <div className="flex justify-end gap-2">
            <Button 
              onClick={handleDialogCopy}
              data-testid={`button-dialog-copy-script-${script.id}`}
            >
              {dialogCopied ? (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy to Clipboard
                </>
              )}
            </Button>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
