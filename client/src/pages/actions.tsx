import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ActionItem } from "@/components/action-item";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { Input } from "@/components/ui/input";
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
  Target, 
  Plus,
  Sparkles,
  CheckCircle2,
  Clock,
  Calendar,
  RefreshCw,
} from "lucide-react";
import type { DailyAction } from "@shared/schema";
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
import { format } from "date-fns";

const actionFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  actionType: z.string().min(1, "Action type is required"),
  priority: z.string().default("medium"),
  dueDate: z.string().optional(),
});

type ActionFormData = z.infer<typeof actionFormSchema>;

export default function Actions() {
  const { toast } = useToast();
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  const form = useForm<ActionFormData>({
    resolver: zodResolver(actionFormSchema),
    defaultValues: {
      title: "",
      description: "",
      actionType: "apply",
      priority: "medium",
      dueDate: "",
    },
  });

  const { data: actions, isLoading } = useQuery<DailyAction[]>({
    queryKey: ["/api/daily-actions"],
  });

  const addMutation = useMutation({
    mutationFn: async (data: ActionFormData) => {
      return apiRequest("POST", "/api/daily-actions", {
        ...data,
        dueDate: data.dueDate ? new Date(data.dueDate).toISOString() : null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/daily-actions"] });
      setAddDialogOpen(false);
      form.reset();
      toast({ title: "Action added!" });
    },
  });

  const completeMutation = useMutation({
    mutationFn: async (action: DailyAction) => {
      return apiRequest("PATCH", `/api/daily-actions/${action.id}`, {
        isCompleted: !action.isCompleted,
        completedAt: action.isCompleted ? null : new Date().toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/daily-actions"] });
    },
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/daily-actions/generate", {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/daily-actions"] });
      toast({ title: "Daily actions generated!", description: "AI has created your priority tasks for today" });
    },
    onError: () => {
      toast({ title: "Failed to generate actions", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (action: DailyAction) => {
      return apiRequest("DELETE", `/api/daily-actions/${action.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/daily-actions"] });
      toast({ title: "Action deleted" });
    },
    onError: () => {
      toast({ title: "Failed to delete action", variant: "destructive" });
    },
  });

  const pendingActions = actions?.filter(a => !a.isCompleted) || [];
  const completedActions = actions?.filter(a => a.isCompleted) || [];
  const highPriorityActions = pendingActions.filter(a => a.priority === "high");
  const todayActions = pendingActions.filter(a => {
    if (!a.dueDate) return false;
    const today = format(new Date(), "yyyy-MM-dd");
    const dueDate = format(new Date(a.dueDate), "yyyy-MM-dd");
    return today === dueDate;
  });

  const onSubmit = (data: ActionFormData) => {
    addMutation.mutate(data);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-semibold">Daily Actions</h1>
          <p className="text-muted-foreground mt-1">
            Your executive headhunter action plan
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => generateMutation.mutate()}
            disabled={generateMutation.isPending}
            data-testid="button-generate-actions"
          >
            {generateMutation.isPending ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4 mr-2" />
            )}
            AI Generate Today's Plan
          </Button>
          <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-action">
                <Plus className="h-4 w-4 mr-2" />
                Add Action
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Action</DialogTitle>
                <DialogDescription>
                  Add a task to your job search action plan
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Title *</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="e.g., Apply to Amazon Operations Manager" data-testid="input-action-title" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea {...field} placeholder="Additional details..." data-testid="textarea-action-description" />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="actionType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Type</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-action-type">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="apply">Apply</SelectItem>
                              <SelectItem value="follow_up">Follow Up</SelectItem>
                              <SelectItem value="network">Network</SelectItem>
                              <SelectItem value="research">Research</SelectItem>
                              <SelectItem value="call">Call</SelectItem>
                              <SelectItem value="email">Email</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="priority"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Priority</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-action-priority">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="high">High</SelectItem>
                              <SelectItem value="medium">Medium</SelectItem>
                              <SelectItem value="low">Low</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="dueDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Due Date</FormLabel>
                        <FormControl>
                          <Input {...field} type="datetime-local" data-testid="input-action-due-date" />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setAddDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={addMutation.isPending} data-testid="button-save-action">
                      {addMutation.isPending ? "Saving..." : "Add Action"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">
              <Target className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{highPriorityActions.length}</p>
              <p className="text-sm text-muted-foreground">High Priority</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{todayActions.length}</p>
              <p className="text-sm text-muted-foreground">Due Today</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{pendingActions.length}</p>
              <p className="text-sm text-muted-foreground">Pending</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{completedActions.length}</p>
              <p className="text-sm text-muted-foreground">Completed</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="pending" className="w-full">
        <TabsList>
          <TabsTrigger value="pending">Pending ({pendingActions.length})</TabsTrigger>
          <TabsTrigger value="high">High Priority ({highPriorityActions.length})</TabsTrigger>
          <TabsTrigger value="completed">Completed ({completedActions.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-6">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : pendingActions.length > 0 ? (
            <div className="space-y-3">
              {pendingActions.map((action) => (
                <ActionItem
                  key={action.id}
                  action={action}
                  onComplete={(a) => completeMutation.mutate(a)}
                  onDelete={(a) => deleteMutation.mutate(a)}
                />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Target className="h-16 w-16 text-muted-foreground/50 mb-4" />
                <h3 className="text-xl font-medium mb-2">No pending actions</h3>
                <p className="text-muted-foreground text-center max-w-md mb-4">
                  Generate your daily action plan or add tasks manually to stay on track.
                </p>
                <Button onClick={() => generateMutation.mutate()} disabled={generateMutation.isPending}>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generate Today's Plan
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="high" className="mt-6">
          <div className="space-y-3">
            {highPriorityActions.map((action) => (
              <ActionItem
                key={action.id}
                action={action}
                onComplete={(a) => completeMutation.mutate(a)}
                onDelete={(a) => deleteMutation.mutate(a)}
              />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="completed" className="mt-6">
          <div className="space-y-3">
            {completedActions.map((action) => (
              <ActionItem
                key={action.id}
                action={action}
                onComplete={(a) => completeMutation.mutate(a)}
                onDelete={(a) => deleteMutation.mutate(a)}
              />
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
