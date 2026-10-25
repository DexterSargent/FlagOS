/** The primary platform administrator email. */
export const PLATFORM_ADMIN_EMAIL = "dextersargent@flagos.ca";
/** Public fallback contact when a league has not published an organizer email. */
export const FLAGOS_SUPPORT_EMAIL = PLATFORM_ADMIN_EMAIL;

/** Authorized platform administrators allowed to provision leagues and teams without billing. */
export const PLATFORM_ADMIN_EMAILS = [
  "dextersargent@flagos.ca",
  "dextersargent@gmail.com",
];

export function isPlatformAdminEmail(email: string | null | undefined): boolean {
  if (typeof email !== "string") return false;
  return PLATFORM_ADMIN_EMAILS.includes(email.trim().toLowerCase());
}
