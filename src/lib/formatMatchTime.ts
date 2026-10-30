/** Formats a stored 24-hour "HH:MM" time as "2:00 PM"; other formats are returned unchanged. */
export function formatMatchTime(value: string | null | undefined): string {
  if (!value) return "";
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return value;
  const hours = Number(match[1]);
  if (hours > 23) return value;
  return `${hours % 12 || 12}:${match[2]} ${hours < 12 ? "AM" : "PM"}`;
}

/** Formats a Date as the calendar day in the user's own timezone ("YYYY-MM-DD"), never UTC. */
export function toLocalDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Parses a "YYYY-MM-DD" input value as local midnight so day arithmetic stays on calendar days. */
export function parseLocalDate(value: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return new Date(value);
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

/** Normalizes "10:00 AM" / "7:05pm" / "18:00" into the 24-hour "HH:MM" accepted by <input type="time">. */
export function toTimeInputValue(value: string | null | undefined): string {
  if (!value) return "";
  const m = /^(\d{1,2}):(\d{2})\s*([AaPp][Mm])?$/.exec(value.trim());
  if (!m) return "";
  let hours = Number(m[1]);
  const minutes = m[2];
  const meridiem = m[3]?.toUpperCase();
  if (meridiem === "PM" && hours < 12) hours += 12;
  if (meridiem === "AM" && hours === 12) hours = 0;
  if (hours > 23 || Number(minutes) > 59) return "";
  return `${String(hours).padStart(2, "0")}:${minutes}`;
}
