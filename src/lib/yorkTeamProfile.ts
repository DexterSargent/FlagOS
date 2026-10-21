import type { DemoTeam } from "./demoSeedData";
import { YORK_TEAM_ID, YORK_ADMIN_EMAILS } from "./yorkStaff";

export const YORK_LIONS_TEAM: DemoTeam & Record<string, unknown> = {
  id: YORK_TEAM_ID,
  name: "York Lions Women's Flag Football",
  shortcode: "YORK",
  color: "#E31837",
  primaryColor: "#E31837",
  secondaryColor: "#FFFFFF",
  tertiaryColor: "#000000",
  icon: "cat",
  logoUrl: "",
  coachName: "Dexter Sargent",
  coachRole: "Head Coach",
  assistantCoach: "Theo Brown",
  assistantCoachRole: "Defensive Coordinator",
  defensiveCoordinator: "Theo Brown",
  defensiveCoordinatorRole: "Defensive Coordinator",
  offensiveCoordinator: "Justin Fawcett",
  offensiveCoordinatorRole: "Offensive Coordinator",
  coachEmail: "dextersargent@gmail.com",
  adminEmails: YORK_ADMIN_EMAILS,
  isStandalone: true,
  isFounderTeam: true,
  isComplimentary: true,
  createdAt: "2026-08-01T00:00:00.000Z",
  subscription: {
    status: "active",
    plan: "team_pro",
    planName: "Pro Team Subscription",
    tier: "Founder Varsity Club",
    isComplimentary: true,
    isFounderTeam: true,
    isStandalone: true,
    monthlyFee: 0,
    playbookLimit: 5,
    billingCycle: "Complimentary Lifetime (Founder Club)",
    renewsAt: "Lifetime",
    features: [
      "Dedicated Team Portal & Roster Hub",
      "Up to 5 Custom Playbooks with Visual Route Designer",
      "Pre-Snap Motion & Play Simulation Animations",
      "Printable Wristband & Armband Inserts (8, 12, 16 plays)",
      "Dynamic Play-by-Play Wizard (Clockless & Synchronous)",
      "Public Live Game Box Scores & Down-by-Down Logs",
      "Career Stat Tracking & Multi-Season Player Résumés",
      "Autonomy for Tournaments & Non-League Exhibition Scrimmages",
    ],
  },
};

export function getYorkTeamData(): typeof YORK_LIONS_TEAM {
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem("flagos_york_team_custom");
      if (raw) {
        const cached = JSON.parse(raw);
        if (cached && typeof cached === "object" && !Array.isArray(cached)) {
          const custom: Record<string, string> = {};
          for (const key of ["name", "shortcode", "logoUrl", "icon", "color", "primaryColor", "secondaryColor", "tertiaryColor"]) {
            if (typeof cached[key] === "string") custom[key] = cached[key];
          }
          return { ...YORK_LIONS_TEAM, ...custom };
        }
      }
    } catch (error) {
      console.warn("Unable to load York team preferences from this device:", error);
    }
  }
  return YORK_LIONS_TEAM;
}
