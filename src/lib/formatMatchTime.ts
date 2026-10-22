/** Formats a stored 24-hour "HH:MM" time as "2:00 PM"; other formats are returned unchanged. */
export function formatMatchTime(value: string | null | undefined): string {
  if (!value) return "";
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return value;
  const hours = Number(match[1]);
  if (hours > 23) return value;
  return `${hours % 12 || 12}:${match[2]} ${hours < 12 ? "AM" : "PM"}`;
}
