import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { 
  Briefcase, 
  MapPin, 
  MessageSquare, 
  Calendar,
  Target,
  ExternalLink,
  Copy,
  Check,
  Sparkles,
  RefreshCw,
  FileText,
  Users,
  TrendingUp,
  Award,
  Building,
  Globe,
  DollarSign,
  ChevronRight,
  BookOpen,
  Mail,
  Linkedin,
  Phone,
} from "lucide-react";
import { SiLinkedin, SiIndeed } from "react-icons/si";
import type { 
  JobArchetype, 
  InterviewStory, 
  OutreachTemplate, 
  WeeklyPlan,
  Job,
} from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

const DEFAULT_ARCHETYPES: Partial<JobArchetype>[] = [
  {
    name: "Enterprise Account Executive",
    whyItFits: "Territory sales experience with major grocery chains translates directly to enterprise sales cycles",
    typicalTitles: ["Enterprise AE", "Senior Account Executive", "Strategic Account Manager"],
    seniorityLevel: "senior",
    compensationRange: "$120,000 - $180,000 OTE",
    recommendedResume: "sales_remote",
    atsKeywords: ["enterprise sales", "strategic accounts", "B2B", "solution selling", "quota attainment"],
    searchStrings: {
      linkedin: "Enterprise Account Executive OR Strategic Account Manager Louisiana OR Remote",
      indeed: "enterprise sales account executive Louisiana",
      google: "site:linkedin.com enterprise account executive baton rouge"
    }
  },
  {
    name: "Business Development Director",
    whyItFits: "Track record of building Ned's Sports from $600K to $2M demonstrates strong BD capabilities",
    typicalTitles: ["BD Director", "Director of Business Development", "VP Business Development"],
    seniorityLevel: "director",
    compensationRange: "$130,000 - $200,000",
    recommendedResume: "business_development",
    atsKeywords: ["business development", "strategic partnerships", "revenue growth", "market expansion"],
    searchStrings: {
      linkedin: "Business Development Director OR VP Business Development Louisiana OR Texas",
      indeed: "business development director Louisiana Texas",
      google: "site:linkedin.com business development director baton rouge"
    }
  },
  {
    name: "Regional Sales Manager",
    whyItFits: "Managed territory across LA/MS/AL with HMT, perfect fit for regional sales leadership",
    typicalTitles: ["Regional Sales Manager", "Area Sales Manager", "District Sales Manager"],
    seniorityLevel: "manager",
    compensationRange: "$90,000 - $140,000 OTE",
    recommendedResume: "sales_remote",
    atsKeywords: ["regional sales", "territory management", "team leadership", "sales strategy"],
    searchStrings: {
      linkedin: "Regional Sales Manager Louisiana Mississippi Alabama",
      indeed: "regional sales manager Louisiana",
      google: "site:linkedin.com regional sales manager louisiana"
    }
  },
  {
    name: "Operations Manager",
    whyItFits: "Amazon marketplace and inventory management experience ideal for operations roles",
    typicalTitles: ["Operations Manager", "Director of Operations", "Supply Chain Manager"],
    seniorityLevel: "manager",
    compensationRange: "$75,000 - $110,000",
    recommendedResume: "operations",
    atsKeywords: ["operations management", "inventory control", "logistics", "process improvement"],
    searchStrings: {
      linkedin: "Operations Manager Baton Rouge OR Louisiana",
      indeed: "operations manager Baton Rouge LA",
      google: "site:linkedin.com operations manager baton rouge"
    }
  },
  {
    name: "Channel Sales Manager",
    whyItFits: "Vendor relationship experience from Amazon marketplace and retail partnerships",
    typicalTitles: ["Channel Sales Manager", "Partner Manager", "Channel Account Manager"],
    seniorityLevel: "manager",
    compensationRange: "$85,000 - $130,000 OTE",
    recommendedResume: "business_development",
    atsKeywords: ["channel sales", "partner management", "reseller network", "distribution"],
    searchStrings: {
      linkedin: "Channel Sales Manager OR Partner Manager Louisiana OR Remote",
      indeed: "channel sales manager Louisiana remote",
      google: "site:linkedin.com channel sales manager"
    }
  },
  {
    name: "Territory Sales Representative",
    whyItFits: "Direct experience as Territory Sales Manager with HMT/INDYME",
    typicalTitles: ["Territory Sales Rep", "Field Sales Representative", "Outside Sales Rep"],
    seniorityLevel: "senior",
    compensationRange: "$70,000 - $100,000 OTE",
    recommendedResume: "sales_remote",
    atsKeywords: ["territory sales", "field sales", "customer acquisition", "B2B sales"],
    searchStrings: {
      linkedin: "Territory Sales Representative Louisiana Mississippi",
      indeed: "territory sales representative Louisiana",
      google: "site:linkedin.com territory sales louisiana"
    }
  },
  {
    name: "E-commerce Manager",
    whyItFits: "Built successful Amazon Marketplace business with 500+ product listings",
    typicalTitles: ["E-commerce Manager", "Amazon Marketplace Manager", "Digital Commerce Manager"],
    seniorityLevel: "manager",
    compensationRange: "$75,000 - $120,000",
    recommendedResume: "operations",
    atsKeywords: ["e-commerce", "Amazon", "marketplace", "digital commerce", "product listing"],
    searchStrings: {
      linkedin: "E-commerce Manager OR Amazon Marketplace Manager Remote",
      indeed: "ecommerce manager amazon remote",
      google: "site:linkedin.com ecommerce manager amazon"
    }
  },
];

