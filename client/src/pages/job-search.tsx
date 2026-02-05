import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { JobCard } from "@/components/job-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { 
  Search, 
  Sparkles, 
  Filter,
  SlidersHorizontal,
  Briefcase,
  MapPin,
  RefreshCw,
} from "lucide-react";
import type { Job } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function JobSearch() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [locationFilter, setLocationFilter] = useState("baton-rouge");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [matchFilter, setMatchFilter] = useState("all");
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [generatingScript, setGeneratingScript] = useState(false);
  const [generatedScript, setGeneratedScript] = useState("");

  const { data: jobs, isLoading, refetch } = useQuery<Job[]>({
    queryKey: ["/api/jobs"],
  });

  const searchMutation = useMutation({
    mutationFn: async (params: { query: string; location: string }) => {
      return apiRequest("POST", "/api/jobs/search", params);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      toast({ title: "Search complete!", description: "Found new job opportunities" });
    },
    onError: () => {
      toast({ title: "Search failed", variant: "destructive" });
    },
  });

  const applyMutation = useMutation({
    mutationFn: async (jobId: number) => {
      return apiRequest("POST", "/api/applications", { jobId, status: "applied" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/applications"] });
      toast({ title: "Application tracked!", description: "Status updated to Applied" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (jobId: number) => {
      return apiRequest("DELETE", `/api/jobs/${jobId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({ title: "Job removed", description: "Job has been deleted" });
    },
    onError: () => {
      toast({ title: "Failed to delete job", variant: "destructive" });
    },
  });

  const handleSearch = () => {
    searchMutation.mutate({ 
      query: searchQuery || "operations manager business development", 
      location: locationFilter === "baton-rouge" ? "Baton Rouge, LA" : "Remote" 
    });
  };

  const handleGenerateScript = async (job: Job) => {
    setSelectedJob(job);
    setGeneratingScript(true);
    setGeneratedScript("");

    try {
      const response = await apiRequest("POST", "/api/scripts/generate", {
        jobId: job.id,
        scriptType: "email",
      });
      const data = await response.json();
      setGeneratedScript(data.content);
    } catch (error) {
      toast({ title: "Failed to generate script", variant: "destructive" });
    } finally {
      setGeneratingScript(false);
    }
  };

  const filteredJobs = jobs?.filter((job) => {
    if (priorityFilter !== "all" && job.priority !== priorityFilter) return false;
    if (matchFilter === "high" && (job.matchScore || 0) < 80) return false;
    if (matchFilter === "medium" && ((job.matchScore || 0) < 60 || (job.matchScore || 0) >= 80)) return false;
    if (searchQuery && !job.title.toLowerCase().includes(searchQuery.toLowerCase()) && 
        !job.company.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return job.isActive;
  }) || [];

  const highMatchJobs = filteredJobs.filter(j => (j.matchScore || 0) >= 80);
  const mediumMatchJobs = filteredJobs.filter(j => (j.matchScore || 0) >= 60 && (j.matchScore || 0) < 80);
  const otherJobs = filteredJobs.filter(j => (j.matchScore || 0) < 60);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-semibold">Job Search</h1>
          <p className="text-muted-foreground mt-1">
            AI-powered job discovery tailored to your resume
          </p>
        </div>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <Label htmlFor="search" className="sr-only">Search jobs</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search jobs, companies, or keywords..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  data-testid="input-job-search"
                />
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Select value={locationFilter} onValueChange={setLocationFilter}>
                <SelectTrigger className="w-40" data-testid="select-location">
                  <MapPin className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Location" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="baton-rouge">Baton Rouge</SelectItem>
                  <SelectItem value="remote">Remote</SelectItem>
                  <SelectItem value="all">All Locations</SelectItem>
                </SelectContent>
              </Select>
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-36" data-testid="select-priority">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priority</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
              <Button 
                onClick={handleSearch} 
                disabled={searchMutation.isPending}
                data-testid="button-ai-search"
              >
                {searchMutation.isPending ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4 mr-2" />
                )}
                AI Search
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-2 flex-wrap">
        <Badge variant="outline" className="no-default-hover-elevate no-default-active-elevate">
          {filteredJobs.length} jobs found
        </Badge>
        <Badge variant="outline" className="no-default-hover-elevate no-default-active-elevate bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
          {highMatchJobs.length} high match (80%+)
        </Badge>
        <Badge variant="outline" className="no-default-hover-elevate no-default-active-elevate bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
          {mediumMatchJobs.length} medium match (60-80%)
        </Badge>
      </div>

      <Tabs defaultValue="all" className="w-full">
        <TabsList>
          <TabsTrigger value="all">All Jobs ({filteredJobs.length})</TabsTrigger>
          <TabsTrigger value="high">High Match ({highMatchJobs.length})</TabsTrigger>
          <TabsTrigger value="medium">Medium Match ({mediumMatchJobs.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-6">
          {isLoading ? (
            <div className="grid gap-4 md:grid-cols-2">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-64 w-full" />
              ))}
            </div>
          ) : filteredJobs.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              {filteredJobs.map((job) => (
                <JobCard
                  key={job.id}
                  job={job}
                  onApply={(j) => applyMutation.mutate(j.id)}
                  onGenerateScript={handleGenerateScript}
                  onDelete={(j) => deleteMutation.mutate(j.id)}
                />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Briefcase className="h-16 w-16 text-muted-foreground/50 mb-4" />
                <h3 className="text-xl font-medium mb-2">No jobs found</h3>
                <p className="text-muted-foreground text-center max-w-md mb-4">
                  Try adjusting your filters or run an AI search to discover new opportunities matching your resume.
                </p>
                <Button onClick={handleSearch} disabled={searchMutation.isPending}>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Run AI Search
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="high" className="mt-6">
          <div className="grid gap-4 md:grid-cols-2">
            {highMatchJobs.map((job) => (
              <JobCard
                key={job.id}
                job={job}
                onApply={(j) => applyMutation.mutate(j.id)}
                onGenerateScript={handleGenerateScript}
                onDelete={(j) => deleteMutation.mutate(j.id)}
              />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="medium" className="mt-6">
          <div className="grid gap-4 md:grid-cols-2">
            {mediumMatchJobs.map((job) => (
              <JobCard
                key={job.id}
                job={job}
                onApply={(j) => applyMutation.mutate(j.id)}
                onGenerateScript={handleGenerateScript}
                onDelete={(j) => deleteMutation.mutate(j.id)}
              />
            ))}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={!!selectedJob} onOpenChange={() => setSelectedJob(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Generated Application Script</DialogTitle>
            <DialogDescription>
              AI-generated email script for {selectedJob?.title} at {selectedJob?.company}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {generatingScript ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-3">Generating personalized script...</span>
              </div>
            ) : (
              <>
                <Textarea
                  value={generatedScript}
                  onChange={(e) => setGeneratedScript(e.target.value)}
                  className="min-h-64 font-mono text-sm"
                  data-testid="textarea-generated-script"
                />
                <div className="flex gap-2">
                  <Button
                    onClick={async () => {
                      await navigator.clipboard.writeText(generatedScript);
                      toast({ title: "Copied to clipboard!" });
                    }}
                  >
                    Copy to Clipboard
                  </Button>
                  <Button variant="outline" onClick={() => setSelectedJob(null)}>
                    Close
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
