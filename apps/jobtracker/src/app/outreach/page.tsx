import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ComposeOutreach } from "./ComposeOutreach";

export default async function OutreachPage({
  searchParams
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = (await searchParams) ?? {};
  const applicationId = typeof sp.applicationId === "string" ? sp.applicationId : undefined;
  const to = typeof sp.to === "string" ? sp.to : undefined;
  const cc = typeof sp.cc === "string" ? sp.cc : undefined;
  const subject = typeof sp.subject === "string" ? sp.subject : undefined;
  const bodyText = typeof sp.bodyText === "string" ? sp.bodyText : undefined;

  return (
    <div className="space-y-4">
      <Card
        title="Outreach"
        description="Tone control + Gmail send (AI drafting next)."
      >
        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
          <Badge>Warm</Badge>
          <Badge>Neutral</Badge>
          <Badge>Direct</Badge>
          <Badge>Human-sounding slider</Badge>
          <span className="text-muted">• Sending works once Google OAuth is connected</span>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Compose" description="Draft now; AI generation is the next layer.">
          <ComposeOutreach
            applicationId={applicationId}
            initialTo={to}
            initialCc={cc}
            initialSubject={subject}
            initialBodyText={bodyText}
          />
        </Card>
        <Card title="What gets logged" description="So you can follow up like an agency.">
          <div className="text-muted text-sm">
            Every send is saved as an Outreach record (to/cc/subject/body, tone, human level, sent
            timestamp, Gmail message id). Next we’ll link it to an Application and generate smart
            follow-ups.
          </div>
        </Card>
      </div>
    </div>
  );
}

