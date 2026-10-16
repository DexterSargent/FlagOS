import { isYorkTeam } from "./yorkTeamData";

export const DEXTER_EMAILS = [
  "dextersargent@gmail.com",
  "dexter@yuwffl.ca",
  "dexter.b.harvey@gmail.com",
];

/**
 * Checks whether an email belongs to the platform owner / Dexter Sargent.
 */
export function isDexterUser(email?: string | null): boolean {
  if (!email) return false;
  return DEXTER_EMAILS.includes(email.trim().toLowerCase());
}

/**
 * Checks whether the current user is considered the primary team admin (Head Coach).
 *
 * Rules:
 * 1. Dexter Sargent (platform owner & York founder) is always authorized as primary admin.
 * 2. If the team has an adminEmails list, the FIRST entry (adminEmails[0]) is the primary admin.
 * 3. Fallback for York Lions: Dexter is primary admin.
 * 4. Fallback for teams without adminEmails: team.coachEmail matches the user's email.
 *
 * RBAC specification:
 * - All authorized team admins can manage the team, edit details, log plays, add players, create playbooks, and schedule games.
 * - Team admins can add additional team admins.
 * - ONLY the primary team admin (the first one) has permission to DELETE players, games, and playbooks.
 */
export function isPrimaryTeamAdmin(
  userEmail: string | null | undefined,
  team: { id?: string; adminEmails?: string[]; coachEmail?: string } | null | undefined,
  isDexterFlag?: boolean
): boolean {
  if (isDexterFlag) return true;
  if (isDexterUser(userEmail)) return true;
  if (!userEmail) return false;
  const cleanEmail = userEmail.trim().toLowerCase();

  const adminEmails = Array.isArray(team?.adminEmails)
    ? team.adminEmails.map((e) => String(e).trim().toLowerCase()).filter(Boolean)
    : [];

  if (adminEmails.length > 0) {
    return adminEmails[0] === cleanEmail;
  }

  // Fallback for York Lions
  if (team?.id && isYorkTeam(team.id)) {
    return isDexterUser(cleanEmail);
  }

  // Fallback if coachEmail is set
  if (team?.coachEmail && team.coachEmail.trim().toLowerCase() === cleanEmail) {
    return true;
  }

  return false;
}

/**
 * Normalizes and extracts all team admin emails for a team.
 * Guarantees that York Lions has dextersargent@gmail.com as the initial primary admin.
 */
export function getTeamAdminEmails(team: { id?: string; adminEmails?: string[]; coachEmail?: string } | null | undefined): string[] {
  const existing = Array.isArray(team?.adminEmails)
    ? team.adminEmails.map((e) => String(e).trim().toLowerCase()).filter(Boolean)
    : [];

  if (team?.id && isYorkTeam(team.id)) {
    if (!existing.includes("dextersargent@gmail.com")) {
      return ["dextersargent@gmail.com", ...existing];
    }
  }

  if (existing.length === 0 && team?.coachEmail) {
    return [team.coachEmail.trim().toLowerCase()];
  }

  return existing;
}
