export function parseDate(dateStr: string): Date {
  // Append T00:00:00 for date-only strings to avoid timezone offset issues
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return new Date(dateStr + "T00:00:00");
  }
  return new Date(dateStr);
}
