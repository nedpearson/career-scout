export function normalizeOrgName(s: string) {
  return s
    .toLowerCase()
    .replace(/[,.'"()]/g, "")
    .replace(/\b(inc|llc|ltd|corp|corporation|company|co)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function scoreContactForCompany({
  contactCompany,
  targetCompany
}: {
  contactCompany?: string | null;
  targetCompany?: string | null;
}) {
  if (!contactCompany || !targetCompany) return 0;
  const c = normalizeOrgName(contactCompany);
  const t = normalizeOrgName(targetCompany);
  if (!c || !t) return 0;
  if (c === t) return 100;
  if (c.includes(t) || t.includes(c)) return 80;
  // token overlap
  const ct = new Set(c.split(" "));
  const tt = new Set(t.split(" "));
  let overlap = 0;
  for (const w of ct) if (tt.has(w)) overlap++;
  return overlap >= 2 ? 60 : overlap === 1 ? 35 : 0;
}

function hasHiringTitle(title?: string | null) {
  if (!title) return false;
  const t = title.toLowerCase();
  return (
    t.includes("recruit") ||
    t.includes("talent") ||
    t.includes("people ops") ||
    t.includes("hr") ||
    t.includes("human resources") ||
    t.includes("hiring manager")
  );
}

function hasTag(tags?: string | null, needle: string) {
  if (!tags) return false;
  return tags
    .split(",")
    .map((x) => x.trim().toLowerCase())
    .includes(needle.toLowerCase());
}

export function scoreContactForOpportunity({
  contact,
  targetCompany
}: {
  contact: {
    company?: string | null;
    title?: string | null;
    strength?: number | null;
    tags?: string | null;
    hiringSignal?: boolean | null;
  };
  targetCompany?: string | null;
}) {
  const companyScore = scoreContactForCompany({
    contactCompany: contact.company,
    targetCompany
  }); // 0..100

  const strength = Math.max(1, Math.min(5, Number(contact.strength ?? 3)));
  const strengthScore = (strength - 1) * 2.5; // 0..10

  const hiringBoost =
    (contact.hiringSignal ? 10 : 0) +
    (hasHiringTitle(contact.title) ? 6 : 0) +
    (hasTag(contact.tags, "recruiter") ? 6 : 0) +
    (hasTag(contact.tags, "hiring") ? 6 : 0) +
    (hasTag(contact.tags, "referral") ? 4 : 0);

  // Company match is the main thing; hiring/title/strength refine ordering.
  const score = Math.min(100, Math.round(companyScore * 0.75 + hiringBoost + strengthScore));
  return score;
}

