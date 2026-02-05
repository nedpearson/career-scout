import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ScriptCard } from "@/components/script-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { 
  FileText, 
  Search, 
  Plus,
  Sparkles,
  Mail,
  Phone,
  Linkedin,
  RefreshCw,
  Reply,
  Copy,
  Check,
} from "lucide-react";
import type { Script, Job } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function Scripts() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
  const [selectedScriptType, setSelectedScriptType] = useState("email");
  const [selectedJobId, setSelectedJobId] = useState<string>("");
  const [customPrompt, setCustomPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  
  const [incomingEmail, setIncomingEmail] = useState("");
  const [replyTone, setReplyTone] = useState("professional");
  const [generatedReply, setGeneratedReply] = useState("");
  const [replyCopied, setReplyCopied] = useState(false);

  const { data: scripts, isLoading } = useQuery<Script[]>({
    queryKey: ["/api/scripts"],
  });

  const { data: jobs } = useQuery<Job[]>({
    queryKey: ["/api/jobs"],
  });

  const generateMutation = useMutation({
    mutationFn: async (params: { scriptType: string; jobId?: number; customPrompt?: string }) => {
      return apiRequest("POST", "/api/scripts/generate", params);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/scripts"] });
      setGenerateDialogOpen(false);
      setCustomPrompt("");
      setSelectedJobId("");
      toast({ title: "Script generated successfully!" });
    },
    onError: () => {
      toast({ title: "Failed to generate script", variant: "destructive" });
    },
  });

  const handleGenerate = () => {
    generateMutation.mutate({
      scriptType: selectedScriptType,
      jobId: selectedJobId ? parseInt(selectedJobId) : undefined,
      customPrompt: customPrompt || undefined,
    });
  };

  const replyMutation = useMutation({
    mutationFn: async ({ incomingEmail, tone }: { incomingEmail: string; tone: string }) => {
      const response = await apiRequest("POST", "/api/emails/generate-reply", {
        incomingEmail,
        tone,
      });
      return response.json();
    },
    onSuccess: (data: { reply: string }) => {
      setGeneratedReply(data.reply);
      toast({ title: "Reply generated!" });
    },
    onError: () => {
      toast({ title: "Failed to generate reply", variant: "destructive" });
    },
  });

  const handleGenerateReply = () => {
    if (!incomingEmail.trim()) {
      toast({ title: "Please paste the email you received", variant: "destructive" });
      return;
    }
    replyMutation.mutate({ incomingEmail, tone: replyTone });
  };

  const handleCopyReply = () => {
    navigator.clipboard.writeText(generatedReply);
    setReplyCopied(true);
    toast({ title: "Copied to clipboard" });
    setTimeout(() => setReplyCopied(false), 2000);
  };

  const filteredScripts = scripts?.filter((script) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      script.title.toLowerCase().includes(query) ||
      script.content.toLowerCase().includes(query)
    );
  }) || [];

  const emailScripts = filteredScripts.filter(s => s.scriptType === "email");
  const linkedinScripts = filteredScripts.filter(s => s.scriptType === "linkedin_dm");
  const phoneScripts = filteredScripts.filter(s => s.scriptType === "phone");
  const followUpScripts = filteredScripts.filter(s => s.scriptType === "follow_up");
  const templateScripts = filteredScripts.filter(s => s.isTemplate);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-semibold">Script Generator</h1>
          <p className="text-muted-foreground mt-1">
            AI-powered outreach scripts tailored to your resume and target jobs
          </p>
        </div>
        <Dialog open={generateDialogOpen} onOpenChange={setGenerateDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-generate-script">
              <Sparkles className="h-4 w-4 mr-2" />
              Generate New Script
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Generate Outreach Script</DialogTitle>
              <DialogDescription>
                AI will create a personalized script based on your resume and the target job
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Script Type</Label>
                <Select value={selectedScriptType} onValueChange={setSelectedScriptType}>
                  <SelectTrigger data-testid="select-script-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">Email to Recruiter</SelectItem>
                    <SelectItem value="linkedin_dm">LinkedIn DM</SelectItem>
                    <SelectItem value="phone">Phone Script</SelectItem>
                    <SelectItem value="follow_up">Follow-up Email</SelectItem>
                    <SelectItem value="thank_you">Thank You Note</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Target Job (Optional)</Label>
                <Select value={selectedJobId} onValueChange={setSelectedJobId}>
                  <SelectTrigger data-testid="select-target-job">
                    <SelectValue placeholder="Select a job..." />
                  </SelectTrigger>
                  <SelectContent>
                    {jobs?.filter(j => j.isActive).map((job) => (
                      <SelectItem key={job.id} value={job.id.toString()}>
                        {job.title} - {job.company}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Custom Instructions (Optional)</Label>
                <Textarea
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  placeholder="E.g., Mention my LSU connection, emphasize my Amazon marketplace experience..."
                  className="min-h-24"
                  data-testid="textarea-custom-prompt"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setGenerateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleGenerate} 
                  disabled={generateMutation.isPending}
                  data-testid="button-generate-confirm"
                >
                  {generateMutation.isPending ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Generate Script
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Reply className="h-5 w-5" />
            AI Email Reply Generator
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-2">
              <Label>Paste the email you received</Label>
              <Textarea
                value={incomingEmail}
                onChange={(e) => setIncomingEmail(e.target.value)}
                placeholder="Hi Ned, thanks for applying to our Operations Manager position..."
                className="min-h-32 resize-none"
                data-testid="textarea-incoming-email"
              />
              <div className="flex items-center gap-2">
                <Select value={replyTone} onValueChange={setReplyTone}>
                  <SelectTrigger className="w-40" data-testid="select-reply-tone">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="professional">Professional</SelectItem>
                    <SelectItem value="friendly">Friendly</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
                <Button 
                  onClick={handleGenerateReply} 
                  disabled={replyMutation.isPending || !incomingEmail.trim()}
                  data-testid="button-generate-reply"
                >
                  {replyMutation.isPending ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Generate Reply
                    </>
                  )}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>AI-Generated Reply</Label>
                {generatedReply && (
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    onClick={handleCopyReply}
                    data-testid="button-copy-reply"
                  >
                    {replyCopied ? (
                      <Check className="h-4 w-4 mr-1" />
                    ) : (
                      <Copy className="h-4 w-4 mr-1" />
                    )}
                    {replyCopied ? "Copied" : "Copy"}
                  </Button>
                )}
              </div>
              <Textarea
                value={generatedReply}
                onChange={(e) => setGeneratedReply(e.target.value)}
                placeholder="Your AI-generated reply will appear here. Edit as needed before sending."
                className="min-h-32 resize-none"
                data-testid="textarea-generated-reply"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search scripts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="input-search-scripts"
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
              <Mail className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{emailScripts.length}</p>
              <p className="text-sm text-muted-foreground">Email Scripts</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-sky-100 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400">
              <Linkedin className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{linkedinScripts.length}</p>
              <p className="text-sm text-muted-foreground">LinkedIn DMs</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400">
              <Phone className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{phoneScripts.length}</p>
              <p className="text-sm text-muted-foreground">Phone Scripts</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{templateScripts.length}</p>
              <p className="text-sm text-muted-foreground">Templates</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="all" className="w-full">
        <TabsList>
          <TabsTrigger value="all">All ({filteredScripts.length})</TabsTrigger>
          <TabsTrigger value="email">Email ({emailScripts.length})</TabsTrigger>
          <TabsTrigger value="linkedin">LinkedIn ({linkedinScripts.length})</TabsTrigger>
          <TabsTrigger value="follow_up">Follow-up ({followUpScripts.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-6">
          {isLoading ? (
            <div className="grid gap-4 md:grid-cols-2">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-64 w-full" />
              ))}
            </div>
          ) : filteredScripts.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              {filteredScripts.map((script) => (
                <ScriptCard key={script.id} script={script} />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <FileText className="h-16 w-16 text-muted-foreground/50 mb-4" />
                <h3 className="text-xl font-medium mb-2">No scripts yet</h3>
                <p className="text-muted-foreground text-center max-w-md mb-4">
                  Generate personalized outreach scripts using AI to make your job applications stand out.
                </p>
                <Button onClick={() => setGenerateDialogOpen(true)}>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generate Your First Script
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="email" className="mt-6">
          <div className="grid gap-4 md:grid-cols-2">
            {emailScripts.map((script) => (
              <ScriptCard key={script.id} script={script} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="linkedin" className="mt-6">
          <div className="grid gap-4 md:grid-cols-2">
            {linkedinScripts.map((script) => (
              <ScriptCard key={script.id} script={script} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="follow_up" className="mt-6">
          <div className="grid gap-4 md:grid-cols-2">
            {followUpScripts.map((script) => (
              <ScriptCard key={script.id} script={script} />
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
