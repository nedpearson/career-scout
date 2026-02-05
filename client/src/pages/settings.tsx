import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { 
  User,
  Users,
  FileText,
  Briefcase,
  Link as LinkIcon,
  Search,
  Plus,
  ExternalLink,
  RefreshCw,
  X,
  Pencil,
  Trash2,
  BookOpen,
  MessageSquare,
  Target,
  Sparkles,
  Wrench,
  Upload,
  CheckCircle,
  AlertCircle,
  Star,
  Loader2,
  Copy,
} from "lucide-react";
import { SiLinkedin, SiIndeed, SiFacebook } from "react-icons/si";
import type { 
  ResumeProfile, 
  ExternalAccount, 
  JobArchetype, 
  InsertJobArchetype,
  InterviewStory,
  InsertInterviewStory,
  OutreachTemplate,
  InsertOutreachTemplate,
  InsertJob 
} from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect, useRef } from "react";

export default function Settings() {
  const { toast } = useToast();
  const [formData, setFormData] = useState<Partial<ResumeProfile>>({});
  const [externalAccounts, setExternalAccounts] = useState<Record<string, string>>({
    linkedin: "",
    indeed: "",
    facebook: "",
  });
  const [manualJob, setManualJob] = useState<Partial<InsertJob>>({
    source: "linkedin",
    isActive: true,
  });

  const [newRole, setNewRole] = useState("");
  const [newHighlight, setNewHighlight] = useState("");
  const [newSkill, setNewSkill] = useState("");

  const [archetypeDialogOpen, setArchetypeDialogOpen] = useState(false);
  const [editingArchetype, setEditingArchetype] = useState<JobArchetype | null>(null);
  const [archetypeForm, setArchetypeForm] = useState<Partial<InsertJobArchetype>>({});

  const [storyDialogOpen, setStoryDialogOpen] = useState(false);
  const [editingStory, setEditingStory] = useState<InterviewStory | null>(null);
  const [storyForm, setStoryForm] = useState<Partial<InsertInterviewStory>>({});

  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<OutreachTemplate | null>(null);
  const [templateForm, setTemplateForm] = useState<Partial<InsertOutreachTemplate>>({});

  const [linkedinImporting, setLinkedinImporting] = useState(false);
  const [facebookImporting, setFacebookImporting] = useState(false);
  const [linkedinConnectionCount, setLinkedinConnectionCount] = useState(0);
  const [facebookConnectionCount, setFacebookConnectionCount] = useState(0);
  
  const [resumeUploading, setResumeUploading] = useState(false);
  const [resumeAnalyzing, setResumeAnalyzing] = useState(false);
  const [resumeRevising, setResumeRevising] = useState(false);
  const [revisedResume, setRevisedResume] = useState("");
  const [revisionDialogOpen, setRevisionDialogOpen] = useState(false);
  const resumeInputRef = useRef<HTMLInputElement>(null);

  const { data: profile, isLoading: isProfileLoading } = useQuery<ResumeProfile>({
    queryKey: ["/api/profile"],
  });

  const { data: accounts, isLoading: isAccountsLoading } = useQuery<ExternalAccount[]>({
    queryKey: ["/api/external-accounts"],
  });

  const { data: archetypes, isLoading: isArchetypesLoading } = useQuery<JobArchetype[]>({
    queryKey: ["/api/job-archetypes"],
  });

  const { data: stories, isLoading: isStoriesLoading } = useQuery<InterviewStory[]>({
    queryKey: ["/api/interview-stories"],
  });

  const { data: templates, isLoading: isTemplatesLoading } = useQuery<OutreachTemplate[]>({
    queryKey: ["/api/outreach-templates"],
  });

  useEffect(() => {
    if (profile) {
      setFormData(profile);
    }
  }, [profile]);

  useEffect(() => {
    if (accounts) {
      const accMap: Record<string, string> = { linkedin: "", indeed: "", facebook: "" };
      accounts.forEach(acc => {
        accMap[acc.platform] = acc.profileUrl || "";
      });
      setExternalAccounts(accMap);
    }
  }, [accounts]);

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<ResumeProfile>) => {
      return apiRequest("PATCH", "/api/profile", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
      toast({ title: "Profile updated!" });
    },
    onError: () => {
      toast({ title: "Failed to update profile", variant: "destructive" });
    },
  });

  const accountMutation = useMutation({
    mutationFn: async ({ platform, profileUrl }: { platform: string, profileUrl: string }) => {
      return apiRequest("POST", "/api/external-accounts", { platform, profileUrl, isConnected: !!profileUrl });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/external-accounts"] });
      toast({ title: "Account updated!" });
    },
    onError: () => {
      toast({ title: "Failed to update account", variant: "destructive" });
    },
  });

  const jobMutation = useMutation({
    mutationFn: async (data: Partial<InsertJob>) => {
      return apiRequest("POST", "/api/jobs", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      toast({ title: "Job imported successfully!" });
      setManualJob({ source: "linkedin", isActive: true });
    },
    onError: () => {
      toast({ title: "Failed to import job", variant: "destructive" });
    },
  });

  const createArchetypeMutation = useMutation({
    mutationFn: async (data: InsertJobArchetype) => {
      return apiRequest("POST", "/api/job-archetypes", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/job-archetypes"] });
      toast({ title: "Archetype created!" });
      setArchetypeDialogOpen(false);
      setArchetypeForm({});
    },
    onError: () => {
      toast({ title: "Failed to create archetype", variant: "destructive" });
    },
  });

  const updateArchetypeMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<InsertJobArchetype> }) => {
      return apiRequest("PATCH", `/api/job-archetypes/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/job-archetypes"] });
      toast({ title: "Archetype updated!" });
      setArchetypeDialogOpen(false);
      setEditingArchetype(null);
      setArchetypeForm({});
    },
    onError: () => {
      toast({ title: "Failed to update archetype", variant: "destructive" });
    },
  });

  const deleteArchetypeMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/job-archetypes/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/job-archetypes"] });
      toast({ title: "Archetype deleted!" });
    },
    onError: () => {
      toast({ title: "Failed to delete archetype", variant: "destructive" });
    },
  });

  const createStoryMutation = useMutation({
    mutationFn: async (data: InsertInterviewStory) => {
      return apiRequest("POST", "/api/interview-stories", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/interview-stories"] });
      toast({ title: "Story created!" });
      setStoryDialogOpen(false);
      setStoryForm({});
    },
    onError: () => {
      toast({ title: "Failed to create story", variant: "destructive" });
    },
  });

  const updateStoryMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<InsertInterviewStory> }) => {
      return apiRequest("PATCH", `/api/interview-stories/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/interview-stories"] });
      toast({ title: "Story updated!" });
      setStoryDialogOpen(false);
      setEditingStory(null);
      setStoryForm({});
    },
    onError: () => {
      toast({ title: "Failed to update story", variant: "destructive" });
    },
  });

  const deleteStoryMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/interview-stories/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/interview-stories"] });
      toast({ title: "Story deleted!" });
    },
    onError: () => {
      toast({ title: "Failed to delete story", variant: "destructive" });
    },
  });

  const createTemplateMutation = useMutation({
    mutationFn: async (data: InsertOutreachTemplate) => {
      return apiRequest("POST", "/api/outreach-templates", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/outreach-templates"] });
      toast({ title: "Template created!" });
      setTemplateDialogOpen(false);
      setTemplateForm({});
    },
    onError: () => {
      toast({ title: "Failed to create template", variant: "destructive" });
    },
  });

  const updateTemplateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<InsertOutreachTemplate> }) => {
      return apiRequest("PATCH", `/api/outreach-templates/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/outreach-templates"] });
      toast({ title: "Template updated!" });
      setTemplateDialogOpen(false);
      setEditingTemplate(null);
      setTemplateForm({});
    },
    onError: () => {
      toast({ title: "Failed to update template", variant: "destructive" });
    },
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/outreach-templates/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/outreach-templates"] });
      toast({ title: "Template deleted!" });
    },
    onError: () => {
      toast({ title: "Failed to delete template", variant: "destructive" });
    },
  });

  const handleSave = () => {
    updateMutation.mutate(formData);
  };

  const updateField = (field: string, value: unknown) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const updateAccount = (platform: string, profileUrl: string) => {
    accountMutation.mutate({ platform, profileUrl });
  };

  const handleManualJobSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualJob.title || !manualJob.company || !manualJob.location) {
      toast({ title: "Please fill in title, company and location", variant: "destructive" });
      return;
    }
    jobMutation.mutate(manualJob);
  };

  const addRole = () => {
    if (newRole.trim()) {
      const currentRoles = (formData.targetRoles as string[]) || [];
      const updated = [...currentRoles, newRole.trim()];
      updateField("targetRoles", updated);
      updateMutation.mutate({ ...formData, targetRoles: updated });
      setNewRole("");
    }
  };

  const removeRole = (index: number) => {
    const currentRoles = (formData.targetRoles as string[]) || [];
    const updated = currentRoles.filter((_, i) => i !== index);
    updateField("targetRoles", updated);
    updateMutation.mutate({ ...formData, targetRoles: updated });
  };

  const addHighlight = () => {
    if (newHighlight.trim()) {
      const current = (formData.highlights as string[]) || [];
      const updated = [...current, newHighlight.trim()];
      updateField("highlights", updated);
      updateMutation.mutate({ ...formData, highlights: updated });
      setNewHighlight("");
    }
  };

  const removeHighlight = (index: number) => {
    const current = (formData.highlights as string[]) || [];
    const updated = current.filter((_, i) => i !== index);
    updateField("highlights", updated);
    updateMutation.mutate({ ...formData, highlights: updated });
  };

  const addSkill = () => {
    if (newSkill.trim()) {
      const current = (formData.skills as string[]) || [];
      const updated = [...current, newSkill.trim()];
      updateField("skills", updated);
      updateMutation.mutate({ ...formData, skills: updated });
      setNewSkill("");
    }
  };

  const removeSkill = (index: number) => {
    const current = (formData.skills as string[]) || [];
    const updated = current.filter((_, i) => i !== index);
    updateField("skills", updated);
    updateMutation.mutate({ ...formData, skills: updated });
  };

  const openEditArchetype = (archetype: JobArchetype) => {
    setEditingArchetype(archetype);
    setArchetypeForm({
      name: archetype.name,
      description: archetype.description || "",
      typicalTitles: archetype.typicalTitles,
      seniorityLevel: archetype.seniorityLevel || "",
      compensationRange: archetype.compensationRange || "",
      recommendedResume: archetype.recommendedResume || "",
      atsKeywords: archetype.atsKeywords,
      searchStrings: archetype.searchStrings,
    });
    setArchetypeDialogOpen(true);
  };

  const openNewArchetype = () => {
    setEditingArchetype(null);
    setArchetypeForm({});
    setArchetypeDialogOpen(true);
  };

  const handleArchetypeSubmit = () => {
    if (!archetypeForm.name) {
      toast({ title: "Name is required", variant: "destructive" });
      return;
    }

    const data: InsertJobArchetype = {
      name: archetypeForm.name,
      description: archetypeForm.description,
      typicalTitles: archetypeForm.typicalTitles,
      seniorityLevel: archetypeForm.seniorityLevel,
      compensationRange: archetypeForm.compensationRange,
      recommendedResume: archetypeForm.recommendedResume,
      atsKeywords: archetypeForm.atsKeywords,
      searchStrings: archetypeForm.searchStrings,
      isActive: true,
    };

    if (editingArchetype) {
      updateArchetypeMutation.mutate({ id: editingArchetype.id, data });
    } else {
      createArchetypeMutation.mutate(data);
    }
  };

  const openEditStory = (story: InterviewStory) => {
    setEditingStory(story);
    setStoryForm({
      title: story.title,
      storyType: story.storyType,
      situation: story.situation || "",
      task: story.task || "",
      action: story.action || "",
      result: story.result || "",
      metrics: story.metrics || "",
      applicableQuestions: story.applicableQuestions,
    });
    setStoryDialogOpen(true);
  };

  const openNewStory = () => {
    setEditingStory(null);
    setStoryForm({});
    setStoryDialogOpen(true);
  };

  const handleStorySubmit = () => {
    if (!storyForm.title || !storyForm.storyType) {
      toast({ title: "Title and Story Type are required", variant: "destructive" });
      return;
    }

    const data: InsertInterviewStory = {
      title: storyForm.title,
      storyType: storyForm.storyType,
      situation: storyForm.situation,
      task: storyForm.task,
      action: storyForm.action,
      result: storyForm.result,
      metrics: storyForm.metrics,
      applicableQuestions: storyForm.applicableQuestions,
    };

    if (editingStory) {
      updateStoryMutation.mutate({ id: editingStory.id, data });
    } else {
      createStoryMutation.mutate(data);
    }
  };

  const openEditTemplate = (template: OutreachTemplate) => {
    setEditingTemplate(template);
    setTemplateForm({
      name: template.name,
      templateType: template.templateType,
      subject: template.subject || "",
      content: template.content,
      variables: template.variables,
    });
    setTemplateDialogOpen(true);
  };

  const openNewTemplate = () => {
    setEditingTemplate(null);
    setTemplateForm({});
    setTemplateDialogOpen(true);
  };

  const handleTemplateSubmit = () => {
    if (!templateForm.name || !templateForm.templateType || !templateForm.content) {
      toast({ title: "Name, Type and Content are required", variant: "destructive" });
      return;
    }

    const data: InsertOutreachTemplate = {
      name: templateForm.name,
      templateType: templateForm.templateType,
      subject: templateForm.subject,
      content: templateForm.content,
      variables: templateForm.variables,
    };

    if (editingTemplate) {
      updateTemplateMutation.mutate({ id: editingTemplate.id, data });
    } else {
      createTemplateMutation.mutate(data);
    }
  };

  const handleLinkedInImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    setLinkedinImporting(true);
    try {
      const text = await file.text();
      const lines = text.split('\n');
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''));
      
      let importedCount = 0;
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].match(/(?:^|,)("(?:[^"]*(?:""[^"]*)*)"|\s*[^,]*)/g);
        if (!values) continue;
        
        const cleanValues = values.map(v => v.replace(/^,/, '').replace(/^"|"$/g, '').replace(/""/g, '"').trim());
        
        const nameIdx = headers.findIndex(h => h.includes('first') || h === 'name');
        const lastNameIdx = headers.findIndex(h => h.includes('last'));
        const companyIdx = headers.findIndex(h => h.includes('company'));
        const positionIdx = headers.findIndex(h => h.includes('position') || h.includes('title'));
        const emailIdx = headers.findIndex(h => h.includes('email'));
        
        const firstName = nameIdx >= 0 ? cleanValues[nameIdx] : '';
        const lastName = lastNameIdx >= 0 ? cleanValues[lastNameIdx] : '';
        const name = lastName ? `${firstName} ${lastName}`.trim() : firstName;
        
        if (name && name.length > 1) {
          await apiRequest("POST", "/api/contacts", {
            name,
            company: companyIdx >= 0 ? cleanValues[companyIdx] : undefined,
            title: positionIdx >= 0 ? cleanValues[positionIdx] : undefined,
            email: emailIdx >= 0 ? cleanValues[emailIdx] : undefined,
            relationship: "linkedin",
            source: "linkedin_import",
          });
          importedCount++;
        }
      }
      
      setLinkedinConnectionCount(importedCount);
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
      toast({ 
        title: "LinkedIn connections imported!", 
        description: `Added ${importedCount} connections to your network` 
      });
    } catch (error) {
      toast({ title: "Import failed", description: "Could not parse CSV file", variant: "destructive" });
    } finally {
      setLinkedinImporting(false);
      event.target.value = '';
    }
  };

  const handleFacebookImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    setFacebookImporting(true);
    try {
      const text = await file.text();
      let importedCount = 0;
      
      try {
        const data = JSON.parse(text);
        const friends = data.friends_v2 || data.friends || data;
        
        if (Array.isArray(friends)) {
          for (const friend of friends) {
            const name = friend.name || friend.title || '';
            if (name && name.length > 1) {
              await apiRequest("POST", "/api/contacts", {
                name,
                relationship: "facebook",
                source: "facebook_import",
              });
              importedCount++;
            }
          }
        }
      } catch {
        const lines = text.split('\n');
        for (const line of lines) {
          const name = line.trim();
          if (name && name.length > 1 && !name.includes(',')) {
            await apiRequest("POST", "/api/contacts", {
              name,
              relationship: "facebook",
              source: "facebook_import",
            });
            importedCount++;
          }
        }
      }
      
      setFacebookConnectionCount(importedCount);
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
      toast({ 
        title: "Facebook friends imported!", 
        description: `Added ${importedCount} connections to your network` 
      });
    } catch (error) {
      toast({ title: "Import failed", description: "Could not parse file", variant: "destructive" });
    } finally {
      setFacebookImporting(false);
      event.target.value = '';
    }
  };

  const isLoading = isProfileLoading || isAccountsLoading || isArchetypesLoading || isStoriesLoading || isTemplatesLoading;

  const handleResumeUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ];
    
    if (!allowedTypes.includes(file.type) && !file.name.match(/\.(pdf|doc|docx|txt)$/i)) {
      toast({ 
        title: "Invalid file type", 
        description: "Please upload a PDF, Word document (.docx), or text file", 
        variant: "destructive" 
      });
      return;
    }

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({ 
        title: "File too large", 
        description: "Please upload a file smaller than 10MB", 
        variant: "destructive" 
      });
      return;
    }
    
    setResumeUploading(true);
    
    try {
      // Combined Upload and Analysis
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('/api/profile/upload-resume', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      
      const result = await response.json();
      
      if (!response.ok || !result.ok) {
        throw new Error(result.message || 'Processing failed');
      }
      
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
      
      toast({ 
        title: "Resume processed!", 
        description: `Analysis complete. Overall score: ${result.overallScore}/100` 
      });
    } catch (error: any) {
      console.error("Resume processing error:", error);
      toast({ 
        title: "Processing failed", 
        description: error.message || "An unexpected error occurred", 
        variant: "destructive" 
      });
    } finally {
      setResumeUploading(false);
      setResumeAnalyzing(false);
      if (event.target) {
        event.target.value = '';
      }
    }
  };

  const handleResumeRevision = async (revisionType: string) => {
    if (!profile?.resumeContent) {
      toast({ title: "No resume found", description: "Please upload a resume first", variant: "destructive" });
      return;
    }
    
    setResumeRevising(true);
    
    try {
      const response = await apiRequest("POST", "/api/profile/revise-resume", {
        resumeContent: profile.resumeContent,
        revisionType,
      });
      
      const result = await response.json();
      setRevisedResume(result.revisedResume);
      setRevisionDialogOpen(true);
    } catch (error) {
      toast({ title: "Revision failed", description: "Could not generate revision", variant: "destructive" });
    } finally {
      setResumeRevising(false);
    }
  };

  const copyRevisedResume = () => {
    navigator.clipboard.writeText(revisedResume);
    toast({ title: "Copied to clipboard!" });
  };

  const applyRevisedResume = async () => {
    try {
      const response = await apiRequest("POST", "/api/profile/analyze-resume", {
        resumeContent: revisedResume,
        resumeFileName: profile?.resumeFileName || "revised_resume.txt",
      });
      
      await response.json();
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
      setRevisionDialogOpen(false);
      toast({ title: "Resume updated!", description: "Your revised resume has been saved and re-analyzed" });
    } catch (error) {
      toast({ title: "Failed to save", variant: "destructive" });
    }
  };

  const getLinkedInSearchUrl = (query: string) => {
    return `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(query)}&location=Baton%20Rouge%2C%20LA`;
  };

  const getIndeedSearchUrl = (query: string) => {
    return `https://www.indeed.com/jobs?q=${encodeURIComponent(query)}&l=Baton%20Rouge%2C%20LA`;
  };

  const getAccountStatus = (platform: string) => {
    const acc = accounts?.find(a => a.platform === platform);
    return acc?.isConnected ? (
      <Badge variant="default" className="bg-green-500 dark:bg-green-600" data-testid={`badge-status-${platform}-connected`}>Connected</Badge>
    ) : (
      <Badge variant="secondary" data-testid={`badge-status-${platform}-disconnected`}>Not Connected</Badge>
    );
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-semibold" data-testid="text-page-title">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage your profile and job search preferences
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                Personal Information
              </CardTitle>
              <CardDescription>
                Your basic contact information for job applications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    value={formData.name || ""}
                    onChange={(e) => updateField("name", e.target.value)}
                    placeholder="Gerald (Ned) Pearson"
                    data-testid="input-profile-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email || ""}
                    onChange={(e) => updateField("email", e.target.value)}
                    placeholder="nedpearson@gmail.com"
                    data-testid="input-profile-email"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone || ""}
                    onChange={(e) => updateField("phone", e.target.value)}
                    placeholder="225-328-2500"
                    data-testid="input-profile-phone"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={formData.location || ""}
                    onChange={(e) => updateField("location", e.target.value)}
                    placeholder="Baton Rouge, LA"
                    data-testid="input-profile-location"
                  />
                </div>
              </div>
              <Button 
                onClick={handleSave} 
                disabled={updateMutation.isPending}
                data-testid="button-save-profile"
              >
                {updateMutation.isPending ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : null}
                Save Changes
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Resume AI Analysis
              </CardTitle>
              <CardDescription>
                Paste your resume text below for AI-powered analysis, suggestions, and optimized job matching.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="resume-text">Resume Content (Paste Text)</Label>
                  <Textarea
                    id="resume-text"
                    placeholder="Paste your resume text here..."
                    className="min-h-[300px] font-sans text-sm"
                    value={formData.resumeContent || ""}
                    onChange={(e) => updateField("resumeContent", e.target.value)}
                    data-testid="textarea-resume-content"
                  />
                  <p className="text-xs text-muted-foreground">
                    Tip: Open your PDF or Word document, press Ctrl+A (Cmd+A) to select all, then Ctrl+C (Cmd+C) to copy and paste it here.
                  </p>
                </div>
                
                <Button
                  onClick={async () => {
                    if (!formData.resumeContent || formData.resumeContent.length < 100) {
                      toast({ 
                        title: "Content too short", 
                        description: "Please paste your full resume text for accurate analysis.", 
                        variant: "destructive" 
                      });
                      return;
                    }
                    setResumeAnalyzing(true);
                    try {
                      const response = await apiRequest("POST", "/api/profile/analyze-resume", {
                        resumeContent: formData.resumeContent,
                        resumeFileName: "Pasted Text"
                      });
                      const result = await response.json();
                      if (!response.ok || !result.ok) throw new Error(result.message || "Analysis failed");
                      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
                      toast({ title: "Analysis complete!", description: "Your resume has been analyzed and your profile updated." });
                    } catch (err: any) {
                      toast({ title: "Analysis failed", description: err.message, variant: "destructive" });
                    } finally {
                      setResumeAnalyzing(false);
                    }
                  }}
                  disabled={resumeAnalyzing}
                  className="w-full"
                  data-testid="button-analyze-resume"
                >
                  {resumeAnalyzing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Analyze Resume Text
                    </>
                  )}
                </Button>
              </div>

              {profile?.resumeAnalysis && (
                <div className="space-y-4">
                  <Separator />
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-primary" />
                      Resume Analysis Results
                    </h4>
                    <Badge 
                      variant={profile.resumeAnalysis.overallScore >= 70 ? "default" : "secondary"}
                      className="text-lg px-3 py-1"
                      data-testid="badge-resume-score"
                    >
                      <Star className="h-4 w-4 mr-1" />
                      {profile.resumeAnalysis.overallScore}/100
                    </Badge>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <h5 className="font-medium flex items-center gap-2 text-primary">
                        <CheckCircle className="h-4 w-4" />
                        Strengths
                      </h5>
                      <ul className="space-y-1">
                        {profile.resumeAnalysis.strengths?.map((s, i) => (
                          <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                            <span className="text-primary">+</span> {s}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="space-y-2">
                      <h5 className="font-medium flex items-center gap-2 text-muted-foreground">
                        <AlertCircle className="h-4 w-4" />
                        Areas to Improve
                      </h5>
                      <ul className="space-y-1">
                        {profile.resumeAnalysis.weaknesses?.map((w, i) => (
                          <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                            <span className="text-foreground">!</span> {w}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h5 className="font-medium">Suggestions</h5>
                    <ul className="space-y-1">
                      {profile.resumeAnalysis.suggestions?.map((s, i) => (
                        <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                          <span className="text-primary">&bull;</span> {s}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <span className="text-sm font-medium mr-2">Key Skills:</span>
                    {profile.resumeAnalysis.keySkills?.map((skill, i) => (
                      <Badge key={i} variant="outline" data-testid={`badge-skill-${i}`}>{skill}</Badge>
                    ))}
                  </div>

                  <div className="flex flex-wrap gap-2 items-center">
                    <span className="text-sm font-medium mr-2">Experience Level:</span>
                    <Badge data-testid="badge-experience-level">{profile.resumeAnalysis.experienceLevel}</Badge>
                    <span className="text-sm font-medium ml-4 mr-2">Industry Focus:</span>
                    {profile.resumeAnalysis.industryFocus?.map((ind, i) => (
                      <Badge key={i} variant="secondary" data-testid={`badge-industry-${i}`}>{ind}</Badge>
                    ))}
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <h5 className="font-medium">AI Resume Revisions</h5>
                    <p className="text-sm text-muted-foreground">
                      Let AI rewrite your resume with different focuses. Select a revision type below.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleResumeRevision("ats-optimize")}
                        disabled={resumeRevising}
                        data-testid="button-revision-ats"
                      >
                        {resumeRevising ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : null}
                        ATS Optimized
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleResumeRevision("results-focused")}
                        disabled={resumeRevising}
                        data-testid="button-revision-results"
                      >
                        Results Focused
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleResumeRevision("executive-level")}
                        disabled={resumeRevising}
                        data-testid="button-revision-executive"
                      >
                        Executive Level
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleResumeRevision("concise")}
                        disabled={resumeRevising}
                        data-testid="button-revision-concise"
                      >
                        Concise Version
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Dialog open={revisionDialogOpen} onOpenChange={setRevisionDialogOpen}>
            <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>AI-Revised Resume</DialogTitle>
                <DialogDescription>
                  Review the AI-generated revision. You can copy it or apply it to replace your current resume.
                </DialogDescription>
              </DialogHeader>
              <div className="bg-muted p-4 rounded-lg max-h-96 overflow-y-auto">
                <pre className="text-sm whitespace-pre-wrap font-sans">{revisedResume}</pre>
              </div>
              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={copyRevisedResume} data-testid="button-copy-revision">
                  <Copy className="h-4 w-4 mr-2" />
                  Copy to Clipboard
                </Button>
                <Button onClick={applyRevisedResume} data-testid="button-apply-revision">
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Apply & Save
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Card>
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Professional Summary
              </CardTitle>
              <CardDescription>
                Your elevator pitch for AI-generated scripts
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="summary">Summary</Label>
                <Textarea
                  id="summary"
                  value={formData.summary || ""}
                  onChange={(e) => updateField("summary", e.target.value)}
                  placeholder="Sales and operations background with experience building product lines, managing retail locations..."
                  className="min-h-32"
                  data-testid="textarea-profile-summary"
                />
              </div>
              <Button 
                onClick={handleSave} 
                disabled={updateMutation.isPending}
                data-testid="button-save-summary"
              >
                Save Summary
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Key Highlights
              </CardTitle>
              <CardDescription>
                Standout achievements used for AI matching
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {(formData.highlights as string[] || []).map((highlight, i) => (
                  <Badge key={i} variant="secondary" className="gap-1 no-default-hover-elevate no-default-active-elevate" data-testid={`badge-highlight-${i}`}>
                    {highlight}
                    <button
                      onClick={() => removeHighlight(i)}
                      className="ml-1 hover:text-destructive"
                      data-testid={`button-remove-highlight-${i}`}
                      aria-label={`Remove highlight: ${highlight}`}
                      title="Remove highlight"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  value={newHighlight}
                  onChange={(e) => setNewHighlight(e.target.value)}
                  placeholder="Add a highlight..."
                  onKeyDown={(e) => e.key === "Enter" && addHighlight()}
                  data-testid="input-new-highlight"
                />
                <Button onClick={addHighlight} disabled={updateMutation.isPending} data-testid="button-add-highlight">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2">
                <Wrench className="h-5 w-5 text-primary" />
                Skills
              </CardTitle>
              <CardDescription>
                Your professional skills and competencies
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {(formData.skills as string[] || []).map((skill, i) => (
                  <Badge key={i} variant="outline" className="gap-1 no-default-hover-elevate no-default-active-elevate" data-testid={`badge-skill-${i}`}>
                    {skill}
                    <button
                      onClick={() => removeSkill(i)}
                      className="ml-1 hover:text-destructive"
                      data-testid={`button-remove-skill-${i}`}
                      aria-label={`Remove skill: ${skill}`}
                      title="Remove skill"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  value={newSkill}
                  onChange={(e) => setNewSkill(e.target.value)}
                  placeholder="Add a skill..."
                  onKeyDown={(e) => e.key === "Enter" && addSkill()}
                  data-testid="input-new-skill"
                />
                <Button onClick={addSkill} disabled={updateMutation.isPending} data-testid="button-add-skill">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                Target Roles
              </CardTitle>
              <CardDescription>
                Roles you are targeting in your job search
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {(formData.targetRoles as string[] || []).map((role, i) => (
                  <Badge key={i} variant="default" className="gap-1" data-testid={`badge-role-${i}`}>
                    {role}
                    <button
                      onClick={() => removeRole(i)}
                      className="ml-1 hover:text-destructive-foreground"
                      data-testid={`button-remove-role-${i}`}
                      aria-label={`Remove target role: ${role}`}
                      title="Remove role"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  placeholder="Add a target role..."
                  onKeyDown={(e) => e.key === "Enter" && addRole()}
                  data-testid="input-new-role"
                />
                <Button onClick={addRole} disabled={updateMutation.isPending} data-testid="button-add-role">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-primary" />
                Job Search Preferences
              </CardTitle>
              <CardDescription>
                Configure your location and salary preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="targetLocation">Target Location</Label>
                  <Input
                    id="targetLocation"
                    value={formData.targetLocation || ""}
                    onChange={(e) => updateField("targetLocation", e.target.value)}
                    placeholder="Baton Rouge, LA"
                    data-testid="input-target-location"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="salaryExpectation">Salary Expectation</Label>
                  <Input
                    id="salaryExpectation"
                    value={formData.salaryExpectation || ""}
                    onChange={(e) => updateField("salaryExpectation", e.target.value)}
                    placeholder="$60K - $90K"
                    data-testid="input-salary-expectation"
                  />
                </div>
              </div>
              <Button onClick={handleSave} disabled={updateMutation.isPending} data-testid="button-save-preferences">
                Save Preferences
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
              <div>
                <CardTitle className="text-xl flex items-center gap-2">
                  <Briefcase className="h-5 w-5 text-primary" />
                  Job Archetypes
                </CardTitle>
                <CardDescription>
                  Define target job categories for your search
                </CardDescription>
              </div>
              <Dialog open={archetypeDialogOpen} onOpenChange={setArchetypeDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={openNewArchetype} data-testid="button-add-archetype">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Archetype
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>{editingArchetype ? "Edit Archetype" : "Add Archetype"}</DialogTitle>
                    <DialogDescription>
                      {editingArchetype ? "Update this job archetype" : "Create a new target job category"}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="arch-name">Name *</Label>
                        <Input
                          id="arch-name"
                          value={archetypeForm.name || ""}
                          onChange={(e) => setArchetypeForm(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="e.g. Operations Manager"
                          data-testid="input-archetype-name"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="arch-seniority">Seniority Level</Label>
                        <Select
                          value={archetypeForm.seniorityLevel || ""}
                          onValueChange={(v) => setArchetypeForm(prev => ({ ...prev, seniorityLevel: v }))}
                        >
                          <SelectTrigger id="arch-seniority" data-testid="select-archetype-seniority">
                            <SelectValue placeholder="Select level" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="manager">Manager</SelectItem>
                            <SelectItem value="senior">Senior</SelectItem>
                            <SelectItem value="director">Director</SelectItem>
                            <SelectItem value="vp">VP</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="arch-description">Description</Label>
                      <Textarea
                        id="arch-description"
                        value={archetypeForm.description || ""}
                        onChange={(e) => setArchetypeForm(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Describe this job archetype..."
                        data-testid="textarea-archetype-description"
                      />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="arch-titles">Typical Titles (comma-separated)</Label>
                        <Input
                          id="arch-titles"
                          value={(archetypeForm.typicalTitles || []).join(", ")}
                          onChange={(e) => setArchetypeForm(prev => ({ 
                            ...prev, 
                            typicalTitles: e.target.value.split(",").map(s => s.trim()).filter(Boolean)
                          }))}
                          placeholder="Ops Manager, Operations Director"
                          data-testid="input-archetype-titles"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="arch-comp">Compensation Range</Label>
                        <Input
                          id="arch-comp"
                          value={archetypeForm.compensationRange || ""}
                          onChange={(e) => setArchetypeForm(prev => ({ ...prev, compensationRange: e.target.value }))}
                          placeholder="$70k - $100k"
                          data-testid="input-archetype-compensation"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="arch-resume">Recommended Resume</Label>
                      <Select
                        value={archetypeForm.recommendedResume || ""}
                        onValueChange={(v) => setArchetypeForm(prev => ({ ...prev, recommendedResume: v }))}
                      >
                        <SelectTrigger id="arch-resume" data-testid="select-archetype-resume">
                          <SelectValue placeholder="Select resume version" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="operations">Operations</SelectItem>
                          <SelectItem value="business_development">Business Development</SelectItem>
                          <SelectItem value="sales_remote">Sales / Remote</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="arch-linkedin">LinkedIn Search String</Label>
                        <Input
                          id="arch-linkedin"
                          value={archetypeForm.searchStrings?.linkedin || ""}
                          onChange={(e) => setArchetypeForm(prev => ({ 
                            ...prev, 
                            searchStrings: { ...prev.searchStrings, linkedin: e.target.value, indeed: prev.searchStrings?.indeed || "", google: prev.searchStrings?.google || "" }
                          }))}
                          placeholder="operations manager Louisiana"
                          data-testid="input-archetype-linkedin-search"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="arch-indeed">Indeed Search String</Label>
                        <Input
                          id="arch-indeed"
                          value={archetypeForm.searchStrings?.indeed || ""}
                          onChange={(e) => setArchetypeForm(prev => ({ 
                            ...prev, 
                            searchStrings: { ...prev.searchStrings, indeed: e.target.value, linkedin: prev.searchStrings?.linkedin || "", google: prev.searchStrings?.google || "" }
                          }))}
                          placeholder="operations manager"
                          data-testid="input-archetype-indeed-search"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="arch-ats">ATS Keywords (comma-separated)</Label>
                      <Input
                        id="arch-ats"
                        value={(archetypeForm.atsKeywords || []).join(", ")}
                        onChange={(e) => setArchetypeForm(prev => ({ 
                          ...prev, 
                          atsKeywords: e.target.value.split(",").map(s => s.trim()).filter(Boolean)
                        }))}
                        placeholder="operations, logistics, supply chain"
                        data-testid="input-archetype-ats-keywords"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button 
                      variant="outline" 
                      onClick={() => setArchetypeDialogOpen(false)}
                      data-testid="button-cancel-archetype"
                    >
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleArchetypeSubmit}
                      disabled={createArchetypeMutation.isPending || updateArchetypeMutation.isPending}
                      data-testid="button-save-archetype"
                    >
                      {(createArchetypeMutation.isPending || updateArchetypeMutation.isPending) && (
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      )}
                      {editingArchetype ? "Update" : "Create"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {archetypes?.map((archetype) => (
                  <div key={archetype.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-3 rounded-lg border bg-muted/30" data-testid={`card-archetype-${archetype.id}`}>
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium">{archetype.name}</p>
                        {archetype.seniorityLevel && (
                          <Badge variant="outline" className="text-xs no-default-hover-elevate no-default-active-elevate">{archetype.seniorityLevel}</Badge>
                        )}
                      </div>
                      {archetype.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">{archetype.description}</p>
                      )}
                      {archetype.searchStrings?.linkedin && (
                        <p className="text-xs text-muted-foreground italic">
                          "{archetype.searchStrings.linkedin.substring(0, 50)}..."
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        onClick={() => window.open(getLinkedInSearchUrl(archetype.searchStrings?.linkedin || archetype.name), "_blank")}
                        data-testid={`button-search-linkedin-${archetype.id}`}
                      >
                        <SiLinkedin className="h-3.5 w-3.5" />
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        onClick={() => window.open(getIndeedSearchUrl(archetype.searchStrings?.indeed || archetype.name), "_blank")}
                        data-testid={`button-search-indeed-${archetype.id}`}
                      >
                        <SiIndeed className="h-3.5 w-3.5" />
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditArchetype(archetype)}
                        data-testid={`button-edit-archetype-${archetype.id}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            data-testid={`button-delete-archetype-${archetype.id}`}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Archetype</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "{archetype.name}"? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel data-testid="button-cancel-delete-archetype">Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteArchetypeMutation.mutate(archetype.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              data-testid="button-confirm-delete-archetype"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                ))}
                {(!archetypes || archetypes.length === 0) && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No job archetypes defined. Add one to see search links.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
              <div>
                <CardTitle className="text-xl flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-primary" />
                  Interview Stories
                </CardTitle>
                <CardDescription>
                  STAR format stories for behavioral interviews
                </CardDescription>
              </div>
              <Dialog open={storyDialogOpen} onOpenChange={setStoryDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={openNewStory} data-testid="button-add-story">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Story
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>{editingStory ? "Edit Story" : "Add Story"}</DialogTitle>
                    <DialogDescription>
                      {editingStory ? "Update this interview story" : "Create a new STAR format story"}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="story-title">Title *</Label>
                        <Input
                          id="story-title"
                          value={storyForm.title || ""}
                          onChange={(e) => setStoryForm(prev => ({ ...prev, title: e.target.value }))}
                          placeholder="e.g. Amazon Store Growth"
                          data-testid="input-story-title"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="story-type">Story Type *</Label>
                        <Select
                          value={storyForm.storyType || ""}
                          onValueChange={(v) => setStoryForm(prev => ({ ...prev, storyType: v }))}
                        >
                          <SelectTrigger id="story-type" data-testid="select-story-type">
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="sales_win">Sales Win</SelectItem>
                            <SelectItem value="turnaround">Turnaround</SelectItem>
                            <SelectItem value="negotiation">Negotiation</SelectItem>
                            <SelectItem value="scaling">Scaling</SelectItem>
                            <SelectItem value="leadership">Leadership</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="story-situation">Situation</Label>
                      <Textarea
                        id="story-situation"
                        value={storyForm.situation || ""}
                        onChange={(e) => setStoryForm(prev => ({ ...prev, situation: e.target.value }))}
                        placeholder="Describe the context and challenge..."
                        data-testid="textarea-story-situation"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="story-task">Task</Label>
                      <Textarea
                        id="story-task"
                        value={storyForm.task || ""}
                        onChange={(e) => setStoryForm(prev => ({ ...prev, task: e.target.value }))}
                        placeholder="What needed to be accomplished..."
                        data-testid="textarea-story-task"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="story-action">Action</Label>
                      <Textarea
                        id="story-action"
                        value={storyForm.action || ""}
                        onChange={(e) => setStoryForm(prev => ({ ...prev, action: e.target.value }))}
                        placeholder="Specific actions you took..."
                        data-testid="textarea-story-action"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="story-result">Result</Label>
                      <Textarea
                        id="story-result"
                        value={storyForm.result || ""}
                        onChange={(e) => setStoryForm(prev => ({ ...prev, result: e.target.value }))}
                        placeholder="Outcomes achieved..."
                        data-testid="textarea-story-result"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="story-metrics">Metrics</Label>
                      <Input
                        id="story-metrics"
                        value={storyForm.metrics || ""}
                        onChange={(e) => setStoryForm(prev => ({ ...prev, metrics: e.target.value }))}
                        placeholder="e.g. 233% revenue growth, $2M annual"
                        data-testid="input-story-metrics"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="story-questions">Applicable Questions (comma-separated)</Label>
                      <Input
                        id="story-questions"
                        value={(storyForm.applicableQuestions || []).join(", ")}
                        onChange={(e) => setStoryForm(prev => ({ 
                          ...prev, 
                          applicableQuestions: e.target.value.split(",").map(s => s.trim()).filter(Boolean)
                        }))}
                        placeholder="Tell me about a time..., Describe a situation..."
                        data-testid="input-story-questions"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button 
                      variant="outline" 
                      onClick={() => setStoryDialogOpen(false)}
                      data-testid="button-cancel-story"
                    >
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleStorySubmit}
                      disabled={createStoryMutation.isPending || updateStoryMutation.isPending}
                      data-testid="button-save-story"
                    >
                      {(createStoryMutation.isPending || updateStoryMutation.isPending) && (
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      )}
                      {editingStory ? "Update" : "Create"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stories?.map((story) => (
                  <div key={story.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-3 rounded-lg border bg-muted/30" data-testid={`card-story-${story.id}`}>
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium">{story.title}</p>
                        <Badge variant="secondary" className="text-xs no-default-hover-elevate no-default-active-elevate">
                          {story.storyType.replace("_", " ")}
                        </Badge>
                      </div>
                      {story.situation && (
                        <p className="text-sm text-muted-foreground line-clamp-2">{story.situation}</p>
                      )}
                      {story.metrics && (
                        <p className="text-xs font-medium text-green-600 dark:text-green-400">{story.metrics}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditStory(story)}
                        data-testid={`button-edit-story-${story.id}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            data-testid={`button-delete-story-${story.id}`}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Story</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "{story.title}"? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel data-testid="button-cancel-delete-story">Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteStoryMutation.mutate(story.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              data-testid="button-confirm-delete-story"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                ))}
                {(!stories || stories.length === 0) && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No interview stories yet. Add your STAR format stories for interviews.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
              <div>
                <CardTitle className="text-xl flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-primary" />
                  Outreach Templates
                </CardTitle>
                <CardDescription>
                  Reusable message templates for networking
                </CardDescription>
              </div>
              <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={openNewTemplate} data-testid="button-add-template">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Template
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>{editingTemplate ? "Edit Template" : "Add Template"}</DialogTitle>
                    <DialogDescription>
                      {editingTemplate ? "Update this outreach template" : "Create a new reusable message template"}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="template-name">Name *</Label>
                        <Input
                          id="template-name"
                          value={templateForm.name || ""}
                          onChange={(e) => setTemplateForm(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="e.g. LinkedIn Cold Outreach"
                          data-testid="input-template-name"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="template-type">Template Type *</Label>
                        <Select
                          value={templateForm.templateType || ""}
                          onValueChange={(v) => setTemplateForm(prev => ({ ...prev, templateType: v }))}
                        >
                          <SelectTrigger id="template-type" data-testid="select-template-type">
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="linkedin_dm">LinkedIn DM</SelectItem>
                            <SelectItem value="recruiter_email">Recruiter Email</SelectItem>
                            <SelectItem value="hiring_manager">Hiring Manager</SelectItem>
                            <SelectItem value="follow_up">Follow Up</SelectItem>
                            <SelectItem value="thank_you">Thank You</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="template-subject">Subject (for emails)</Label>
                      <Input
                        id="template-subject"
                        value={templateForm.subject || ""}
                        onChange={(e) => setTemplateForm(prev => ({ ...prev, subject: e.target.value }))}
                        placeholder="e.g. Interested in {role} opportunity"
                        data-testid="input-template-subject"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="template-content">Content *</Label>
                      <Textarea
                        id="template-content"
                        value={templateForm.content || ""}
                        onChange={(e) => setTemplateForm(prev => ({ ...prev, content: e.target.value }))}
                        placeholder="Hi {name}, I noticed {company} is hiring for..."
                        className="min-h-40"
                        data-testid="textarea-template-content"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="template-variables">Variables (comma-separated)</Label>
                      <Input
                        id="template-variables"
                        value={(templateForm.variables || []).join(", ")}
                        onChange={(e) => setTemplateForm(prev => ({ 
                          ...prev, 
                          variables: e.target.value.split(",").map(s => s.trim()).filter(Boolean)
                        }))}
                        placeholder="{company}, {role}, {name}"
                        data-testid="input-template-variables"
                      />
                      <p className="text-xs text-muted-foreground">Placeholders to replace when using the template</p>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button 
                      variant="outline" 
                      onClick={() => setTemplateDialogOpen(false)}
                      data-testid="button-cancel-template"
                    >
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleTemplateSubmit}
                      disabled={createTemplateMutation.isPending || updateTemplateMutation.isPending}
                      data-testid="button-save-template"
                    >
                      {(createTemplateMutation.isPending || updateTemplateMutation.isPending) && (
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      )}
                      {editingTemplate ? "Update" : "Create"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {templates?.map((template) => (
                  <div key={template.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-3 rounded-lg border bg-muted/30" data-testid={`card-template-${template.id}`}>
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium">{template.name}</p>
                        <Badge variant="secondary" className="text-xs no-default-hover-elevate no-default-active-elevate">
                          {template.templateType.replace("_", " ")}
                        </Badge>
                      </div>
                      {template.subject && (
                        <p className="text-sm text-muted-foreground">Subject: {template.subject}</p>
                      )}
                      <p className="text-xs text-muted-foreground line-clamp-2">{template.content.substring(0, 100)}...</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditTemplate(template)}
                        data-testid={`button-edit-template-${template.id}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            data-testid={`button-delete-template-${template.id}`}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Template</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "{template.name}"? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel data-testid="button-cancel-delete-template">Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteTemplateMutation.mutate(template.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              data-testid="button-confirm-delete-template"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                ))}
                {(!templates || templates.length === 0) && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No outreach templates yet. Create templates for faster networking.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2">
                <LinkIcon className="h-5 w-5 text-primary" />
                Platform Connections
              </CardTitle>
              <CardDescription>
                Connect your professional profiles for job discovery
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2 flex-1">
                    <SiLinkedin className="h-5 w-5 text-[#0A66C2]" />
                    <div className="flex-1 space-y-1">
                      <Label htmlFor="linkedin-url">LinkedIn Profile URL</Label>
                      <div className="flex gap-2">
                        <Input
                          id="linkedin-url"
                          placeholder="https://linkedin.com/in/username"
                          value={externalAccounts.linkedin}
                          onChange={(e) => setExternalAccounts(prev => ({ ...prev, linkedin: e.target.value }))}
                          data-testid="input-linkedin-url"
                        />
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => updateAccount("linkedin", externalAccounts.linkedin)}
                          disabled={accountMutation.isPending}
                          data-testid="button-save-linkedin"
                        >
                          Save
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => (window.location.href = "/api/oauth/linkedin/start")}
                          data-testid="button-connect-linkedin"
                        >
                          Connect
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setExternalAccounts(prev => ({ ...prev, linkedin: "" }));
                            updateAccount("linkedin", "");
                          }}
                          data-testid="button-disconnect-linkedin"
                        >
                          Disconnect
                        </Button>
                      </div>
                    </div>
                  </div>
                  <div className="mt-6">
                    {getAccountStatus("linkedin")}
                  </div>
                </div>

                <Separator />

                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2 flex-1">
                    <SiIndeed className="h-5 w-5 text-[#2164f3]" />
                    <div className="flex-1 space-y-1">
                      <Label htmlFor="indeed-url">Indeed Profile URL</Label>
                      <div className="flex gap-2">
                        <Input
                          id="indeed-url"
                          placeholder="https://profile.indeed.com/p/..."
                          value={externalAccounts.indeed}
                          onChange={(e) => setExternalAccounts(prev => ({ ...prev, indeed: e.target.value }))}
                          data-testid="input-indeed-url"
                        />
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => updateAccount("indeed", externalAccounts.indeed)}
                          disabled={accountMutation.isPending}
                          data-testid="button-save-indeed"
                        >
                          Save
                        </Button>
                      </div>
                    </div>
                  </div>
                  <div className="mt-6">
                    {getAccountStatus("indeed")}
                  </div>
                </div>

                <Separator />

                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2 flex-1">
                    <SiFacebook className="h-5 w-5 text-[#1877F2]" />
                    <div className="flex-1 space-y-1">
                      <Label htmlFor="facebook-url">Facebook Profile URL</Label>
                      <div className="flex gap-2">
                        <Input
                          id="facebook-url"
                          placeholder="https://facebook.com/username"
                          value={externalAccounts.facebook}
                          onChange={(e) => setExternalAccounts(prev => ({ ...prev, facebook: e.target.value }))}
                          data-testid="input-facebook-url"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateAccount("facebook", externalAccounts.facebook)}
                          disabled={accountMutation.isPending}
                          data-testid="button-save-facebook"
                        >
                          Save
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => (window.location.href = "/api/oauth/facebook/start")}
                          data-testid="button-connect-facebook"
                        >
                          Connect
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setExternalAccounts(prev => ({ ...prev, facebook: "" }));
                            updateAccount("facebook", "");
                          }}
                          data-testid="button-disconnect-facebook"
                        >
                          Disconnect
                        </Button>
                      </div>
                    </div>
                  </div>
                  <div className="mt-6">
                    {getAccountStatus("facebook")}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Import Social Connections
              </CardTitle>
              <CardDescription>
                Import your LinkedIn and Facebook connections to find mutual contacts with job opportunities
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="p-4 rounded-lg border border-[#0A66C2]/30 bg-[#0A66C2]/5 dark:bg-[#0A66C2]/10 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#0A66C2] text-white">
                      <SiLinkedin className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="font-medium">LinkedIn</h4>
                      <p className="text-xs text-muted-foreground">
                        {linkedinConnectionCount > 0 ? `${linkedinConnectionCount} connections imported` : "Import your professional network"}
                      </p>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p>1. Go to LinkedIn Settings</p>
                    <p>2. Data Privacy &gt; Get a copy of your data</p>
                    <p>3. Download Connections.csv</p>
                  </div>
                  <label className="block">
                    <input
                      type="file"
                      accept=".csv"
                      onChange={handleLinkedInImport}
                      className="hidden"
                      data-testid="input-linkedin-csv"
                    />
                    <Button
                      variant="outline"
                      className="w-full gap-2 border-[#0A66C2]/50 text-[#0A66C2] hover:bg-[#0A66C2]/10"
                      disabled={linkedinImporting}
                      onClick={(e) => {
                        const input = e.currentTarget.parentElement?.querySelector('input[type="file"]') as HTMLInputElement;
                        input?.click();
                      }}
                      data-testid="button-import-linkedin"
                    >
                      {linkedinImporting ? (
                        <>
                          <RefreshCw className="h-4 w-4 animate-spin" />
                          Importing...
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4" />
                          Upload Connections.csv
                        </>
                      )}
                    </Button>
                  </label>
                </div>

                <div className="p-4 rounded-lg border border-[#1877F2]/30 bg-[#1877F2]/5 dark:bg-[#1877F2]/10 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#1877F2] text-white">
                      <SiFacebook className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="font-medium">Facebook</h4>
                      <p className="text-xs text-muted-foreground">
                        {facebookConnectionCount > 0 ? `${facebookConnectionCount} friends imported` : "Import your personal network"}
                      </p>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p>1. Go to Facebook Settings</p>
                    <p>2. Your Facebook Information</p>
                    <p>3. Download Your Information</p>
                  </div>
                  <label className="block">
                    <input
                      type="file"
                      accept=".json,.txt"
                      onChange={handleFacebookImport}
                      className="hidden"
                      data-testid="input-facebook-file"
                    />
                    <Button
                      variant="outline"
                      className="w-full gap-2 border-[#1877F2]/50 text-[#1877F2] hover:bg-[#1877F2]/10"
                      disabled={facebookImporting}
                      onClick={(e) => {
                        const input = e.currentTarget.parentElement?.querySelector('input[type="file"]') as HTMLInputElement;
                        input?.click();
                      }}
                      data-testid="button-import-facebook"
                    >
                      {facebookImporting ? (
                        <>
                          <RefreshCw className="h-4 w-4 animate-spin" />
                          Importing...
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4" />
                          Upload Friends.json
                        </>
                      )}
                    </Button>
                  </label>
                </div>
              </div>

              <div className="p-3 rounded-md bg-muted/50 text-sm text-muted-foreground">
                <p className="font-medium mb-1">How it works:</p>
                <p>After importing, our AI will automatically detect mutual connections when viewing job opportunities. Contacts that match will be highlighted with LinkedIn (teal) or Facebook (blue) badges.</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2">
                <Plus className="h-5 w-5 text-primary" />
                Manual Job Import
              </CardTitle>
              <CardDescription>
                Found a job elsewhere? Add it here to track your application
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleManualJobSubmit} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="job-title">Job Title *</Label>
                    <Input
                      id="job-title"
                      placeholder="e.g. Operations Manager"
                      value={manualJob.title || ""}
                      onChange={(e) => setManualJob(prev => ({ ...prev, title: e.target.value }))}
                      required
                      data-testid="input-import-job-title"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="job-company">Company *</Label>
                    <Input
                      id="job-company"
                      placeholder="e.g. ACME Corp"
                      value={manualJob.company || ""}
                      onChange={(e) => setManualJob(prev => ({ ...prev, company: e.target.value }))}
                      required
                      data-testid="input-import-job-company"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="job-location">Location *</Label>
                    <Input
                      id="job-location"
                      placeholder="e.g. Baton Rouge, LA"
                      value={manualJob.location || ""}
                      onChange={(e) => setManualJob(prev => ({ ...prev, location: e.target.value }))}
                      required
                      data-testid="input-import-job-location"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="job-salary">Salary</Label>
                    <Input
                      id="job-salary"
                      placeholder="e.g. $80k - $100k"
                      value={manualJob.salary || ""}
                      onChange={(e) => setManualJob(prev => ({ ...prev, salary: e.target.value }))}
                      data-testid="input-import-job-salary"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="job-source">Source</Label>
                    <Select
                      value={manualJob.source || "linkedin"}
                      onValueChange={(value) => setManualJob(prev => ({ ...prev, source: value }))}
                    >
                      <SelectTrigger id="job-source" data-testid="select-import-job-source">
                        <SelectValue placeholder="Select source" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="linkedin">LinkedIn</SelectItem>
                        <SelectItem value="indeed">Indeed</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="job-description">Description</Label>
                  <Textarea
                    id="job-description"
                    placeholder="Paste job description or notes here..."
                    className="min-h-24"
                    value={manualJob.description || ""}
                    onChange={(e) => setManualJob(prev => ({ ...prev, description: e.target.value }))}
                    data-testid="textarea-import-job-description"
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full"
                  disabled={jobMutation.isPending}
                  data-testid="button-import-job"
                >
                  {jobMutation.isPending ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Import Job
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
