/** "Marcus Vance" -> "M. Vance"; single names are returned unchanged. */
export function shortPlayerName(name: string | null | undefined): string {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length < 2) return parts[0] || "";
  return `${parts[0][0]}. ${parts.slice(1).join(" ")}`;
}
