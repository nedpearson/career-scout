import { NextResponse } from "next/server";
import { google } from "googleapis";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";

export const runtime = "nodejs";

export async function POST() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!env.AUTH_GOOGLE_ID || !env.AUTH_GOOGLE_SECRET) {
    return NextResponse.json({ error: "Google OAuth not configured" }, { status: 400 });
  }

  const account = await prisma.account.findFirst({
    where: { userId, provider: "google" }
  });
  if (!account?.refresh_token) {
    return NextResponse.json(
      { error: "Google account not connected or missing refresh token" },
      { status: 400 }
    );
  }

  const oauth2 = new google.auth.OAuth2({
    clientId: env.AUTH_GOOGLE_ID,
    clientSecret: env.AUTH_GOOGLE_SECRET
  });
  oauth2.setCredentials({
    refresh_token: account.refresh_token,
    access_token: account.access_token ?? undefined
  });

  const people = google.people({ version: "v1", auth: oauth2 });

  const res = await people.people.connections.list({
    resourceName: "people/me",
    pageSize: 200,
    personFields: "names,emailAddresses,phoneNumbers,organizations,urls"
  });

  const connections = res.data.connections ?? [];
  let imported = 0;
  for (const p of connections) {
    const name = p.names?.[0]?.displayName?.trim() || "";
    if (!name) continue;
    const email = p.emailAddresses?.[0]?.value?.trim() || "";
    const phone = p.phoneNumbers?.[0]?.value?.trim() || "";
    const org = p.organizations?.[0]?.name?.trim() || "";
    const title = p.organizations?.[0]?.title?.trim() || "";

    // Best-effort dedupe by email if present, otherwise by (name+org).
    const existing = email
      ? await prisma.contact.findFirst({ where: { userId, email } })
      : await prisma.contact.findFirst({ where: { userId, name, company: org || null } });

    if (existing) {
      await prisma.contact.update({
        where: { id: existing.id },
        data: {
          phone: phone || existing.phone,
          company: org || existing.company,
          title: title || existing.title
        }
      });
    } else {
      await prisma.contact.create({
        data: {
          userId,
          name,
          email: email || null,
          phone: phone || null,
          company: org || null,
          title: title || null,
          strength: 3
        }
      });
      imported++;
    }
  }

  return NextResponse.json({ ok: true, imported, total: connections.length });
}

