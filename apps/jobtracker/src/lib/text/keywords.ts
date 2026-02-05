const STOPWORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "by",
  "for",
  "from",
  "has",
  "have",
  "in",
  "is",
  "it",
  "its",
  "of",
  "on",
  "or",
  "that",
  "the",
  "to",
  "with",
  "you",
  "your",
  "we",
  "our",
  "they",
  "their",
  "will",
  "can",
  "may"
]);

export function normalizeText(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9+.#\s-]/g, " ");
}

export function tokenize(s: string): string[] {
  const t = normalizeText(s);
  return t
    .split(/\s+/)
    .map((x) => x.trim())
    .filter(Boolean)
    .filter((x) => x.length > 1)
    .filter((x) => !STOPWORDS.has(x));
}

export function includesPhrase(haystack: string, phrase: string) {
  return normalizeText(haystack).includes(normalizeText(phrase).trim());
}

