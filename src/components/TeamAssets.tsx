import React from "react";
import { Shield, Sword, Cat, Bird, Hexagon, Flame, Zap, Trophy, Crown, Star, Target, Crosshair, Sparkles } from "lucide-react";

export const teamColors: Record<string, string> = {
  "Lions": "text-red-500",
  "Warriors": "text-yellow-500",
  "Vipers": "text-emerald-500",
  "Titans": "text-blue-500",
  "Panthers": "text-purple-500",
  "Hawks": "text-amber-500",
  "Sharks": "text-cyan-400",
  "Thunder": "text-orange-500",
  "Knights": "text-indigo-400",
  "Storm": "text-teal-400",
  "Team 1": "text-red-500",
  "Team 2": "text-blue-500",
  "Team 3": "text-amber-500",
  "Team 4": "text-emerald-500",
};

export function FootballIcon({
  className = "w-6 h-6",
  style,
  ...props
}: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className={className}
      style={style}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {/* Pointed football outline */}
      <path d="M21 3c-.8-.8-3-1.2-5.8-.9s-6 1.6-8.8 4.4-4 6-4.4 8.8.1 5 .9 5.8 3 1.2 5.8.9 6-1.6 8.8-4.4 4-6 4.4-8.8-.1-5-.9-5.8" />
      {/* End stripes */}
      <path d="M15.3 2.1c.8 3.3 3.4 5.8 6.6 6.6" />
      <path d="M8.7 21.9c-.8-3.3-3.4-5.8-6.7-6.7" />
      {/* Seam running along the longitudinal axis */}
      <path d="M6.4 17.6 9 15" />
      <path d="M15 9 17.6 6.4" />
      {/* Laces perpendicular to the seam */}
      <path d="m8.1 13.9 2 2" />
      <path d="m11 11 2 2" />
      <path d="m13.9 8.1 2 2" />
    </svg>
  );
}

export const AVAILABLE_ICONS = [
  { id: "football", label: "Football", icon: FootballIcon },
  { id: "flame", label: "Flame", icon: Flame },
  { id: "zap", label: "Lightning", icon: Zap },
  { id: "trophy", label: "Trophy", icon: Trophy },
  { id: "crown", label: "Crown", icon: Crown },
  { id: "star", label: "Star", icon: Star },
  { id: "sword", label: "Sword", icon: Sword },
  { id: "target", label: "Target", icon: Target },
  { id: "bird", label: "Falcon", icon: Bird },
  { id: "cat", label: "Panther", icon: Cat },
  { id: "hexagon", label: "Badge", icon: Hexagon },
  { id: "sparkles", label: "Spark", icon: Sparkles },
];

export function isRealTeam(team?: { id?: string; name?: string } | null): boolean {
  if (!team) return false;
  if (team.id === "team_free_agents" || team.id === "Free Agent") return false;
  const name = team.name?.trim().toLowerCase();
  if (!name || name === "free agent" || name === "free agents") return false;
  return true;
}

export function getTeamColor(teamName?: string, customColor?: string) {
  if (customColor) return customColor;
  if (!teamName) return "text-cyan-400";
  return teamColors[teamName] || "text-cyan-400";
}

export function getTeamShortcode(team?: { name?: string; shortcode?: string } | null, fallbackName?: string) {
  if (team?.shortcode && team.shortcode.trim()) return team.shortcode.trim().toUpperCase();
  const name = team?.name || fallbackName || "";
  if (!name) return "FLG";
  if (name.includes("Team ")) return name.replace("Team ", "T");
  if (name === "Free Agent") return "FA";
  const words = name.split(" ").filter(Boolean);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0] + (words[2] ? words[2][0] : "")).toUpperCase();
  }
  return name.substring(0, 3).toUpperCase();
}

export function TeamLogo({
  teamName = "Team",
  logoUrl,
  icon,
  className = "w-12 h-12",
  customColor,
  iconColor,
  isDemo = false,
  primaryColor,
}: {
  teamName?: string;
  logoUrl?: string;
  icon?: string;
  className?: string;
  customColor?: string;
  iconColor?: string;
  isDemo?: boolean;
  primaryColor?: string;
}) {
  const color = customColor || getTeamColor(teamName);
  const hasValidLogo =
    !!logoUrl &&
    (logoUrl.startsWith("http") || logoUrl.startsWith("/") || logoUrl.startsWith("data:"));
  const effectiveIconColor = iconColor || primaryColor;
  const iconProps = {
    className: `${className} ${effectiveIconColor ? "" : color}`.trim(),
    style: effectiveIconColor ? { color: effectiveIconColor } : undefined,
  };

  if (hasValidLogo) {
    return (
      <img
        src={logoUrl}
        alt={teamName}
        className={className}
        loading="lazy"
        decoding="async"
        style={{ objectFit: "contain" }}
      />
    );
  }

  const iconKey = (icon || "").toLowerCase();
  // All demo teams and teams without an icon default to the football icon
  if (isDemo || !iconKey || iconKey === "football" || (isDemo && iconKey === "shield")) {
    return <FootballIcon {...iconProps} />;
  }

  switch (iconKey) {
    case "flame": return <Flame {...iconProps} />;
    case "zap": return <Zap {...iconProps} />;
    case "trophy": return <Trophy {...iconProps} />;
    case "crown": return <Crown {...iconProps} />;
    case "star": return <Star {...iconProps} />;
    case "sword": return <Sword {...iconProps} />;
    case "target": return <Target {...iconProps} />;
    case "bird": return <Bird {...iconProps} />;
    case "cat": return <Cat {...iconProps} />;
    case "hexagon": return <Hexagon {...iconProps} />;
    case "sparkles": return <Sparkles {...iconProps} />;
    case "shield": return <Shield {...iconProps} />;
    default: return <FootballIcon {...iconProps} />;
  }
}