const DEFAULT_TEMPLATES: Partial<OutreachTemplate>[] = [
  {
    name: "LinkedIn Connection Request",
    templateType: "linkedin_dm",
    content: `Hi {first_name},

I noticed your role at {company_name} and was impressed by {specific_detail}. With my background in {relevant_experience}, I'd love to connect and learn more about opportunities in {department}.

Best regards,
Ned Pearson`,
    variables: ["{first_name}", "{company_name}", "{specific_detail}", "{relevant_experience}", "{department}"],
    isDefault: true,
  },
  {
    name: "Recruiter Outreach Email",
    templateType: "recruiter_email",
    subject: "Experienced Sales & Operations Professional - Open to Opportunities",
    content: `Dear {recruiter_name},

I came across your profile while researching opportunities in {industry}. With 10+ years of experience in territory sales, operations management, and e-commerce, I'm actively exploring new challenges.

Key highlights:
- Grew Amazon marketplace business from $600K to $2M annual revenue
- Managed multi-state territory for HMT/INDYME Solutions
- Strong background in vendor relations and retail partnerships

I'd welcome the opportunity to discuss how my background might align with your current searches in the {location} area.

Best regards,
Ned Pearson
225-328-2500`,
    variables: ["{recruiter_name}", "{industry}", "{location}"],
    isDefault: true,
  },
  {
    name: "Hiring Manager Introduction",
    templateType: "hiring_manager",
    subject: "Interest in {role_title} Position at {company_name}",
    content: `Dear {hiring_manager_name},

I'm writing to express my strong interest in the {role_title} position at {company_name}. Your company's {company_attribute} particularly resonates with my professional background.

My experience includes:
- Territory sales management across Louisiana, Mississippi, and Alabama
- Building e-commerce operations from the ground up
- Developing and maintaining key vendor relationships

I'd welcome the opportunity to discuss how I can contribute to your team's success.

Best regards,
Ned Pearson`,
    variables: ["{hiring_manager_name}", "{role_title}", "{company_name}", "{company_attribute}"],
    isDefault: true,
  },
  {
    name: "Follow-up After Application",
    templateType: "follow_up",
    subject: "Following Up - {role_title} Application",
    content: `Dear {contact_name},

I wanted to follow up on my application for the {role_title} position submitted on {application_date}. I remain very interested in this opportunity and believe my experience in {relevant_area} would be valuable to your team.

I'm available at your convenience for a conversation about how I can contribute to {company_name}.

Thank you for your consideration.

Best regards,
Ned Pearson
225-328-2500`,
    variables: ["{contact_name}", "{role_title}", "{application_date}", "{relevant_area}", "{company_name}"],
    isDefault: true,
  },
];

