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

export const AVAILABLE_ICONS = [
  { id: "shield", label: "Shield", icon: Shield },
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
}: {
  teamName?: string;
  logoUrl?: string;
  icon?: string;
  className?: string;
}) {
  const color = getTeamColor(teamName);
  const iconProps = { className: `${className} ${color}` };

  if (logoUrl && (logoUrl.startsWith("http") || logoUrl.startsWith("/"))) {
    return <img src={logoUrl} alt={teamName} className={className} style={{ objectFit: "contain" }} />;
  }

  const iconKey = (icon || "").toLowerCase();
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
    default: return <Shield {...iconProps} />;
  }
}
