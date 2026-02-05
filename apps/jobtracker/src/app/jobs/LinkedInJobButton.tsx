"use client";

import * as React from "react";
import { Button } from "@/components/ui/Button";

export function LinkedInJobButton({
  title,
  location,
  companyName
}: {
  title: string;
  location?: string | null;
  companyName?: string | null;
}) {
  const url = React.useMemo(() => {
    const u = new URL("https://www.linkedin.com/jobs/search/");
    const keywords = [title, companyName].filter(Boolean).join(" ");
    u.searchParams.set("keywords", keywords);
    if (location) u.searchParams.set("location", location);
    return u.toString();
  }, [title, location, companyName]);

  return (
    <a href={url} target="_blank" rel="noreferrer">
      <Button type="button" variant="ghost" size="sm">
        LinkedIn
      </Button>
    </a>
  );
}