const STORY_TYPES = [
  { id: "sales_win", label: "Major Sales Win", icon: TrendingUp },
  { id: "turnaround", label: "Business Turnaround", icon: RefreshCw },
  { id: "negotiation", label: "Tough Negotiation", icon: MessageSquare },
  { id: "scaling", label: "Scaling Operations", icon: Building },
  { id: "leadership", label: "Leadership Challenge", icon: Users },
];

export default function Strategy() {
  const { toast } = useToast();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedArchetype, setSelectedArchetype] = useState<Partial<JobArchetype> | null>(null);
  const [selectedStory, setSelectedStory] = useState<InterviewStory | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<OutreachTemplate | null>(null);
  const [editedContent, setEditedContent] = useState("");

  const { data: archetypes, isLoading: archetypesLoading } = useQuery<JobArchetype[]>({
    queryKey: ["/api/job-archetypes"],
  });

  const { data: stories, isLoading: storiesLoading } = useQuery<InterviewStory[]>({
    queryKey: ["/api/interview-stories"],
  });

  const { data: templates, isLoading: templatesLoading } = useQuery<OutreachTemplate[]>({
    queryKey: ["/api/outreach-templates"],
  });

  const { data: weeklyPlan, isLoading: planLoading } = useQuery<WeeklyPlan | null>({
    queryKey: ["/api/weekly-plans/current"],
  });

  const { data: jobs } = useQuery<Job[]>({
    queryKey: ["/api/jobs"],
  });

  const generateStoryMutation = useMutation({
    mutationFn: async (storyType: string) => {
      return apiRequest("POST", "/api/interview-stories/generate", { storyType });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/interview-stories"] });
      toast({ title: "STAR story generated!" });
    },
    onError: () => {
      toast({ title: "Failed to generate story", variant: "destructive" });
    },
  });

  const generatePlanMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/weekly-plans/generate", {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/weekly-plans/current"] });
      toast({ title: "Weekly plan generated!" });
    },
    onError: () => {
      toast({ title: "Failed to generate plan", variant: "destructive" });
    },
  });

  const updateTemplateMutation = useMutation({
    mutationFn: async ({ id, content }: { id: number; content: string }) => {
      return apiRequest("PATCH", `/api/outreach-templates/${id}`, { content });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/outreach-templates"] });
      setEditingTemplate(null);
      toast({ title: "Template updated!" });
    },
  });

  const handleCopy = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast({ title: "Copied to clipboard!" });
    setTimeout(() => setCopiedId(null), 2000);
  };

  const displayArchetypes = archetypes?.length ? archetypes : DEFAULT_ARCHETYPES;
  const displayTemplates = templates?.length ? templates : DEFAULT_TEMPLATES;

  const jobsByRegion = {
    batonRouge: jobs?.filter(j => j.location?.toLowerCase().includes("baton rouge") || j.location?.toLowerCase().includes("louisiana")) || [],
    texas: jobs?.filter(j => j.location?.toLowerCase().includes("texas") || j.location?.toLowerCase().includes("houston") || j.location?.toLowerCase().includes("dallas") || j.location?.toLowerCase().includes("austin")) || [],
    remote: jobs?.filter(j => j.location?.toLowerCase().includes("remote")) || [],
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold">Strategy Command Center</h1>
        <p className="text-muted-foreground mt-1">
          Your complete job search strategy toolkit
        </p>
      </div>

      <Tabs defaultValue="archetypes" className="space-y-6">
        <TabsList className="flex flex-wrap gap-1 h-auto p-1">
          <TabsTrigger value="archetypes" data-testid="tab-archetypes">
            <Briefcase className="h-4 w-4 mr-2" />
            Job Archetypes
          </TabsTrigger>
          <TabsTrigger value="geographic" data-testid="tab-geographic">
            <MapPin className="h-4 w-4 mr-2" />
            Geographic
          </TabsTrigger>
          <TabsTrigger value="interview" data-testid="tab-interview">
            <BookOpen className="h-4 w-4 mr-2" />
            Interview Prep
          </TabsTrigger>
          <TabsTrigger value="outreach" data-testid="tab-outreach">
            <Mail className="h-4 w-4 mr-2" />
            Outreach Kit
          </TabsTrigger>
          <TabsTrigger value="execution" data-testid="tab-execution">
            <Calendar className="h-4 w-4 mr-2" />
            Weekly Execution
          </TabsTrigger>
        </TabsList>

        <TabsContent value="archetypes" className="space-y-6">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h2 className="text-xl font-medium">Target Job Archetypes</h2>
              <p className="text-sm text-muted-foreground">7 role categories aligned with your experience</p>
            </div>
          </div>

          {archetypesLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Skeleton key={i} className="h-64" />
              ))}
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {displayArchetypes.map((archetype, index) => (
                <Card key={archetype.id || index} className="flex flex-col">
                  <CardHeader className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-lg">{archetype.name}</CardTitle>
                      <Badge variant="secondary" className="shrink-0">
                        {archetype.seniorityLevel}
                      </Badge>
                    </div>
                    <CardDescription className="line-clamp-2">
                      {archetype.whyItFits}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex-1 space-y-4">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Typical Titles</p>
                      <div className="flex flex-wrap gap-1">
                        {archetype.typicalTitles?.slice(0, 3).map((title) => (
                          <Badge key={title} variant="outline" className="text-xs">
                            {title}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <span>{archetype.compensationRange}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="capitalize">{archetype.recommendedResume?.replace("_", " ")} Resume</span>
                    </div>
                  </CardContent>
                  <CardFooter className="flex flex-col gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => setSelectedArchetype(archetype)}
                      data-testid={`button-view-archetype-${index}`}
                    >
                      <Target className="h-4 w-4 mr-2" />
                      View Keywords & Resume
                    </Button>
                    <div className="flex gap-2 w-full">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="flex-1"
                        onClick={() => {
                          const url = `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(archetype.searchStrings?.linkedin || archetype.name || "")}`;
                          window.open(url, "_blank");
                        }}
                        data-testid={`button-linkedin-search-${index}`}
                      >
                        <SiLinkedin className="h-4 w-4 mr-1" />
                        LinkedIn
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="flex-1"
                        onClick={() => {
                          const url = `https://www.indeed.com/jobs?q=${encodeURIComponent(archetype.searchStrings?.indeed || archetype.name || "")}&l=Louisiana`;
                          window.open(url, "_blank");
                        }}
                        data-testid={`button-indeed-search-${index}`}
                      >
                        <SiIndeed className="h-4 w-4 mr-1" />
                        Indeed
                      </Button>
                    </div>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="geographic" className="space-y-6">
          <div>
            <h2 className="text-xl font-medium">Geographic Targeting</h2>
            <p className="text-sm text-muted-foreground">Job opportunities by region</p>
          </div>

          <Tabs defaultValue="baton-rouge">
            <TabsList>
              <TabsTrigger value="baton-rouge" data-testid="tab-baton-rouge">
                <MapPin className="h-4 w-4 mr-2" />
                Baton Rouge / Louisiana
              </TabsTrigger>
              <TabsTrigger value="texas" data-testid="tab-texas">
                <MapPin className="h-4 w-4 mr-2" />
                Texas
              </TabsTrigger>
              <TabsTrigger value="remote" data-testid="tab-remote">
                <Globe className="h-4 w-4 mr-2" />
                Remote US
              </TabsTrigger>
            </TabsList>

            <TabsContent value="baton-rouge" className="mt-6">
              <div className="grid gap-6 lg:grid-cols-3">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Target className="h-5 w-5 text-primary" />
                      Job Count
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-4xl font-bold">{jobsByRegion.batonRouge.length}</div>
                    <p className="text-sm text-muted-foreground">Active opportunities</p>
                  </CardContent>
                </Card>

                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle className="text-lg">Top Opportunities</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {jobsByRegion.batonRouge.length > 0 ? (
                      <div className="space-y-3">
                        {jobsByRegion.batonRouge.slice(0, 3).map((job) => (
                          <div key={job.id} className="flex items-center justify-between gap-4 p-3 rounded-md bg-muted/50">
                            <div className="min-w-0">
                              <p className="font-medium truncate">{job.title}</p>
                              <p className="text-sm text-muted-foreground truncate">{job.company}</p>
                            </div>
                            {job.matchScore && (
                              <Badge variant={job.matchScore >= 80 ? "default" : "secondary"}>
                                {job.matchScore}% match
                              </Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-center py-4">No jobs found in this region yet</p>
                    )}
                  </CardContent>
                </Card>

                <Card className="lg:col-span-3">
                  <CardHeader>
                    <CardTitle className="text-lg">Industry Insights - Louisiana</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 sm:grid-cols-3">
                      <div className="p-4 rounded-md bg-muted/50">
                        <p className="font-medium">Key Industries</p>
                        <p className="text-sm text-muted-foreground mt-1">Petrochemical, Healthcare, Retail Distribution, Manufacturing</p>
                      </div>
                      <div className="p-4 rounded-md bg-muted/50">
                        <p className="font-medium">Target Companies</p>
                        <p className="text-sm text-muted-foreground mt-1">ExxonMobil, BASF, Our Lady of the Lake, Rouses, Matherne's</p>
                      </div>
                      <div className="p-4 rounded-md bg-muted/50">
                        <p className="font-medium">Salary Range</p>
                        <p className="text-sm text-muted-foreground mt-1">$65K - $110K for target roles</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="texas" className="mt-6">
              <div className="grid gap-6 lg:grid-cols-3">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Target className="h-5 w-5 text-primary" />
                      Job Count
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-4xl font-bold">{jobsByRegion.texas.length}</div>
                    <p className="text-sm text-muted-foreground">Active opportunities</p>
                  </CardContent>
                </Card>

                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle className="text-lg">Top Opportunities</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {jobsByRegion.texas.length > 0 ? (
                      <div className="space-y-3">
                        {jobsByRegion.texas.slice(0, 3).map((job) => (
                          <div key={job.id} className="flex items-center justify-between gap-4 p-3 rounded-md bg-muted/50">
                            <div className="min-w-0">
                              <p className="font-medium truncate">{job.title}</p>
                              <p className="text-sm text-muted-foreground truncate">{job.company}</p>
                            </div>
                            {job.matchScore && (
                              <Badge variant={job.matchScore >= 80 ? "default" : "secondary"}>
                                {job.matchScore}% match
                              </Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-center py-4">No jobs found in this region yet</p>
                    )}
                  </CardContent>
                </Card>

                <Card className="lg:col-span-3">
                  <CardHeader>
                    <CardTitle className="text-lg">Industry Insights - Texas</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 sm:grid-cols-3">
                      <div className="p-4 rounded-md bg-muted/50">
                        <p className="font-medium">Key Industries</p>
                        <p className="text-sm text-muted-foreground mt-1">Tech, Energy, Healthcare, Logistics, E-commerce</p>
                      </div>
                      <div className="p-4 rounded-md bg-muted/50">
                        <p className="font-medium">Target Cities</p>
                        <p className="text-sm text-muted-foreground mt-1">Houston, Dallas, Austin, San Antonio</p>
                      </div>
                      <div className="p-4 rounded-md bg-muted/50">
                        <p className="font-medium">Salary Range</p>
                        <p className="text-sm text-muted-foreground mt-1">$75K - $140K for target roles</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="remote" className="mt-6">
              <div className="grid gap-6 lg:grid-cols-3">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Target className="h-5 w-5 text-primary" />
                      Job Count
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-4xl font-bold">{jobsByRegion.remote.length}</div>
                    <p className="text-sm text-muted-foreground">Active opportunities</p>
                  </CardContent>
                </Card>

                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle className="text-lg">Top Opportunities</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {jobsByRegion.remote.length > 0 ? (
                      <div className="space-y-3">
                        {jobsByRegion.remote.slice(0, 3).map((job) => (
                          <div key={job.id} className="flex items-center justify-between gap-4 p-3 rounded-md bg-muted/50">
                            <div className="min-w-0">
                              <p className="font-medium truncate">{job.title}</p>
                              <p className="text-sm text-muted-foreground truncate">{job.company}</p>
                            </div>
                            {job.matchScore && (
                              <Badge variant={job.matchScore >= 80 ? "default" : "secondary"}>
                                {job.matchScore}% match
                              </Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-center py-4">No jobs found in this region yet</p>
                    )}
                  </CardContent>
                </Card>

                <Card className="lg:col-span-3">
                  <CardHeader>
                    <CardTitle className="text-lg">Industry Insights - Remote</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 sm:grid-cols-3">
                      <div className="p-4 rounded-md bg-muted/50">
                        <p className="font-medium">Key Industries</p>
                        <p className="text-sm text-muted-foreground mt-1">SaaS, E-commerce, Tech Sales, Digital Marketing</p>
                      </div>
                      <div className="p-4 rounded-md bg-muted/50">
                        <p className="font-medium">Best Fit Roles</p>
                        <p className="text-sm text-muted-foreground mt-1">Territory Sales, Account Management, E-commerce Manager</p>
                      </div>
                      <div className="p-4 rounded-md bg-muted/50">
                        <p className="font-medium">Salary Range</p>
                        <p className="text-sm text-muted-foreground mt-1">$80K - $150K for target roles</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </TabsContent>

        <TabsContent value="interview" className="space-y-6">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h2 className="text-xl font-medium">Interview Prep - STAR Stories</h2>
              <p className="text-sm text-muted-foreground">Prepared stories for behavioral interviews</p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {STORY_TYPES.map((storyType) => {
              const story = stories?.find(s => s.storyType === storyType.id);
              const Icon = storyType.icon;

              return (
                <Card key={storyType.id} className="flex flex-col">
                  <CardHeader>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Icon className="h-5 w-5 text-primary" />
                        <CardTitle className="text-lg">{storyType.label}</CardTitle>
                      </div>
                      {story && (
                        <Badge variant="outline">Ready</Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1">
                    {story ? (
                      <div className="space-y-3">
                        <p className="font-medium">{story.title}</p>
                        <p className="text-sm text-muted-foreground line-clamp-3">
                          {story.situation}
                        </p>
                        {story.metrics && (
                          <div className="flex items-center gap-2 text-sm">
                            <Award className="h-4 w-4 text-muted-foreground" />
                            <span className="text-muted-foreground">{story.metrics}</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-sm">
                        No story prepared yet. Generate one with AI.
                      </p>
                    )}
                  </CardContent>
                  <CardFooter className="flex gap-2">
                    {story ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => setSelectedStory(story)}
                        data-testid={`button-view-story-${storyType.id}`}
                      >
                        View Full Story
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        className="w-full"
                        onClick={() => generateStoryMutation.mutate(storyType.id)}
                        disabled={generateStoryMutation.isPending}
                        data-testid={`button-generate-story-${storyType.id}`}
                      >
                        {generateStoryMutation.isPending ? (
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Sparkles className="h-4 w-4 mr-2" />
                        )}
                        Generate with AI
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="outreach" className="space-y-6">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h2 className="text-xl font-medium">Outreach Kit</h2>
              <p className="text-sm text-muted-foreground">Message templates with variable placeholders</p>
            </div>
          </div>

          {templatesLoading ? (
            <div className="grid gap-4 md:grid-cols-2">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-48" />
              ))}
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {displayTemplates.map((template, index) => {
                const templateId = `template-${template.id || index}`;
                const isCopied = copiedId === templateId;

                return (
                  <Card key={template.id || index}>
                    <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
                      <div>
                        <CardTitle className="text-lg">{template.name}</CardTitle>
                        <CardDescription className="capitalize">
                          {template.templateType?.replace("_", " ")}
                        </CardDescription>
                      </div>
                      <Badge variant="outline">
                        {template.variables?.length || 0} variables
                      </Badge>
                    </CardHeader>
                    <CardContent>
                      {template.subject && (
                        <p className="text-sm font-medium mb-2">Subject: {template.subject}</p>
                      )}
                      <p className="text-sm text-muted-foreground line-clamp-4 whitespace-pre-wrap">
                        {template.content}
                      </p>
                      {template.variables && template.variables.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-3">
                          {template.variables.map((v) => (
                            <Badge key={v} variant="secondary" className="text-xs">
                              {v}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </CardContent>
                    <CardFooter className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCopy(template.content || "", templateId)}
                        data-testid={`button-copy-template-${index}`}
                      >
                        {isCopied ? (
                          <>
                            <Check className="h-4 w-4 mr-2" />
                            Copied
                          </>
                        ) : (
                          <>
                            <Copy className="h-4 w-4 mr-2" />
                            Copy
                          </>
                        )}
                      </Button>
                      {template.id && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingTemplate(template as OutreachTemplate);
                            setEditedContent(template.content || "");
                          }}
                          data-testid={`button-edit-template-${index}`}
                        >
                          Edit
                        </Button>
                      )}
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="execution" className="space-y-6">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h2 className="text-xl font-medium">Weekly Execution Plan</h2>
              <p className="text-sm text-muted-foreground">
                {weeklyPlan?.weekStartDate 
                  ? `Week of ${format(new Date(weeklyPlan.weekStartDate), "MMM d, yyyy")}`
                  : "Track your weekly progress"
                }
              </p>
            </div>
            <Button
              onClick={() => generatePlanMutation.mutate()}
              disabled={generatePlanMutation.isPending}
              data-testid="button-generate-weekly-plan"
            >
              {generatePlanMutation.isPending ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4 mr-2" />
              )}
              Generate New Plan
            </Button>
          </div>

          {planLoading ? (
            <Skeleton className="h-96" />
          ) : weeklyPlan ? (
            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Target className="h-5 w-5 text-primary" />
                    Weekly Goals
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {weeklyPlan.goals?.map((goal, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-medium shrink-0">
                          {i + 1}
                        </div>
                        <p className="text-sm">{goal}</p>
                      </div>
                    )) || <p className="text-muted-foreground">No goals set</p>}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    Progress Tracking
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>Applications</span>
                      <span className="font-medium">
                        {weeklyPlan.completedApplications || 0} / {weeklyPlan.targetApplications || 10}
                      </span>
                    </div>
                    <Progress 
                      value={((weeklyPlan.completedApplications || 0) / (weeklyPlan.targetApplications || 10)) * 100} 
                      data-testid="progress-applications"
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>Networking Contacts</span>
                      <span className="font-medium">
                        {weeklyPlan.completedNetworking || 0} / {weeklyPlan.targetNetworkingContacts || 5}
                      </span>
                    </div>
                    <Progress 
                      value={((weeklyPlan.completedNetworking || 0) / (weeklyPlan.targetNetworkingContacts || 5)) * 100}
                      data-testid="progress-networking" 
                    />
                  </div>
                  <div className="pt-4 border-t">
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span className="capitalize">
                        Focus: {weeklyPlan.geographicFocus?.replace("_", " ") || "All regions"}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {weeklyPlan.notes && (
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle className="text-lg">Strategic Notes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {weeklyPlan.notes}
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-lg font-medium mb-2">No Weekly Plan Yet</p>
                <p className="text-muted-foreground mb-4">
                  Generate a strategic weekly plan with AI to stay focused
                </p>
                <Button
                  onClick={() => generatePlanMutation.mutate()}
                  disabled={generatePlanMutation.isPending}
                  data-testid="button-generate-plan-empty"
                >
                  {generatePlanMutation.isPending ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4 mr-2" />
                  )}
                  Generate Weekly Plan
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={!!selectedArchetype} onOpenChange={() => setSelectedArchetype(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedArchetype?.name}</DialogTitle>
            <DialogDescription>
              Resume recommendations and ATS keywords
            </DialogDescription>
          </DialogHeader>
          {selectedArchetype && (
            <div className="space-y-6">
              <div>
                <h4 className="font-medium mb-2">Recommended Resume</h4>
                <Badge variant="default" className="capitalize">
                  {selectedArchetype.recommendedResume?.replace("_", " ")}
                </Badge>
              </div>
              <div>
                <h4 className="font-medium mb-2">ATS Keywords to Include</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedArchetype.atsKeywords?.map((keyword) => (
                    <Badge key={keyword} variant="secondary">
                      {keyword}
                    </Badge>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="font-medium mb-2">Search Strings</h4>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">LinkedIn</p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 text-xs bg-muted p-2 rounded overflow-x-auto">
                        {selectedArchetype.searchStrings?.linkedin}
                      </code>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleCopy(selectedArchetype.searchStrings?.linkedin || "", "linkedin-search")}
                        data-testid="button-copy-linkedin-search"
                      >
                        {copiedId === "linkedin-search" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Indeed</p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 text-xs bg-muted p-2 rounded overflow-x-auto">
                        {selectedArchetype.searchStrings?.indeed}
                      </code>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleCopy(selectedArchetype.searchStrings?.indeed || "", "indeed-search")}
                        data-testid="button-copy-indeed-search"
                      >
                        {copiedId === "indeed-search" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedStory} onOpenChange={() => setSelectedStory(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedStory?.title}</DialogTitle>
            <DialogDescription>
              STAR Story for {STORY_TYPES.find(t => t.id === selectedStory?.storyType)?.label}
            </DialogDescription>
          </DialogHeader>
          {selectedStory && (
            <div className="space-y-6">
              <div>
                <h4 className="font-medium text-primary mb-1">Situation</h4>
                <p className="text-sm">{selectedStory.situation}</p>
              </div>
              <div>
                <h4 className="font-medium text-primary mb-1">Task</h4>
                <p className="text-sm">{selectedStory.task}</p>
              </div>
              <div>
                <h4 className="font-medium text-primary mb-1">Action</h4>
                <p className="text-sm">{selectedStory.action}</p>
              </div>
              <div>
                <h4 className="font-medium text-primary mb-1">Result</h4>
                <p className="text-sm">{selectedStory.result}</p>
              </div>
              {selectedStory.metrics && (
                <div>
                  <h4 className="font-medium text-primary mb-1">Key Metrics</h4>
                  <p className="text-sm">{selectedStory.metrics}</p>
                </div>
              )}
              {selectedStory.applicableQuestions && selectedStory.applicableQuestions.length > 0 && (
                <div>
                  <h4 className="font-medium text-primary mb-2">Applicable Interview Questions</h4>
                  <ul className="space-y-2">
                    {selectedStory.applicableQuestions.map((q, i) => (
                      <li key={i} className="text-sm flex items-start gap-2">
                        <span className="text-muted-foreground">{i + 1}.</span>
                        <span>{q}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingTemplate} onOpenChange={() => setEditingTemplate(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Template</DialogTitle>
            <DialogDescription>
              {editingTemplate?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              className="min-h-48"
              data-testid="textarea-edit-template"
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditingTemplate(null)}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (editingTemplate?.id) {
                    updateTemplateMutation.mutate({ id: editingTemplate.id, content: editedContent });
                  }
                }}
                disabled={updateTemplateMutation.isPending}
                data-testid="button-save-template"
              >
                {updateTemplateMutation.isPending ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : null}
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
