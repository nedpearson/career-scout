import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

const schema = z.object({
  applicationId: z.string().min(1),
  companyLinkedInUrl: z.string().nullable().optional(),
  jobLinkedInUrl: z.string().nullable().optional(),
  contactLinkedInUrl: z.string().nullable().optional(),
  threadLinkedInUrl: z.string().nullable().optional()
});

export async function POST(req: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const { applicationId, companyLinkedInUrl, jobLinkedInUrl, contactLinkedInUrl, threadLinkedInUrl } =
    parsed.data;

  const app = await prisma.application.findFirst({
    where: { id: applicationId, userId },
    select: { id: true, jobId: true, job: { select: { companyId: true } } }
  });
  if (!app) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.application.update({
    where: { id: app.id },
    data: {
      linkedinContactUrl: contactLinkedInUrl ?? undefined,
      linkedinThreadUrl: threadLinkedInUrl ?? undefined
    }
  });

  await prisma.job.update({
    where: { id: app.jobId },
    data: {
      linkedinJobUrl: jobLinkedInUrl ?? undefined
    }
  });

  if (app.job.companyId) {
    await prisma.company.update({
      where: { id: app.job.companyId },
      data: { linkedinUrl: companyLinkedInUrl ?? undefined }
    });
  }

  return NextResponse.json({ ok: true });
}

