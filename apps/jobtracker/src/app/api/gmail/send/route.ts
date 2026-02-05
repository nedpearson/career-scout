import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { sendGmailMessage } from "@/lib/gmail";
import { addBusinessDays } from "@/lib/date";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!env.AUTH_GOOGLE_ID || !env.AUTH_GOOGLE_SECRET) {
    return NextResponse.json(
      { error: "Google OAuth not configured (missing AUTH_GOOGLE_ID/SECRET)" },
      { status: 400 }
    );
  }

  const body = (await req.json().catch(() => null)) as
    | {
        to: string;
        cc?: string;
        subject: string;
        bodyText: string;
        applicationId?: string;
        tone?: "WARM" | "NEUTRAL" | "DIRECT";
        humanLevel?: number;
        autoFollowUpBusinessDays?: number;
      }
    | null;

  if (!body?.to || !body.subject || !body.bodyText) {
    return NextResponse.json({ error: "Missing to/subject/bodyText" }, { status: 400 });
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

  const sent = await sendGmailMessage({
    googleClientId: env.AUTH_GOOGLE_ID,
    googleClientSecret: env.AUTH_GOOGLE_SECRET,
    refreshToken: account.refresh_token,
    accessToken: account.access_token,
    to: body.to,
    cc: body.cc,
    subject: body.subject,
    bodyText: body.bodyText
  });

  const saved = await prisma.outreachEmail.create({
    data: {
      userId,
      applicationId: body.applicationId,
      toEmail: body.to,
      ccEmail: body.cc,
      subject: body.subject,
      bodyText: body.bodyText,
      tone: body.tone ?? "NEUTRAL",
      humanLevel: typeof body.humanLevel === "number" ? body.humanLevel : 70,
      sentAt: new Date(),
      gmailMessageId: sent.id
    }
  });

  if (body.applicationId && typeof body.autoFollowUpBusinessDays === "number") {
    const days = Math.max(0, Math.min(30, Math.floor(body.autoFollowUpBusinessDays)));
    if (days > 0) {
      await prisma.application.updateMany({
        where: { id: body.applicationId, userId },
        data: { nextFollowUpAt: addBusinessDays(new Date(), days) }
      });
    }
  }

  return NextResponse.json({ ok: true, gmailMessageId: sent.id, outreachId: saved.id });
}

