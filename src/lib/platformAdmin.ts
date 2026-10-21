/** The only account allowed to provision leagues and teams until real billing exists. */
export const PLATFORM_ADMIN_EMAIL = "dextersargent@gmail.com";

export function isPlatformAdminEmail(email: string | null | undefined): boolean {
  return typeof email === "string" && email.trim().toLowerCase() === PLATFORM_ADMIN_EMAIL;
}
