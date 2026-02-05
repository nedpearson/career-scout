import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { GoogleContactsImportButton } from "./GoogleContactsImportButton";

function parseCsv(text: string) {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return { headers: [], rows: [] as string[][] };
  const headers = splitCsvLine(lines[0]);
  const rows = lines.slice(1).map(splitCsvLine);
  return { headers, rows };
}

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"' && line[i + 1] === '"') {
      cur += '"';
      i++;
      continue;
    }
    if (ch === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (ch === "," && !inQuotes) {
      out.push(cur.trim());
      cur = "";
      continue;
    }
    cur += ch;
  }
  out.push(cur.trim());
  return out;
}

function pick(row: Record<string, string>, ...keys: string[]) {
  for (const k of keys) {
    const v = row[k];
    if (v != null && String(v).trim() !== "") return String(v).trim();
  }
  return "";
}

export default async function NetworkPage() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return null;

  async function addContact(formData: FormData) {
    "use server";
    const name = String(formData.get("name") ?? "").trim();
    if (!name) return;
    await prisma.contact.create({
      data: {
        userId,
        name,
        company: String(formData.get("company") ?? "").trim() || null,
        title: String(formData.get("title") ?? "").trim() || null,
        email: String(formData.get("email") ?? "").trim() || null,
        phone: String(formData.get("phone") ?? "").trim() || null,
        linkedinUrl: String(formData.get("linkedinUrl") ?? "").trim() || null,
        facebookUrl: String(formData.get("facebookUrl") ?? "").trim() || null,
        instagramUrl: String(formData.get("instagramUrl") ?? "").trim() || null,
        strength: Number(formData.get("strength") ?? 3) || 3,
        tags: String(formData.get("tags") ?? "").trim() || null,
        hiringSignal: String(formData.get("hiringSignal") ?? "") === "on",
        hiringPlatforms: String(formData.get("hiringPlatforms") ?? "").trim() || null,
        hiringKeywords: String(formData.get("hiringKeywords") ?? "").trim() || null,
        hiringNotes: String(formData.get("hiringNotes") ?? "").trim() || null,
        notes: String(formData.get("notes") ?? "").trim() || null
      }
    });
  }

  async function updateContact(formData: FormData) {
    "use server";
    const id = String(formData.get("id") ?? "");
    if (!id) return;
    await prisma.contact.update({
      where: { id },
      data: {
        strength: Number(formData.get("strength") ?? 3) || 3,
        tags: String(formData.get("tags") ?? "").trim() || null,
        hiringSignal: String(formData.get("hiringSignal") ?? "") === "on",
        hiringPlatforms: String(formData.get("hiringPlatforms") ?? "").trim() || null,
        hiringKeywords: String(formData.get("hiringKeywords") ?? "").trim() || null,
        hiringNotes: String(formData.get("hiringNotes") ?? "").trim() || null,
        hiringLastSeenAt: String(formData.get("hiringSignal") ?? "") === "on" ? new Date() : null,
        notes: String(formData.get("notes") ?? "").trim() || null
      }
    });
  }

  async function importCsv(formData: FormData) {
    "use server";
    const csvText = String(formData.get("csv") ?? "");
    const { headers, rows } = parseCsv(csvText);
    if (headers.length === 0) return;

    const norm = (s: string) => s.toLowerCase().replace(/\s+/g, "");
    const headerMap = headers.reduce<Record<string, string>>((acc, h) => {
      acc[norm(h)] = h;
      return acc;
    }, {});

    let imported = 0;
    for (const r of rows) {
      const obj: Record<string, string> = {};
      for (let i = 0; i < headers.length; i++) obj[headers[i]] = r[i] ?? "";

      const name =
        pick(obj, headerMap["name"], headerMap["fullname"]) ||
        pick(obj, headerMap["firstname"]) + " " + pick(obj, headerMap["lastname"]);
      const cleanName = name.trim();
      if (!cleanName) continue;

      const email = pick(obj, headerMap["email"], headerMap["emailaddress"]);

      await prisma.contact.create({
        data: {
          userId,
          name: cleanName,
          company: pick(obj, headerMap["company"], headerMap["organization"]) || null,
          title: pick(obj, headerMap["title"], headerMap["jobtitle"]) || null,
          email: email || null,
          phone: pick(obj, headerMap["phone"], headerMap["phonenumber"]) || null,
          linkedinUrl: pick(obj, headerMap["linkedin"], headerMap["linkedinurl"]) || null,
          facebookUrl: pick(obj, headerMap["facebook"], headerMap["facebookurl"]) || null,
          instagramUrl: pick(obj, headerMap["instagram"], headerMap["instagramurl"]) || null,
          strength: Number(pick(obj, headerMap["strength"])) || 3,
          tags: pick(obj, headerMap["tags"]) || null,
          hiringSignal: ["true", "1", "yes", "y"].includes(
            pick(obj, headerMap["hiringsignal"], headerMap["hiring"]).toLowerCase()
          ),
          hiringPlatforms: pick(obj, headerMap["hiringplatforms"]) || null,
          hiringKeywords: pick(obj, headerMap["hiringkeywords"]) || null,
          hiringNotes: pick(obj, headerMap["hiringnotes"]) || null,
          notes: pick(obj, headerMap["notes"]) || null
        }
      });
      imported++;
      if (imported >= 500) break;
    }
  }

  const contacts = await prisma.contact.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    take: 50
  });

  return (
    <div className="space-y-4">
      <Card
        title="Network"
        description="Your “who do I know?” database. Add contacts across LinkedIn/Facebook/Instagram + email, then we’ll surface mutuals per job."
      >
        <div className="text-muted text-sm">
          Note: Meta (Facebook/Instagram) doesn’t allow a normal app to fetch your friend lists/mutuals automatically.
          This feature works by importing/maintaining your network and matching it to your target companies/roles.
        </div>
      </Card>

      <Card title="Google Contacts (optional)" description="Import up to 200 Google Contacts into Network.">
        <div className="text-muted text-sm">
          Requires re-signing into Google after enabling the Contacts scope.
        </div>
        <div className="mt-2">
          <GoogleContactsImportButton />
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Add contact" description="Manual entry (fast).">
          <form action={addContact} className="mt-2 grid gap-2">
            <div className="grid gap-2 md:grid-cols-2">
              <Input name="name" placeholder="Name" required />
              <Input name="company" placeholder="Company (optional)" />
              <Input name="title" placeholder="Title (optional)" />
              <Input name="email" placeholder="Email (optional)" />
              <Input name="phone" placeholder="Phone (optional)" />
              <Input name="linkedinUrl" placeholder="LinkedIn URL (optional)" />
              <Input name="facebookUrl" placeholder="Facebook URL (optional)" />
              <Input name="instagramUrl" placeholder="Instagram URL (optional)" />
              <Select name="strength" defaultValue="3">
                <option value="1">Strength 1 (weak)</option>
                <option value="2">Strength 2</option>
                <option value="3">Strength 3</option>
                <option value="4">Strength 4</option>
                <option value="5">Strength 5 (strong)</option>
              </Select>
              <Input name="tags" placeholder="Tags (comma-separated, optional)" />
            </div>
            <div className="rounded-xl bg-white/[0.03] p-3 ring-1 ring-white/10">
              <label className="flex items-center gap-2 text-sm text-white/80">
                <input className="accent-white" type="checkbox" name="hiringSignal" /> Hiring signal
              </label>
              <div className="mt-2 grid gap-2 md:grid-cols-2">
                <Input
                  name="hiringPlatforms"
                  placeholder="Platforms (comma-separated, e.g. linkedin, facebook, instagram)"
                />
                <Input
                  name="hiringKeywords"
                  placeholder="Keywords (comma-separated, e.g. hiring, referrals, open roles)"
                />
              </div>
              <Textarea name="hiringNotes" placeholder="Hiring notes (what you saw, what role, link, date…)" />
            </div>
            <Textarea name="notes" placeholder="Notes (how you know them, referral strength, etc.)" />
            <div className="flex justify-end">
              <Button type="submit">Add</Button>
            </div>
          </form>
        </Card>

        <Card title="Import CSV" description="Paste CSV (headers like name,email,company,linkedin,facebook,instagram).">
          <form action={importCsv} className="mt-2 grid gap-2">
            <Textarea
              name="csv"
              placeholder={`name,email,company,linkedin,facebook,instagram\nJane Doe,jane@example.com,Acme Inc,https://www.linkedin.com/in/janedoe,,https://instagram.com/janedoe`}
              required
            />
            <div className="flex justify-end">
              <Button type="submit" variant="secondary">
                Import (up to 500)
              </Button>
            </div>
          </form>
        </Card>
      </div>

      <Card title={`Recent contacts (${contacts.length})`} description="Latest 50.">
        {contacts.length === 0 ? (
          <div className="text-muted text-sm">No contacts yet.</div>
        ) : (
          <div className="mt-2 space-y-2">
            {contacts.map((c) => (
              <div key={c.id} className="rounded-xl bg-white/[0.03] p-3 ring-1 ring-white/10">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-sm font-medium">{c.name}</div>
                  <div className="text-xs text-white/60">{c.company ?? ""}</div>
                </div>
                <div className="text-muted text-sm">
                  {(c.title ?? "").trim()}
                  {c.email ? ` • ${c.email}` : ""}
                </div>
                <div className="text-muted mt-1 text-xs">
                  Strength: {c.strength}/5 {c.tags ? `• Tags: ${c.tags}` : ""}
                  {c.hiringSignal ? " • Hiring signal" : ""}
                </div>
                <div className="mt-2 flex flex-wrap gap-2 text-xs">
                  {c.linkedinUrl ? (
                    <a className="underline decoration-white/20 underline-offset-4" href={c.linkedinUrl} target="_blank" rel="noreferrer">
                      LinkedIn
                    </a>
                  ) : null}
                  {c.facebookUrl ? (
                    <a className="underline decoration-white/20 underline-offset-4" href={c.facebookUrl} target="_blank" rel="noreferrer">
                      Facebook
                    </a>
                  ) : null}
                  {c.instagramUrl ? (
                    <a className="underline decoration-white/20 underline-offset-4" href={c.instagramUrl} target="_blank" rel="noreferrer">
                      Instagram
                    </a>
                  ) : null}
                </div>
                <form action={updateContact} className="mt-2 grid gap-2 md:grid-cols-3 md:items-end">
                  <input type="hidden" name="id" value={c.id} />
                  <div>
                    <div className="text-muted mb-1 text-xs">Strength</div>
                    <Select name="strength" defaultValue={String(c.strength)}>
                      <option value="1">1</option>
                      <option value="2">2</option>
                      <option value="3">3</option>
                      <option value="4">4</option>
                      <option value="5">5</option>
                    </Select>
                  </div>
                  <div>
                    <div className="text-muted mb-1 text-xs">Tags</div>
                    <Input name="tags" defaultValue={c.tags ?? ""} placeholder="mutual, referral…" />
                  </div>
                  <Button type="submit" variant="secondary">
                    Update
                  </Button>
                  <div className="md:col-span-3">
                    <div className="text-muted mb-1 text-xs">Notes</div>
                    <Textarea name="notes" defaultValue={c.notes ?? ""} placeholder="Notes…" />
                  </div>
                  <div className="md:col-span-3 rounded-xl bg-white/[0.03] p-3 ring-1 ring-white/10">
                    <label className="flex items-center gap-2 text-sm text-white/80">
                      <input
                        className="accent-white"
                        type="checkbox"
                        name="hiringSignal"
                        defaultChecked={Boolean(c.hiringSignal)}
                      />
                      Hiring signal
                    </label>
                    <div className="mt-2 grid gap-2 md:grid-cols-2">
                      <Input
                        name="hiringPlatforms"
                        defaultValue={c.hiringPlatforms ?? ""}
                        placeholder="Platforms (comma-separated)"
                      />
                      <Input
                        name="hiringKeywords"
                        defaultValue={c.hiringKeywords ?? ""}
                        placeholder="Keywords (comma-separated)"
                      />
                    </div>
                    <Textarea
                      name="hiringNotes"
                      defaultValue={c.hiringNotes ?? ""}
                      placeholder="Hiring notes…"
                    />
                    <div className="text-muted mt-1 text-xs">
                      {c.hiringLastSeenAt ? `Last seen: ${new Date(c.hiringLastSeenAt).toLocaleString()}` : ""}
                    </div>
                  </div>
                </form>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

