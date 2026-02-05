import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2, RefreshCw, Sparkles, Download, Upload, Mail, MessageCircle, Users } from "lucide-react";

type JTCompany = { id: string; name: string; website?: string | null; linkedinUrl?: string | null };
type JTJob = {
  id: string;
  title: string;
  location?: string | null;
  source?: string | null;
  sourceUrl?: string | null;
  matchScore?: number | null;
  matchNotes?: string | null;
  company?: JTCompany | null;
  applications?: Array<{ id: string; stage: string }>;
  updatedAt?: string;
};

type JTApplication = {
  id: string;
  stage: string;
  appliedAt?: string | null;
  nextFollowUpAt?: string | null;
  notes?: string | null;
  job: JTJob & { company?: JTCompany | null };
};

type JTContact = {
  id: string;
  name: string;
  email?: string | null;
  company?: string | null;
  title?: string | null;
  strength?: number;
  hiringSignal?: boolean;
  updatedAt?: string;
};

type SerpJobResult = {
  title: string;
  company_name?: string;
  location?: string;
  via?: string;
  description?: string;
  related_links?: { link: string }[];
};

function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function JobTrackerPage() {
  const { toast } = useToast();

  const [searchQuery, setSearchQuery] = useState("");
  const [searchLocation, setSearchLocation] = useState("Remote");
  const [searchResults, setSearchResults] = useState<SerpJobResult[]>([]);

  const [draftOpen, setDraftOpen] = useState(false);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftBody, setDraftBody] = useState("");

  const [profileSummary, setProfileSummary] = useState("");
  const [desiredTitles, setDesiredTitles] = useState("");
  const [desiredWorkModes, setDesiredWorkModes] = useState("");

  const { data: jobsResp, isLoading: jobsLoading } = useQuery<{ ok: true; jobs: JTJob[] }>({
    queryKey: ["/api/jobtracker/jobs"],
  });
  const jobs = jobsResp?.jobs ?? [];

  const { data: appsResp, isLoading: appsLoading } = useQuery<{ ok: true; applications: JTApplication[] }>({
    queryKey: ["/api/jobtracker/applications"],
  });
  const applications = appsResp?.applications ?? [];

  const { data: contactsResp, isLoading: contactsLoading } = useQuery<{ ok: true; contacts: JTContact[] }>({
    queryKey: ["/api/jobtracker/contacts"],
  });
  const contacts = contactsResp?.contacts ?? [];

  const { data: profileResp } = useQuery<{ ok: true; profile: any | null; skills: any[] }>({
    queryKey: ["/api/jobtracker/profile"],
  });

  // keep local form fields in sync the first time profile loads
  useEffect(() => {
    if (!profileResp?.profile) return;
    setProfileSummary((v) => (v ? v : profileResp.profile.summary ?? ""));
    setDesiredTitles((v) => (v ? v : profileResp.profile.desiredTitles ?? ""));
    setDesiredWorkModes((v) => (v ? v : profileResp.profile.desiredWorkModes ?? ""));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileResp?.profile?.id]);

  const searchMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/jobtracker/jobs/search", {
        query: searchQuery.trim(),
        location: searchLocation.trim() || undefined,
      });
      return (await res.json()) as { ok: true; results: SerpJobResult[] };
    },
    onSuccess: (data) => {
      setSearchResults(data.results ?? []);
      toast({ title: "Search complete", description: `Found ${data.results?.length ?? 0} results` });
    },
    onError: (e: any) => toast({ title: "Search failed", description: String(e?.message ?? e), variant: "destructive" }),
  });

  const importSerpJobMutation = useMutation({
    mutationFn: async (r: SerpJobResult) => {
      const sourceUrl = r.related_links?.[0]?.link;
      const res = await apiRequest("POST", "/api/jobtracker/jobs/import/serpapi", {
        title: r.title,
        companyName: r.company_name || "Unknown",
        location: r.location,
        sourceUrl,
        description: r.description,
        via: r.via,
      });
      return (await res.json()) as { ok: true; jobId: string };
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/jobtracker/jobs"] });
      toast({ title: "Tracked", description: "Saved job to your JobTracker list" });
    },
    onError: (e: any) =>
      toast({ title: "Track failed", description: String(e?.message ?? e), variant: "destructive" }),
  });

  const scoreJobsMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/jobtracker/jobs/score");
      return (await res.json()) as { updated: number };
    },
    onSuccess: async (data) => {
      await queryClient.invalidateQueries({ queryKey: ["/api/jobtracker/jobs"] });
      toast({ title: "Scored jobs", description: `Updated ${data.updated} job(s)` });
    },
    onError: (e: any) =>
      toast({ title: "Scoring failed", description: String(e?.message ?? e), variant: "destructive" }),
  });

  const updateApplicationMutation = useMutation({
    mutationFn: async (input: { applicationId: string; stage?: string; autoFollowUpBusinessDays?: number }) => {
      const res = await apiRequest("POST", "/api/jobtracker/applications/update", input);
      return res.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/jobtracker/applications"] });
      toast({ title: "Updated", description: "Application updated" });
    },
    onError: (e: any) =>
      toast({ title: "Update failed", description: String(e?.message ?? e), variant: "destructive" }),
  });

  const aiMutation = useMutation({
    mutationFn: async (input: { url: string; payload: any; title: string }) => {
      const res = await apiRequest("POST", input.url, input.payload);
      return { json: await res.json(), title: input.title };
    },
    onSuccess: ({ json, title }) => {
      const body =
        json?.bodyText ||
        json?.messageText ||
        (json?.report ? JSON.stringify(json.report, null, 2) : JSON.stringify(json, null, 2));
      setDraftTitle(title);
      setDraftBody(String(body ?? ""));
      setDraftOpen(true);
    },
    onError: (e: any) =>
      toast({ title: "AI request failed", description: String(e?.message ?? e), variant: "destructive" }),
  });

  const googleImportMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/jobtracker/google/contacts/import");
      return res.json() as Promise<{ ok: true; imported: number; total: number }>;
    },
    onSuccess: async (data) => {
      await queryClient.invalidateQueries({ queryKey: ["/api/jobtracker/contacts"] });
      toast({ title: "Imported contacts", description: `Imported ${data.imported} / ${data.total}` });
    },
    onError: (e: any) =>
      toast({ title: "Import failed", description: String(e?.message ?? e), variant: "destructive" }),
  });

  const updateProfileMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PUT", "/api/jobtracker/profile", {
        summary: profileSummary,
        desiredTitles,
        desiredWorkModes,
      });
      return res.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/jobtracker/profile"] });
      toast({ title: "Saved", description: "Profile updated" });
    },
    onError: (e: any) =>
      toast({ title: "Save failed", description: String(e?.message ?? e), variant: "destructive" }),
  });

  const exportMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("GET", "/api/jobtracker/export");
      return res.json();
    },
    onSuccess: (data) => {
      const stamp = new Date().toISOString().slice(0, 10);
      downloadJson(`jobtracker-export-${stamp}.json`, data);
      toast({ title: "Exported", description: "Downloaded export JSON" });
    },
    onError: (e: any) =>
      toast({ title: "Export failed", description: String(e?.message ?? e), variant: "destructive" }),
  });

  const importMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/jobtracker/import", data);
      return res.json();
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["/api/jobtracker/jobs"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/jobtracker/applications"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/jobtracker/contacts"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/jobtracker/profile"] }),
      ]);
      toast({ title: "Imported", description: "Import completed" });
    },
    onError: (e: any) =>
      toast({ title: "Import failed", description: String(e?.message ?? e), variant: "destructive" }),
  });

  const migrateLegacyMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/jobtracker/migrate/legacy");
      return res.json();
    },
    onSuccess: async (data: any) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["/api/jobtracker/jobs"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/jobtracker/applications"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/jobtracker/contacts"] }),
      ]);
      toast({
        title: "Migration complete",
        description: `Jobs: ${data?.migrated?.jobs ?? 0}, Apps: ${data?.migrated?.applications ?? 0}, Contacts: ${data?.migrated?.contacts ?? 0}`,
      });
    },
    onError: (e: any) =>
      toast({ title: "Migration failed", description: String(e?.message ?? e), variant: "destructive" }),
  });

  const stages = ["INTERESTED", "APPLIED", "RECRUITER_SCREEN", "INTERVIEW", "OFFER", "CLOSED"] as const;
  const appsByStage = useMemo(() => {
    const m = new Map<string, JTApplication[]>();
    for (const s of stages) m.set(s, []);
    for (const a of applications) m.get(a.stage)?.push(a);
    return m;
  }, [applications]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-semibold">Job Tracker</h1>
          <p className="text-muted-foreground mt-1">Jobs, applications, outreach, and contacts (Prisma-backed)</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => exportMutation.mutate()} disabled={exportMutation.isPending}>
            {exportMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
            Export
          </Button>
          <Label className="inline-flex items-center">
            <input
              type="file"
              accept="application/json"
              aria-label="Import JobTracker export JSON"
              title="Import JSON"
              className="hidden"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                const text = await f.text();
                importMutation.mutate(JSON.parse(text));
                e.target.value = "";
              }}
            />
            <Button variant="outline" disabled={importMutation.isPending} asChild>
              <span>
                {importMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4 mr-2" />
                )}
                Import
              </span>
            </Button>
          </Label>
        </div>
      </div>

      <Tabs defaultValue="jobs" className="w-full">
        <TabsList>
          <TabsTrigger value="jobs">Jobs</TabsTrigger>
          <TabsTrigger value="applications">Applications</TabsTrigger>
          <TabsTrigger value="network">Network</TabsTrigger>
          <TabsTrigger value="profile">Profile</TabsTrigger>
        </TabsList>

        <TabsContent value="jobs" className="mt-6 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Find jobs (SerpAPI)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-3 md:grid-cols-[1fr_220px_auto] items-end">
                <div>
                  <Label>Query</Label>
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="e.g. operations manager, business development"
                  />
                </div>
                <div>
                  <Label>Location</Label>
                  <Input value={searchLocation} onChange={(e) => setSearchLocation(e.target.value)} placeholder="Remote" />
                </div>
                <Button
                  onClick={() => searchMutation.mutate()}
                  disabled={searchMutation.isPending || searchQuery.trim().length < 2}
                >
                  {searchMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                  Search
                </Button>
              </div>

              {searchResults.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">{searchResults.length} results</div>
                  </div>
                  <div className="grid gap-2">
                    {searchResults.slice(0, 20).map((r, idx) => (
                      <Card key={`${r.title}-${idx}`}>
                        <CardContent className="p-4 flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="font-medium truncate">{r.title}</div>
                            <div className="text-sm text-muted-foreground truncate">
                              {r.company_name || "Unknown"} {r.location ? `• ${r.location}` : ""} {r.via ? `• via ${r.via}` : ""}
                            </div>
                          </div>
                          <Button size="sm" onClick={() => importSerpJobMutation.mutate(r)} disabled={importSerpJobMutation.isPending}>
                            Track
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Tracked jobs</CardTitle>
              <Button variant="outline" onClick={() => scoreJobsMutation.mutate()} disabled={scoreJobsMutation.isPending}>
                {scoreJobsMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                Score
              </Button>
            </CardHeader>
            <CardContent className="space-y-2">
              {jobsLoading ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading…
                </div>
              ) : jobs.length === 0 ? (
                <div className="text-sm text-muted-foreground">No jobs yet. Track one from search results.</div>
              ) : (
                <div className="grid gap-2">
                  {jobs.slice(0, 50).map((j) => (
                    <Card key={j.id}>
                      <CardContent className="p-4 flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-medium truncate">{j.title}</div>
                          <div className="text-sm text-muted-foreground truncate">
                            {j.company?.name || "Unknown"} {j.location ? `• ${j.location}` : ""}
                          </div>
                          <div className="flex gap-2 mt-2 flex-wrap">
                            {typeof j.matchScore === "number" && (
                              <Badge variant="secondary">{Math.round(j.matchScore)}%</Badge>
                            )}
                            {j.source && <Badge variant="outline">{j.source}</Badge>}
                            {(j.applications?.length ?? 0) > 0 && (
                              <Badge variant="outline">{j.applications?.length} application(s)</Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2 flex-wrap justify-end">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              aiMutation.mutate({
                                url: "/api/jobtracker/ai/job-deep-dive",
                                payload: { jobId: j.id },
                                title: "Deep dive report",
                              })
                            }
                            disabled={aiMutation.isPending}
                          >
                            Deep dive
                          </Button>
                          <Button
                            size="sm"
                            onClick={() =>
                              aiMutation.mutate({
                                url: "/api/jobtracker/ai/company-fit",
                                payload: { jobId: j.id },
                                title: "Company fit",
                              })
                            }
                            disabled={aiMutation.isPending}
                          >
                            Fit
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="applications" className="mt-6 space-y-4">
          {appsLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : (
            <div className="grid gap-4">
              {stages.map((s) => (
                <Card key={s}>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-base">{s.replaceAll("_", " ")}</CardTitle>
                    <Badge variant="outline">{appsByStage.get(s)?.length ?? 0}</Badge>
                  </CardHeader>
                  <CardContent className="grid gap-2">
                    {(appsByStage.get(s) ?? []).map((a) => (
                      <Card key={a.id}>
                        <CardContent className="p-4 flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="font-medium truncate">{a.job.title}</div>
                            <div className="text-sm text-muted-foreground truncate">
                              {a.job.company?.name || "Unknown"} {a.job.location ? `• ${a.job.location}` : ""}
                            </div>
                            <div className="flex gap-2 mt-2 flex-wrap">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  aiMutation.mutate({
                                    url: "/api/jobtracker/ai/linkedin-message",
                                    payload: { applicationId: a.id },
                                    title: "LinkedIn message",
                                  })
                                }
                                disabled={aiMutation.isPending}
                              >
                                <MessageCircle className="h-4 w-4 mr-2" />
                                LinkedIn
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  aiMutation.mutate({
                                    url: "/api/jobtracker/ai/followup-draft",
                                    payload: { applicationId: a.id },
                                    title: "Follow-up email",
                                  })
                                }
                                disabled={aiMutation.isPending}
                              >
                                <Mail className="h-4 w-4 mr-2" />
                                Follow-up
                              </Button>
                            </div>
                          </div>
                          <div className="flex gap-2 flex-wrap justify-end">
                            {a.stage !== "INTERESTED" && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => updateApplicationMutation.mutate({ applicationId: a.id, stage: "INTERESTED" })}
                                disabled={updateApplicationMutation.isPending}
                              >
                                Interested
                              </Button>
                            )}
                            {a.stage !== "APPLIED" && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => updateApplicationMutation.mutate({ applicationId: a.id, stage: "APPLIED", autoFollowUpBusinessDays: 5 })}
                                disabled={updateApplicationMutation.isPending}
                              >
                                Applied
                              </Button>
                            )}
                            {a.stage !== "INTERVIEW" && (
                              <Button
                                size="sm"
                                onClick={() => updateApplicationMutation.mutate({ applicationId: a.id, stage: "INTERVIEW" })}
                                disabled={updateApplicationMutation.isPending}
                              >
                                Interview
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                    {(appsByStage.get(s) ?? []).length === 0 && (
                      <div className="text-sm text-muted-foreground">No applications in this stage.</div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="network" className="mt-6 space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Contacts</CardTitle>
              <Button variant="outline" onClick={() => googleImportMutation.mutate()} disabled={googleImportMutation.isPending}>
                {googleImportMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Users className="h-4 w-4 mr-2" />}
                Import Google Contacts
              </Button>
            </CardHeader>
            <CardContent className="space-y-2">
              {contactsLoading ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading…
                </div>
              ) : contacts.length === 0 ? (
                <div className="text-sm text-muted-foreground">No contacts yet.</div>
              ) : (
                <div className="grid gap-2">
                  {contacts.slice(0, 50).map((c) => (
                    <Card key={c.id}>
                      <CardContent className="p-4 flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-medium truncate">{c.name}</div>
                          <div className="text-sm text-muted-foreground truncate">
                            {c.title ? `${c.title}` : ""} {c.company ? `• ${c.company}` : ""} {c.email ? `• ${c.email}` : ""}
                          </div>
                        </div>
                        <div className="flex gap-2 flex-wrap justify-end">
                          {c.hiringSignal ? <Badge>Hiring</Badge> : <Badge variant="outline">—</Badge>}
                          <Badge variant="secondary">Strength {c.strength ?? 3}/5</Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="profile" className="mt-6 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Profile (for scoring + AI)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3">
                <div className="text-sm text-muted-foreground">
                  Have existing Career Scout data? Migrate it into JobTracker (one-time, safe to rerun).
                </div>
                <Button
                  variant="outline"
                  onClick={() => migrateLegacyMutation.mutate()}
                  disabled={migrateLegacyMutation.isPending}
                >
                  {migrateLegacyMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                  Migrate legacy data
                </Button>
              </div>
              <div>
                <Label>Desired titles (comma-separated)</Label>
                <Input value={desiredTitles} onChange={(e) => setDesiredTitles(e.target.value)} placeholder="e.g. Operations Manager, GM, Sales Ops" />
              </div>
              <div>
                <Label>Desired work modes (comma-separated)</Label>
                <Input value={desiredWorkModes} onChange={(e) => setDesiredWorkModes(e.target.value)} placeholder="REMOTE, HYBRID, ONSITE" />
              </div>
              <div>
                <Label>Summary</Label>
                <Textarea value={profileSummary} onChange={(e) => setProfileSummary(e.target.value)} rows={6} placeholder="A short summary used for AI prompts…" />
              </div>
              <Button onClick={() => updateProfileMutation.mutate()} disabled={updateProfileMutation.isPending}>
                {updateProfileMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Save profile
              </Button>
              <div className="text-xs text-muted-foreground">
                Skills: {profileResp?.skills?.length ?? 0} (add via API for now; UI editor comes next)
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={draftOpen} onOpenChange={setDraftOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{draftTitle}</DialogTitle>
            <DialogDescription>Copy/paste and tweak as needed.</DialogDescription>
          </DialogHeader>
          <Textarea value={draftBody} onChange={(e) => setDraftBody(e.target.value)} rows={16} className="font-mono text-sm" />
        </DialogContent>
      </Dialog>
    </div>
  );
}

