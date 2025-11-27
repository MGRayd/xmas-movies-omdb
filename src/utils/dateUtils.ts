export const getYearFromReleaseDate = (value?: string | null): string | null => {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  // If it already looks like a 4-digit year, just return it
  const yearMatch = trimmed.match(/(\d{4})/);
  if (!yearMatch) return null;

  const year = parseInt(yearMatch[1], 10);
  if (!Number.isFinite(year)) return null;

  return String(year);
};
