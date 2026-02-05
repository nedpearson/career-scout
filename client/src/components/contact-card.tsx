import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { Contact } from "@shared/schema";
import { 
  Mail, 
  Phone, 
  Linkedin,
  Users,
  Building2,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ContactCardProps {
  contact: Contact;
  onDelete?: (contact: Contact) => void;
}

function getRelationshipColor(relationship: string | null) {
  switch (relationship) {
    case "former colleague": return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
    case "vendor": return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400";
    case "alumni": return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
    case "mutual friend": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
    case "recruiter": return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
    default: return "bg-muted text-muted-foreground";
  }
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function ContactCard({ contact, onDelete }: ContactCardProps) {
  return (
    <Card className="hover-elevate" data-testid={`card-contact-${contact.id}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <Avatar className="h-12 w-12">
            <AvatarFallback className="bg-primary/10 text-primary font-medium">
              {getInitials(contact.name)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-medium truncate">{contact.name}</h4>
              {contact.isMutualConnection && (
                <Badge variant="outline" className="no-default-hover-elevate no-default-active-elevate bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                  <Users className="h-3 w-3 mr-1" />
                  Mutual
                </Badge>
              )}
            </div>
            {contact.title && (
              <p className="text-sm text-muted-foreground">{contact.title}</p>
            )}
            {contact.company && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground mt-0.5">
                <Building2 className="h-3 w-3" />
                <span>{contact.company}</span>
              </div>
            )}
            {contact.relationship && (
              <Badge 
                variant="outline" 
                className={cn("mt-2 no-default-hover-elevate no-default-active-elevate capitalize", getRelationshipColor(contact.relationship))}
              >
                {contact.relationship}
              </Badge>
            )}
            {contact.mutualConnectionWith && (
              <p className="text-xs text-muted-foreground mt-1">
                Connected via: {contact.mutualConnectionWith}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 mt-4 pt-3 border-t border-border">
          {contact.email && (
            <Button 
              size="sm" 
              variant="outline"
              asChild
              data-testid={`button-email-${contact.id}`}
            >
              <a href={`mailto:${contact.email}`}>
                <Mail className="h-4 w-4 mr-1" />
                Email
              </a>
            </Button>
          )}
          {contact.phone && (
            <Button 
              size="sm" 
              variant="outline"
              asChild
              data-testid={`button-phone-${contact.id}`}
            >
              <a href={`tel:${contact.phone}`}>
                <Phone className="h-4 w-4 mr-1" />
                Call
              </a>
            </Button>
          )}
          {contact.linkedIn && (
            <Button 
              size="sm" 
              variant="outline"
              asChild
              data-testid={`button-linkedin-${contact.id}`}
            >
              <a href={contact.linkedIn} target="_blank" rel="noopener noreferrer">
                <Linkedin className="h-4 w-4 mr-1" />
                LinkedIn
              </a>
            </Button>
          )}
          <div className="flex-1" />
          {onDelete && (
            <Button 
              size="icon" 
              variant="ghost"
              className="text-destructive hover:text-destructive"
              onClick={() => onDelete(contact)}
              data-testid={`button-delete-contact-${contact.id}`}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
