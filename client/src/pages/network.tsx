import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ContactCard } from "@/components/contact-card";
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
  Users, 
  Search, 
  Plus,
  Sparkles,
  UserCheck,
  Building2,
  RefreshCw,
} from "lucide-react";
import type { Contact } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

const contactFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  company: z.string().optional(),
  title: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  linkedIn: z.string().optional(),
  relationship: z.string().optional(),
  notes: z.string().optional(),
});

type ContactFormData = z.infer<typeof contactFormSchema>;

export default function Network() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  const form = useForm<ContactFormData>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: {
      name: "",
      company: "",
      title: "",
      email: "",
      phone: "",
      linkedIn: "",
      relationship: "",
      notes: "",
    },
  });

  const { data: contacts, isLoading } = useQuery<Contact[]>({
    queryKey: ["/api/contacts"],
  });

  const addMutation = useMutation({
    mutationFn: async (data: ContactFormData) => {
      return apiRequest("POST", "/api/contacts", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
      setAddDialogOpen(false);
      form.reset();
      toast({ title: "Contact added!" });
    },
    onError: () => {
      toast({ title: "Failed to add contact", variant: "destructive" });
    },
  });

  const findMutualsMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/contacts/find-mutuals", {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
      toast({ title: "Mutual connections search complete!" });
    },
    onError: () => {
      toast({ title: "Search failed", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (contact: Contact) => {
      return apiRequest("DELETE", `/api/contacts/${contact.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
      toast({ title: "Contact deleted" });
    },
    onError: () => {
      toast({ title: "Failed to delete contact", variant: "destructive" });
    },
  });

  const filteredContacts = contacts?.filter((contact) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      contact.name.toLowerCase().includes(query) ||
      contact.company?.toLowerCase().includes(query) ||
      contact.title?.toLowerCase().includes(query)
    );
  }) || [];

  const mutualConnections = filteredContacts.filter(c => c.isMutualConnection);
  const recruiters = filteredContacts.filter(c => c.relationship === "recruiter");
  const alumni = filteredContacts.filter(c => c.relationship === "alumni");
  const colleagues = filteredContacts.filter(c => c.relationship === "former colleague");

  const onSubmit = (data: ContactFormData) => {
    addMutation.mutate(data);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-semibold">Network</h1>
          <p className="text-muted-foreground mt-1">
            Manage contacts and find mutual connections for referrals
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => findMutualsMutation.mutate()}
            disabled={findMutualsMutation.isPending}
            data-testid="button-find-mutuals"
          >
            {findMutualsMutation.isPending ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4 mr-2" />
            )}
            Find Mutual Connections
          </Button>
          <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-contact">
                <Plus className="h-4 w-4 mr-2" />
                Add Contact
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Add New Contact</DialogTitle>
                <DialogDescription>
                  Add a professional contact to your network
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem className="col-span-2">
                          <FormLabel>Name *</FormLabel>
                          <FormControl>
                            <Input {...field} data-testid="input-contact-name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Title</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="e.g. HR Manager" data-testid="input-contact-title" />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="company"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Company</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="e.g. Amazon" data-testid="input-contact-company" />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input {...field} type="email" data-testid="input-contact-email" />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone</FormLabel>
                          <FormControl>
                            <Input {...field} type="tel" data-testid="input-contact-phone" />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="linkedIn"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>LinkedIn URL</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="https://linkedin.com/in/..." data-testid="input-contact-linkedin" />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="relationship"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Relationship</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-contact-relationship">
                                <SelectValue placeholder="Select type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="former colleague">Former Colleague</SelectItem>
                              <SelectItem value="vendor">Vendor</SelectItem>
                              <SelectItem value="alumni">Alumni</SelectItem>
                              <SelectItem value="mutual friend">Mutual Friend</SelectItem>
                              <SelectItem value="recruiter">Recruiter</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem className="col-span-2">
                          <FormLabel>Notes</FormLabel>
                          <FormControl>
                            <Textarea {...field} placeholder="How do you know this person?" data-testid="textarea-contact-notes" />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setAddDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={addMutation.isPending} data-testid="button-save-contact">
                      {addMutation.isPending ? "Saving..." : "Add Contact"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search contacts by name, company, or title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="input-search-contacts"
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-2 flex-wrap">
        <Badge variant="outline" className="no-default-hover-elevate no-default-active-elevate">
          {filteredContacts.length} contacts
        </Badge>
        {mutualConnections.length > 0 && (
          <Badge variant="outline" className="no-default-hover-elevate no-default-active-elevate bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
            <UserCheck className="h-3 w-3 mr-1" />
            {mutualConnections.length} mutual connections
          </Badge>
        )}
      </div>

      <Tabs defaultValue="all" className="w-full">
        <TabsList>
          <TabsTrigger value="all">All ({filteredContacts.length})</TabsTrigger>
          <TabsTrigger value="mutual">Mutual ({mutualConnections.length})</TabsTrigger>
          <TabsTrigger value="recruiters">Recruiters ({recruiters.length})</TabsTrigger>
          <TabsTrigger value="alumni">Alumni ({alumni.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-6">
          {isLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Skeleton key={i} className="h-48 w-full" />
              ))}
            </div>
          ) : filteredContacts.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredContacts.map((contact) => (
                <ContactCard
                  key={contact.id}
                  contact={contact}
                  onDelete={(c) => deleteMutation.mutate(c)}
                />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Users className="h-16 w-16 text-muted-foreground/50 mb-4" />
                <h3 className="text-xl font-medium mb-2">No contacts yet</h3>
                <p className="text-muted-foreground text-center max-w-md mb-4">
                  Add your professional contacts to track relationships and find mutual connections for referrals.
                </p>
                <Button onClick={() => setAddDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Your First Contact
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="mutual" className="mt-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {mutualConnections.map((contact) => (
              <ContactCard
                key={contact.id}
                contact={contact}
                onDelete={(c) => deleteMutation.mutate(c)}
              />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="recruiters" className="mt-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {recruiters.map((contact) => (
              <ContactCard
                key={contact.id}
                contact={contact}
                onDelete={(c) => deleteMutation.mutate(c)}
              />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="alumni" className="mt-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {alumni.map((contact) => (
              <ContactCard
                key={contact.id}
                contact={contact}
                onDelete={(c) => deleteMutation.mutate(c)}
              />
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
