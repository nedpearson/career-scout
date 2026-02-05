import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import Link from "next/link";
import { ExportImport } from "./ExportImport";

export default function SettingsPage() {
  return (
    <div className="space-y-4">
      <Card title="Settings" description="Integrations, export/import, and privacy controls.">
        <div className="mt-2 flex flex-wrap gap-2 text-sm">
          <Badge>Google (Gmail)</Badge>
          <Badge>OpenAI (optional)</Badge>
          <Badge>Export / Import</Badge>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Integrations" description="Connect accounts and manage keys.">
          <div className="text-muted text-sm">
            - **Google (Gmail)**: sign in with Google on the{" "}
            <Link className="underline decoration-white/20 underline-offset-4" href="/signin">
              sign-in page
            </Link>{" "}
            to enable Gmail send.
            <br />
            - **OpenAI**: set `OPENAI_API_KEY` (and optionally `OPENAI_MODEL`) in `.env` to enable AI
            drafting and company-fit analysis.
          </div>
        </Card>
        <Card title="Share / portability" description="Export your data to JSON; import elsewhere.">
          <ExportImport />
        </Card>
      </div>
    </div>
  );
}

